---
title: "NaiveProxy Guide by swrneko"
source: https://gist.github.com/swrneko/09e60de4d3d8f9a551a1a2c1ab9283c5
video: https://www.youtube.com/watch?v=vnTgnL1tskw
date: 2026-04-07
author: swrneko
tags: [naiveproxy, dpi-bypass, censorship, vpn]
---

# NaiveProxy Guide by swrneko

## Source
- **Видео:** VLESS всё. Лучший способ обхода DPI в 2026: NaiveProxy
- **Gist:** https://gist.github.com/swrneko/09e60de4d3d8f9a551a1a2c1ab9283c5

## Quick Summary
VLESS/XRay устарел. NaiveProxy — лучший способ обхода DPI в 2026 году.

## Key Points
- Использует сетевой стек Chromium для маскировки трафика
- Защита от: fingerprinting, TLS fingerprinting, active probing, length-based analysis
- Обход блокировок через application fronting

## Server Setup (gist)
1. SSH ключи, обновление системы
2. Включить Google BBR
3. Установить Go 1.22+
4. Собрать Caddy с forwardproxy плагином
5. Создать Caddyfile с логином/паролем
6. Systemd сервис

## Clients
- v2rayN (Windows)
- NekoRay (Windows/Linux)
- NekoBox (Android)

## Hosting Providers
- RuVDS: https://ruvds.com
- 62yun: https://62yun.ru
- Zomro: https://zomro.com
- Reg.ru: https://www.reg.ru

## WARP Integration (optional)
Для скрытия IP сервера или обхода регионального контента.
