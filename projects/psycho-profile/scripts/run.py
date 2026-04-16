#!/usr/bin/env python3
"""
Run psychological analysis on extracted user messages.
Supports chunked processing for large datasets.
"""

import json
import os
import sys
import time
from pathlib import Path
from datetime import datetime

PROJECT_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DATA_FILE = os.path.join(PROJECT_DIR, "data", "user_messages.jsonl")
PROMPT_FILE = os.path.join(PROJECT_DIR, "prompts", "analysis.md")
OUTPUT_DIR = os.path.join(PROJECT_DIR, "output")

# Model configurations: (provider_id, model_id, display_name)
MODELS = {
    "opus-4.6": ("opencode-anthropic", "claude-opus-4-6", "Claude Opus 4.6"),
    "sonnet-4.6": ("opencode-anthropic", "claude-sonnet-4-6", "Claude Sonnet 4.6"),
    "neko-opus-4.6": ("neko", "claude-opus-4-6", "Claude Opus 4.6 (Neko)"),
    "gpt-5.4": ("opencode-openai", "gpt-5.4", "GPT-5.4"),
    "gpt-5.4-neko": ("neko-openai", "gpt-5.4-2026-03-05", "GPT-5.4 (Neko)"),
    "glm-5": ("zai", "glm-5", "GLM-5"),
    "glm-5.1": ("zai", "glm-5.1", "GLM-5.1"),
    "minimax-m2.7": ("minimax", "minimax-m2.7", "MiniMax M2.7"),
    "hunter": ("openrouter", "hunter-alpha", "Hunter Alpha"),
    "kimi": ("openrouter", "moonshotai/kimi-k2.5", "Kimi K2.5"),
    "deepseek": ("deepseek", "deepseek-chat", "DeepSeek Chat"),
}


def load_messages(limit=None, max_tokens=100000):
    """Load messages, respecting token limit."""
    messages = []
    total_chars = 0
    with open(DATA_FILE, "r", encoding="utf-8") as f:
        for line in f:
            msg = json.loads(line.strip())
            text = msg.get("text", "")
            total_chars += len(text)
            messages.append(msg)
            if total_chars // 4 > max_tokens:
                break
            if limit and len(messages) >= limit:
                break
    return messages, total_chars


def build_prompt(messages, date_range=""):
    """Build the analysis prompt with user messages."""
    with open(PROMPT_FILE, "r", encoding="utf-8") as f:
        prompt_template = f.read()

    prompt_template = prompt_template.replace("{{date_range}}", date_range)

    # Format messages
    msg_texts = []
    for i, msg in enumerate(messages):
        ts = msg.get("timestamp", "")[:16]
        text = msg.get("text", "")
        # Truncate very long messages
        if len(text) > 500:
            text = text[:500] + "..."
        msg_texts.append(f"[{ts}] {text}")

    messages_block = "\n".join(msg_texts)

    return f"{prompt_template}\n\n---\n\n## Сообщения для анализа ({len(messages)} штук)\n\n{messages_block}"


def main():
    import argparse
    parser = argparse.ArgumentParser(description="Run psycho profile analysis")
    parser.add_argument("--model", default="opus-4.6", help=f"Model key: {', '.join(MODELS.keys())}")
    parser.add_argument("--max-tokens", type=int, default=100000, help="Max tokens of user data to include")
    parser.add_argument("--limit", type=int, default=None, help="Max number of messages")
    parser.add_argument("--output", default=None, help="Output filename")
    args = parser.parse_args()

    if args.model not in MODELS:
        print(f"Unknown model: {args.model}")
        print(f"Available: {', '.join(MODELS.keys())}")
        sys.exit(1)

    provider, model_id, display_name = MODELS[args.model]

    print(f"Loading messages (max {args.max_tokens} tokens)...")
    messages, total_chars = load_messages(limit=args.limit, max_tokens=args.max_tokens)
    date_range = f"{messages[0]['timestamp'][:10]} — {messages[-1]['timestamp'][:10]}" if messages else ""
    print(f"  Loaded {len(messages)} messages, {total_chars:,} chars (~{total_chars//4:,} tokens)")
    print(f"  Date range: {date_range}")

    prompt = build_prompt(messages, date_range)
    prompt_chars = len(prompt)
    print(f"  Prompt size: {prompt_chars:,} chars (~{prompt_chars//4:,} tokens)")

    # Save the full prompt for inspection
    os.makedirs(OUTPUT_DIR, exist_ok=True)
    prompt_path = os.path.join(OUTPUT_DIR, f".prompt_{args.model}.txt")
    with open(prompt_path, "w", encoding="utf-8") as f:
        f.write(prompt)
    print(f"  Prompt saved to: {prompt_path}")

    print(f"\nModel: {display_name} ({provider}/{model_id})")
    print(f"\nTo run via OpenClaw subagent:")
    print(f'  sessions_spawn with model="{provider}/{model_id}"')
    print(f'  task="Read the file {prompt_path} and provide the analysis as described."')
    print(f'\nTo run manually via curl, use the prompt file as input.')


if __name__ == "__main__":
    main()
