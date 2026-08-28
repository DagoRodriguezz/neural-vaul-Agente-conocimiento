"""Diagnostic script to verify connectivity with the Google Gemini API."""

import os
import sys
from dotenv import load_dotenv
from langchain_google_genai import ChatGoogleGenerativeAI


def main() -> None:
    """Send a basic ping prompt to validate Gemini API credentials."""
    load_dotenv()

    api_key = os.getenv("GEMINI_API_KEY")
    if not api_key or api_key.strip() in ("", "tu_api_key_aqui"):
        print("=" * 60)
        print("[ERROR] GEMINI_API_KEY is not configured in .env")
        print("=" * 60)
        sys.exit(1)

    print("Testing connectivity to Google Gemini...")

    try:
        llm = ChatGoogleGenerativeAI(
            model="gemini-2.5-flash",
            google_api_key=api_key,
            temperature=0.7,
        )

        prompt = "Ping test: confirm connection with a brief response."
        response = llm.invoke(prompt)

        print("Response received:")
        print(response.content)
        print("Gemini API connection successfully validated.")

    except Exception as e:
        print(f"\n[ERROR] Connection failed:\n{e}")
        sys.exit(1)


if __name__ == "__main__":
    main()
