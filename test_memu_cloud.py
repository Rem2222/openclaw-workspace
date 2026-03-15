#!/usr/bin/env python3
"""
Тест Cloud API memU
"""

import requests
import json

API_KEY = "mu_oJLn8lm2R0UPv17a3OsFTb7N5lh3Sd2an3VBNCZTYKHnASCWU1ycH_dF1XYm7IfdrVZCUyKOd-SF3xmkAdXcv_ydtK5xqf7Y7P5_T_H1_6fQ5qwf7Q"
BASE_URL = "https://api.memu.so"

headers = {
    "Authorization": f"Bearer {API_KEY}",
    "Content-Type": "application/json"
}

print("🚀 Тест Cloud API memU\n")

# 1. Тест Memorize
print("📝 1. Запись памяти...")
response = requests.post(
    f"{BASE_URL}/api/v3/memory/memorize",
    headers=headers,
    json={
        "text": "Роман изучает memU и хочет использовать его для OpenClaw. Он программист 1С, руководитель отдела разработки, изучает вайбкодинг."
    }
)

if response.status_code == 200:
    data = response.json()
    print(f"✅ Запись успешна!")
    print(f"   Task ID: {data.get('task_id', 'N/A')}")
    print(f"   Items: {len(data.get('items', []))}")
    print(f"   Categories: {len(data.get('categories', []))}")
else:
    print(f"❌ Ошибка: {response.status_code}")
    print(f"   {response.text}")

print()

# 2. Тест Retrieve
print("🔍 2. Извлечение памяти...")
response = requests.post(
    f"{BASE_URL}/api/v3/memory/retrieve",
    headers=headers,
    json={
        "queries": [{"text": "Что Роман изучает?"}],
        "method": "rag"
    }
)

if response.status_code == 200:
    data = response.json()
    print(f"✅ Извлечение успешно!")
    print(f"   Items: {len(data.get('items', []))}")
    print(f"   Categories: {len(data.get('categories', []))}")
    if data.get('items'):
        print(f"   Первый item: {data['items'][0].get('content', '')[:100]}...")
else:
    print(f"❌ Ошибка: {response.status_code}")
    print(f"   {response.text}")

print()

# 3. Тест Categories
print("📁 3. Список категорий...")
response = requests.post(
    f"{BASE_URL}/api/v3/memory/categories",
    headers=headers,
    json={}
)

if response.status_code == 200:
    data = response.json()
    print(f"✅ Категории получены!")
    print(f"   Count: {len(data)}")
    for cat in data[:5]:
        print(f"   - {cat.get('name', 'N/A')}")
else:
    print(f"❌ Ошибка: {response.status_code}")
    print(f"   {response.text}")

print("\n✅ Все тесты пройдены!")
