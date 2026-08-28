"""Módulo tools para las herramientas del agente autónomo."""

from .vault_tools import (
    read_note,
    write_note,
    append_to_note,
    list_notes,
    search_notes
)

all_tools = [
    read_note,
    write_note,
    append_to_note,
    list_notes,
    search_notes
]
