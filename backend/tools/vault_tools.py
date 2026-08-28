"""LangChain tools for performing secure file operations on the Obsidian vault."""

from pathlib import Path
from typing import List
from langchain_core.tools import tool

from core.config import VaultConfig


def _get_safe_path(relative_path: str) -> Path:
    """Resolve and validate that the target path does not escape the vault root.

    Args:
        relative_path: Relative file path within the vault.

    Returns:
        Path: Resolved filesystem path.

    Raises:
        ValueError: If an absolute path is provided or if path traversal is detected.
    """
    base_path = VaultConfig.get_base_path()

    if Path(relative_path).is_absolute():
        raise ValueError(
            f"Security error: Absolute paths are not permitted ('{relative_path}'). "
            "Use paths relative to the vault."
        )

    target_path = (base_path / relative_path).resolve()

    # Guard against Path Traversal vulnerabilities
    try:
        target_path.relative_to(base_path)
    except ValueError:
        raise ValueError(
            f"Security error: Path Traversal detected. Target '{relative_path}' "
            "is outside the vault boundaries."
        )

    return target_path


@tool
def read_note(relative_path: str) -> str:
    """Read and return the text content of a Markdown note in the vault.

    Args:
        relative_path: Relative path to the file (e.g. 'folder/note.md').
    """
    try:
        path = _get_safe_path(relative_path)
        if not path.exists():
            return f"Error: Note '{relative_path}' does not exist."
        if not path.is_file():
            return f"Error: '{relative_path}' is not a valid file."
        return path.read_text(encoding="utf-8")
    except Exception as e:
        return str(e)


@tool
def write_note(relative_path: str, content: str) -> str:
    """Create or overwrite a Markdown note. Parent directories are created automatically.

    Args:
        relative_path: Relative path to the file (e.g. 'new_folder/note.md').
        content: Text content to write.
    """
    try:
        path = _get_safe_path(relative_path)
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_text(content, encoding="utf-8")
        return f"Success: Note saved at '{relative_path}'."
    except Exception as e:
        return str(e)


@tool
def append_to_note(relative_path: str, content: str) -> str:
    """Append text content to the end of an existing Markdown note.

    Args:
        relative_path: Relative path to the file to modify.
        content: Text to append.
    """
    try:
        path = _get_safe_path(relative_path)
        if not path.exists():
            return f"Error: Note '{relative_path}' does not exist. Use write_note to create it."

        with path.open("a", encoding="utf-8") as f:
            f.write("\n" + content)

        return f"Success: Content appended to '{relative_path}'."
    except Exception as e:
        return str(e)


@tool
def list_notes(folder: str = "") -> List[str]:
    """List relative paths of all Markdown notes (.md) recursively.

    Args:
        folder: Optional subdirectory to limit search scope. Defaults to entire vault.
    """
    base_path = VaultConfig.get_base_path()
    try:
        if folder:
            search_base = _get_safe_path(folder)
        else:
            search_base = base_path

        if not search_base.exists() or not search_base.is_dir():
            return [f"Error: Folder '{folder}' does not exist or is not a valid directory."]

        notes = []
        for file in search_base.rglob("*.md"):
            rel_path = file.relative_to(base_path)
            notes.append(str(rel_path))

        return sorted(notes)
    except Exception as e:
        return [str(e)]


@tool
def search_notes(query: str) -> List[str]:
    """Search for keyword occurrences across note contents and return matching paths.

    Args:
        query: Search string to match in note bodies.
    """
    base_path = VaultConfig.get_base_path()
    try:
        if not base_path.exists():
            return ["Error: Vault does not exist."]

        matches = []
        for file in base_path.rglob("*.md"):
            try:
                content = file.read_text(encoding="utf-8", errors="ignore")
                if query.lower() in content.lower():
                    matches.append(str(file.relative_to(base_path)))
            except Exception:
                continue

        return sorted(matches)
    except Exception as e:
        return [str(e)]
