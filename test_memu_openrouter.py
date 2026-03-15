#!/usr/bin/env python3
"""Простая memory system через OpenRouter"""

import requests
import json
import hashlib
from datetime import datetime

OPENROUTER_KEY = "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"
BASE_URL = "https://openrouter.ai/api/v1"

headers = {
    "Authorization": f"Bearer {OPENROUTER_KEY}",
    "Content-Type": "application/json"
}

class SimpleMemory:
    def __init__(self, user_id="roman"):
        self.user_id = user_id
        self.memories = []
        self.categories = {}
        
    def memorize(self, text):
        print(f"📝 Запись памяти: {text[:50]}...")
        
        response = requests.post(
            f"{BASE_URL}/chat/completions",
            headers=headers,
            json={
                "model": "google/gemma-3-27b-it:free",
                "max_tokens": 300,
                "messages": [
                    {"role": "user", "content": f"Extract 3-5 key facts from this text. Return ONLY valid JSON with structure: {{\"facts\": [\"string\"], \"category\": \"string\", \"importance\": 5}}\n\nText: {text}"}
                ]
            }
        )
        
        print(f"   Status: {response.status_code}")
        if response.status_code != 200:
            print(f"   Error: {response.text[:200]}")
            return None
            
        resp_data = response.json()
        print(f"   Choices: {len(resp_data.get('choices', []))}")
        
        if not resp_data.get('choices'):
            print(f"   ❌ No choices")
            return None
            
        msg = resp_data['choices'][0]['message']
        content = msg.get('content') or msg.get('reasoning', '')
        print(f"   Content len: {len(content) if content else 0}")
        
        if not content:
            print(f"   ❌ Empty content")
            return None
            
        content = content.replace('```json', '').replace('```', '').strip()
        try:
            data = json.loads(content)
        except json.JSONDecodeError as e:
            print(f"   ❌ JSON error: {e}")
            print(f"   Raw: {content[:100]}")
            return None
        
        for fact in data.get('facts', []):
            memory = {
                "id": hashlib.md5(fact.encode()).hexdigest()[:12],
                "content": fact,
                "category": data.get('category', 'general'),
                "importance": data.get('importance', 5),
                "created": datetime.now().isoformat()
            }
            self.memories.append(memory)
            cat = data.get('category', 'general')
            if cat not in self.categories:
                self.categories[cat] = {'name': cat, 'count': 0}
            self.categories[cat]['count'] += 1
            
        print(f"   ✅ Extracted {len(data.get('facts', []))} facts")
        return data
    
    def retrieve(self, query):
        print(f"🔍 Query: {query}")
        
        response = requests.post(
            f"{BASE_URL}/chat/completions",
            headers=headers,
            json={
                "model": "google/gemma-3-27b-it:free",
                "max_tokens": 300,
                "messages": [
                    {"role": "user", "content": f"Find relevant memories for this query. Return JSON with structure: {{\"results\": [{{\"memory\": {{...}}, \"relevance\": 0.9}}]}}\n\nQuery: {query}\n\nMemories: {json.dumps(self.memories, ensure_ascii=False)}"}
                ]
            }
        )
        
        if response.status_code == 200:
            resp_data = response.json()
            content = resp_data['choices'][0]['message'].get('content') or resp_data['choices'][0]['message'].get('reasoning', '')
            content = content.replace('```json', '').replace('```', '').strip()
            data = json.loads(content)
            results = data.get('results', [])[:5]
            
            print(f"   ✅ Found {len(results)} relevant memories")
            for r in results[:3]:
                print(f"     [{r.get('relevance', 0):.2f}] {r.get('memory', {}).get('content', '')[:80]}...")
            return results
        else:
            print(f"   ❌ Error: {response.status_code}")
            print(f"   Response: {response.text[:200]}")
            return []
    
    def list_categories(self):
        return list(self.categories.values())

def main():
    print("🚀 Simple Memory System (OpenRouter)\n")
    
    memory = SimpleMemory(user_id="roman")
    
    print("1️⃣  Запись памяти...")
    memory.memorize("Роман изучает memU для OpenClaw. Программист 1С, руководитель отдела разработки, изучает вайбкодинг. Любит локальные модели, использует Ollama с Qwen3.5-27B. Живёт в Ростове-на-Дону.")
    
    print()
    memory.memorize("Роман ценит честность и прямоту. Не любит фразы-заполнители и излишнюю вежливость. Хочет проактивного ассистента.")
    
    print("\n2️⃣  Извлечение памяти...")
    memory.retrieve("Что Роман изучает?")
    print()
    memory.retrieve("Где Роман живёт?")
    
    print("\n3️⃣  Категории...")
    categories = memory.list_categories()
    print(f"   📁 {len(categories)} категорий:")
    for cat in categories:
        print(f"     - {cat['name']}: {cat['count']} записей")
    
    print("\n✅ Test completed!")

if __name__ == "__main__":
    main()
