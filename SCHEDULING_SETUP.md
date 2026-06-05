# Agendamento Automático Gratuito

Este projeto usa **GitHub Actions** para atualizar os playcounts das músicas todo dia às 00:00 GMT. Totalmente **GRÁTIS** (até 2000 minutos/mês).

## Setup (5 minutos)

### 1. Adicione os Secrets no GitHub
Vá para: **Repository Settings → Secrets and variables → Actions → New repository secret**

Crie 2 secrets:

| Nome | Valor |
|------|-------|
| `ADMIN_SECRET` | Mesmo valor do `.env.local` (ADMIN_SECRET) |
| `APP_URL` | URL do seu app (ex: `https://seu-dominio.com`) |

### 2. Pronto! 🎉
O workflow `.github/workflows/daily-update.yml` agora:
- ✅ Executa todo dia às 00:00 GMT automaticamente
- ✅ Pode ser trigado manualmente em **Actions → Daily Playcount Update → Run workflow**
- ✅ Tenta novamente automaticamente se falhar

## Alternativas Gratuitas

### Opção 2: UptimeRobot (mais simples, sem GitHub)
1. Vá para https://uptimerobot.com (gratuito)
2. Crie uma "Heartbeat" (cron job) com:
   - **URL**: `https://seu-dominio.com/api/scheduled-update`
   - **Método**: POST
   - **Headers**: `x-admin-secret: [seu-secret]`
   - **Intervalo**: Daily, 00:00 GMT

### Opção 3: EasyCron (ainda mais simples)
1. Vá para https://www.easycron.com (gratuito, até 10 crons)
2. Nova cron:
   - **URL**: `https://seu-dominio.com/api/scheduled-update?admin_secret=[seu-secret]`
   - **Schedule**: `0 0 * * *`

## Testando Manualmente

No seu terminal local:
```bash
curl -X POST \
  -H "x-admin-secret: seu_admin_secret" \
  https://seu-dominio.com/api/scheduled-update
```

Ou no painel admin, você pode clicar num botão para forçar atualização (em desenvolvimento).
