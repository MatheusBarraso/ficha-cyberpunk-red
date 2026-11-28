# Sketcher

Plataforma de RPG no navegador — começou como a **Ficha Cyberpunk RED** e está virando um ambiente
para vários sistemas (ver [`docs/PLANO.md`](docs/PLANO.md)).

- Site: https://matheusbarraso.github.io/ficha-cyberpunk-red/
- App do Windows: página **Releases** deste repositório (pasta [`app/`](app/))
- Android: abra o site no Chrome → ⋮ → **Instalar app**

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

Como o projeto está organizado: [`docs/ARQUITETURA.md`](docs/ARQUITETURA.md).
Configuração do Firebase: [`docs/FIREBASE.md`](docs/FIREBASE.md).
