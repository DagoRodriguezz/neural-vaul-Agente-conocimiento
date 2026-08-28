"""CLI entrypoint for interactive console chat with the autonomous agent."""

import os
import sys
from dotenv import load_dotenv
from langchain_core.messages import HumanMessage

load_dotenv()

api_key = os.getenv("GEMINI_API_KEY")
if not api_key or api_key.strip() in ("", "tu_api_key_aqui"):
    print("=" * 60)
    print("[ERROR] GEMINI_API_KEY is not configured.")
    print("Please configure your Gemini API Key in backend/.env")
    print("=" * 60)
    sys.exit(1)

from core.agent import graph


def main() -> None:
    """Run interactive REPL session with the LangGraph agent."""
    print("=" * 60)
    print("Autonomous Agent CLI Initialized. Type 'exit' or 'quit' to exit.")
    print("=" * 60)

    messages = []

    while True:
        try:
            user_input = input("\nUser: ").strip()
        except (KeyboardInterrupt, EOFError):
            print("\nExiting...")
            break

        if user_input.lower() in ("salir", "exit", "quit"):
            print("Session terminated.")
            break

        if not user_input:
            continue

        messages.append(HumanMessage(content=user_input))

        for event in graph.stream({"messages": messages}):
            for node_name, node_state in event.items():
                latest_message = node_state["messages"][-1]

                if node_name == "call_model":
                    if latest_message.tool_calls:
                        for tool_call in latest_message.tool_calls:
                            print(f"\n[Invoking tool '{tool_call['name']}']")
                    elif latest_message.content:
                        print(f"\nAgent:\n{latest_message.content}")
                        messages.append(latest_message)

                if "messages" in node_state:
                    messages = node_state["messages"]


if __name__ == "__main__":
    main()
