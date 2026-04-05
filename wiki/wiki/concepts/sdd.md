# SDD — Spec-Driven Development

**Spec-Driven Development** — подход к разработке, где спецификация является первичным артефактом, а код генерируется из неё.

## Три уровня SDD

| Уровень | Описание | Инструменты |
|---------|---------|-------------|
| **Spec-first** | Сначала пишешь спецификацию, потом код | Все инструменты |
| **Spec-anchored** | Спецификация остаётся после разработки — для поддержки и эволюции | Tessl |
| **Spec-as-source** | Спецификация — единственный файл для редактирования; код генерируется | Tessl (future) |

## Ключевые принципы

1. **Single Source of Truth (SSOT)** — спецификация единственный источник требований
2. **Constraint-Driven** — AI работает в рамках спецификации
3. **Traceability** — каждый код trace-тся к конкретному пункту спецификации

## Инструменты SDD

- [[SDD инструменты сравнение]]
- [[OpenSpec]]
- [[Kiro]]
- [[Spec-kit]]
- [[Tessl]]

## SDD vs Vibe Coding

| Vibe Coding | SDD |
|------------|-----|
| Интуитивный, быстрый | Структурированный, документированный |
| 0 → 1 прототипы | 1 → n итерации |
| Код быстро генерируется | Код стабилен и документирован |
| Сложно масштабировать | Легко масштабировать |

## Источники

- [Martin Fowler: Understanding Spec-Driven-Development](https://martinfowler.com/articles/exploring-gen-ai/sdd-3-tools.html)
- [OpenSpec](https://openspec.pro/)
- [QubitTool Complete Guide to Spec Coding](https://qubittool.com/blog/spec-coding-complete-guide)
