#!/usr/bin/env bash
# Corre uma vez, dentro desta pasta: bash setup.sh
set -e
command -v wrangler >/dev/null || npm i -g wrangler
wrangler login
echo ">> Se o wrangler perguntar para adicionar a base de dados ao wrangler.toml, responde NAO"
OUT=$(wrangler d1 create nomatrix-leads 2>&1 || true); echo "$OUT"
ID=$(echo "$OUT" | grep -oE '[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}' | head -1)
[ -n "$ID" ] && sed -i.bak "s/COLA_AQUI_O_ID/$ID/" wrangler.toml
wrangler d1 execute nomatrix-leads --remote --file=schema.sql
DEP=$(wrangler deploy 2>&1 | tee /dev/stderr)
URL=$(echo "$DEP" | grep -oE 'https://[a-zA-Z0-9.-]+\.workers\.dev' | head -1)
echo "Worker: $URL"
[ -n "$URL" ] && sed -i.bak "s|https://SEU-WORKER.workers.dev|$URL|" site/diagnostico.html
read -rp "Token do bot do Telegram (do @BotFather): " V; printf %s "$V" | wrangler secret put TG_TOKEN
read -rp "O teu chat id do Telegram (numero, do @userinfobot): " V; printf %s "$V" | wrangler secret put TG_CHAT
read -rp "Chave da API do Resend (conta criada com willy.simbine@gmail.com): " V; printf %s "$V" | wrangler secret put RESEND_KEY
echo "Worker pronto. O site (pasta site/) já tem o link do Worker. Agora segue o passo 2 do LEIA-ME para o pôr em nomatrix.github.io"
