# App da Ficha Cyberpunk RED (Windows)

O app abre o site online numa janela própria. Toda versão nova do site já aparece no app — não precisa reinstalar.

## Baixar
Na página **Releases** do repositório, pegue a versão mais nova:
- `Ficha-CPR-Instalador-x.y.z.exe` — instala, cria atalho na área de trabalho e no menu Iniciar.
- `Ficha-CPR-Portatil-x.y.z.exe` — roda direto, sem instalar.

O Windows pode avisar "O Windows protegeu o computador" (o app não tem assinatura digital paga). Clique em **Mais informações → Executar assim mesmo**.

## Seus dados
O app guarda a ficha no próprio app (separado do navegador). Pra levar a ficha do navegador pro app: no site, abra o menu → **Ficha → Salvar backup completo**; no app, menu → **Ficha → Carregar backup**.

## Gerar uma versão nova do app
Só é preciso quando mudar algo do próprio app (este diretório). Suba o número em `package.json` → `version` e envie pro GitHub: a ação **App Windows** monta o instalador e cria a Release `app-vX.Y.Z` sozinha. Também dá pra rodar à mão em **Actions → App Windows → Run workflow**.

Pra testar no PC: `npm install` e `npm start` dentro desta pasta.
