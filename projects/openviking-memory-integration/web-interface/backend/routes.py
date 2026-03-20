"""API маршруты."""
import sys
import os
import logging
from datetime import datetime
from typing import Optional

from fastapi import APIRouter, Query, HTTPException

# Add parent directory to path for config import
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from config import DEFAULT_TOP_K, MAX_TOP_K, MIN_TOP_K, TODAY

# Add backend directory to path for services/models imports
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from services.openviking_service import OpenVikingService
from models.response import SearchResponse, ResourceResponse, TreeResponse, HealthResponse

# Настройка логирования
logger = logging.getLogger(__name__)
logger.setLevel(logging.DEBUG)

# Инициализация роутера
router = APIRouter(prefix="/api")

# Инициализация сервиса
ov_service = OpenVikingService()


@router.get("/health", response_model=HealthResponse)
async def health_check():
    """Проверка здоровья сервиса."""
    try:
        logger.debug("Health check requested")
        
        # Проверка подключения к OpenViking
        ov_status = ov_service.health_check()
        
        status = "healthy" if ov_status["status"] == "connected" else "unhealthy"
        
        response = HealthResponse(
            status=status,
            timestamp=datetime.utcnow().isoformat() + "Z",
            openviking=ov_status["status"]
        )
        
        logger.info(f"Health check: {status}")
        return response
        
    except Exception as e:
        error_msg = f"Health check failed: {str(e)}"
        logger.error(error_msg, exc_info=True)
        return HealthResponse(
            status="unhealthy",
            timestamp=datetime.utcnow().isoformat() + "Z",
            openviking="error"
        )


@router.get("/search", response_model=SearchResponse)
async def search(
    query: str = Query(default="", description="Ключевые слова для поиска"),
    date_from: Optional[str] = Query(default=None, description="Дата от (YYYY-MM-DD)"),
    date_to: Optional[str] = Query(default=None, description="Дата до (YYYY-MM-DD)"),
    category: Optional[str] = Query(default=None, description="Категория"),
    pattern: Optional[str] = Query(default=None, description="Regex для имени ресурса"),
    limit: int = Query(default=DEFAULT_TOP_K, ge=MIN_TOP_K, le=MAX_TOP_K, description="Количество результатов")
):
    """Поиск ресурсов в OpenViking."""
    try:
        logger.info(f"Search request: query='{query}', date_from='{date_from}', date_to='{date_to}', "
                   f"category='{category}', pattern='{pattern}', limit={limit}")
        
        # Выполнение поиска
        resources = await ov_service.search(
            query=query,
            date_from=date_from,
            date_to=date_to,
            category=category,
            pattern=pattern,
            limit=limit
        )
        
        response = SearchResponse(
            success=True,
            total=len(resources),
            resources=resources
        )
        
        logger.info(f"Search completed: {len(resources)} results")
        return response
        
    except ValueError as e:
        error_msg = f"Invalid search parameters: {str(e)}"
        logger.error(error_msg)
        raise HTTPException(status_code=400, detail=error_msg)
    except Exception as e:
        error_msg = f"Search failed: {str(e)}"
        logger.error(error_msg, exc_info=True)
        raise HTTPException(status_code=500, detail=error_msg)


@router.get("/resource/{uri:path}", response_model=ResourceResponse)
async def get_resource(
    uri: str,
    level: str = Query(default="L0", description="Уровень детализации: L0, L1, L2")
):
    """Получение ресурса из OpenViking."""
    try:
        logger.info(f"Get resource request: uri='{uri}', level='{level}'")
        
        # Валидация уровня
        valid_levels = ["L0", "L1", "L2"]
        if level not in valid_levels:
            error_msg = f"Invalid level: {level}. Must be one of {valid_levels}"
            logger.error(error_msg)
            raise HTTPException(status_code=400, detail=error_msg)
        
        # Получение ресурса
        resource = await ov_service.get_resource(uri=uri, level=level)
        
        response = ResourceResponse(
            success=True,
            uri=resource["uri"],
            name=resource["name"],
            level=resource["level"],
            content=resource["content"],
            metadata=resource.get("metadata", {})
        )
        
        logger.info(f"Resource retrieved: {uri}, level={level}")
        return response
        
    except HTTPException:
        raise
    except Exception as e:
        error_msg = f"Get resource failed: uri={uri}, level={level}, error={str(e)}"
        logger.error(error_msg, exc_info=True)
        raise HTTPException(status_code=500, detail=error_msg)


@router.get("/tree", response_model=TreeResponse)
async def get_tree(
    path: str = Query(default="viking://resources/", description="Путь к папке")
):
    """Получение дерева ресурсов."""
    try:
        logger.info(f"Get tree request: path='{path}'")
        
        # Получение дерева
        tree_data = await ov_service.get_tree(path=path)
        
        response = TreeResponse(
            success=True,
            path=tree_data["path"],
            children=tree_data["children"]
        )
        
        logger.info(f"Tree retrieved: {path}, {len(tree_data['children'])} children")
        return response
        
    except ValueError as e:
        error_msg = f"Invalid tree path: {str(e)}"
        logger.error(error_msg)
        raise HTTPException(status_code=400, detail=error_msg)
    except Exception as e:
        error_msg = f"Get tree failed: path={path}, error={str(e)}"
        logger.error(error_msg, exc_info=True)
        raise HTTPException(status_code=500, detail=error_msg)
