"""Tests for Markdown → HTML formatter — Stage 6B."""

from __future__ import annotations

import pytest

from bot_trueconf.utils.formatter import markdown_to_html


class TestBasicFormatting:
    """Bold, italic, inline code."""

    def test_bold(self) -> None:
        result = markdown_to_html("**bold**")
        assert "<strong>bold</strong>" in result

    def test_italic(self) -> None:
        result = markdown_to_html("*italic*")
        assert "<em>italic</em>" in result

    def test_inline_code(self) -> None:
        result = markdown_to_html("`code`")
        assert "<code>code</code>" in result

    def test_empty_input(self) -> None:
        assert markdown_to_html("") == ""


class TestBlockElements:
    """Headings, code blocks, lists."""

    def test_heading(self) -> None:
        result = markdown_to_html("# Hello")
        assert "<h1>" in result or "Hello" in result

    def test_code_block(self) -> None:
        md = "```python\nprint('hi')\n```"
        result = markdown_to_html(md)
        assert "<code" in result
        assert "print" in result

    def test_unordered_list(self) -> None:
        md = "- one\n- two\n- three"
        result = markdown_to_html(md)
        assert "<ul>" in result
        assert "<li>" in result

    def test_ordered_list(self) -> None:
        md = "1. first\n2. second"
        result = markdown_to_html(md)
        assert "<ol>" in result
        assert "<li>" in result


class TestLinks:
    """Links."""

    def test_link(self) -> None:
        result = markdown_to_html("[OpenAI](https://openai.com)")
        assert '<a href="https://openai.com"' in result
        assert "OpenAI" in result


class TestXSSProtection:
    """XSS / sanitisation."""

    def test_script_tag_stripped(self) -> None:
        result = markdown_to_html('<script>alert("xss")</script>')
        assert "<script>" not in result
        assert "&lt;script" in result

    def test_javascript_href_blocked(self) -> None:
        result = markdown_to_html('[click](javascript:alert(1))')
        # Should not contain javascript: href
        assert "javascript:" not in result

    def test_onclick_stripped(self) -> None:
        result = markdown_to_html('<a onclick="alert(1)" href="https://example.com">x</a>')
        assert "onclick" not in result

    def test_iframe_stripped(self) -> None:
        result = markdown_to_html('<iframe src="evil.com"></iframe>')
        assert "<iframe>" not in result
