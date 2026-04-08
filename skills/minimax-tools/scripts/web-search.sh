#!/usr/bin/bash
# MiniMax Web Search
# Использование: ./web-search.sh "запрос"

QUERY="$1"

if [ -z "$QUERY" ]; then
  echo "Использование: $0 \"запрос\""
  exit 1
fi

export PATH="$HOME/.local/bin:$PATH"
mcporter call "minimax.web_search(query: \"$QUERY\")"
