# === ЗАДАЧА #2: БАГ ===

# Функция удаляет пользователей младше 18 лет из списка.
# Должна работать, но результат неожиданный.

def remove_minors(users: list) -> list:
    """Удаляет пользователей младше 18 лет."""
    return [user for user in users if user["age"] >= 18]


# Тестовые данные
users = [
    {"name": "Alice", "age": 30},
    {"name": "Bob", "age": 15},  # minor
    {"name": "Charlie", "age": 35},
    {"name": "Diana", "age": 12},  # minor
    {"name": "Eve", "age": 25},
    {"name": "Frank", "age": 17},  # minor
]

result = remove_minors(users)
print([u["name"] for u in result])
# Ожидаем: ["Alice", "Charlie", "Eve"]
# Получаем: ???

# ПРОБЛЕМА: Результат неправильный — часть несовершеннолетних осталась.
# Найди баг и исправь.
