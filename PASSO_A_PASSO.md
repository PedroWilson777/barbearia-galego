# 🚀 PASSO A PASSO PRO PEDRO — Coloca o Sistema no Ar

Esse guia é pra ti seguir do começo ao fim, sem precisar saber programar.

---

## ✅ Antes de começar, confere se tu tem:

- [ ] **Senha nova** do GitHub trocada e 2FA ativo
- [ ] **Chave Anthropic NOVA** (revogou a antiga, criou outra) — guardada num bloco de notas no PC
- [ ] **API Key Evolution NOVA** — guardada num bloco de notas no PC
- [ ] Conta Railway criada e logada
- [ ] Repositório GitHub criado: https://github.com/PedroWilson777/barbearia-galego (já tá feito)

---

## 🎯 ETAPA 1 — Subir o código pro GitHub

1. **Extrai o ZIP** que recebeu (clica com botão direito → "Extrair tudo")
2. Vai abrir uma pasta chamada `barbearia-galego` com vários arquivos dentro
3. Acessa: https://github.com/PedroWilson777/barbearia-galego
4. Vai aparecer "This repository is empty" ou só o README. Clica em **"Add file"** → **"Upload files"**
5. **Abre a pasta `barbearia-galego` extraída** no explorador de arquivos
6. **Selecione TODOS os arquivos e pastas dentro** dela (Ctrl+A) — NÃO selecione a pasta em si, só o conteúdo
7. **Arrasta tudo** pra área de upload do GitHub
8. ⏳ Espera o upload terminar (1-2 minutos)
9. Lá embaixo escreve no campo "Commit changes": `Versão inicial do sistema`
10. Clica no botão verde **"Commit changes"**

✅ Confere: tem que aparecer pelo menos as pastas `prisma/`, `src/`, e arquivos `package.json`, `next.config.js` no repositório.

---

## 🎯 ETAPA 2 — Criar o projeto no Railway

1. Acessa: https://railway.app/dashboard
2. Clica em **"+ New Project"**
3. Escolhe **"Deploy from GitHub repo"**
4. Se for primeira vez, vai pedir pra autorizar o Railway a ver teus repos do GitHub → autoriza
5. Acha o `barbearia-galego` na lista e clica nele
6. Railway começa a buildar automaticamente
7. **Vai dar erro de build na primeira vez** — é normal! Não te preocupa, tá faltando o banco e as variáveis. Vamos resolver agora.

---

## 🎯 ETAPA 3 — Adicionar PostgreSQL ao projeto

**Se tu já tinha um banco PostgreSQL no Railway:**

1. No mesmo projeto, na lateral, deve aparecer o serviço Postgres
2. Clica nele → aba **"Variables"**
3. Acha a variável `DATABASE_URL` e copia o valor todo
4. **NÃO fecha essa aba ainda**, vamos usar daqui a pouco

**Se ainda não tinha banco:**

1. Dentro do projeto Railway, clica no botão **"+ New"** (em cima)
2. Escolhe **"Database"** → **"Add PostgreSQL"**
3. Pronto, ele cria sozinho. Repete os passos acima pra pegar o `DATABASE_URL`.

---

## 🎯 ETAPA 4 — Configurar as variáveis de ambiente

1. Clica no serviço do **app Next.js** (o que tem o nome do repositório, não o Postgres)
2. Vai na aba **"Variables"**
3. Clica em **"Raw Editor"** (canto superior direito)
4. **Apaga tudo que tiver lá** e cola isso aqui (substitui os valores entre `<...>` pelos teus reais):

```
DATABASE_URL=<COLA AQUI A DATABASE_URL QUE TU COPIOU>
ANTHROPIC_API_KEY=<COLA AQUI TUA CHAVE ANTHROPIC NOVA>
ANTHROPIC_MODEL=claude-haiku-4-5-20251001
EVOLUTION_API_URL=https://evolution-evolution-api.eeb1ij.easypanel.host
EVOLUTION_API_KEY=<COLA AQUI TUA CHAVE EVOLUTION NOVA>
EVOLUTION_INSTANCE=teste
SUPERVISOR_PASSWORD=galego2026senhaforte
```

5. Clica em **"Update Variables"** (botão verde)
6. Railway vai redeployar automaticamente. Aguarda 2-3 minutos.

---

## 🎯 ETAPA 5 — Configurar o build pra rodar a migração do banco

1. Ainda no serviço do app, vai em **"Settings"**
2. Role até **"Build"**
3. Em **"Custom Build Command"** cola exatamente isso:

```
npx prisma migrate deploy && npx prisma db seed && next build
```

4. Salva (clica fora do campo)
5. Vai em **"Deployments"** → clica no botão **"Redeploy"** no último deploy

⏳ Aguarda 3-5 minutos. Acompanha pela aba **"Deploy Logs"**.

✅ **Sucesso quando aparece:**
```
✂️  Barbeiro: Galego
✂️  Barbeiro: Heitor
✂️  Barbeiro: Loiro
💈 Serviço: Corte - R$ 45.00
...
✅ Banco populado com sucesso!
```

---

## 🎯 ETAPA 6 — Pegar a URL pública do site

1. No serviço do app, vai em **"Settings"** → role até **"Networking"**
2. Clica em **"Generate Domain"**
3. Vai gerar uma URL tipo: `https://barbearia-galego-production-abc123.up.railway.app`
4. **Copia essa URL** — vamos usar agora

🎉 Acessa essa URL no navegador. Deve aparecer o painel da Galego Barbearia funcionando!

---

## 🎯 ETAPA 7 — Conectar o WhatsApp (Webhook na Evolution)

Aqui é o pulo do gato — sem isso o WhatsApp não fala com o sistema.

1. Entra no easypanel onde tua Evolution tá rodando
2. Acessa o **Manager da Evolution** (é onde tu vê a instância `teste`)
3. Clica na instância `teste` → vai nas configurações dela
4. Procura a seção **"Webhook"** (ou "Webhooks")
5. Configure:
   - **URL**: `https://SUA-URL-RAILWAY/api/webhook/evolution`
     (substitui `SUA-URL-RAILWAY` pela URL que tu pegou na etapa 6)
   - **Webhook by Events**: deixa **desligado** (false)
   - **Eventos**: marca SÓ a opção **`MESSAGES_UPSERT`** (desmarca o resto)
6. Salva

---

## 🎯 ETAPA 8 — TESTAR! 🎉

1. Pega o teu celular **pessoal** (NÃO o número da barbearia)
2. Manda uma mensagem **"oi"** pro número da barbearia: **+55 73 8820-8560**
3. Aguarda uns 5-10 segundos...
4. **A Sofia deve responder algo tipo:** "Oi! 👋 Sou a Sofia, da Galego Barbearia. Como posso te chamar?"
5. Continua a conversa: tenta marcar um horário pra ver se ela marca certinho
6. Volta no painel (URL do Railway) → **Caixa de Conversas** → tu vai ver a conversa aparecendo ao vivo

---

## 🆘 Deu errado? Manda pra mim:

**Se o site não abre:** print da página + log do Railway (aba "Deploy Logs")

**Se a Sofia não responde:**
1. Manda print da configuração do Webhook na Evolution
2. No Railway, clica em **"View Logs"** (do serviço do app) e me copia as últimas 30 linhas
3. Verifica se a instância `teste` tá realmente conectada (com QR code escaneado)

**Se der erro nas variáveis:** print da aba Variables (mas TIRA OS VALORES das chaves — só me mostra os nomes)

---

## 💰 Custos esperados

- **Railway**: tem $5 grátis/mês. Depois disso ~R$ 25-40/mês.
- **Anthropic (Sofia)**: ~R$ 0,01-0,02 por conversa. Pra 100 conversas/mês = ~R$ 2.
- **Evolution**: tu já paga separado.

---

**Vamos com calma. Faz uma etapa por vez. Qualquer dúvida me chama!** 💈
