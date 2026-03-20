"""Сервис для работы с OpenViking Memory."""
import logging
from typing import Optional, List, Dict, Any
from functools import lru_cache
from collections import OrderedDict

from config import OPENVIKING_WORKSPACE, CACHE_MAX_SIZE

# Настройка логирования
logger = logging.getLogger(__name__)
logger.setLevel(logging.DEBUG)


class LRUCache:
    """Простая реализация LRU кэша."""
    
    def __init__(self, max_size: int = 100):
        self.max_size = max_size
        self._cache = OrderedDict()
    
    def get(self, key: str) -> Optional[Any]:
        """Получить значение из кэша."""
        if key not in self._cache:
            return None
        # Перемещаем в конец (самый недавний)
        self._cache.move_to_end(key)
        return self._cache[key]
    
    def set(self, key: str, value: Any) -> None:
        """Установить значение в кэш."""
        if key in self._cache:
            self._cache.move_to_end(key)
        self._cache[key] = value
        # Удаляем старые элементы если превышен лимит
        while len(self._cache) > self.max_size:
            self._cache.popitem(last=False)
    
    def clear(self) -> None:
        """Очистить кэш."""
        self._cache.clear()


class OpenVikingService:
    """Сервис для работы с OpenViking Memory."""
    
    def __init__(self):
        """Инициализация сервиса."""
        try:
            from openviking import OpenViking
            self.client = OpenViking()
            self._cache = LRUCache(max_size=CACHE_MAX_SIZE)
            logger.info("OpenVikingService initialized successfully")
        except ImportError as e:
            logger.error(f"Failed to import OpenViking: {e}")
            raise
        except Exception as e:
            logger.error(f"Failed to initialize OpenVikingService: {e}")
            raise
    
    def health_check(self) -> Dict[str, str]:
        """Проверка соединения с OpenViking."""
        try:
            # Пробуем простой запрос для проверки соединения
            self.client.search(query="test", limit=1)
            return {"status": "connected", "message": "OpenViking is available"}
        except Exception as e:
            error_msg = f"OpenViking connection failed: {str(e)}"
            logger.error(error_msg)
            return {"status": "disconnected", "message": error_msg}
    
    async def search(self, query: str = "", date_from: Optional[str] = None,
                     date_to: Optional[str] = None, category: Optional[str] = None,
                     pattern: Optional[str] = None, limit: int = 10) -> List[Dict[str, Any]]:
        """Поиск ресурсов в OpenViking."""
        cache_key = f"search:{query}:{date_from}:{date_to}:{category}:{pattern}:{limit}"
        
        # Проверка кэша
        cached_result = self._cache.get(cache_key)
        if cached_result:
            logger.debug(f"Cache hit for search: {query}")
            return cached_result
        
        try:
            logger.info(f"Searching for: {query}, filters: date_from={date_from}, date_to={date_to}, category={category}, pattern={pattern}, limit={limit}")
            
            # Формируем параметры поиска
            search_params = {
                "query": query,
                "limit": limit
            }
            
            if date_from:
                search_params["date_from"] = date_from
            if date_to:
                search_params["date_to"] = date_to
            if category:
                search_params["category"] = category
            if pattern:
                search_params["pattern"] = pattern
            
            # Выполняем поиск
            results = self.client.search(**search_params)
            
            # Форматируем результаты
            formatted_results = []
            for item in results:
                # item — это MatchedContext (dataclass)
                uri = item.uri if hasattr(item, 'uri') else str(item)
                resource = {
                    "uri": uri,
                    "name": uri.split("/")[-1] if uri else "",
                    "date": "",
                    "category": item.category if hasattr(item, 'category') else "",
                    "abstract": item.abstract if hasattr(item, 'abstract') else "",
                    "score": item.score if hasattr(item, 'score') else 0.0
                }
                formatted_results.append(resource)
            
            logger.info(f"Search returned {len(formatted_results)} results")
            
            # Сохраняем в кэш
            self._cache.set(cache_key, formatted_results)
            
            return formatted_results
            
        except Exception as e:
            error_msg = f"Search failed: query={query}, error={str(e)}"
            logger.error(error_msg, exc_info=True)
            raise
    
    async def get_resource(self, uri: str, level: str = "L0") -> Dict[str, Any]:
        """Получение ресурса из OpenViking."""
        cache_key = f"resource:{uri}:{level}"
        
        # Проверка кэша
        cached_result = self._cache.get(cache_key)
        if cached_result:
            logger.debug(f"Cache hit for resource: {uri} (level={level})")
            return cached_result
        
        try:
            logger.info(f"Getting resource: {uri}, level={level}")
            
            # Чтение ресурса
            content = self.client.read(uri=uri, level=level)
            
            # Извлекаем имя из URI
            name = uri.split("/")[-1] if "/" in uri else uri
            
            resource = {
                "uri": uri,
                "name": name,
                "level": level,
                "content": content,
                "metadata": {
                    "size": len(content.encode("utf-8")) if content else 0
                }
            }
            
            logger.info(f"Resource loaded: {uri}, size={resource['metadata']['size']}")
            
            # Сохраняем в кэш
            self._cache.set(cache_key, resource)
            
            return resource
            
        except Exception as e:
            error_msg = f"Get resource failed: uri={uri}, level={level}, error={str(e)}"
            logger.error(error_msg, exc_info=True)
            raise
    
    async def get_tree(self, path: str = "viking://resources/") -> Dict[str, Any]:
        """Получение дерева ресурсов."""
        cache_key = f"tree:{path}"
        
        # Проверка кэша
        cached_result = self._cache.get(cache_key)
        if cached_result:
            logger.debug(f"Cache hit for tree: {path}")
            return cached_result
        
        try:
            logger.info(f"Getting tree for path: {path}")
            
            # Получаем список ресурсов
            resources = self.client.ls(uri=path)
            
            # Формируем дерево
            children = []
            for resource in resources:
                # resource может быть словарём или объектом
                if isinstance(resource, dict):
                    node = {
                        "name": resource.get("name", ""),
                        "type": resource.get("type", "file"),
                        "path": resource.get("path", path)
                    }
                    if resource.get("size"):
                        node["size"] = resource["size"]
                    if resource.get("date"):
                        node["date"] = resource["date"]
                    if resource.get("children"):
                        node["children"] = resource["children"]
                else:
                    # Если это строка или другой тип
                    node = {
                        "name": str(resource),
                        "type": "file",
                        "path": path + "/" + str(resource)
                    }
                children.append(node)
                
                children.append(node)
            
            tree_response = {
                "path": path,
                "children": children
            }
            
            logger.info(f"Tree loaded for {path}: {len(children)} children")
            
            # Сохраняем в кэш
            self._cache.set(cache_key, tree_response)
            
            return tree_response
            
        except Exception as e:
            error_msg = f"Get tree failed: path={path}, error={str(e)}"
            logger.error(error_msg, exc_info=True)
            raise
    
    def clear_cache(self) -> None:
        """Очистка кэша."""
        self._cache.clear()
        logger.info("Cache cleared")
