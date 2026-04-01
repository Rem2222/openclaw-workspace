# Procedures — How I Do Things

_Last updated: 2026-04-01_

---

## 🎨 Communication Preferences
<!-- Language, tone, format preferences the user has expressed -->
<!-- e.g., "Prefers Chinese with English technical terms" -->

- **Язык:** Русский (Russian) — основной язык общения
- **Формат:** Сухой, деловой, без воды. Без фраз-заполнителей ("говорю прямо", "суть в том")
- **Таблицы:** Выравнивать пробелами, не markdown-таблицы (могут съехать в Telegram)
- **Код:** Только в блоках ``` — иначе не выполняется

## 🔧 Tool Workflows

### Видео с YouTube — как разбирать
**Роман хочет чтобы я анализировал видео.** Правильный порядок:
1. Скачать через `yt-dlp` (нужен отдельно)
2. Извлечь кадры через `video-frames` скилл
3. Анализировать кадры через vision-модель (Gemini, или subagent с vision)
4. **НЕ пытаться парсить через Invidious/Jina — это не работает для видео**

### Vision-модели — когда использовать
- minimax-m2.7 — НЕ поддерживает картинки (только text)
- Gemini 2.0 Flash / Qwen Vision — поддерживают картинки
- Если нужно анализировать картинку — использовать vision-модель

### Subagents — правильное использование
- Subagents работают для параллельных задач
- Но: результаты не всегда корректно возвращаются (особенно через Telegram)
- vision-модели через subagent часто возвращают пустой результат
- Лучше: vision-задачи делать напрямую, а не через subagent

### Ollama — запуск и проверка
```bash
OLLAMA_HOST=127.0.0.1:11434 ollama serve &
```
- `ollama` на localhost работает
- `ollamalocal` на 10.110.0.203 — недоступен из-за сетевых ограничений

### Telegram Webhook через Cloudflare Tunnel
1. Поднять туннель: `cloudflared tunnel --url http://localhost:18789`
2. URL временный — при перезапуске меняется
3. Для продакшена нужен постоянный Cloudflare Tunnel

## 📝 Format Preferences
<!-- How the user likes output structured -->
<!-- e.g., "Tables for comparisons, bullet lists for Discord" -->

- **Сводка (итог дня):** Формат из AGENTS.md Rule 8 — 5 блоков (о чём говорили, что сделали, токены, задачи, git)
- **Обращение:** Редко по имени — только когда действительно нужно
- **Свои ошибки:** Признавать честно, без оправданий

## ⚡ Shortcuts & Patterns
<!-- Recurring patterns, aliases, quick references -->
<!-- e.g., "When user says 'ship it' → run deploy workflow" -->

- `"запусти Оркестратора"` → читать `ОРКЕСТРАТОР_ПРОЕКТОВ_PROMT.md` и становиться Оркестратором
- `"на сегодня достаточно"` / `"отбой"` → итоговая сводка + auto-dream cycle + git backup
- Root/Sudo операции → предупреждать и передавать управление через tmux
