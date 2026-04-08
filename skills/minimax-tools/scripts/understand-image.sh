#!/usr/bin/bash
# MiniMax Image Understanding
# Использование: ./understand-image.sh "prompt" "image_url_or_path"

PROMPT="$1"
IMAGE_SOURCE="$2"

if [ -z "$PROMPT" ] || [ -z "$IMAGE_SOURCE" ]; then
  echo "Использование: $0 \"prompt\" \"image_url_or_path\""
  echo "Пример: $0 \"опиши картинку\" \"https://example.com/photo.jpg\""
  exit 1
fi

export PATH="$HOME/.local/bin:$PATH"
mcporter call "minimax.understand_image(prompt: \"$PROMPT\", image_source: \"$IMAGE_SOURCE\")"
