---
title: "Cursor + Proxy Fix"
description: "Как починить доступ к Claude Sonnet в Cursor через Hiddify / OneXRay (VLESS/Xray)"
tags: [cursor, proxy, vless, xray, onexray, hiddify, claude]
related: [[naiveproxy]], [[cursor-rules-1c]]
---

# Cursor + Proxy Fix

**Автор:** Дарт Вейдер  
**Источник:** forwarded message (2026-04-08)

## Проблема

Через **OpenVPN** модель Sonnet работала отлично, а через **Hiddify** или **OneXRay** — выдавала ошибку или блокировалась.

### Причины

1. **TUN vs System Proxy:** OpenVPN работает на уровне ядра macOS и создаёт жёсткий VPN-туннель. Весь трафик системы идёт туда. Hiddify и другие Xray-клиенты по умолчанию работают как «Системный прокси». Cursor (написанный на Node.js) **игнорирует системные прокси** и пытается идти в сеть напрямую.

2. **Конфликт HTTP/2 и Xray:** Cursor использует **HTTP/2** для связи со своими серверами ИИ. Ядро Xray часто некорректно обрабатывает мультиплексирование HTTP/2 трафика от Node.js, из-за чего пакеты теряются и соединение сбрасывается.

---

## Решение

### Шаг 1. Использование правильного клиента

Перейти на клиент, который корректно создаёт системный VPN-профиль в macOS:
- **OneXRay** (Mac App Store)
- **Hiddify в режиме TUN**

### Шаг 2. Настройка Cursor

Добавить в `settings.json` (Cmd + Shift + J → кнопка открытия JSON в правом верхнем углу):

```json
{
  "http.proxyStrictSSL": false,
  "http.proxySupport": "off",
  "http.systemCertificates": true,
  "cursor.general.disableHttp2": true
}
```

### Что делает каждая настройка

| Настройка | Зачем |
|-----------|-------|
| `"cursor.general.disableHttp2": true` | **Самое важное.** Отключает HTTP/2 для API-запросов Cursor, переводит на HTTP/1.1. Решает проблему потери пакетов через Xray/VLESS. |
| `"http.proxySupport": "off"` | Запрещает Cursor'у искать свои пути для проксирования. Он начинает отправлять трафик в системный VPN-туннель. |
| `"http.systemCertificates": true` | Заставляет Cursor доверять системным сертификатам macOS, чтобы туннель не воспринимался как MITM. |
| `"http.proxyStrictSSL": false` | Отключает параноидальную проверку SSL, которая часто ломается при проксировании. |

---

## Если проблема вернётся

1. Убедитесь что VPN-клиент включен и `claude.ai` открывается в браузере
2. Проверьте что 4 строчки всё ещё в `settings.json`
3. Полностью перезапустите Cursor (`Cmd + Q`)

---

## Связанные темы

- [[NaiveProxy]] — альтернативный способ обхода DPI
- [[cursor-rules-1c]] — правила Cursor для 1С
