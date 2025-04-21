import uvicorn
import sys
from pathlib import Path

# --- Calculate project root and backend directory ---
PROJECT_ROOT = Path(__file__).resolve().parent
BACKEND_DIR = PROJECT_ROOT / "backend"

# --- Add backend directory to Python's sys.path ---
if str(BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(BACKEND_DIR))
    print(f"INFO: Added '{BACKEND_DIR}' to sys.path")
# ---------------------------------------------------

# --- Configuration ---
HOST = "127.0.0.1"
PORT = 8000
LOG_LEVEL = "info"
RELOAD = True

# --- App Location ---
APP_LOCATION = "app.main:app"

# --- Reload Directories ---
RELOAD_DIRS = [str(BACKEND_DIR)]

if __name__ == "__main__":
    print(f"--- Starting FastAPI Development Server ---")
    print(f"Project Root: {PROJECT_ROOT}")
    print(f"Watching for changes in: {BACKEND_DIR}")
    print(f"App location (relative to backend dir): {APP_LOCATION}")
    print(f"URL: http://{HOST}:{PORT}")
    print(f"Auto-Reload: {'Enabled' if RELOAD else 'Disabled'}")
    print(f"Log Level: {LOG_LEVEL}")
    print(f"Current Working Directory: {Path.cwd()}")
    print("-" * 40)

    # Run the Uvicorn server programmatically
    uvicorn.run(
        APP_LOCATION,
        host=HOST,
        port=PORT,
        log_level=LOG_LEVEL,
        reload=RELOAD,
        reload_dirs=RELOAD_DIRS,
        # workers=1
    )