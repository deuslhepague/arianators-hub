# 🔧 FIRESTORE - SETUP COMPLETO

## O Problema
```
FirebaseError: Missing or insufficient permissions
```

Isso significa que as **Security Rules do Firestore estão bloqueando** suas operações.

---

## ✅ SOLUÇÃO - Passo 1: Configurar Security Rules

1. Vá para: **Firebase Console → Firestore Database → Rules**

2. **Copie e cole EXATAMENTE estas regras:**

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    
    // CATÁLOGO (admin apenas)
    match /catalog/{document=**} {
      allow read: if true;
      allow write: if request.auth != null && 
                      request.auth.customClaims.admin == true;
    }
    
    // HISTÓRICO (admin apenas)
    match /historical/{document=**} {
      allow read: if request.auth != null && 
                     request.auth.customClaims.admin == true;
      allow write: if request.auth != null && 
                      request.auth.customClaims.admin == true;
    }
    
    // LEADERBOARD (público ler, usuários escrever)
    match /leaderboard/{document=**} {
      allow read: if true;
      allow write: if request.auth != null;
    }
    
    // USUÁRIOS (privado, ler/escrever próprio doc)
    match /users/{userId} {
      allow read, write: if request.auth.uid == userId;
    }
    
    // DELETION REQUESTS (admin apenas)
    match /deletion_requests/{document=**} {
      allow read, write: if request.auth != null && 
                            request.auth.customClaims.admin == true;
    }
  }
}
```

3. Clique **"Publish"**

---

## ✅ SOLUÇÃO - Passo 2: Configurar Firebase Authentication

Como não há usuário autenticado no seu código, o Firebase nega acesso. Você precisa:

### Opção A: Firebase Admin SDK (Recomendado)

Use no **server-side** (API routes):

```typescript
// src/app/api/save-catalog/route.ts
import { NextResponse } from "next/server";
import * as admin from "firebase-admin";

// Inicializar admin SDK
const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT || "{}");
if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
  });
}

const db = admin.firestore();

export async function POST(req: Request) {
  try {
    // Verificar admin passcode
    const { passcode, tracks, albums } = await req.json();
    if (passcode !== process.env.ADMIN_PASSCODE) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Salvar no Firestore (como admin)
    await db.collection("catalog").doc("config").set({
      tracks,
      albums,
      updatedAt: new Date().toISOString()
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error:", error);
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
```

**Como instalar:**
```bash
npm install firebase-admin
```

**Pegar o serviceAccount:**
1. Firebase Console → Project Settings (engrenagem) → Service Accounts
2. Clique "Generate new private key"
3. Copie o JSON inteiro
4. Adicione em `.env.local`:
```
FIREBASE_SERVICE_ACCOUNT={"type":"service_account",...}
```

---

### Opção B: Firebase Authentication (Client-side)

Se preferir autenticar no browser:

```typescript
// src/lib/firebase.ts
import { signInWithCustomToken, getAuth } from "firebase/auth";

export async function authenticateAdmin(passcode: string) {
  try {
    // Chama seu servidor para gerar token customizado
    const response = await fetch("/api/create-admin-token", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ passcode })
    });

    if (!response.ok) throw new Error("Invalid passcode");

    const { token } = await response.json();
    const auth = getAuth();
    await signInWithCustomToken(auth, token);
    
    return true;
  } catch (error) {
    console.error("Auth failed:", error);
    return false;
  }
}
```

```typescript
// src/app/api/create-admin-token/route.ts
import { NextResponse } from "next/server";
import * as admin from "firebase-admin";

export async function POST(req: Request) {
  try {
    const { passcode } = await req.json();

    if (passcode !== process.env.ADMIN_PASSCODE) {
      return NextResponse.json({ error: "Invalid passcode" }, { status: 401 });
    }

    // Criar custom token com claim admin
    const token = await admin.auth().createCustomToken("admin-user", {
      admin: true
    });

    return NextResponse.json({ token });
  } catch (error) {
    console.error("Error:", error);
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
```

---

## 🧪 Teste Rápido

1. Abra **Firebase Console → Firestore → Rules**
2. Clique em **"Rules playground"** (canto superior direito)
3. Configure:
   - **Location**: `/catalog/config`
   - **Request type**: `set`
   - **Authentication**: Selecione um usuário com `admin: true`
4. Clique **"Run"**

Deve aparecer "Simulated write succeeded ✓"

---

## Resumo

| Opção | Segurança | Complexidade | Recomendação |
|-------|-----------|--------------|--------------|
| Admin SDK (server-side) | ⭐⭐⭐⭐⭐ | Média | ✅ Melhor |
| Custom Token (client-side) | ⭐⭐⭐⭐ | Média | ✅ Bom |
| Rules permissivas | ⭐ | Baixa | ❌ Inseguro |

---

## Se ainda não funcionar

1. Certifique-se de que **Firestore está criado** (Firebase Console → Firestore → Create Database)
2. **Security Rules foram publicadas** (não salvas em draft)
3. **Seu `.env.local` tem as credenciais corretas**
4. Aguarde **30 segundos** para as rules propagarem
