# SDD: Глубокое погружение для опытного программиста

**Версия:** 2026-04-05  
**Источники:** Martin Fowler, Wikipedia, GitHub, OpenSpec.pro, Hashrocket  

---

## 1. Что такое SDD — суть

**Spec-Driven Development (SDD)** — методология, где **спецификация** становится primary artifact, а код — производным.

Ключевое отличие от традиционной разработки:
- **Традиционная:** docs = afterthought, code = truth
- **SDD:** spec = Single Source of Truth, code = output

Wikipedia definition:
> "a formal, machine-readable specification serves as the authoritative source of truth and the primary artifact from which implementation, testing, and documentation are derived."

### Почему это стало актуальным в 2026

Исследование GitClear (211M строк кода):
- Copy-paste кода вырос на **48%** после AI-инструментов
- Рефакторинг упал на **60%**
- "Vibe coding" создаёт неконтролируемый technical debt

AI агенты генерируют код **быстро, но без гарантий**. SDD = "рельсы" для этой скорости.

---

## 2. Три уровня строгости SDD

### Level 1: Spec-First
> "A well thought-out spec is written first, and then used in the AI-assisted development workflow"

Просто: написал спеку → отдал AI → получил код.

**Характеристики:**
- Spec существует **только для текущей задачи**
- После завершения — спека в мусорку
- Это **большинство текущих SDD-инструментов**
- Аналог: написал ТЗ → отдал программисту → ТЗ выбросил

### Level 2: Spec-Anchored
> "The spec is kept even after the task is complete, to continue using it for evolution and maintenance"

Спека **живёт** вместе с кодом. При изменениях — сначала правишь спеку.

**Характеристики:**
- Spec используется для **последующей поддержки**
- Регрессии trace-тся через spec
- Новый разработчик читает spec, не code archaeology
- **Tessl** = единственный tool с явной spec-anchored support

### Level 3: Spec-As-Source
> "The spec is the main source file over time, and only the spec is edited by the human, the human never touches the code"

Human редактирует **только спеку**. Код — GENERATED, с пометкой "DO NOT EDIT".

**Характеристики:**
- 1 spec : 1 code file (в текущей реализации Tessl)
- Полная инверсия: код — transient artifact
- Аналог: CASE-tools 1990-х, MDA (Model-Driven Architecture)

**⚠️ WARNING от Martin Fowler:** Spec-as-source имеет риски **и** MDD (недетерминизм), **и** LLM (галлюцинации). Это "the worst of both worlds" если делать неаккуратно.

---

## 3. SDD vs TDD vs BDD vs MDD

### SDD vs TDD

| Аспект | TDD | SDD |
|--------|-----|-----|
| Focus | Implementation correctness | Intent & requirements |
| Trigger | "Write test first" | "Write spec first" |
| Test generation | SDD генерирует тесты из spec | TDD = manual |
| Scope | Per-function/unit | System-level |
| AI role | Не применимо напрямую | Core methodology |

**Важно:** TDD и SDD **дополняют**, не конкурируют. SDD генерирует тесты, TDD их исполняет.

### SDD vs BDD

| Аспект | BDD | SDD |
|--------|-----|-----|
| Focus | User-facing behavior | Technical specification |
| Format | Gherkin (Given/When/Then) | Markdown, YAML, DSL |
| Audience | Business + Tech | Primarily AI agents |
| Traceability | Feature → Scenario | Requirement → Spec |

**BDD** = spec для людей. **SDD** = spec для AI.

### SDD vs MDD (Model-Driven Development)

**Это critical comparison — многие это упускают.**

MDD (2000-е):
- UML модель = spec
- Кодогенератор → код
- Проблемы:僵硬 (inflexible), overhead, tool lock-in

**Что LLM меняет:**
- Не нужен parseable DSL
- Natural language = valid spec
- Не нужен custom code generator
- LLM = universal code generator

**Риски spec-as-source (от Martin Fowler):**
- MDD давал parseable structure → tool support для валидации spec
- LLM = non-deterministic → нет гарантий consistency
- **Result:** "Inflexibility AND non-determinism" = worst of both worlds

---

## 4. Три уровня SDD-инструментов

### Tool 1: Kiro (AWS)

**Type:** VS Code plugin  
**Positioning:** Lightweight, spec-first only  
**Lock-in:** Claude only, proprietary  

**Workflow:**
```
Requirements → Design → Tasks
```

**Характеристики:**
- 3 файла markdown (по одному на шаг)
- User Story в "As a..." формате
- Acceptance criteria в "GIVEN/WHEN/THEN"
- Memory bank = "steering" (product.md, structure.md, tech.md)

**Проблемы (от Martin Fowler):**
- Для small bug = sledgehammer (4 user stories, 16 acceptance criteria)
- "As a developer, I want the transformation function to handle edge cases gracefully"
- **Это overkill для простых задач**

### Tool 2: GitHub Spec-Kit

**Type:** CLI + templates  
**Positioning:** Heavy, constitution-based  
**Lock-in:** Python required  

**Workflow:**
```
Constitution → Specify → Plan → Tasks
```

**Структура:**
- **Constitution** = immutable principles (rules файлы)
- **Specify** = functional requirements
- **Plan** = technical design
- **Tasks** = checklist для implementation
- Много markdown файлов (~800 строк на change)

**Особенности:**
- Auto-branching (каждый change = отдельная ветка)
- Heavy checklists в файлах
- Research step для анализа существующего кода

**Проблемы (от Martin Fowler):**
- Слишком verbose — "rather review code than all these markdown files"
- Agent frequently ignores instructions (создаёт дубликаты)
- Brownfield = сложно внедрить
- Не spec-anchored по факту (change = branch lifetime, не feature lifetime)

### Tool 3: Tessl Framework

**Type:** CLI + MCP server  
**Positioning:** Spec-anchored, spec-as-source (future)  
**Lock-in:** MIT licensed  

**Workflow:**
```
Spec → Build → Test
```

**Особенности:**
- **Единственный** с настоящим spec-anchored
- Spec с @generate/@test tags
- API section = interfaces для межмодульного взаимодействия
- Generated code с пометкой "// GENERATED FROM SPEC - DO NOT EDIT"
- Currently: 1 spec : 1 code file (beta)

**Проблемы:**
- Non-determinism even с same spec (LLM variance)
- Still in private beta
- Spec-as-source = early experiments

### Tool 4: OpenSpec

**Type:** CLI + AI commands  
**Positioning:** Universal, brownfield-friendly, lightweight  
**Lock-in:** MIT, 20+ AI assistants  

**Workflow:**
```
/opsx:propose → Review → /opsx:apply → /opsx:archive
```

**Артефакты (всего ~250 строк на change):**
- `proposal.md` — WHY
- `specs/` — WHAT (delta specs)
- `design.md` — HOW
- `tasks.md` — checklist

**Особенности:**
- 5 минут setup vs 30 минут Spec-Kit
- No Python (Node.js only)
- Fluid workflow — можно редактировать в любой момент
- Brownfield-first (для существующих проектов)
- 3 команды vs 8 у Spec-Kit

**Hashrocket benchmark:**
```
Same change:
- Spec-Kit: ~800 lines, slower
- OpenSpec: ~250 lines, faster
```

---

## 5. Сравнительная таблица

| Dimension | OpenSpec | Spec-Kit | Kiro | Tessl |
|-----------|----------|----------|------|-------|
| **Setup** | 5 min | 30 min | 15 min | N/A beta |
| **Language** | TypeScript | Python | Proprietary | Go? |
| **Lock-in** | None | None | AWS+Claude | None |
| **AI tools** | 20+ | Any | Claude only | Any |
| **Brownfield** | ✅ Best | ❌ Hard | ❌ | ⚠️ |
| **Greenfield** | ⚠️ OK | ✅ Best | ✅ | ⚠️ |
| **Output verbosity** | 250 lines | 800 lines | Moderate | N/A |
| **Learning curve** | Low | Medium | Medium | High |
| **Spec-anchored** | ⚠️ Basic | ❌ | ❌ | ✅ Full |
| **Spec-as-source** | ❌ | ❌ | ❌ | ✅ Future |

---

## 6. Когда что использовать

### Choose OpenSpec If:
- ✅ Existing/legacy codebase (brownfield)
- ✅ Want setup in 5 minutes
- ✅ Prefer concise specs
- ✅ Small to medium team
- ✅ Value speed over comprehensive docs
- ✅ Don't want Python

### Choose Spec-Kit If:
- ✅ New project from scratch
- ✅ Clear role separation (PO vs Developer)
- ✅ Junior developers need guidance
- ✅ Want extensive documentation
- ✅ GitHub ecosystem

### Choose Kiro If:
- ✅ Already in AWS + Claude ecosystem
- ✅ OK with vendor lock-in
- ✅ Want integrated IDE experience

### Choose Tessl If:
- ✅ Want true spec-anchored
- ✅ Willing to be early adopter (beta)
- ✅ Believe in spec-as-source future

### Choose NO SDD Tool If:
- ❌ Small, simple projects
- ❌ Exploratory/prototyping work
- ❌ Team resistant to ceremony

---

## 7. Критические наблюдения Martin Fowler

### "False Sense of Control"
> "Even with all these files and templates and prompts and workflows and checklists, I frequently saw the agent ultimately not follow all the instructions."

Agent regularly **ignore spec instructions** или **follow them too eagerly**. Large context window ≠ AI понимает всё в нём.

### "Review Overload"
Spec-Kit создаёт **много markdown файлов** — repetitive, verbose. Рецензирование spec = может быть **тяжелее** чем рецензирование кода.

### "One Size Doesn't Fit All"
Три инструмента = три разных подхода. **Ни один** не подходит для всех problem sizes:
- Kiro для small bug = overkill (16 acceptance criteria)
- Spec-Kit для medium feature = overkill
- Нужен **гибкий workflow** под размер задачи

### "AI Frequently Ignores Spec"
Spec-Kit делает research step, но agent **ignored notes** что classes already exist — создаёт дубликаты.

### "MDD Parallel"
Spec-as-source = MDD 1990-х:
- MDD: UML model → code generator → code
- LLM SDD: Natural language spec → LLM → code

MDD failed для business applications. **Вопрос:** будет ли spec-as-source успешнее?

---

## 8. SDD и 1С разработка

### Как это применимо к 1С

**Специфика 1С:**
- Метаданные 1С = уже структурированные "specs"
- Конфигурация хранит структуру объектов
- BSL = язык с слабой типизацией
- AI hallucination risk высокий для 1С-специфики

**Где SDD поможет:**
1. **Интеграции** — внешние API, обмены данными
2. **Сложные алгоритмы** — расчёты, регистры
3. **Сложные формы** — управляемые формы с большим количеством элементов
4. **Документация** — требования к системе

**cursor_rules_1c SDD-интеграции:**
```
- memory-bank/ — cursor-memory-bank compatibility
- openspec/specs/ — OpenSpec specs directory
- spec.md, constitution.md — spec-kit compatibility
```

### Как NOT использовать SDD в 1С

❌ Small доработки (добавить реквизит)  
❌ Bug fixes  
❌ Простой код (обработка табличной части)  
❌ Рефакторинг без изменения логики  

---

## 9. Практический пример: OpenSpec workflow

### Установка
```bash
npm install -g @fission-ai/openspec@latest
cd your-project
openspec init --tools cursor  # или claude, windsurf, etc.
```

### Proposal
```
/opsx:propose Add user authentication
```

Генерирует:
```
openspec/changes/add-auth/
├── proposal.md       # WHY: бизнес-причина
├── specs/
│   └── auth/spec.md  # WHAT: requirements + scenarios
├── design.md         # HOW: technical approach
└── tasks.md          # Checklist
```

### Review
Человек проверяет и редактирует файлы.

### Apply
```
/opsx:apply
```

AI исполняет таски по одной, читая только relevant context.

### Archive
```
/opsx:archive
```

Change → `openspec/changes/archive/2025-01-24-add-auth/`
Specs merged → `openspec/specs/auth/spec.md`

---

## 10. Delta Specs — ключевая концепция

Delta specs показывают **изменения** относительно текущего состояния:

```markdown
## ADDED Requirements

### Requirement: Two-Factor Authentication
The system MUST require a second factor during login.

#### Scenario: OTP required
- GIVEN a user with 2FA enabled
- WHEN the user submits valid credentials
- THEN an OTP challenge is presented

## MODIFIED Requirements

### Requirement: Session Timeout
The system SHALL expire sessions after 30 minutes.
(Previously: 60 minutes)

## REMOVED Requirements

### Requirement: Remember Me
(Deprecated in favor of 2FA)
```

**Преимущество:** Traceable changes, понятно что было до.

---

## 11. Лучшие модели для SDD

SDD требует **high-reasoning** моделей:

| Tier | Models | Notes |
|------|--------|-------|
| **Recommended** | Opus 4.5, GPT 5.2 | Best reasoning, lowest hallucination |
| **OK** | Sonnet 4.5, GLM-5 | Balance cost/quality |
| **Minimum** | Haiku 4.5 | May miss subtle requirements |
| **Avoid** | Fast/cheap models | High hallucination risk |

**Rationale:** Specs — это constraints. Cheap models могут "creatively interpret" constraints.

---

## 12. Aggregate Learning

### What works:
1. ✅ Spec-first = definitely valuable
2. ✅ Specs как SSOT = reduces hallucination scope
3. ✅ Small-step execution (one task at a time)
4. ✅ Brownfield support (OpenSpec best)
5. ✅ Delta specs для traceability

### What doesn't work:
1. ❌ Overly verbose specs (spec-kit critique)
2. ❌ Heavy upfront design для small problems
3. ❌ Full spec-as-source сейчас (non-determinism risk)
4. ❌ Expecting AI to follow all instructions perfectly
5. ❌ One workflow fits all sizes

### Red flags to watch:
- Agent creating duplicates (ignoring existing code)
- Agent ignoring constitution/rules
- Review fatigue from too many markdown files
- False confidence from "structured" process

---

## 13. Источники и дальнейшее чтение

### Primary Sources
1. **Martin Fowler** — "Understanding Spec-Driven-Development: Kiro, spec-kit, and Tessl"  
   https://martinfowler.com/articles/exploring-gen-ai/sdd-3-tools.html

2. **Wikipedia** — "Spec-driven development"  
   https://en.wikipedia.org/wiki/Spec-driven_development

3. **OpenSpec** — Official docs  
   https://openspec.pro

4. **GitHub Spec-Kit** — GitHub blog post  
   https://github.blog/ai-and-ml/generative-ai/spec-driven-development-with-ai-get-started-with-a-new-open-source-toolkit/

5. **Tessl** — Documentation  
   https://docs.tessl.io/

### Comparisons
- **openspec.pro/comparison** — Full comparison table
- **Hashrocket** — Practical side-by-side OpenSpec vs Spec-Kit
- **Intent-driven.dev** — Spec Kit vs OpenSpec deep dive

### Related
- **MDD History** — "Model-Driven Development Challenges and Solutions" (MetaCase)
- **GitClear Report** — Code quality trends 2025-2026
- **cursor_rules_1c** — SDD integrations for 1С

---

## Резюме для 1С-разработчика

SDD = **Spec-First** + **SSOT** + **AI-as-coder**.

**Когда использовать:**
- Крупные интеграционные проекты
- Проекты с командой >1 человека
- Когда важна traceable documentation

**Когда НЕ использовать:**
- Small hotfixes
- Прототипы
- Один разработчик, быстрые изменения

**Tool choice для 1С:**
- **OpenSpec** — лучший для brownfield, легковесный
- **cursor_rules_1c** — имеет встроенную SDD-интеграцию

**Важно:** SDD не заменяет программирование — это **фреймворк** для работы с AI-агентами. Опытный 1С-разработник понимает когда нужен контроль, а когда можно довериться AI.
