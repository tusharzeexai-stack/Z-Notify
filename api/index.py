import sys
import os

# Add backend directory to Python path so all backend imports resolve correctly
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', 'backend'))

# Import the FastAPI app — Vercel uses this 'app' variable as the ASGI handler
from main import app  # noqa: F401
