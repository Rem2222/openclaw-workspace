---
children_hash: 350d4c1e67eea1edf7f709683e0c346c619c0026ab77f3fd662e284b7fdbaeeb
compression_ratio: 0.44298245614035087
condensation_order: 2
covers: [context.md, http_response_parsing/_index.md]
covers_token_total: 456
summary_level: d2
token_count: 202
type: summary
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