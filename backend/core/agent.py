"""LangGraph workflow definition for the autonomous Knowledge Librarian agent."""

from dotenv import load_dotenv
from langchain_core.messages import SystemMessage
from langchain_core.runnables.config import RunnableConfig
from langchain_google_genai import ChatGoogleGenerativeAI
from langgraph.checkpoint.memory import MemorySaver
from langgraph.graph import END, START, MessagesState, StateGraph
from langgraph.prebuilt import ToolNode, tools_condition

from core.config import VaultConfig
from tools import all_tools

load_dotenv()


def get_vault_index() -> str:
    """Generate a formatted list of existing Markdown files in the vault.

    Returns:
        str: Bulleted list of relative note paths or empty placeholder.
    """
    base_path = VaultConfig.get_base_path()

    if not base_path.exists():
        return "Bóveda vacía."

    notes = [
        str(file.relative_to(base_path))
        for file in base_path.rglob("*.md")
    ]

    if not notes:
        return "Bóveda vacía."

    return "\n- ".join([""] + notes)


def call_model(state: MessagesState, config: RunnableConfig) -> dict:
    """Invoke the LLM with current state and dynamic model configuration.

    Args:
        state: LangGraph state containing conversation history.
        config: Runtime configuration with model name and thread parameters.

    Returns:
        dict: Updated messages state.
    """
    model_name = config.get("configurable", {}).get("model", "gemini-3.5-flash-lite")
    index_text = get_vault_index()

    sys_content = (
        "Rol: Eres un Administrador Autónomo de Conocimiento (Knowledge Librarian) "
        "de una bóveda Obsidian.\n"
        f"Notas existentes actualmente:{index_text}\n\n"
        "Directivas Avanzadas:\n"
        "1. Conoces las notas existentes. NO uses list_notes ni search_notes si el "
        "usuario te da el nombre explícito de la nota; ve directo a read_note.\n"
        "2. Manejo de Wikilinks: Comprendes que el texto entre dobles corchetes [[Concepto]] "
        "son enlaces a otras notas técnicas. Si necesitas entender el contexto completo "
        "de un concepto, debes usar read_note en esos enlaces.\n"
        "3. Análisis y Auto-Enrutamiento: Tienes la capacidad de comparar notas de Gestión de "
        "Rutas (índices) con las notas del Cerebro Técnico. Si el usuario te pide enlazar, "
        "analizar brechas, o organizar información, debes leer las notas implicadas, deducir "
        "qué falta, y usar write_note o append_to_note para actualizar los índices "
        "automáticamente inyectando los enlaces [[ ]] pertinentes."
    )

    llm = ChatGoogleGenerativeAI(
        model=model_name,
        temperature=0.0
    )
    llm_with_tools = llm.bind_tools(all_tools)

    messages_with_sys = [SystemMessage(content=sys_content)] + state["messages"]
    response = llm_with_tools.invoke(messages_with_sys)
    return {"messages": [response]}


tool_node = ToolNode(tools=all_tools)

builder = StateGraph(MessagesState)
builder.add_node("call_model", call_model)
builder.add_node("tools", tool_node)

builder.add_edge(START, "call_model")
builder.add_conditional_edges("call_model", tools_condition)
builder.add_edge("tools", "call_model")

memory = MemorySaver()
graph = builder.compile(checkpointer=memory)
