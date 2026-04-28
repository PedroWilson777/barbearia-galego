# 💈 Galego Barbearia — Sistema de Atendimento Inteligente

Sistema completo de atendimento via WhatsApp com IA (Sofia/Claude Haiku 4.5), agendamento automático e dashboard de gestão.

## 🚀 Stack

- **Next.js 14** (App Router, TypeScript)
- **PostgreSQL** + **Prisma ORM**
- **Anthropic Claude Haiku 4.5** (Sofia, a IA)
- **Evolution API** (integração WhatsApp)
- **Tailwind CSS** (visual dark luxury)

---

## 📋 Pré-requisitos

- Conta no [GitHub](https://github.com)
- Conta no [Railway](https://railway.app) com banco PostgreSQL criado
- Chave API da [Anthropic](https://console.anthropic.com)
- Evolution API rodando (no easypanel ou similar) com instância `teste` conectada ao WhatsApp

---

## 🛠️ Deploy passo a passo (no Railway)

### 1️⃣ Subir o código pro GitHub

1. Vá em: https://github.com/PedroWilson777/barbearia-galego
2. Clique **"Add file" → "Upload files"**
3. **Arrasta TODA a pasta `barbearia-galego`** descompactada (todos os arquivos e subpastas)
4. Commit message: `Initial commit`
5. Clique em **Commit changes**

### 2️⃣ Deploy no Railway

1. Acesse https://railway.app/dashboard
2. Clique em **"New Project"** → **"Deploy from GitHub repo"**
3. Autoriza o Railway a acessar teu GitHub (se ainda não tiver feito)
4. Selecione o repositório `barbearia-galego`
5. Aguarda o Railway detectar que é Next.js (vai começar a buildar)

### 3️⃣ Adicionar PostgreSQL ao projeto

Se ainda não tem banco no projeto:
1. No mesmo projeto Railway, clica **"+ New" → "Database" → "PostgreSQL"**
2. Pronto, o `DATABASE_URL` é gerado automaticamente

Se já tem banco:
1. Vai no serviço do PostgreSQL → aba **Variables** → copia o valor de `DATABASE_URL`

### 4️⃣ Configurar variáveis de ambiente

No serviço do **app Next.js** (não no Postgres), vai em **Variables → Raw Editor** e cola:

```env
DATABASE_URL=postgresql://... (cola a do Railway)
ANTHROPIC_API_KEY=sk-ant-api03-... (tua chave nova)
ANTHROPIC_MODEL=claude-haiku-4-5-20251001
EVOLUTION_API_URL=https://evolution-evolution-api.eeb1ij.easypanel.host
EVOLUTION_API_KEY=... (tua chave nova da Evolution)
EVOLUTION_INSTANCE=teste
SUPERVISOR_PASSWORD=defina-uma-senha-forte
```

> ⚠️ **NÃO esqueça de salvar.** O Railway vai redeployar.

### 5️⃣ Rodar migração do banco

No Railway, no serviço do app:
1. Aba **"Settings"** → role até **"Deploy"** → procura **"Custom Build Command"**
2. Coloque: `prisma migrate deploy && prisma db seed && next build`
3. Salva e clica em **"Redeploy"**

> **Alternativa:** abre o terminal do Railway (botão `>_`) e roda manualmente:
> ```bash
> npx prisma migrate deploy
> npx prisma db seed
> ```

### 6️⃣ Pegar a URL pública do app

1. No serviço do app → **Settings** → **Networking** → **"Generate Domain"**
2. Vai gerar algo tipo: `https://barbearia-galego-production-abc.up.railway.app`
3. Copia essa URL — vai usar no próximo passo

### 7️⃣ Configurar webhook na Evolution API

Vai no painel da tua Evolution (easypanel) → **instância `teste`** → **Webhook**:

- **URL**: `https://SUA-URL-RAILWAY/api/webhook/evolution`
- **Eventos**: marca apenas `MESSAGES_UPSERT`
- **Webhook by Events**: `false`
- **Salvar**

### 8️⃣ Testar! 🎉

1. Acessa tua URL Railway no navegador → deve aparecer o painel da Galego
2. Pega outro celular (não o número da barbearia) e manda **"oi"** pro WhatsApp da barbearia
3. A Sofia deve responder em alguns segundos
4. Volta no painel → **Caixa de Conversas** → vê a conversa lá

---

## 🔧 Rodar localmente (opcional)

```bash
npm install
cp .env.example .env
# preenche o .env com tuas chaves
npx prisma migrate dev
npx prisma db seed
npm run dev
```

Acessa http://localhost:3000

---

## 🧠 Como funciona a Sofia

A Sofia recebe um **system prompt** com:
- Dados da barbearia (endereço, horário, formas de pagamento)
- Lista atual de barbeiros e serviços (lê do banco)
- Regras de comportamento

Quando ela quer **marcar um horário**, inclui uma tag invisível no final da resposta:
```
[META:AGENDAR|barbeiro=Galego|servico=Corte|data=2026-04-28|hora=11:00]
```

O sistema lê essa tag, **remove ela** antes de mandar pro cliente, e cria o agendamento no banco automaticamente.

Quando ela precisa **escalar pro humano**:
```
[META:ESCALAR|motivo=Cliente quer remarcar pela 3a vez|severidade=HIGH]
```

---

## 🛡️ Segurança

- Variáveis sensíveis ficam apenas no `.env` (nunca commit)
- Webhook valida origem implícita (Evolution só consegue chamar se conhece a URL)
- Recomenda-se ativar **basic auth** ou login no painel pra produção

---

## 📞 Suporte

Em caso de problema, verifica os logs no Railway:
- Aba **Deployments** → clica no último deploy → **View Logs**

Erros comuns:
- `ANTHROPIC_API_KEY` faltando → confere no Variables
- `DATABASE_URL` errada → deve apontar pro Postgres do Railway
- Evolution não chega no webhook → confere se a URL no painel da Evolution está certa

---

**Desenvolvido para a Galego Barbearia · Teixeira de Freitas - BA**
