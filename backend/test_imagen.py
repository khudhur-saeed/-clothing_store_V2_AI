"""
Quick test script for imagen-3.0-fast-generate-001 image generation.

Usage:
    cd backend
    source venv/bin/activate
    python test_imagen.py

Output:
    Saves the generated image as test_output.png in the same directory.
"""

import base64
import os
import sys

# ── Load API key from .env (same folder as this script) ──────────────────────
def load_env(path: str):
    if not os.path.exists(path):
        return
    with open(path) as f:
        for line in f:
            line = line.strip()
            if not line or line.startswith("#") or "=" not in line:
                continue
            key, _, value = line.partition("=")
            os.environ.setdefault(key.strip(), value.strip())


env_path = os.path.join(os.path.dirname(__file__), ".env")
load_env(env_path)

API_KEY = os.environ.get("VITE_GEMINI_API_KEY", "")
if not API_KEY:
    print("❌  VITE_GEMINI_API_KEY is not set. Check backend/.env")
    sys.exit(1)

print(f"✅  API key loaded: {API_KEY[:8]}…")

# ── Try generating with google-genai SDK (supports generate_images) ──────────
try:
    from google import genai
    from google.genai import types

    client = genai.Client(api_key=API_KEY)

    MODEL = "imagen-4.0-fast-generate-001"
    PROMPT = "A photorealistic product photo of a modern blue denim jacket on a white background, studio lighting, fashion e-commerce style"

    print(f"\n🎨  Generating image with model: {MODEL}")
    print(f"   Prompt: {PROMPT[:80]}…\n")

    response = client.models.generate_images(
        model=MODEL,
        prompt=PROMPT,
        config=types.GenerateImagesConfig(
            number_of_images=1,
            output_mime_type="image/jpeg",
        ),
    )

    # ── Save the first generated image ───────────────────────────────────────
    if not response.generated_images:
        print("❌  No images were returned by the API.")
        sys.exit(1)

    out_path = os.path.join(os.path.dirname(__file__), "test_output.jpg")
    image_bytes = response.generated_images[0].image.image_bytes
    with open(out_path, "wb") as f:
        f.write(image_bytes)

    print(f"✅  Image saved to: {out_path}")
    print(f"   Size: {len(image_bytes):,} bytes ({len(image_bytes)//1024} KB)")

except Exception as exc:
    print(f"❌  Image generation failed:\n    {type(exc).__name__}: {exc}")
    sys.exit(1)
