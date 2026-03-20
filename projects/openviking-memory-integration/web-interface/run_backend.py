#!/usr/bin/env python3
"""Backend server entry point."""
import sys
import os

# Set up paths
PROJECT_DIR = os.path.dirname(os.path.abspath(__file__))
BACKEND_DIR = os.path.join(PROJECT_DIR, 'backend')

sys.path.insert(0, PROJECT_DIR)
sys.path.insert(0, BACKEND_DIR)

# Now we can import properly
from app import app

if __name__ == "__main__":
    import uvicorn
    from config import SERVER_HOST, SERVER_PORT
    
    print(f"Starting OpenViking Memory Backend on {SERVER_HOST}:{SERVER_PORT}")
    uvicorn.run(
        "backend.app:app",
        host=SERVER_HOST,
        port=SERVER_PORT,
        log_level="info"
    )
