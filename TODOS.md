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

## Linear webhook уведомления [future]
- Настроить webhook в Linear для отправки комментариев в OpenClaw
- Варианты: Telegram bot, email, или OpenClaw webhook endpoint
- Решить: все комментарии или только @mention
- Зависит от: поддержка Linear вебхуков

## CodexBar UI glitch при открытии [bug]
- При открытии основного окна sometimes показывает прозрачный/белый экран
- Сквозь окно видно рабочий стол, остатки date picker "2023-04-13"
- Кнопки tabs (CL, Codex, Z.AI и т.д.) и футер видны, центр не отрисовывается
- Скорее всего CTk/CustomTkInter rendering issue
- Может помочь: обновление графических драйверов или forced redraw
