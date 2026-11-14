"""Create backend/.env from backend/.env.example with a fresh random SECRET_KEY (never overwrites an existing .env)."""
import re
import secrets
import sys
from pathlib import Path

backend = Path(__file__).resolve().parents[1] / "backend"
env, example = backend / ".env", backend / ".env.example"

if env.exists():
    print("backend/.env already exists - leaving it unchanged.")
    sys.exit(0)
if not example.exists():
    print("ERROR: backend/.env.example is missing.")
    sys.exit(1)

text = example.read_text(encoding="utf-8")
text = re.sub(r"(?m)^SECRET_KEY=.*$", "SECRET_KEY=" + secrets.token_urlsafe(48), text)
env.write_text(text, encoding="utf-8")
print("Created backend/.env with a new random secret key.")
