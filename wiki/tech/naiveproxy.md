---
title: "NaiveProxy"
description: "Лучший способ обхода DPI в 2026. Использует сетевой стек Chromium для маскировки трафика."
tags: [dpi-bypass, censorship, vpn, chromium, caddy]
related: [[v2ray]], [[vless]], [[wireguard]]
---

# NaiveProxy

**URL:** https://github.com/klzgrad/naiveproxy

## Что это

NaiveProxy использует сетевой стек Chromium для маскировки трафика с высокой устойчивостью к цензуре и низкой обнаруживаемостью. Повторное использование стека Chrome также обеспечивает лучшие практики в производительности и безопасности.

## Защита от обнаружения

NaiveProxy защищает от следующих атак:

| Атака | Защита |
|-------|--------|
| Website fingerprinting / traffic classification | Mitigated by traffic multiplexing in HTTP/2 |
| TLS parameter fingerprinting | Defeated by reusing Chrome's network stack |
| Active probing | Defeated by application fronting |
| Length-based traffic analysis | Mitigated by length padding |

## Архитектура

```
[Browser → Naïve client] ⟶ Censor ⟶ [Frontend → Naïve server] ⟶ Internet
```

Frontend сервером может быть любой известный reverse proxy, умеющий маршрутизировать HTTP/2 трафик по HTTP authorization headers. Известые варианты: **Caddy** с forwardproxy плагином и **HAProxy**.

## Установка сервера

### 1. Подключаемся к серверу

```bash
ssh-copy-id root@<SERVER-IP-ADDRESS>
ssh root@<SERVER-IP-ADDRESS>
```

### 2. Обновляем систему

```bash
apt update -y && apt upgrade -y
```

### 3. Включаем Google BBR

```bash
echo "net.core.default_qdisc=fq" >> /etc/sysctl.conf
echo "net.ipv4.tcp_congestion_control=bbr" >> /etc/sysctl.conf
sysctl -p
```

### 4. Устанавливаем Go

```bash
wget https://go.dev/dl/go1.22.0.linux-amd64.tar.gz
rm -rf /usr/local/go && tar -C /usr/local -xzf go1.22.0.linux-amd64.tar.gz
echo 'export PATH=$PATH:/usr/local/go/bin' >> ~/.profile
source ~/.profile
```

### 5. Собираем Caddy с forwardproxy плагином

```bash
go install github.com/caddyserver/xcaddy/cmd/xcaddy@latest

# Увеличиваем /tmp если мало места
mkdir /root/tmp
export TMPDIR=/root/tmp

~/go/bin/xcaddy build --with github.com/caddyserver/forwardproxy@caddy2=github.com/klzgrad/forwardproxy@naive
```

### 6. Создаём конфиг

```bash
mkdir -p /etc/caddy
```

Генерируем логин и пароль:

```bash
apt install openssl -y
openssl rand -base64 64 | tr -dc 'A-Za-z0-9' | head -c 16; echo  # логин
openssl rand -base64 64 | tr -dc 'A-Za-z0-9' | head -c 16; echo  # пароль
```

Создаём Caddyfile (заменить your-domain.com, email, user, pass, и сайт-маскировку):

```caddy
:443, your-domain.com
tls example@example.com

route {
  forward_proxy {
    basic_auth user pass
    hide_ip
    hide_via
    probe_resistance
  }

  reverse_proxy https://demo.cloudreve.org {
    header_up Host {upstream_hostport}
    header_up X-Forwarded-Host {host}
  }
}
```

### 7. Systemd сервис

```bash
mv caddy /usr/bin/caddy
chmod +x /usr/bin/caddy

cat <<EOF > /etc/systemd/system/caddy.service
[Unit]
Description=Caddy with NaiveProxy
After=network.target network-online.target
Requires=network-online.target

[Service]
Type=notify
User=root
Group=root
ExecStart=/usr/bin/caddy run --environ --config /etc/caddy/Caddyfile
ExecReload=/usr/bin/caddy reload --config /etc/caddy/Caddyfile --force
TimeoutStopSec=5s
LimitNOFILE=1048576
LimitNPROC=512
PrivateTmp=true
ProtectSystem=full
AmbientCapabilities=CAP_NET_BIND_SERVICE
Restart=always
RestartSec=5s

[Install]
WantedBy=multi-user.target
EOF

systemctl daemon-reload
systemctl enable --now caddy
```

## Клиенты

### Windows
- [v2rayN](https://github.com/2dust/v2rayN) — GUI клиент
- [NekoRay](https://github.com/MatsuriDayo/nekoray/releases) — Qt-based клиент

### Android
- [NekoBox](https://github.com/MatsuriDayo/NekoBoxForAndroid/releases)

## Хостинг провайдеры

- 🇷🇺 [RuVDS](https://ruvds.com) — российский VPS
- 🇨🇳 [62yun](https://62yun.ru) — китайский VPS
- 🇷🇺 [Zomro](https://zomro.com) — VPS
- 🇷🇺 [Reg.ru](https://www.reg.ru) — домены и VPS

## WARP (опционально)

Для скрытия IP сервера или разблокировки регионального контента:

```bash
apt install -y curl gnupg lsb-release

curl -fsSL https://pkg.cloudflareclient.com/pubkey.gpg | gpg --yes --dearmor --output /usr/share/keyrings/cloudflare-warp-archive-keyring.gpg
echo "deb [signed-by=/usr/share/keyrings/cloudflare-warp-archive-keyring.gpg] https://pkg.cloudflareclient.com/ $(lsb_release -cs) main" | tee /etc/apt/sources.list.d/cloudflare-client.list
apt update && apt install cloudflare-warp -y

warp-cli registration new
warp-cli mode proxy
warp-cli connect
```

В Caddyfile добавить `upstream socks5://127.0.0.1:40000` в блок forward_proxy.

## Источник

- Видео: [VLESS всё. Лучший способ обхода DPI в 2026: NaiveProxy](https://www.youtube.com/watch?v=vnTgnL1tskw)
- Gist: https://gist.github.com/swrneko/09e60de4d3d8f9a551a1a2c1ab9283c5
