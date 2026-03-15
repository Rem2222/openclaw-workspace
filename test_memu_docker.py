#!/usr/bin/env python3
"""
Тест memU в Docker контейнере
"""

import asyncio
from memu import MemUService

async def main():
    print("🚀 Инициализация memU (Docker)...")
    
    service = MemUService(
        llm_profiles={
            "default": {
                "base_url": "http://host.docker.internal:11434/v1",
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
    
    result = await service.memorize(
        resource_url="test",
        modality="conversation",
        user={"user_id": "test"}
    )
    
    print("\n📊 Результат:")
    print(f"  - Items: {len(result.get('items', []))}")
    print(f"  - Categories: {len(result.get('categories', []))}")
    
    print("\n✅ Тест пройден!")

if __name__ == "__main__":
    asyncio.run(main())
