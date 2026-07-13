import sys
import os

# Add backend directory to Python path so all backend imports resolve correctly
_backend_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', 'backend'))
sys.path.insert(0, _backend_dir)

# Import the FastAPI app — Vercel uses this 'app' variable as the ASGI handler
from main import app  # noqa: F401
