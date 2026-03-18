# OpenViking Semantic Search Rule

## Trigger Patterns

This rule triggers when the user asks about memory with semantic search intent:

**Russian:**
- "вспомни"
- "вспомни что"
- "вспомни что я"
- "что я говорил про"
- "что я спрашивал про"
- "когда я спрашивал"
- "из памяти"
- "что записано"
- "что сохранил"
- "ты помнишь"

**English:**
- "remember"
- "what did i say about"
- "what did i ask about"
- "do you remember"

## Action

1. Extract the search query from the message
2. Call semantic search via OpenViking HTTP API
3. Return top 5 results with context
4. If no results found, fall back to text search

## Response Format

```
🔍 Из памяти:

[1] viking://resources/SOUL/.abstract.md
     This directory contains guidelines...

[2] viking://resources/MEMORY/.overview.md
     MEMORY is a comprehensive guide...

... и ещё 3 результата
```

## Configuration

- **Limit:** 5 results
- **Score threshold:** 0.5
- **Fallback:** text search if semantic returns empty
