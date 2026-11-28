# Endereço antigo → Sketcher

Quando o repositório muda de nome (`ficha-cyberpunk-red` → `sketcher`), o GitHub **não** redireciona o site
antigo: `matheusbarraso.github.io/ficha-cyberpunk-red/` passaria a dar erro 404 — links de convite, o app
instalado no Android e o app do Windows 1.0 apontam pra ele.

Estes três arquivos resolvem isso. Eles vão num repositório **separado**, o site de usuário
`matheusbarraso.github.io` (que responde no endereço raiz, `matheusbarraso.github.io/`):

| Arquivo | O que faz |
|---|---|
| `index.html` | `matheusbarraso.github.io/` abre o Sketcher |
| `ficha-cyberpunk-red/index.html` | o endereço antigo leva pro novo, mantendo o `#…` (RPG do convite) |
| `404.html` | qualquer página antiga (`/ficha-cyberpunk-red/…`) também vai pro Sketcher |
| `.well-known/assetlinks.json` | confirma que o app do Android é deste site: o app abre sem a barra de endereço |
| `_config.yml` | faz o GitHub publicar a pasta `.well-known` (ela começa com ponto) |

Os dados de quem já usava (fichas, anotações) continuam: ficam no navegador por **domínio**, e o domínio
(`matheusbarraso.github.io`) é o mesmo nos dois endereços.

## Passo a passo
1. **Renomear este repositório**: Settings → General → Repository name → `sketcher` → Rename.
   O site passa a abrir em `https://matheusbarraso.github.io/sketcher/`.
2. **Criar o redirecionamento**: no GitHub, **+ → New repository** → nome exatamente
   `matheusbarraso.github.io` → Public → Create. Envie os arquivos desta pasta (com as pastas
   `ficha-cyberpunk-red` e `.well-known`) por **uploading an existing file** → Commit.
3. Nesse repositório novo: **Settings → Pages** → Source **Deploy from a branch** → **main** / **(root)** → Save.
4. Em 1–2 minutos, `https://matheusbarraso.github.io/ficha-cyberpunk-red/` já manda pro Sketcher.

O Firebase não precisa de nada: o domínio autorizado (`matheusbarraso.github.io`) é o mesmo.
