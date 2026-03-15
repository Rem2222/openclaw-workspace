#!/usr/bin/env python3
"""
Тестовый скрипт для memU с локальной конфигурацией
LLM: локальный Ollama (Qwen3.5-27B)
Embedding: OpenRouter (text-embedding-3-small)
"""

import asyncio
import sys
import os

# Добавляем user site-packages в путь
user_site = os.path.expanduser("~/.local/lib/python3.12/site-packages")
if user_site not in sys.path:
    sys.path.insert(0, user_site)

async def main():
    try:
        from memu import MemUService
    except ImportError:
        print("❌ memu не найден. Установка...")
        import subprocess
        subprocess.check_call([sys.executable, "-m", "pip", "install", "memu", "--user", "--break-system-packages"])
        if user_site not in sys.path:
            sys.path.insert(0, user_site)
        from memu import MemUService

    print("🚀 Инициализация memU...")
    
    service = MemUService(
        llm_profiles={
            "default": {
                "base_url": "http://10.110.0.203:11434/v1",
                "api_key": "not-needed",
                "chat_model": "Qwen3.5-27B.Q4_K_M",
                "client_backend": "http"
            },
            "embedding": {
                "provider": "openrouter",
                "base_url": "https://openrouter.ai/api/v1",
                "api_key": "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",
                "embed_model": "text-embedding-3-small"
            }
        },
        database_config={
            "metadata_store": {"provider": "inmemory"},
        },
    )
    
    print("✅ memU инициализирован!")
    print("\n📝 Тест: запись памяти...")
    
    # Тестовая запись памяти
    result = await service.memorize(
        resource_url="test",
        modality="conversation",
        user={"user_id": "test"}
    )
    
    print("\n📊 Результат:")
    print(f"  - Resources: {len(result.get('resource', {}))}")
    print(f"  - Items: {len(result.get('items', []))}")
    print(f"  - Categories: {len(result.get('categories', []))}")
    
    print("\n✅ Тест пройден!")

if __name__ == "__main__":
    asyncio.run(main())
