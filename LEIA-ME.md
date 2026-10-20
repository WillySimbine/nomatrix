# Sistema de diagnóstico Nomatrix

- `site/index.html`, `site/diagnostico.html`, `site/logo.png`: o site (vai para o GitHub)
- `worker.js`, `schema.sql`, `wrangler.toml`, `setup.sh`: base de dados e envio dos PDFs (vai para a Cloudflare, NUNCA para o GitHub)

## Passo 1: Worker na Cloudflare (grátis)
Antes: cria um bot no Telegram com o @BotFather (guarda o token, depois manda /start ao bot) e pede o teu chat id ao @userinfobot. O telemóvel não serve, os bots só enviam para o chat id. Cria também conta grátis em resend.com com willy.simbine@gmail.com e gera uma chave de API. Instala o Node.js (nodejs.org).
Depois corre `bash setup.sh`. No fim, o `site/diagnostico.html` já fica com o link do teu Worker.

## Passo 2: Site em nomatrix.github.io (grátis)
1. Cria conta em github.com com o nome de utilizador **nomatrix** (se estiver ocupado, escolhe outro e o endereço passa a ser esse nome + .github.io)
2. New repository, com o nome exatamente `nomatrix.github.io`, público
3. Clica em "uploading an existing file" e arrasta SÓ o conteúdo da pasta `site/` (index.html, diagnostico.html, logo.png). Commit
4. Settings, Pages, Deploy from a branch, main, pasta (root), Save
5. Em 1 a 2 minutos o site abre em https://nomatrix.github.io

Se alterares o site, volta ao repositório e substitui o ficheiro.

## Como funciona
Cada resposta grava-se na base de dados. Quem fica 10 minutos parado recebe PDF automático no Telegram e no email (verificação de 5 em 5 minutos, por isso chega entre 10 e 15 minutos depois). Quem termina dispara o PDF logo.

## Depois, se quiseres domínio próprio
Compras o domínio e ligas ao GitHub Pages (Settings, Pages, Custom domain). O site mantém-se igual.
