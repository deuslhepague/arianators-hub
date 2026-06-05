# Deploy no Firebase Hosting

Este projeto usa rotas `app/api/*`, então **não** deve ser exportado como site estático.  
Use **Firebase Hosting com integração Next.js/framework-aware** para manter as rotas funcionando e gerar a URL `*.web.app`.

## 1) Pré-requisitos

- Criar um projeto no Firebase Console.
- Instalar o CLI:
  ```bash
  npm i -g firebase-tools
  firebase login
  ```
- No repositório, manter os envs usados pela aplicação:
  - `NEXT_PUBLIC_FIREBASE_API_KEY`
  - `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN`
  - `NEXT_PUBLIC_FIREBASE_PROJECT_ID`
  - `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET`
  - `NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID`
  - `NEXT_PUBLIC_FIREBASE_APP_ID`
  - `ADMIN_PASSCODE`
- Manter o arquivo `arianatorshub-firebase-adminsdk-fbsvc-3373df087d.json` na raiz do projeto para o Admin SDK do servidor.

## 2) Inicializar o Hosting

Na raiz do projeto:

```bash
firebase init hosting
```

Quando o CLI perguntar:

- escolha o projeto correto do Firebase
- mantenha a integração do Next.js/framework
- não use `public/` como site estático
- permita que o Firebase crie os arquivos de configuração

Isso normalmente gera:

- `firebase.json`
- `.firebaserc`
- workflow de GitHub Actions, se você optar pela integração automática

## 3) Deploy manual

Depois de inicializar:

```bash
npm run build
firebase deploy --only hosting
```

Se tudo estiver correto, o Firebase vai publicar a aplicação em uma URL como:

- `https://seu-projeto.web.app`
- `https://seu-projeto.firebaseapp.com`

## 4) O que o GitHub Actions precisa

### Workflow atual `daily-update.yml`

Esse workflow **não faz deploy**. Ele só chama:

`POST /api/scheduled-update`

Para ele funcionar, configure no GitHub:

- `secrets.APP_URL` = URL pública já publicada no Firebase, por exemplo `https://seu-projeto.web.app`
- `secrets.ADMIN_PASSCODE` = mesmo valor usado no login do painel

Esse job roda no GitHub, então o site **não precisa ficar aberto** no navegador.

### Se você quiser deploy automático via GitHub Actions

Use a integração oficial do Firebase:

```bash
firebase init hosting:github
```

O CLI cria o workflow e registra o segredo necessário no GitHub.  
Depois disso, cada push pode disparar deploy automático.

## 5) Checklist rápido

- `firebase deploy` funciona localmente
- a URL `*.web.app` abre a aplicação
- `secrets.APP_URL` aponta para a URL publicada
- `secrets.ADMIN_PASSCODE` bate com o ambiente
- as rotas `app/api/*` respondem no domínio publicado

## 6) Observação importante

Como este projeto tem API routes do Next.js, **não use exportação estática**.  
Se fizer isso, as rotas `/api/*` vão quebrar.
