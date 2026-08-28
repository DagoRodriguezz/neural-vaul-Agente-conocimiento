"""Unit and integration test script for Obsidian vault tools."""

from tools.vault_tools import (
    append_to_note,
    list_notes,
    read_note,
    search_notes,
    write_note,
)


def run_tests() -> None:
    """Execute end-to-end sanity tests on vault file tools and security bounds."""
    print("Testing write_note...")
    res_write = write_note.invoke({
        "relative_path": "journal/test.md",
        "content": "# Test Note\n\nInitial content."
    })
    print(res_write)

    print("\nTesting append_to_note...")
    res_append = append_to_note.invoke({
        "relative_path": "journal/test.md",
        "content": "Appended content."
    })
    print(res_append)

    print("\nTesting read_note...")
    res_read = read_note.invoke({"relative_path": "journal/test.md"})
    print(res_read)

    print("\nTesting list_notes...")
    res_list = list_notes.invoke({"folder": ""})
    print(f"Vault notes: {res_list}")

    print("\nTesting search_notes...")
    res_search = search_notes.invoke({"query": "Initial"})
    print(f"Search results: {res_search}")

    print("\nTesting Path Traversal security checks...")
    res_sec_1 = write_note.invoke({
        "relative_path": "../../../etc/passwd",
        "content": "test"
    })
    print(f"Path traversal write attempt: {res_sec_1}")

    res_sec_2 = read_note.invoke({"relative_path": "/etc/passwd"})
    print(f"Absolute path read attempt: {res_sec_2}")


if __name__ == "__main__":
    run_tests()
