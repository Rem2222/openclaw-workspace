# TODOS.md

## Проекты

### 🔴 В работе
- **OpenClaw Dashboard** — закончить проект, поменять морду на стиль https://nekocode.app

### ⏳ Запланировано
- [[Heisenberg Team]] — протестировать мультиагентный шаблон для OpenClaw (8 агентов, 34 скилла, Board-First протокол)
- [[Z.AI MCP Servers]] — починить zai-search MCP (SSE content type ошибка), проверить zai-vision MCP

### ✅ Завершено
- _(empty)_

---

## Разное

### 🔴 Z.AI MCP Servers
- [ ] Проверить работает ли zai-vision MCP
- [ ] Исправить zai-search MCP: SSE content type error — API возвращает не text/event-stream
  - Проблема: `https://api.z.ai/api/mcp/web_search_prime/mcp` возвращает `Invalid content type`
  - Возможно решение: использовать другую версию API или добавить header Accept: text/event-stream
