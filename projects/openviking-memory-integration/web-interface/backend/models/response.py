"""Pydantic модели для ответов."""
from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Any


class Resource(BaseModel):
    """Модель ресурса в результатах поиска."""
    uri: str = Field(..., description="URI ресурса")
    name: str = Field(..., description="Имя ресурса")
    date: str = Field(..., description="Дата создания")
    category: Optional[str] = Field(default=None, description="Категория")
    abstract: str = Field(..., description="Краткое резюме")
    score: float = Field(..., description="Релевантность (0-1)")


class SearchResponse(BaseModel):
    """Модель ответа для поиска."""
    success: bool = Field(..., description="Успешность выполнения")
    total: int = Field(..., description="Общее количество результатов")
    resources: List[Resource] = Field(..., description="Список ресурсов")


class ResourceResponse(BaseModel):
    """Модель ответа для получения ресурса."""
    success: bool = Field(..., description="Успешность выполнения")
    uri: str = Field(..., description="URI ресурса")
    name: str = Field(..., description="Имя ресурса")
    level: str = Field(..., description="Уровень детализации")
    content: str = Field(..., description="Контент ресурса")
    metadata: Dict[str, Any] = Field(default_factory=dict, description="Метаданные")


class TreeNode(BaseModel):
    """Модель узла дерева ресурсов."""
    name: str = Field(..., description="Имя узла")
    type: str = Field(..., description="Тип: 'file' или 'directory'")
    path: str = Field(..., description="Полный путь")
    size: Optional[int] = Field(default=None, description="Размер файла в байтах")
    date: Optional[str] = Field(default=None, description="Дата модификации")
    children: Optional[List['TreeNode']] = Field(default=None, description="Дочерние узлы")


class TreeResponse(BaseModel):
    """Модель ответа для дерева ресурсов."""
    success: bool = Field(..., description="Успешность выполнения")
    path: str = Field(..., description="Путь к текущей папке")
    children: List[TreeNode] = Field(..., description="Список детей")


class HealthResponse(BaseModel):
    """Модель ответа health check."""
    status: str = Field(..., description="Статус: 'healthy' или 'unhealthy'")
    timestamp: str = Field(..., description="Время ответа (ISO 8601)")
    openviking: str = Field(..., description="Статус подключения к OpenViking")
