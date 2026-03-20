"""FastAPI приложение."""
import sys
import os
import logging
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

# Add parent directory to path for config import
web_interface_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, web_interface_dir)

from config import SERVER_HOST, SERVER_PORT

# Import router from sibling module
import importlib.util
routes_path = os.path.join(web_interface_dir, 'backend', 'routes.py')
spec = importlib.util.spec_from_file_location('routes', routes_path)
routes_module = importlib.util.module_from_spec(spec)
sys.modules['routes'] = routes_module
spec.loader.exec_module(routes_module)
router = routes_module.router

# Настройка логирования
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# Создание приложения
app = FastAPI(
    title="OpenViking Memory API",
    version="1.0.0",
    description="API для веб-интерфейса OpenViking Memory"
)

# Добавление CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Включение роутера
app.include_router(router)


@app.get("/")
async def root():
    """Корневой эндпоинт."""
    logger.debug("Root endpoint accessed")
    return {
        "message": "OpenViking Memory API",
        "version": "1.0.0",
        "docs": f"http://{SERVER_HOST}:{SERVER_PORT}/docs",
        "health": f"http://{SERVER_HOST}:{SERVER_PORT}/api/health"
    }


@app.get("/info")
async def info():
    """Информация о сервере."""
    logger.debug("Info endpoint accessed")
    return {
        "host": SERVER_HOST,
        "port": SERVER_PORT,
        "title": app.title,
        "version": app.version
    }


if __name__ == "__main__":
    import uvicorn
    logger.info(f"Starting server on {SERVER_HOST}:{SERVER_PORT}")
    uvicorn.run(
        "backend.app:app",
        host=SERVER_HOST,
        port=SERVER_PORT,
        reload=True,
        log_level="info"
    )
