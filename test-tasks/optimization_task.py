# === ЗАДАЧА #4: ОПТИМИЗАЦИЯ ===

# Функция ищет двух пользователей с одинаковым возрастом.
# Работает правильно, но медленно на больших списках.

def find_users_with_same_age(users: list) -> tuple:
    """
    Ищет первую пару пользователей с одинаковым возрастом.
    Возвращает (user1, user2) или None.

    Сложность: O(n) - один проход с хеш-таблицей
    """
    seen = {}  # age -> user с этим возрастом

    for user in users:
        age = user["age"]
        if age in seen:
            return (seen[age], user)
        seen[age] = user

    return None


# Тестовые данные (1000 пользователей)
import random
random.seed(42)
users = [
    {"name": f"User_{i}", "age": random.randint(18, 80)}
    for i in range(1000)
]

# Проверка работоспособности
result = find_users_with_same_age(users)
if result:
    print(f"Найдены: {result[0]['name']} и {result[1]['name']}, возраст: {result[0]['age']}")

# ПРОБЛЕМА: O(n²) сложность. На 1M пользователей будет очень медленно.
# Оптимизируй до O(n) или O(n log n).
