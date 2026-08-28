"""Configuration module for managing dynamic Obsidian vault path settings."""

import os
from pathlib import Path
from dotenv import load_dotenv

load_dotenv()


class VaultConfig:
    """Singleton-style manager for the active Obsidian vault directory."""

    vault_path: str = os.getenv("VAULT_PATH", "/home/juanr/Documentos/Obsidean")

    @classmethod
    def get_base_path(cls) -> Path:
        """Resolve and return the absolute Path to the active vault."""
        if not cls.vault_path:
            return Path("")
        return Path(cls.vault_path).resolve()

    @classmethod
    def set_vault_path(cls, new_path: str) -> None:
        """Update the active vault path at runtime."""
        cls.vault_path = new_path

    @classmethod
    def is_configured(cls) -> bool:
        """Check if the active vault path is configured and exists on the filesystem."""
        if not cls.vault_path:
            return False
        path = Path(cls.vault_path).resolve()
        return path.exists() and path.is_dir()
