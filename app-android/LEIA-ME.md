# App do Sketcher (Android)

Um app pequeno que abre o site no motor do Chrome, em tela cheia (Trusted Web Activity). Login do Google,
foto do perfil e PDFs funcionam igual ao Chrome, e toda versão nova do site já aparece no app.

## Baixar
Página **Releases** do repositório → `Sketcher-Android-x.y.z.apk`. No celular, abra o arquivo; se o Android
pedir, permita instalar apps dessa fonte (o app não está na Play Store).

## Barra de endereço no topo
O Chrome só esconde a barra quando o domínio confirma que o app é dele, pelo arquivo
`https://matheusbarraso.github.io/.well-known/assetlinks.json`. Esse arquivo vai no repositório do site de
usuário `matheusbarraso.github.io` — o mesmo do redirecionamento do endereço antigo
(ver `docs/endereco-antigo/`). Sem ele, o app funciona, só que com uma barrinha de endereço em cima.

## Chave de assinar
O APK é assinado com uma chave que fica **só** nos segredos do repositório (Settings → Secrets and variables →
Actions): `ANDROID_KEYSTORE` (o arquivo da chave em base64) e `ANDROID_SENHA`. Toda versão precisa sair com a
mesma chave, senão o Android não instala por cima. Guarde uma cópia da chave fora do GitHub.
Sem os segredos, a ação monta só um APK de teste (em Actions → a execução → Artifacts), sem Release.

## Versão nova do app
Só quando mudar algo desta pasta: suba `versionCode` (+1) e `versionName` em `app/build.gradle` e envie.
