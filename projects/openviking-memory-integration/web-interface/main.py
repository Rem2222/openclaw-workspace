"""
main.py — Точка входа для веб-интерфейса OpenViking Memory.

Запускает Gradio интерфейс на порту 7860.
Бэкенд (FastAPI) должен быть запущен отдельно или интегрирован.
"""
import sys
import os
import logging

# Добавляем путь к проекту
PROJECT_DIR = os.path.dirname(os.path.abspath(__file__))
WORKSPACE_DIR = "/home/rem/.openclaw/workspace"

sys.path.insert(0, PROJECT_DIR)
sys.path.insert(0, WORKSPACE_DIR)

# Настройка логирования
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)


def main():
    """Запускает Gradio интерфейс."""
    try:
        logger.info("="*60)
        logger.info("OpenViking Memory — Веб-интерфейс (Iteration 7)")
        logger.info("="*60)
        logger.info(f"Project directory: {PROJECT_DIR}")
        logger.info(f"Workspace directory: {WORKSPACE_DIR}")
        
        # Импортируем Gradio приложение
        from frontend.main import create_gradio_app
        
        logger.info("Creating Gradio app...")
        demo = create_gradio_app()
        
        logger.info("Launching server on http://localhost:7860")
        logger.info("API docs available at: http://localhost:7860/docs")
        logger.info("="*60)
        
        # Запуск сервера
        demo.launch(
            server_name="127.0.0.1",
            server_port=7860,
            share=False,
            show_error=True,
            inbrowser=False  # Не открывать браузер автоматически
        )
        
    except ImportError as e:
        logger.error(f"Import error: {e}")
        logger.error("Make sure all dependencies are installed:")
        logger.error("  pip install -r requirements-web.txt")
        raise
    except Exception as e:
        logger.error(f"Failed to start server: {e}")
        raise


if __name__ == "__main__":
    main()
