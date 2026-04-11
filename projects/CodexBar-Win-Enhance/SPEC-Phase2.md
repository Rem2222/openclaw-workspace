# Спецификация задачи: CodexBar-Win Phase 2 — MiniMax + OpenCode

## Описание задачи
Добавить два новых провайдера в CodexBar-Win: MiniMax и OpenCode. Исправить видимость процентов на иконке (чёрный текст вместо белого).

## Цель проекта
Расширить CodexBar-Win для отслеживания использования MiniMax и OpenCode alongside Claude, Codex, Z.AI.

## Ожидаемый результат
- MiniMax DataFetcher с получением session/weekly usage
- OpenCode DataFetcher с получением session/weekly usage  
- UI вкладки для каждого провайдера с правильными цветами
- Иконка с чёрным текстом процентов (видимость на любом фоне)
- Настройки для API токенов обоих провайдеров

## Ограничения
- Python 3.10+ (Windows совместимость)
- customtkinter для UI
- Та же архитектура что у ZaiDataFetcher
- Куки-дешифрование DPAPI для OpenCode (как у Claude/Codex)

## Критерии успеха
- [ ] MiniMax fetcher корректно получает данные из API
- [ ] OpenCode fetcher корректно получает данные (cookie или API)
- [ ] Вкладки отображаются корректно с правильными цветами
- [ ] Иконка показывает проценты чёрным текстом
- [ ] Настройки позволяют ввести токены
- [ ] Код проходит syntax check
- [ ] Tab switching работает без крашей

## Технические детали

### MiniMax API
- Endpoint: `https://api.minimax.chat/v1/usage` (или аналогичный)
- Auth: Bearer token
- Ответ содержит session/weekly percentages

### OpenCode
- Подход: API token или cookie-based (как Claude)
- OpenCode CLI хранит данные локально
- Возможно использование API endpoint для проверки лимитов

### Иконка — фикс
- Проценты должны быть чёрным текстом с белой обводкой (или наоборот, но чёрный на цветном фоне виднее)
- Текущий код: белый текст на цветном круге — не видно на светлых фонах

## Тип проекта
- [x] Десктопное приложение (доработка)
