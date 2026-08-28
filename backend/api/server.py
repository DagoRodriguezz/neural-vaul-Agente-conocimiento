"""FastAPI application providing REST endpoints and SSE streaming for Obsidian PKM."""

import json
import re
import shutil
import os
from pathlib import Path
from urllib.parse import unquote

from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from pydantic import BaseModel

from core.agent import get_vault_index, graph
from core.config import VaultConfig

load_dotenv()

app = FastAPI(
    title="Autonomous Agent PKM API",
    description="Backend API powering the Obsidian-compatible autonomous knowledge assistant."
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173", "*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


class ChatRequest(BaseModel):
    message: str
    model: str = "gemini-3.5-flash-lite"
    thread_id: str = "sesion-usuario-1"


class VaultRequest(BaseModel):
    vault_path: str


class NoteContentRequest(BaseModel):
    path: str
    content: str


class FolderCreateRequest(BaseModel):
    path: str


class RenameRequest(BaseModel):
    old_path: str
    new_path: str


@app.get("/api/graph")
async def get_graph():
    """Extract notes and wikilinks to construct the knowledge graph.

    Returns:
        dict: Graph structure with 'nodes' and 'links'.
    """
    if not VaultConfig.is_configured():
        return {"nodes": [], "links": []}

    base_path = VaultConfig.get_base_path()
    nodes_dict = {}
    links = []

    # Register all physical markdown files as primary nodes (group 1)
    for file in base_path.rglob("*.md"):
        node_id = file.stem
        nodes_dict[node_id] = {"id": node_id, "group": 1}

    # Parse wikilinks and compiled vault anchors
    for file in base_path.rglob("*.md"):
        node_id = file.stem
        try:
            content = file.read_text(encoding="utf-8")

            wikilinks = re.findall(r"\[\[(.*?)\]\]", content)
            vault_links = re.findall(r"#vault:([^)]+)", content)

            target_ids = []

            for link in wikilinks:
                clean_id = link.split("|")[0].strip()
                if clean_id:
                    target_ids.append(clean_id)

            for link in vault_links:
                clean_id = unquote(link).strip()
                if clean_id:
                    target_ids.append(clean_id)

            # Deduplicate targets per file
            target_ids = list(set(target_ids))

            for target_id in target_ids:
                # Ignore Obsidian internal block identifier references
                if target_id.startswith("#^"):
                    continue

                links.append({"source": node_id, "target": target_id})

                # Register non-existent linked notes as ghost/orphan nodes (group 2)
                if target_id not in nodes_dict:
                    nodes_dict[target_id] = {"id": target_id, "group": 2}
        except Exception:
            pass

    return {"nodes": list(nodes_dict.values()), "links": links}


@app.post("/api/config/vault")
async def config_vault(request: VaultRequest):
    """Dynamically set the active vault directory path."""
    raw_path = (request.vault_path or "").strip()

    # Si viene vacío, dice 'mock', contiene 'mock_vault' o la ruta no existe en el contenedor pero contiene mock
    if not raw_path or "mock" in raw_path.lower():
        target_path = os.getenv("MOCK_VAULT_PATH", "/app/mock_vault")
        if not os.path.exists(target_path):
            # Fallback para desarrollo local fuera de Docker
            target_path = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", "mock_vault"))
    else:
        target_path = raw_path

    new_path = Path(target_path).resolve()

    if not new_path.exists() or not new_path.is_dir():
        raise HTTPException(
            status_code=400,
            detail=f"Directorio no encontrado: {target_path}"
        )

    VaultConfig.set_vault_path(str(new_path))
    return {"status": "success", "vault_path": str(new_path)}


@app.post("/api/notes/folder")
async def create_folder(request: FolderCreateRequest):
    """Create a new directory within the active vault."""
    base_path = VaultConfig.get_base_path()
    try:
        if Path(request.path).is_absolute():
            raise HTTPException(status_code=403, detail="Absolute paths are not allowed.")

        target_path = (base_path / request.path).resolve()
        try:
            target_path.relative_to(base_path)
        except ValueError:
            raise HTTPException(status_code=403, detail="Path traversal forbidden.")

        target_path.mkdir(parents=True, exist_ok=True)
        return {"status": "success"}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.delete("/api/notes")
async def delete_item(path: str):
    """Delete a note file or folder recursively from the vault."""
    base_path = VaultConfig.get_base_path()
    try:
        if Path(path).is_absolute():
            raise HTTPException(status_code=403, detail="Absolute paths are not allowed.")

        target_path = (base_path / path).resolve()
        try:
            target_path.relative_to(base_path)
        except ValueError:
            raise HTTPException(status_code=403, detail="Path traversal forbidden.")

        if not target_path.exists():
            raise HTTPException(status_code=404, detail="File or folder not found.")

        if target_path.is_file():
            target_path.unlink()
        elif target_path.is_dir():
            shutil.rmtree(target_path)

        return {"status": "success"}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/notes/rename")
async def rename_item(request: RenameRequest):
    """Rename or move a file/folder within the vault."""
    base_path = VaultConfig.get_base_path()
    try:
        if Path(request.old_path).is_absolute() or Path(request.new_path).is_absolute():
            raise HTTPException(status_code=403, detail="Absolute paths are not allowed.")

        old_target = (base_path / request.old_path).resolve()
        new_target = (base_path / request.new_path).resolve()

        try:
            old_target.relative_to(base_path)
            new_target.relative_to(base_path)
        except ValueError:
            raise HTTPException(status_code=403, detail="Path traversal forbidden.")

        if not old_target.exists():
            raise HTTPException(status_code=404, detail="Source file or folder not found.")

        if new_target.exists():
            raise HTTPException(status_code=400, detail="Destination path already exists.")

        new_target.parent.mkdir(parents=True, exist_ok=True)
        old_target.rename(new_target)

        return {"status": "success"}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.put("/api/notes/content")
async def update_note_content(request: NoteContentRequest):
    """Write or overwrite the content of a Markdown note."""
    base_path = VaultConfig.get_base_path()
    try:
        if Path(request.path).is_absolute():
            raise HTTPException(status_code=403, detail="Absolute paths are not allowed.")

        target_path = (base_path / request.path).resolve()

        # Obsidian-style fallback if filename is referenced without directory path
        if not target_path.exists():
            file_name = Path(request.path).name
            found_files = list(base_path.rglob(file_name))
            if found_files:
                target_path = found_files[0].resolve()

        try:
            target_path.relative_to(base_path)
        except ValueError:
            raise HTTPException(status_code=403, detail="Path traversal forbidden.")

        target_path.parent.mkdir(parents=True, exist_ok=True)
        target_path.write_text(request.content, encoding="utf-8")
        return {"status": "success"}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/notes")
async def get_notes():
    """Scan the active vault and return indexed files and folders."""
    if not VaultConfig.is_configured():
        return {"notes": []}

    base_path = VaultConfig.get_base_path()
    if not base_path.exists():
        return {"notes": []}

    notes = []
    for item in base_path.rglob("*"):
        # Exclude hidden files and directories (e.g. .git, .obsidian)
        if any(part.startswith(".") for part in item.relative_to(base_path).parts):
            continue

        rel_path = item.relative_to(base_path)
        parent = str(rel_path.parent) if str(rel_path.parent) != "." else ""

        if item.is_dir():
            notes.append({
                "path": str(rel_path),
                "name": item.name,
                "folder": parent,
                "type": "folder"
            })
        elif item.is_file() and item.suffix == ".md":
            notes.append({
                "path": str(rel_path),
                "name": item.name,
                "folder": parent,
                "type": "file"
            })

    notes.sort(key=lambda x: x["path"])
    return {"notes": notes}


@app.get("/api/notes/content")
async def get_note_content(path: str):
    """Retrieve the raw content of a Markdown note."""
    base_path = VaultConfig.get_base_path()
    try:
        if Path(path).is_absolute():
            raise HTTPException(status_code=403, detail="Absolute paths are not allowed.")

        target_path = (base_path / path).resolve()

        if not target_path.exists() or not target_path.is_file():
            file_name = Path(path).name
            found_files = list(base_path.rglob(file_name))
            if found_files:
                target_path = found_files[0].resolve()
            else:
                raise HTTPException(status_code=404, detail="File not found.")

        try:
            target_path.relative_to(base_path)
        except ValueError:
            raise HTTPException(status_code=403, detail="Path traversal forbidden.")

        content = target_path.read_text(encoding="utf-8")
        return {"content": content}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/chat")
async def chat_endpoint(request: ChatRequest):
    """Process user prompt with the LangGraph agent and stream events via SSE."""
    async def event_generator():
        try:
            for event in graph.stream(
                {"messages": [("user", request.message)]},
                config={
                    "configurable": {
                        "model": request.model,
                        "thread_id": request.thread_id
                    },
                    "recursion_limit": 15
                }
            ):
                for node_name, node_state in event.items():
                    latest_message = node_state["messages"][-1]

                    if node_name == "call_model":
                        if latest_message.tool_calls:
                            for tool_call in latest_message.tool_calls:
                                log_msg = f"Iniciando herramienta '{tool_call['name']}'..."
                                yield f"data: {json.dumps({'type': 'log', 'message': log_msg})}\n\n"
                        elif latest_message.content:
                            raw_content = latest_message.content
                            if isinstance(raw_content, list):
                                clean_text = "".join(
                                    [block.get("text", "") for block in raw_content if isinstance(block, dict)]
                                )
                            else:
                                clean_text = str(raw_content)

                            yield f"data: {json.dumps({'type': 'result', 'message': clean_text})}\n\n"
                    elif node_name == "tools":
                        yield f"data: {json.dumps({'type': 'log', 'message': 'Herramienta completada exitosamente.'})}\n\n"
        except Exception as e:
            yield f"data: {json.dumps({'type': 'log', 'message': f'Error en el grafo: {str(e)}'})}\n\n"
            yield f"data: {json.dumps({'type': 'result', 'message': f'❌ Ocurrió un error interno: {str(e)}'})}\n\n"

    return StreamingResponse(event_generator(), media_type="text/event-stream")
