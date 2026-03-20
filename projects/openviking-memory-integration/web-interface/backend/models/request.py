"""Pydantic модели для запросов."""
from pydantic import BaseModel, Field
from typing import Optional


class SearchRequest(BaseModel):
    """Модель запроса для поиска."""
    query: str = Field(default="", description="Ключевые слова для поиска")
    date_from: Optional[str] = Field(default=None, description="Дата от (YYYY-MM-DD)")
    date_to: Optional[str] = Field(default=None, description="Дата до (YYYY-MM-DD)")
    category: Optional[str] = Field(default=None, description="Категория")
    pattern: Optional[str] = Field(default=None, description="Regex для имени ресурса")
    top_k: int = Field(default=10, ge=1, le=100, description="Количество результатов (1-100)")


class GetResourceRequest(BaseModel):
    """Модель запроса для получения ресурса."""
    uri: str = Field(..., description="URI ресурса")
    level: str = Field(default="L0", description="Уровень детализации: L0, L1, L2")
