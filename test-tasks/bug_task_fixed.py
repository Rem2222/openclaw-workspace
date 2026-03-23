# === ЗАДАЧА #2: БАГ (ИСПРАВЛЕНО) ===

# Функция удаляет пользователей младше 18 лет из списка.

def remove_minors(users: list) -> list:
    """Удаляет пользователей младше 18 лет."""
    # БЫЛО (багово):
    # for user in users:  # Итерация по оригинальному списку!
    #     if user["age"] < 18:
    #         users.remove(user)  # Модификация во время итерации!

    # СТАЛО (исправлено):
    for user in users[:]:  # Создаём копию списка для безопасной итерации
        if user["age"] < 18:
            users.remove(user)
    return users


# Тестовые данные (с подряд идущими несовершеннолетними для проверки бага)
users = [
    {"name": "Alice", "age": 30},
    {"name": "Bob", "age": 15},  # minor
    {"name": "Diana", "age": 12},  # minor (идёт подряд с Bob)
    {"name": "Charlie", "age": 35},
    {"name": "Eve", "age": 25},
    {"name": "Frank", "age": 17},  # minor
]

result = remove_minors(users)
print([u["name"] for u in result])
# Ожидаем: ["Alice", "Charlie", "Eve"]
# Получаем: ["Alice", "Charlie", "Eve"] ✓

# БАГ БЫЛ: При удалении Bob (индекс 1) Diana сдвигалась с индекса 2 на индекс 1,
# но итератор переходил к индексу 2 (теперь Charlie), пропуская Diana.
# ИСПРАВЛЕНИЕ: users[:] создаёт копию для итерации — безопасно.
