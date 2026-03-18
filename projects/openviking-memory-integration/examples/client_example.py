# Пример использования OpenViking API для интеграции в OpenClaw

## Базовый клиент

```python
"""OpenViking Memory Client for OpenClaw"""

import openviking as ov
from typing import Optional, List, Dict, Any

class OpenVikingMemoryClient:
    """Клиент для работы с OpenViking как долгосрочной памятью."""
    
    def __init__(self, workspace_path: str = "~/.openviking/workspace"):
        """Инициализация клиента."""
        self.client = ov.OpenViking(path=workspace_path)
        self.client.initialize()
    
    def store(self, text: str, metadata: Dict[str, Any] = None) -> str:
        """
        Сохранить текст в OpenViking.
        
        Args:
            text: Текст для сохранения
            metadata: Метаданные (date, session_id, topic, etc.)
            
        Returns:
            URI сохранённого ресурса
        """
        if metadata is None:
            metadata = {}
        
        # Создаем описание ресурса
        description = f"{metadata.get('topic', 'Memory')} - {metadata.get('date', 'N/A')}"
        
        # Добавляем как ресурс (используем data URI для текста)
        result = self.client.add_resource(
            path=f"data:text/markdown,{text}",
            reason=description
        )
        
        return result.get('root_uri', '')
    
    def search(self, query: str, top_k: int = 5) -> List[Dict[str, Any]]:
        """
        Семантический поиск по памяти.
        
        Args:
            query: Запрос для поиска
            top_k: Количество результатов
            
        Returns:
            Список результатов с URI и score
        """
        results = self.client.find(query, limit=top_k)
        
        return [
            {
                'uri': r.uri,
                'score': r.score,
                'abstract': self.client.abstract(r.uri)
            }
            for r in results.resources[:top_k]
        ]
    
    def get(self, uri: str, level: str = "overview") -> str:
        """
        Получить контент по URI.
        
        Args:
            uri: URI ресурса
            level: Уровень чтения ("abstract", "overview", "read")
            
        Returns:
            Контент ресурса
        """
        if level == "abstract":
            return self.client.abstract(uri)
        elif level == "overview":
            return self.client.overview(uri)
        else:
            return self.client.read(uri)
    
    def list_resources(self, pattern: str = "*") -> List[Dict[str, Any]]:
        """
        Список ресурсов по паттерну.
        
        Args:
            pattern: Паттерн для поиска (glob)
            
        Returns:
            Список ресурсов
        """
        result = self.client.glob(pattern=pattern)
        return result.get('matches', [])
    
    def close(self):
        """Закрытие клиента."""
        self.client.close()


# Пример использования
if __name__ == "__main__":
    # Инициализация
    memory = OpenVikingMemoryClient()
    
    try:
        # Сохранение
        uri = memory.store(
            text="# Запоминание\n\nМеня зовут Роман. Я программист 1С.",
            metadata={"topic": "Личность", "date": "2026-03-17"}
        )
        print(f"Сохранено: {uri}")
        
        # Поиск
        results = memory.search("как меня зовут")
        print(f"Найдено {len(results)} результатов:")
        for r in results:
            print(f"  - {r['uri']} (score: {r['score']:.4f})")
            print(f"    Abstract: {r['abstract'][:100]}...")
        
        # Чтение
        if results:
            content = memory.get(results[0]['uri'], level="overview")
            print(f"\nOverview:\n{content[:500]}...")
    
    finally:
        memory.close()
```

## Асинхронный клиент (для VikingBot)

```python
"""Асинхронный клиент OpenViking для интеграции с VikingBot."""

import openviking as ov
from typing import Optional, List, Dict, Any


class AsyncOpenVikingMemoryClient:
    """Асинхронный клиент для работы с OpenViking."""
    
    def __init__(self, workspace_path: str = "~/.openviking/workspace"):
        """Инициализация."""
        self._async_client = ov.AsyncOpenViking(path=workspace_path)
        self._initialized = False
    
    async def initialize(self):
        """Инициализация клиента."""
        if not self._initialized:
            await self._async_client.initialize()
            self._initialized = True
    
    async def store(self, text: str, metadata: Dict[str, Any] = None) -> str:
        """Сохранить текст."""
        await self.initialize()
        
        description = f"{metadata.get('topic', 'Memory')}"
        result = await self._async_client.add_resource(
            path=f"data:text/markdown,{text}",
            reason=description
        )
        
        return result.get('root_uri', '')
    
    async def search(self, query: str, top_k: int = 5) -> List[Dict[str, Any]]:
        """Семантический поиск."""
        await self.initialize()
        
        results = await self._async_client.find(query, limit=top_k)
        
        return [
            {
                'uri': r.uri,
                'score': r.score,
                'abstract': await self._async_client.abstract(r.uri)
            }
            for r in results.resources[:top_k]
        ]
    
    async def get(self, uri: str, level: str = "overview") -> str:
        """Получить контент."""
        await self.initialize()
        
        if level == "abstract":
            return await self._async_client.abstract(uri)
        elif level == "overview":
            return await self._async_client.overview(uri)
        else:
            return await self._async_client.read(uri)
    
    async def close(self):
        """Закрытие."""
        await self._async_client.close()


# Пример асинхронного использования
import asyncio

async def main():
    memory = AsyncOpenVikingMemoryClient()
    
    try:
        # Сохранение
        uri = await memory.store(
            text="# Запоминание\n\nМеня зовут Роман.",
            metadata={"topic": "Личность"}
        )
        print(f"Сохранено: {uri}")
        
        # Поиск
        results = await memory.search("как меня зовут")
        print(f"Найдено {len(results)} результатов")
    
    finally:
        await memory.close()

asyncio.run(main())
```

## Интеграция с OpenClaw tools

```python
"""Интеграция OpenViking в инструменты OpenClaw."""

import json
import sys
sys.path.insert(0, '/home/rem/.openclaw/skills/openviking-memory/lib')

from openviking_client import OpenVikingMemoryClient

# Глобальный клиент (singleton)
_memory_client = None

def get_memory_client():
    """Получить или создать глобальный клиент."""
    global _memory_client
    if _memory_client is None:
        _memory_client = OpenVikingMemoryClient()
    return _memory_client


def memory_search_tool(query: str, top_k: int = 5, engine: str = "openviking"):
    """
    Инструмент для семантического поиска в памяти.
    
    Используется как replacement/enhancement для memory_search.
    """
    if engine == "openviking":
        client = get_memory_client()
        results = client.search(query, top_k=top_k)
        
        output = f"Найдено {len(results)} результатов:\n\n"
        for i, r in enumerate(results, 1):
            output += f"{i}. {r['uri']} (score: {r['score']:.4f})\n"
            output += f"   {r['abstract'][:200]}...\n\n"
        
        return output
    else:
        # Fallback на файловый поиск
        return "File-based search not implemented yet"


def memory_get_tool(uri: str, level: str = "overview"):
    """
    Инструмент для чтения из памяти.
    
    Поддерживает URI в формате:
    - viking://resources/... (OpenViking)
    - file://... (файловая система)
    """
    if uri.startswith("viking://"):
        client = get_memory_client()
        return client.get(uri, level=level)
    elif uri.startswith("file://"):
        # Чтение из файловой системы
        filepath = uri[7:]  # Убрать "file://"
        with open(filepath, 'r') as f:
            return f.read()
    else:
        return f"Unknown URI scheme: {uri}"


# Пример использования
if __name__ == "__main__":
    # Тест memory_search
    result = memory_search_tool("как меня зовут", top_k=3)
    print(result)
    
    # Тест memory_get
    # result = memory_get_tool("viking://resources/xxx", level="overview")
    # print(result)
```

## Shell скрипты для OpenClaw

### store-context.sh

```bash
#!/bin/bash
# Сохранение контекста в OpenViking

WORKSPACE="~/.openviking/workspace"
TEXT="$1"
TOPIC="$2"
DATE=$(date +%Y-%m-%d)

source ~/.openviking/venv/bin/activate

python3 << PYEOF
import openviking as ov

client = ov.OpenViking(path="$WORKSPACE")
client.initialize()

try:
    description = f"{TOPIC} - {DATE}"
    result = client.add_resource(
        path="data:text/markdown,$TEXT",
        reason=description
    )
    print(f"Сохранено: {result.get('root_uri', 'N/A')}")
finally:
    client.close()
PYEOF
```

### search-context.sh

```bash
#!/bin/bash
# Семантический поиск в OpenViking

QUERY="$1"
TOP_K="${2:-5}"

source ~/.openviking/venv/bin/activate

python3 << PYEOF
import openviking as ov

client = ov.OpenViking(path="~/.openviking/workspace")
client.initialize()

try:
    results = client.find("$QUERY", limit=$TOP_K)
    print(f"Найдено {len(results.resources)} результатов:\n")
    for i, r in enumerate(results.resources[:$TOP_K], 1):
        abstract = client.abstract(r.uri)
        print(f"{i}. {r.uri} (score: {r.score:.4f})")
        print(f"   {abstract[:200]}...\n")
finally:
    client.close()
PYEOF
```

## Тестирование

```bash
# Сохранить контекст
bash store-context.sh "Меня зовут Роман" "Личность"

# Поиск
bash search-context.sh "как меня зовут" 3
```
