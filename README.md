# Sketcher

Plataforma de RPG no navegador: você escolhe o RPG e tem a ficha, as anotações, a história, os livros e as
sessões com o mestre daquele sistema. Hoje: **Cyberpunk RED** (a ficha oficial, igual ao PDF) e **Sistema
livre** (a ficha que você monta, pra qualquer RPG). Começou como a Ficha Cyberpunk RED.

- Site: https://matheusbarraso.github.io/ficha-cyberpunk-red/ — vai pra `/sketcher/` quando este repositório for
  renomeado (passo a passo e redirecionamento do endereço antigo em [`docs/endereco-antigo/`](docs/endereco-antigo/LEIA-ME.md))
- App do Windows: página **Releases** deste repositório (pasta [`app/`](app/))
- App do Android: `Sketcher-Android-x.y.z.apk` na página **Releases** (pasta [`app-android/`](app-android/)); ou abra o site no Chrome → ⋮ → **Instalar app**

## Antes de mexer

O `index.html` da raiz é **gerado** — não edite ele. O código fica em [`src/`](src/) e o build monta o site:

```
npm run build      # gera index.html + arquivos públicos na raiz
npm run conferir   # confere se a raiz está em dia com src/
```

Testes (precisa de `pip install playwright pillow` e um Chrome):

```
npm run testes     # testes de ponta a ponta
npm run visual     # compara as telas com a base (tests/visual.py base pra criar a base)
```

Como o projeto está organizado (e como acrescentar um RPG): [`docs/ARQUITETURA.md`](docs/ARQUITETURA.md).
Configuração do Firebase: [`docs/FIREBASE.md`](docs/FIREBASE.md). Histórico da refatoração: [`docs/PLANO.md`](docs/PLANO.md).
