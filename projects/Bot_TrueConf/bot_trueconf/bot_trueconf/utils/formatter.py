"""Markdown → HTML formatter for TrueConf bot — Stage 6B."""

from __future__ import annotations

import re

import mistune

# HTML tags allowed in TrueConf messages
_ALLOWED_TAGS = frozenset({
    "b", "i", "u", "s", "strong", "em", "a",
    "br", "p", "div", "span",
    "ul", "ol", "li",
    "pre", "code",
    "h1", "h2", "h3", "h4", "h5", "h6",
    "table", "thead", "tbody", "tr", "th", "td",
    "blockquote",
})

_ALLOWED_ATTRS: dict[str, frozenset[str]] = {
    "a": frozenset({"href", "title"}),
    "span": frozenset({"class"}),
    "code": frozenset({"class"}),
    "pre": frozenset({"class"}),
    "ol": frozenset({"start"}),
    "td": frozenset({"align"}),
    "th": frozenset({"align"}),
}

# Regex to match any HTML tag (opening, closing, or self-closing)
_TAG_RE = re.compile(
    r"<(/?)(\w+)((?:\s+[^>]*?)?)(/?)>",
    re.DOTALL,
)

# Regex to strip dangerous attribute values (javascript:, data:, vbscript:)
_DANGEROUS_ATTR_RE = re.compile(
    r"""\b(?:href|src|action)\s*=\s*["']?\s*(?:javascript|data|vbscript)\s*:""",
    re.IGNORECASE,
)


def _sanitize_html(html: str) -> str:
    """Strip disallowed tags and attributes, escape dangerous content."""

    def _replace_tag(m: re.Match) -> str:
        closing, tag, attrs_str, self_closing = m.group(1), m.group(2).lower(), m.group(3), m.group(4)

        if tag not in _ALLOWED_TAGS:
            return m.group(0)  # escape will happen below

        # Check allowed attrs
        allowed = _ALLOWED_ATTRS.get(tag, frozenset())
        if not closing and allowed and attrs_str:
            # Parse and filter attributes
            filtered = []
            for attr_match in re.finditer(r'(\w+)\s*=\s*(?:"([^"]*)"|\'([^\']*)\')', attrs_str):
                attr_name = attr_match.group(1).lower()
                if attr_name in allowed:
                    attr_val = attr_match.group(2) or attr_match.group(3) or ""
                    # Block dangerous URLs
                    if attr_name in ("href", "src", "action") and _DANGEROUS_ATTR_RE.match(f"{attr_name}=\"{attr_val}\""):
                        continue
                    filtered.append(f'{attr_name}="{attr_val}"')
            attrs_str = (" " + " ".join(filtered)) if filtered else ""
        elif not closing and not allowed:
            attrs_str = ""

        return f"<{closing}{tag}{attrs_str}{self_closing}>"

    # Process known tags, escape everything else
    result = []
    last = 0
    for m in _TAG_RE.finditer(html):
        # Append escaped text before this tag
        result.append(html[last : m.start()].replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;"))
        tag = m.group(2).lower()
        if tag in _ALLOWED_TAGS and not _DANGEROUS_ATTR_RE.search(m.group(0)):
            # Keep allowed tags with sanitized attrs
            result.append(_replace_tag(m))
        else:
            # Escape the whole tag
            result.append(m.group(0).replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;"))
        last = m.end()
    result.append(html[last:].replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;"))
    return "".join(result)


def markdown_to_html(text: str) -> str:
    """Convert Markdown to TrueConf-compatible HTML.

    Supports: bold, italic, code (inline & block), headings, lists, links,
    blockquotes, tables. XSS-safe: strips dangerous tags and attributes.

    Args:
        text: Markdown string.

    Returns:
        Sanitised HTML string suitable for TrueConf messages.
    """
    if not text:
        return ""

    md = mistune.create_markdown(
        escape=False,  # We handle sanitisation ourselves
        plugins=["table"],
    )
    raw_html = md(text)
    return _sanitize_html(raw_html)
