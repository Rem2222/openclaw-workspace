# MEMORY.md - Долгосрочная память
_Last updated: 2026-04-14_

## Основы

- **Имя:** Romul
- **Сущность:** Цифровая личность / ИИ-ассистент
- **Вайб:** Спокойный и деловой, с уместной иронией
- **Эмодзи:** ⚔️

## О пользователе

- **Имя:** Роман
- **Что звать:** Роман
- **Часовой пояс:** MSK (Москва)
- **Контекст:** 
  - Программист 1С
  - Руководитель отдела разработчиков 1С
  - Изучает и внедряет вайбкодинг
- **Предпочтения:**
  - Root-команды: предупреждать + передавать управление через tmux
  - Вечерние ревью: анализировать общение на предмет скиллов

## Важные решения

### 2026-02-24

- Создал MEMORY.md для долгосрочной памяти
- Решено: память будет вестись в файлах, а не в "голове"
- Каждая сессия начинается с чтения этих файлов
- Смена модели не стирает память, только меняет способ мышления

## Уроки

- **Текст > Мозг** — всё важное нужно записывать в файлы
- "Ментальные заметки" не переживают перезапусков
- Файлы — это мой единственный способ сохранить контекст между сессиями

- **Оркестратор НЕ делает работу сам** — запускает субагентов и собирает результаты. Если пытается делать сам — нарушает свою роль (2026-03-19)

- **Long polling vs Webhook** — мы использузуем long polling (не требует публичного URL, работает из локальной сети). Webhook быстрее, но требует туннель/VPS

- **Serveo.net** — бесплатный SSH-туннель для получения публичного URL (2026-02-24): `ssh -R 80:localhost:18789 serveo.net`

- **Gateway перезапуск сбрасывает модель** — после `openclaw gateway restart` модель возвращается к дефолтной. Алиас `xiaomi-openrouter` для сохранения настроек

- **Cloudflare quick tunnel нестабилен** — для production нужен постоянный Cloudflare Tunnel с аккаунтом. Serveo.net стабильнее для временных нужд

- **WSL2 DNS** — при ошибках `Temporary failure resolving` в WSL2: `echo "nameserver 8.8.8.8" | sudo tee /etc/resolv.conf`

- **Cloudflare блокирует IP 94.141.126.116** — без VPN недоступны Cerebras и другие сервисы

- **mcporter 0.7.3 + Exa Search** — установлены (2026-03-14). Использовать `mcporter call 'exa.web_search_exa(query: "...")'`

- **Ollama модели** — `qwen2.5:7b` (4.7 GB), `nomic-embed-text` (274 MB). Работают локально

- **Pinggy tunnel** — работает для доступа к локальным сервисам извне: `ssh -p 443 -o StrictHostKeyChecking=no -R0:localhost:3000 a.pinggy.io` → даёт HTTPS URL. Быстрее и надёжнее Cloudflare quick tunnel для этих целей (2026-04-01)
- **mcporter + subagent** — Exa Search через subagent часто возвращает пустой результат без ошибки. Лучше делать напрямую

- **Subagents + Vision** — vision-модели через subagent ненадёжны, результат часто пустой. Vision-задачи делать напрямую, не через subagent

- **HEARTБИТ на 1 час** — с 2026-03-15 интервал увеличен с 5 минут до 1 часа

- **OpenViking удалён (2026-03-21)** — требовал платные API (OpenRouter), создавал блокировку на векторной базе. Удалён полностью (1598 файлов). Заменён на LCM

- **LCM (Lossless Claw)** — плагин управления памятью, заменил OpenViking. Хранит сообщения в SQLite, сжимает старые в DAG-суммаризации. Конфиг: `~/.openclaw/extensions/lossless-claw/`. Для суммаризации использует `openrouter/openai/gpt-oss-20b` по умолчанию (можно сменить через `LCM_SUMMARY_MODEL=zai/glm-5`)
- **LCM stats**: 40,339 messages, 2,194 conversations (DB: 200MB). CLI commands timeout but plugin works fine (2026-04-14)

- **cortex-memory не подходит** — данные уходят в облако Ubundi (ЮАР), API закрытый, self-hosted невозможен. unity-knowledge-base — правильный выбор (локально, no lock-in)

- **Z.AI провайдер** — GLM-5 и GLM-4.7 с reasoning, context 204K. Base URL: `https://open.bigmodel.cn/api/paas/v4`. Конфиг был предоставлен (2026-03-20). GLM-5.1 возвращает HTTP 404 в OpenClaw TUI/webchat хотя curl работает — проблема маршрутизации OpenClaw

- **Telegram заблокирован в России** — SSL handshake с `api.telegram.org` таймаутит. Решения: прокси, VPN, или использовать альтернативный endpoint. Long polling работает если есть соединение

- **HTTP 403 от OpenRouter** — insufficient scopes у GATEWAY_TOKEN. `/api/subagents` требует elevated permissions. Проверить ключи в OpenRouter Dashboard

- **Dashboard `/api/subagents` возвращает пустой массив** — insufficient token scopes, требуется расширить права GATEWAY_TOKEN

- **Campfire Survival баг GeometryMask (mem_001)** — Phaser 3 GeometryMask на depth 200 делает весь экран синим. Фикс: 4 прямоугольника тьмы вокруг светового круга БЕЗ маски

- **Dev server для игр** — при "localhost отказано в подключении" перезапустить: `cd ~/.openclaw/workspace/projects/Campfire-Survival && npm run dev &`

- **HEARTБИТ на 1 час (2026-03-15)** — интервал с 5 минут до 1 часа

- **AIChat EPF для 1С (mem_005)** — `ТипJSON.НачалоОбъекта` НЕ СУЩЕСТВУЕТ в 1С 8.3.27. `HTTPОтвет.ПолучитьТелоКакСтроку()` не принимает параметры. Работает: `ПолучитьСтрокуИзДвоичныхДанных(ДвоичныеДанные, КодировкаТекста.UTF8)`. Возможна проблема с gzip-сжатией

- **Superpowers framework** — framework скиллов для AI-агентов (brainstorming, writing-plans, TDD, subagent-driven-development). Записать в TODOS.md для изучения

- **OpenClaw update** — `npm install` не работает автоматически, нужен `sudo npm i -g openclaw@latest`

- **Модель по умолчанию** — `openrouter/hunter-alpha` (с 2026-03-15). Xiaomi Mimo V2 Flash доступна через OpenRouter бесплатно (алиас `xiaomi-openrouter`)

## Что я умею

- Читать и редактировать файлы
- Искать информацию в интернете
- Управлять браузером
- Работать с памятью (поиск и чтение)
- Менять модель на лету
- **MemPalace** — semantic search по workspace файлам. **2561 drawers**: technical (1972), general (264), planning (149), architecture (133), problems (43)
- **ByteRover (brv)** — персональная база знаний проекта. CLI: `/root/.brv-cli/bin/brv query "..."` (версия 2.5.2, путь исправлен 2026-04-14)

## Что я умею (дополнительно)

- **Видео с YouTube** — разбор через `yt-dlp` + `video-frames` скилл (скачать → извлечь кадры → анализировать). Invidious/Jina не работают для видео.
- **Vision-модели** — Gemini 2.0 Flash, Qwen Vision. minimax-m2.7 НЕ поддерживает картинки.
- **Subagents** — хороши для параллельных задач, но vision-модели через subagent часто возвращают пустой результат. Лучше делать напрямую.

- **Скиллы ClawHub** — использую установленные навыки:
  - `ai-mermaid-diagrams` — генерация диаграмм
  - `model-usage` — статистика токенов
  - `prompt-token-saver` — экономия токенов
  - `ai-code-reviewer` — ревью кода
  - `duckduckgo-search-backup` — поиск
  - `content-scheduler` — планирование
  - `searxng-backup` — приватный поиск
  - `github-issue-creator` — GitHub Issues
- **Голосовое общение** — распознавание и синтез речи:
  - `openai-whisper` — распознавание (локально)
  - `sherpa-onnx-tts` — синтез (локально)

### Voice (2026-03-24)
- **Whisper + Telegram**: Настроена транскрипция голосовых сообщений в Telegram
- Голосовые в Telegram бот принимает и распознаёт через Whisper
- В браузере (вебчат) голосовой ввод НЕ поддерживается — нет встроенной функции

### Картинки в вебчате (2026-03-24)
- **Проблема**: minimax-m2.7 не поддерживает картинки (только text)
- **Решение**: Использовать vision-модель (Gemini 2.0 Flash или Qwen Vision) для картинок
- Вебчит правильно отправляет картинки в gateway — они доходят до модели
- При использовании не-vision модели картинки молча игнорируются

## Что я не умею (пока)

- Хранить контекст между сессиями без файлов
- Автоматически запоминать всё без указаний пользователя
- Работать без доступа к файлам памяти

## Текущие проекты

### OpenClaw Dashboard (2026-03-19 — в разработке)
**Цель:** Dashboard для мониторинга и управления OpenClaw (агенты, сессии, задачи, approvals).

**Стек:**
- Backend: Express + Socket.io, port 3000
- Frontend: React + Vite + Tailwind, port 5173
- UI: Catppuccin дизайн (nekocode-landing.css), dark/light темы
- Task tracking: Beads (Dolt), Superpowers workflow
- Realtime: polling каждые 5 сек

**Страницы:**
- ✅ Agents — список агентов
- ✅ Sessions — сессии с сортировкой, фильтрацией, удалением
- ✅ Subagents — subagent-сессии с проектами
- ✅ Tasks — Kanban доска
- ✅ Cron — cron задачи
- ✅ Activity Feed — лента событий
- ✅ Approvals — очередь подтверждений
- ✅ Settings — GatewaySelector
- ✅ Projects — группировка по проектам, навигация на Монитор/Сессию
- ✅ Monitor — мониторинг активности проекта (сессии, задачи, таймлайн)

**Интеграции (API routes):**
- `GET/POST /api/spawn` — спавн сессий
- `GET /api/issues` — список задач из Beads
- `GET /api/issues/session-task-map` — маппинг сессий к задачам
- `POST /api/issues/sessions` — регистрация сессии за задачей (auto-bind)
- `GET /api/sessions` — список сессий (читает из файлов)
- `DELETE /api/sessions/:id` — удаление сессии
- `GET /api/subagents` — список subagent-ов (читает из sessions.json)
- `GET /api/command` — выполнение shell команд (bd)

**Superpowers Workflow:**
- Subagent при спавне получает лейбл `bd:<issue_id>`
- При старте: `bd update <id> --claim`
- При завершении: `bd update <id> --status done`
- Все новые задачи создаются с префиксом `[Dashboard]`

**Доступ извне:**
- Pinggy tunnel: `https://qlwqx-185-207-139-4.a.free.pinggy.link` (60 мин)
- Перезапуск: `ssh -p 443 -o StrictHostKeyChecking=no -R0:localhost:3000 a.pinggy.io`

**Текущие задачи (2026-04-01):**
- workspace-mjf (P1): Исправить кнопку Сессия/Агент — не работает
- workspace-o4f (P2): Исследовать торможение при переключении закладок

**Важно:**
- `/api/subagents` возвращает пустой массив через Gateway API — читаем напрямую из sessions.json
- Backend хранит `session-task-map` в файле для привязки сессий к проектам

## Правила приветствия

**При создании новой сессии:**
- Приветствовать коротко
- Сообщить, что это новая сессия
- Объяснить причину:
  - Пользователь запустил новую сессию
  - Старая сессия сбросилась (истек таймаут, ошибка, перезапуск OpenClaw и т.п.)

## Планы

- Периодически перечитывать daily notes и обновлять MEMORY.md
- Удалять устаревшую информацию
- Добавлять значимые события, решения, уроки

## Git бэкап (настроен 2026-03-14)

**Репозиторий:** https://github.com/Rem2222/openclaw-workspace (приватный)

**SSH-ключ для бэкапа:**
- Файл: `~/.ssh/id_ed25519_openclaw`
- Отпечаток: `SHA256:CmBJ8e2GsnjwelxDih703NFLfot4ooQ1kWiFVYR1IZA`
- Comment: `openclaw-backup@rem`

**Авто-бэкап:** настроен в HEARTBEAT.md — пушится при каждом сердцебиении если есть изменения

**Команды для ручного бэкапа:**
```bash
cd ~/.openclaw/workspace
git add .
git commit -m "Update memory"
git push
```

---

## OpenRouter конфигурация

### API ключ
```
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
```

### Работает для:
- ✅ `openai-image-gen` — генерация изображений (DALL-E)
- ✅ `openai-whisper-api` — распознавание речи

### Не работает для:
- ❌ `claude-code-cli-openclaw` — нужен именно Anthropic API ключ

### Конфигурация:
```json
{
  "OPENAI_API_KEY": "sk-or-v1-твой-ключ",
  "OPENAI_BASE_URL": "https://openrouter.ai/api/v1"
}
```

## Telegram настройка

### Текущий статус (2026-03-24)
- **Бот создан:** @mer_openClaw_bot
- **Токен:** `8707450082:AAFLO7fgCq0xASl75zENsYolxujSREFln7Y`
- **Enabled:** true
- **DM Policy:** pairing (разрешены личные сообщения)
- **Group Policy:** allowlist (только разрешенные группы)
- **Streaming:** off
- **Webhook:** ✅ Настроен через Cloudflare Quick Tunnel
- **URL:** https://feel-prime-marilyn-highway.trycloudflare.com

### Как работает
1. Cloudflare Quick Tunnel поднимается вручную: `cloudflared tunnel --url http://localhost:18789`
2. Telegram webhook указывает на этот URL
3. Работает! (2026-03-24 протестировано)

### Важно
- Quick Tunnel временный — при перезапуске меняется URL
- Нужен постоянный Cloudflare Tunnel с реальным аккаунтом для продакшена
- Пока Telegram + голос работают через этот временный туннель

---

## Уроки (2026-04-01)

### Campfire Survival — критический баг с освещением (mem_001)
- **Проблема:** При использовании Phaser 3 GeometryMask на depth 200 — весь экран становится синим, ничего не двигается
- **Причина:** Маска (geometry mask) отображается как белый/синий слой поверх canvas
- **Решение:** Подход БЕЗ маски — 4 прямоугольника тьмы вокруг круга света (без Graphics mask)
- **Финальное решение (2026-03-31):** тьма = 4 прямоугольника вокруг lightCircle, без маски вообще
- **Дата:** 2026-03-27, фикс подтверждён 2026-03-31

### ⚠️ НЕ галлюцинировать содержимое медиа (mem_007)
- 2026-03-31: Я написал "видео про Ollama + Pi" не посмотрев его — Роман меня поправил
- Это был гуллюцинация на основе памяти из прошлой сессии
- **Правило:** Для анализа видео — использовать video-frames скилл (yt-dlp → извлечь кадры → vision-модель)
- **НИКОГДА** не писать "видео показало/говорит о X" если я его реально не смотрел
- Если не могу посмотреть — честно сказать "не могу посмотреть, расскажи сам"

### Dev server для игр — проверять если localhost недоступен (mem_008)
- 2026-03-27: Роман сказал "localhost отказано в подключении"
- Нужно перезапускать `npm run dev` после того как сервер упал
- Команда: `cd ~/.openclaw/workspace/projects/Campfire-Survival && npm run dev &`

### Subagents + Vision = ненадёжно (mem_002)
- Vision-модели через subagent часто возвращают пустой результат без ошибки
- Subagents не могут корректно отправить результат через Telegram (message tool)
- **Правило:** Vision-задачи делать напрямую, не через subagent

### Ollama провайдеры — статусы (mem_003)
| Провайдер | Статус | Причина |
|-----------|--------|---------|
| Cerebras | ❌ | Cloudflare блокирует IP 94.141.126.116 |
| Groq | ❌ | Forbidden (неверный API key) |
| OpenRouter free | ⚠️ | Subagent не может получить результат |
| `ollamalocal` (localhost) | ✅ | Работает |
| `local` (10.110.0.203) | ❌ | Сеть недостижима |

### GLM-5.1 HTTP 404 в OpenClaw (mem_004)
- Direct curl к `https://api.z.ai/api/coding/paas/v4` — РАБОТАЕТ для glm-5.1
- OpenClaw TUI и webchat — возвращает HTTP 404
- glm-4.7 работает в обоих
- **Проблема:** Маршрутизация внутри OpenClaw для glm-5.1, а не API
- **Дата:** 2026-03-30

### AIChat EPF для 1С — парсинг JSON (mem_005)
- `ТипJSON.НачалоОбъекта` — **НЕ СУЩЕСТВУЕТ** в 1С 8.3.27
- `HTTPОтвет.ПолучитьТелоКакСтроку()` — не принимает параметры в этой версии
- `ПолучитьСтрокуИзДвоичныхДанных(Данные, КодировкаТекста.UTF8)` — работает
- **Возможная проблема:** gzip-сжатие ответа от API → нужен ZipReader
- **Дата:** 2026-03-30

### Superpowers framework (mem_006)
- https://github.com/obra/superpowers — framework скиллов для AI-агентов
- brainstorming, writing-plans, TDD, subagent-driven-development
- **Записано в TODOS.md** для изучения (2026-03-26)

### Subagent labels — только реальные Beads ID (mem_009)
- 2026-04-01: Запустил subagent с меткой "bd:p1-fixes" — задачи с такими названиями нет в Beads
- Роман указал: subagent сессия в списке показывает бессмысленную метку
- **Правило:** При спавне subagent использовать реальный ID задачи (workspace-xxx) или создать родительскую задачу в Beads
- Не создавать искусственных меток-групп

### Когда Роман говорит "добавь в Туду" — создавать в Linear (mem_010)
- 2026-04-01: Роман написал "добавь в Туду" — я добавил задачи И сразу запустил subagent
- Роман хотел только записать, а я начал делать
- **Правило:** "добавить в Туду" = создать задачу в Linear (проект TODOTuda), ЖДАТЬ указаний. Не выполнять.

### Linear API
- **Key:** в auth-profiles.json (НЕ в git!)
- **Endpoint:** `https://api.linear.app/graphql`
- **Projects:** codexbar_win_enhance (`91b2d1ad6847`), TODOTuda (`7723bcfa-ebd6-4841-acdd-9a65f2c0f13f`)
- **Auth:** ключ БЕЗ "Bearer " — напрямую

### LCM контекст — порог 75%, не триггерти вручную (mem_011)
- 2026-04-01: Роман спросил можно ли запустить сжатие контекста вручную
- LCM запускается автоматически при достижении 75% контекста (threshold=0.75)
- Вручную запустить нельзя, команды `openclaw lcm` нет
- Сейчас 35% — далеко до порога

**НИКОГДА не запускать обновления, установки, перезагрузки сервисов и прочие серьёзные действия БЕЗ ЯВНОГО РАЗРЕШЕНИЯ Романа.**

Если что-то нужно сделать — предупреждаю Романа и ЖДУ ответа.

**Причина:** 2026-03-25 я сам полез проверять обновления OpenClaw вместо того чтобы дождаться запроса от Романа, что привело к проблемам с серверами. Роман просил только "строку для обновления ок" (JSON конфиг Ollama), а не обновление OpenClaw.


## Глоссарий

**Есть файл `ГЛОССАРИЙ.md`** — расшифровки аббревиатур Романа. Прежде чем спрашивать "что значит X" — заглянуть туда!

- **ЛКМ** = lossless-claw (LCM) — контекст-менеджмент OpenClaw (сжатие истории, хранение памяти сессий)

## JAWL (Джинкс/Dasha) — 2026-04-26

### Исправленный баг
- **SOUL.md** имел НЕПРАВИЛЬНЫЙ формат tool_calls
- Было: `{"name": "send_message", "parameters": {...}}`
- Должно быть: `{"thoughts": "...", "actions": [{"tool_name": "AiogramMessages.send_message", "parameters": {...}}]}`
- Файл: `/home/rem/JAWL/src/l3_agent/prompt/personality/SOUL.md`

### Настройки (оставлены как было)
- `ticks: 12, detailed_ticks: 3, tick_action_max_chars: 1000, max_tokens: 1200`

### Важные пути
- Точка входа: `python src/main.py` (НЕ `jawl.py` — требует TTY, не работает с nohup)
- Запуск: `/home/rem/JAWL/scripts/start-safe.sh`
- Qdrant lock: `/home/rem/JAWL/src/utils/local/data/vector_db/.lock`
- Dashboard: `/home/rem/JAWL/dashboard.py` (port 5000)
- Лог дашборда: `system.log` (был `startup_error.log` — исправлено)

### Rem's Telegram
- chat_id: 386235337
- Бот: @Jawl_Jinx_bot

### ByteRover issue
- brv curate SIGKILL при длинных строках — используй MEMORY.md вместо brv для больших записей
