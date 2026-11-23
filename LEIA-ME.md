# Ficha Cyberpunk RED — versão GitHub + Firebase

Esta pasta é o site inteiro: ficha, anotações, história, leitor de livros e Comunidade (Mestre/Player).
Ele fica de graça no **GitHub Pages**, e a Comunidade guarda os dados no **Firebase** (também grátis).
Qualquer pessoa entra com a **conta Google** e escolhe ser Mestre ou Player.

São uns 15 minutos, uma vez só. Siga na ordem.

---

## O que tem aqui

| Arquivo | Pra quê |
|---|---|
| `index.html` | o site |
| `firebase-config.js` | **você cola aqui** a configuração do seu Firebase (passo 4) |
| `firestore.rules` | regras de segurança: **você cola no Firebase** (passo 3) |
| `fb.js` | liga a Comunidade ao Firebase (não precisa mexer) |
| `livros_local.js` | leitor de livros: cada pessoa adiciona o próprio PDF (não precisa mexer) |
| `lib/` | leitor de PDF (pdf.js) |
| `exemplo/` | imagens da cidade de exemplo |

---

## Passo 1 — Criar o projeto no Firebase

1. Abra **console.firebase.google.com** e entre com a sua conta Google.
2. **Criar um projeto** → dê um nome (ex.: `ficha-cpr`) → pode desligar o Google Analytics → **Criar projeto**.

O plano que já vem (Spark) é gratuito e não pede cartão.

## Passo 2 — Ligar o login com Google

1. No menu da esquerda: **Criação → Authentication** → **Vamos começar**.
2. Aba **Método de login** → **Google** → ligue **Ativar** → escolha seu e-mail de suporte → **Salvar**.

## Passo 3 — Criar o banco de dados e colar as regras

1. Menu da esquerda: **Criação → Firestore Database** → **Criar banco de dados**.
2. Local: **southamerica-east1 (São Paulo)** → **Avançar**.
3. Escolha **Iniciar no modo de produção** → **Criar**.
4. Quando abrir, vá na aba **Regras**, **apague tudo** que estiver lá, abra o arquivo `firestore.rules` desta pasta, copie tudo e cole → **Publicar**.

> As regras é que garantem a segurança: só o mestre administra a própria sessão, quem não entrou na sessão não lê nada dela, e ninguém escreve no nome de outra pessoa. Sem elas a Comunidade não funciona.

## Passo 4 — Pegar a configuração e colar no `firebase-config.js`

1. Clique na engrenagem ⚙️ ao lado de **Visão geral do projeto** → **Configurações do projeto**.
2. Lá embaixo, em **Seus apps**, clique no ícone **`</>`** (Web).
3. Dê um apelido (ex.: `ficha`) → **não** marque Firebase Hosting → **Registrar app**.
4. Vai aparecer um código com `const firebaseConfig = { apiKey: "...", authDomain: "...", ... }`.
5. Abra o `firebase-config.js` desta pasta (Bloco de Notas serve) e troque cada `COLE_AQUI` pelo valor correspondente. Fica assim:

```js
window.FIREBASE_CONFIG = {
  apiKey: "AIzaSy...",
  authDomain: "ficha-cpr.firebaseapp.com",
  projectId: "ficha-cpr",
  storageBucket: "ficha-cpr.firebasestorage.app",
  messagingSenderId: "1234567890",
  appId: "1:1234567890:web:abc123"
};
```

Esses valores **não são senha** (eles aparecem pra qualquer um que abrir o site, é normal). Quem protege os dados são as regras do passo 3.

## Passo 5 — Publicar no GitHub Pages

1. Entre em **github.com** (crie a conta se não tiver).
2. Canto de cima → **+** → **New repository**.
   - Nome: `ficha-cyberpunk-red` (ou o que quiser)
   - Deixe **Public** → **Create repository**.
3. Na página do repositório: **uploading an existing file**.
4. Arraste **todo o conteúdo desta pasta** (os arquivos **e** as pastas `lib` e `exemplo`) → **Commit changes**.
5. No repositório: **Settings → Pages**.
   - Em **Source**: **Deploy from a branch**
   - Branch: **main** e pasta **/ (root)** → **Save**.
6. Espere 1–2 minutos e recarregue essa tela: aparece o link, tipo
   `https://SEU-USUARIO.github.io/ficha-cyberpunk-red/`

## Passo 6 — Autorizar o endereço do site no Firebase

Sem isso o botão “Entrar com Google” dá erro.

1. Firebase → **Authentication** → aba **Configurações** → **Domínios autorizados** → **Adicionar domínio**.
2. Digite só `SEU-USUARIO.github.io` (sem `https://` e sem o resto) → **Adicionar**.

## Pronto 🎲

Abra o link do passo 5:

- **Mestre**: escolhe *Mestre* → **Entrar com Google** → **＋ Nova sessão** → copia o código (tipo `ABCD-2345`) e manda pros jogadores.
- **Player**: abre o mesmo link → *Player* → **Entrar com Google** → digita o código → **Solicitar entrada** (ou entra direto, se o mestre escolheu “Entra direto com o código”).

Cada pessoa usa a própria conta Google, de qualquer computador ou celular.

---

## Livros

Os PDFs dos livros **não vão pro GitHub**: o repositório é público e os livros têm direitos autorais.
Cada pessoa adiciona o PDF que tem, e ele fica guardado **só no aparelho dela**:

**Livros → 📖 (menu do leitor) → ＋ Adicionar PDF**

- O *Livro de Regras* e o *The Jacket* (CEMK) e o *Livro Básico* do Cyberpunk RED são reconhecidos sozinhos, e as páginas marcadas na ficha continuam funcionando.
- Qualquer outro PDF também pode ser adicionado.
- A busca funciona igual (na primeira busca de cada livro ela demora alguns segundos pra ler o PDF).
- **Tirar** remove o livro do aparelho (as marcações continuam).

## A ficha

A ficha, anotações e história continuam salvas **no navegador de cada aparelho**, como antes.
Pra levar pra outro aparelho use o backup (exportar/importar) do menu.

## Atualizar o site depois

No repositório do GitHub: **Add file → Upload files** → arraste os arquivos novos → **Commit changes**.
Se mudar o `firestore.rules`, cole de novo no Firebase (passo 3, aba Regras → Publicar).
**Cuidado** pra não subir de novo um `firebase-config.js` com `COLE_AQUI`.

## Se algo der errado

| Mensagem | O que fazer |
|---|---|
| “A Comunidade ainda não foi configurada neste site” | o `firebase-config.js` no GitHub ainda está com `COLE_AQUI` (passo 4) |
| “Este endereço ainda não foi autorizado no Firebase” | faça o passo 6 |
| “O servidor recusou: você não tem permissão” | as regras não foram publicadas (passo 3) ou foram coladas pela metade |
| A janela do Google não abre | o navegador bloqueou o pop-up: permita pop-ups pro site e tente de novo |
| Mudei algo e o site não mudou | espere 1–2 min e recarregue com Ctrl+F5 |

O plano gratuito do Firebase tem um limite diário de leituras e gravações que sobra pra uma mesa de RPG.
Dá pra acompanhar em **Firestore Database → Uso**.
