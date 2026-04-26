---
tags: []
keywords: []
importance: 56
recency: 1
maturity: draft
accessCount: 2
---
# Domain: one_c_development

## Purpose
1C:Enterprise platform development patterns and best practices.

## Scope
- 1C coding patterns, HTTP handling, EPF/ERF development, platform-specific APIs
- Excludes: general programming patterns, other enterprise platforms

## Ownership
rem

## Topics

### http_response_parsing
Patterns for parsing HTTP responses in 1C:Enterprise.

**Key Methods:**
- `ПолучитьСтрокуИзДвоичныхДанных()` — reliable body extraction
- `ПрочитатьJSON()` — JSON parsing
- `ZipReader` — gzip decompression

**Avoid:** `HTTPОтвет.ПолучитьТелоКакСтроку()` — unreliable

**Flow:** HTTP response → binary data → string conversion → JSON parsing

**Source:** AIChat EPF (`C:\Users\rem\AIChat-build\AIChat.epf`)

---
**See also:** `http_response_parsing/` for detailed implementation examples