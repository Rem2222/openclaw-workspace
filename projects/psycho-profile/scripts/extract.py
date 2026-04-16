#!/usr/bin/env python3
"""
Extract all user messages from OpenClaw session JSONL files and LCM summaries.
Outputs a single JSONL file with user messages sorted by timestamp.
"""

import json
import os
import sys
from pathlib import Path
from datetime import datetime

SESSIONS_DIR = os.path.expanduser("~/.openclaw/agents/main/sessions")
OUTPUT_FILE = os.path.join(os.path.dirname(__file__), "..", "data", "user_messages.jsonl")


def clean_user_text(content):
    """Extract clean text from user message content, stripping metadata envelopes."""
    if isinstance(content, str):
        text = content
    elif isinstance(content, list):
        parts = []
        for part in content:
            if isinstance(part, dict) and part.get("type") == "text":
                parts.append(part.get("text", ""))
        text = "\n".join(parts)
    else:
        return ""

    # Strip common OpenClaw metadata wrappers
    # Remove "Sender (untrusted metadata):" blocks
    lines = text.split("\n")
    clean_lines = []
    skip_until = 0
    for i, line in enumerate(lines):
        if i < skip_until:
            continue
        if line.startswith("Sender (untrusted metadata):") or line.startswith("Conversation info (untrusted metadata):"):
            # Skip until we find a blank line or non-metadata line
            skip_until = i
            for j in range(i, min(i + 30, len(lines))):
                if j > i and lines[j].strip() and not lines[j].startswith("```") and not lines[j].startswith('"') and not lines[j].startswith("{") and not lines[j].startswith("}") and not lines[j].startswith("'") and not lines[j].startswith("sender") and not lines[j].startswith("label") and not lines[j].startswith("message_id") and not lines[j].startswith("reply") and not lines[j].startswith("timestamp") and not lines[j].startswith("topic") and not lines[j].startswith("has_") and not lines[j].startswith("Replied") and not lines[j].startswith("```"):
                    skip_until = j
                    break
            else:
                skip_until = len(lines)
            continue
        clean_lines.append(line)

    text = "\n".join(clean_lines).strip()
    return text


def extract_from_jsonl():
    """Extract user messages from session JSONL files."""
    messages = []
    sessions_dir = Path(SESSIONS_DIR)

    for jsonl_file in sorted(sessions_dir.glob("*.jsonl*")):
        try:
            with open(jsonl_file, "r", encoding="utf-8") as f:
                for line in f:
                    try:
                        record = json.loads(line.strip())
                    except json.JSONDecodeError:
                        continue

                    if record.get("type") != "message":
                        continue

                    msg = record.get("message", {})
                    if msg.get("role") != "user":
                        continue

                    content = msg.get("content", "")
                    text = clean_user_text(content)
                    if not text or len(text) < 3:
                        continue

                    # Skip system/heartbeat messages
                    if text in ("HEARTBEAT_OK", "/new", "/reset"):
                        continue
                    if text.startswith("/approve") or text.startswith("/reject"):
                        continue

                    timestamp = record.get("timestamp", "")
                    session_id = jsonl_file.stem.split("-topic")[0]

                    messages.append({
                        "timestamp": timestamp,
                        "session_id": session_id,
                        "source": "jsonl",
                        "text": text
                    })
        except Exception as e:
            print(f"Warning: error reading {jsonl_file.name}: {e}", file=sys.stderr)

    return messages


def main():
    os.makedirs(os.path.dirname(OUTPUT_FILE), exist_ok=True)

    print("Extracting user messages from JSONL sessions...")
    messages = extract_from_jsonl()
    print(f"  Found {len(messages)} user messages from JSONL")

    # Sort by timestamp
    messages.sort(key=lambda m: m.get("timestamp", ""))

    # Write output
    with open(OUTPUT_FILE, "w", encoding="utf-8") as f:
        for msg in messages:
            f.write(json.dumps(msg, ensure_ascii=False) + "\n")

    # Stats
    total_chars = sum(len(m["text"]) for m in messages)
    total_tokens_est = total_chars // 4
    date_range = ""
    if messages:
        first = messages[0].get("timestamp", "")[:10]
        last = messages[-1].get("timestamp", "")[:10]
        date_range = f"{first} — {last}"

    print(f"\n  Saved to: {OUTPUT_FILE}")
    print(f"  Messages: {len(messages)}")
    print(f"  Characters: {total_chars:,}")
    print(f"  Estimated tokens: {total_tokens_est:,}")
    print(f"  Date range: {date_range}")


if __name__ == "__main__":
    main()
