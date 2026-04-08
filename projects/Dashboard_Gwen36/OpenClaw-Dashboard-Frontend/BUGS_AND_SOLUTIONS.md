# 📋 ОТЧЁТ ПО ОШИБКАМ И РЕШЕНИЯМ — OpenClaw Dashboard

## Дата: 2026-03-18

---

## 🐛 КРИТИЧЕСКИЕ ОШИБКИ И РЕШЕНИЯ

### 1. **CORS — Порт 5173 vs 5175**

**Симптом:**
- Frontend не получал данные от Backend
- Консоль браузера: `Access to fetch at 'http://localhost:3000/api/agents' from origin 'http://localhost:5175' has been blocked by CORS policy`

**Причина:**
```env
# Было в .env:
CORS_ORIGIN=http://localhost:5173
```

**Решение:**
```env
# Стало:
CORS_ORIGIN=http://localhost:5175
```

**Как избежать в будущем:**
- Всегда проверять `.env` на соответствие портов
- Добавить проверку при старте Frontend — выводить фактический порт
- Добавить логирование CORS ошибок в Backend

---

### 2. **React Router v7 — Синтаксис**

**Симптом:**
- Sidebar отображался
- Content area — пустая
- Консоль: только StatusBar логгирует, компоненты НЕ загружаются

**Причина:**
```jsx
// Было (старый синтаксис v6):
<Layout>
  <Routes>
    <Route path="/agents" element={<Agents />} />
  </Routes>
</Layout>
```

**Решение:**
```jsx
// Стало (новый синтаксис v7):
<Routes>
  <Route path="/" element={<Layout />}>
    <Route path="agents" element={<Agents />} />
  </Route>
</Routes>
```

**Как избежать в будущем:**
- Внимательно читать changelog при обновлении зависимостей
- React Router v7 использует вложенные routes через `<Outlet />`
- Добавить тестирование navigation при разработке

---

### 3. **Data Transformation — Frontend не обрабатывал ответы**

**Симптом:**
- Backend возвращал данные
- Frontend не отображал карточки

**Причина:**
```json
// Backend возвращал:
[{"id":"main","configured":true}]

// Frontend ожидал:
[{"id":"main","name":"Main","status":"idle","tasks":[],"sessions":[]}]
```

**Решение:**
```jsx
// Добавили transform в Agents.jsx:
const agents = rawData.map(agent => ({
  id: agent.id,
  name: agent.name || agent.id,
  configured: agent.configured,
  status: agent.status || 'idle',
  tasks: agent.tasks || [],
  sessions: agent.sessions || [],
}));
```

**Как избежать в будущем:**
- Создать shared types между Backend и Frontend
- Добавить TypeScript для строготипизации
- Добавить unit тесты для transform функций

---

## 🔧 АРХИТЕКТУРНЫЕ УЛУЧШЕНИЯ

### 1. **Logging — Детальный лог в консоль**

**Проблема:** Сложно отлаживать — не понятно где ошибка

**Решение:**
```jsx
async function loadAgents() {
  console.log('[Agents] Запрос к /api/agents...');
  const start = Date.now();
  const res = await fetch('/api/agents');
  console.log(`[Agents] Ответ получен за ${Date.now() - start}ms`);
  const data = await res.json();
  console.log('[Agents] Raw data:', data);
  // ...
}
```

**Как избежать в будущем:**
- Всегда добавлять logging при разработке
- Использовать structured logging (pino, winston) в production

---

### 2. **StatusBar — Индикатор подключения**

**Проблема:** Не понятно работает ли Backend

**Решение:**
- Создан компонент `StatusBar.jsx`
- Показывает статус подключения (зелёный/жёлтый/красный)
- Показывает время ответа Backend

**Как избежать в будущем:**
- Всегда добавлять health check endpoint
- Визуализировать статус подключения

---

## 📝 УРОКИ

### 1. **Всегда проверять version dependencies**
- React Router v7 имеет breaking changes
- Внимательно читать миграционные гайды

### 2. **Logging — это must-have**
- Без логирования отладка занимает в 10 раз больше времени
- Добавлять logging с первой строки кода

### 3. **Shared types между Backend и Frontend**
- Использовать TypeScript
- Генерировать типы из OpenAPI spec
- Добавлять runtime validation (zod, yup)

### 4. **DevOps — автоматизировать проверки**
- Добавить ESLint правила
- Добавить Prettier для форматирования
- Добавить тесты (Jest, React Testing Library)

---

## 🚀 РЕКОМЕНДАЦИИ ДЛЯ БУДУЩИХ ПРОЕКТОВ

### При старте проекта:

1. **Выбрать стек и зафиксировать версии**
```json
{
  "react": "^19.2.4",
  "react-router-dom": "^7.13.1",
  "vite": "^8.0.0",
  "tailwindcss": "^4.x"
}
```

2. **Добавить logging с первого дня**
- Frontend: console.log с префиксами
- Backend: winston/pino

3. **Настроить CORS правильно с первого раза**
- Использовать wildcard только в development
- В production — whitelist конкретных origins

4. **Использовать TypeScript**
- Строгая типизация предотвращает ошибки
- Автодополнение и рефакторинг

5. **Добавить health check endpoint**
```javascript
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});
```

---

## 📚 ДОКУМЕНТАЦИЯ ДЛЯ ОРКЕСТРАТОРА

### Шаблон для создания нового компонента:

```jsx
import { useState, useEffect } from 'react';

export default function ComponentName() {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [rawData, setRawData] = useState(null);

  useEffect(() => {
    loadData();
    const interval = setInterval(loadData, 5000);
    return () => clearInterval(interval);
  }, []);

  async function loadData() {
    try {
      console.log(`[ComponentName] Запрос к /api/endpoint...`);
      const start = Date.now();
      
      const res = await fetch('/api/endpoint');
      const elapsed = Date.now() - start;
      
      console.log(`[ComponentName] Ответ получен за ${elapsed}ms, status: ${res.status}`);
      
      const data = await res.json();
      setRawData(data);
      
      console.log('[ComponentName] Raw data:', data);
      
      if (!Array.isArray(data)) {
        console.error('[ComponentName] Ожидался массив, получено:', typeof data);
        setData([]);
        return;
      }
      
      setData(data);
      console.log(`[ComponentName] Количество: ${data.length}`);
    } catch (error) {
      console.error('[ComponentName] Ошибка:', error);
      setData([]);
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  const countDisplay = rawData === null ? '-' : rawData.length;

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <h2 className="text-2xl font-bold text-white">Title</h2>
        <span className="text-sm text-dark-600">
          {countDisplay} объектов
        </span>
      </div>
      
      {data.length === 0 && rawData !== null ? (
        <div className="text-center py-12 text-dark-500">
          <p>Нет данных</p>
        </div>
      ) : (
        // ... рендер данных ...
      )}
    </div>
  );
}
```

---

*Создано: 2026-03-18 13:00 MSK*
*Автор: Romul (цифровой ассистент)*