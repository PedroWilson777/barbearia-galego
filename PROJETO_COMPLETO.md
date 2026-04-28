# Projeto Completo: Barbearia Galego



## Arquivo: `src\app\agendamentos\page.tsx`

```tsx
'use client';

import { useEffect, useState } from 'react';

interface Appointment {
  id: string;
  scheduledAt: string;
  status: string;
  lead: { name?: string; phone: string };
  barber: { id: string; name: string; color: string };
  service: { name: string; durationMinutes: number };
}

export default function AgendamentosPage() {
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [date, setDate] = useState(() => new Date().toISOString().split('T')[0]);

  useEffect(() => {
    const load = async () => {
      const res = await fetch(`/api/appointments?date=${date}`);
      if (res.ok) setAppointments(await res.json());
    };
    load();
    const interval = setInterval(load, 10000);
    return () => clearInterval(interval);
  }, [date]);

  // Agrupa por barbeiro
  const byBarber: Record<string, { name: string; color: string; appts: Appointment[] }> = {};
  appointments.forEach(a => {
    if (!byBarber[a.barber.id]) {
      byBarber[a.barber.id] = { name: a.barber.name, color: a.barber.color, appts: [] };
    }
    byBarber[a.barber.id].appts.push(a);
  });

  const dateLabel = new Date(`${date}T12:00:00`).toLocaleDateString('pt-BR', {
    weekday: 'long', day: 'numeric', month: 'long',
  });

  const totalConfirmed = appointments.filter(a => a.status === 'CONFIRMED').length;
  const totalPending = appointments.filter(a => a.status === 'PENDING_CONFIRMATION').length;

  return (
    <div className="page animate-fade-up">
      <div className="px-10 pt-8 pb-6 flex justify-between items-end gap-6" style={{ borderBottom: '1px solid var(--border)' }}>
        <div>
          <h1 className="font-display text-[36px] tracking-tight leading-none mb-1.5">
            Agenda <em className="italic font-medium" style={{ color: 'var(--accent)' }}>do dia</em>
          </h1>
          <p style={{ color: 'var(--text-2)' }}>
            {dateLabel.charAt(0).toUpperCase() + dateLabel.slice(1)} · {appointments.length} horários — {totalConfirmed} confirmados, {totalPending} aguardando
          </p>
        </div>
        <input
          type="date"
          value={date}
          onChange={e => setDate(e.target.value)}
          className="px-3 py-2 rounded-lg text-sm font-sans"
          style={{ background: 'var(--surface)', border: '1px solid var(--border)', color: 'var(--text)' }}
        />
      </div>

      <div className="px-10 py-7">
        {Object.keys(byBarber).length === 0 ? (
          <div className="text-center py-20 text-sm" style={{ color: 'var(--text-3)' }}>
            Nenhum agendamento pra esse dia. Os agendamentos aparecem aqui assim que a Sofia marcar com os clientes.
          </div>
        ) : (
          <div className="grid grid-cols-3 gap-4">
            {Object.entries(byBarber).map(([id, b]) => (
              <div key={id} className="rounded-xl overflow-hidden" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
                <div
                  className="px-4 py-4 flex items-center gap-2.5"
                  style={{ background: 'var(--bg-2)', borderBottom: '1px solid var(--border)' }}
                >
                  <div
                    className="w-8 h-8 rounded-full grid place-items-center font-display font-medium text-sm"
                    style={{ background: `linear-gradient(135deg, ${b.color}, ${b.color}99)`, color: '#1a1410' }}
                  >
                    {b.name[0]}
                  </div>
                  <div>
                    <h3 className="font-display font-medium text-base leading-tight">{b.name}</h3>
                    <small className="text-[11px]" style={{ color: 'var(--text-3)' }}>
                      {b.appts.length} agendamento{b.appts.length === 1 ? '' : 's'}
                    </small>
                  </div>
                  <div className="ml-auto font-mono text-[13px]" style={{ color: 'var(--accent)' }}>
                    {b.appts.filter(a => a.status === 'CONFIRMED').length}/{b.appts.length}
                  </div>
                </div>
                {b.appts.map((a, i) => {
                  const time = new Date(a.scheduledAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
                  return (
                    <div
                      key={a.id}
                      className="grid gap-2.5 px-4 py-3"
                      style={{
                        gridTemplateColumns: '50px 1fr',
                        borderBottom: i < b.appts.length - 1 ? '1px solid var(--border)' : 'none',
                        background: i === 0 ? 'linear-gradient(90deg, var(--accent-glow), transparent 80%)' : 'transparent',
                      }}
                    >
                      <div className="font-mono text-[13px] font-medium pt-0.5" style={{ color: 'var(--accent)' }}>
                        {time}
                      </div>
                      <div className="min-w-0">
                        <div className="text-[13px] font-medium mb-0.5">{a.lead.name || a.lead.phone}</div>
                        <div className="text-[11px]" style={{ color: 'var(--text-2)' }}>{a.service.name}</div>
                        <div className="mt-1.5">
                          <span
                            className="text-[10px] px-2 py-0.5 rounded uppercase tracking-[0.08em] font-medium"
                            style={{
                              background: a.status === 'CONFIRMED' ? 'rgba(126, 184, 154, 0.12)' : 'rgba(224, 168, 104, 0.15)',
                              color: a.status === 'CONFIRMED' ? 'var(--success)' : 'var(--warning)',
                            }}
                          >
                            {a.status === 'CONFIRMED' ? 'Confirmado' : 'Aguarda'}
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

```


## Arquivo: `src\app\api\appointments\route.ts`

```ts
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

// Lista agendamentos (com filtros opcionais)
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const date = searchParams.get('date'); // YYYY-MM-DD
  const barberId = searchParams.get('barberId');

  const where: { scheduledAt?: { gte: Date; lt: Date }; barberId?: string } = {};

  if (date) {
    const start = new Date(`${date}T00:00:00-03:00`);
    const end = new Date(`${date}T23:59:59-03:00`);
    where.scheduledAt = { gte: start, lt: end };
  }

  if (barberId) {
    where.barberId = barberId;
  }

  const appointments = await prisma.appointment.findMany({
    where,
    include: {
      lead: true,
      barber: true,
      service: true,
    },
    orderBy: { scheduledAt: 'asc' },
  });

  return NextResponse.json(appointments);
}

```


## Arquivo: `src\app\api\conversations\route.ts`

```ts
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function GET() {
  const conversations = await prisma.conversation.findMany({
    where: { status: { not: 'RESOLVED' } },
    include: {
      lead: true,
      messages: {
        orderBy: { createdAt: 'desc' },
        take: 1,
      },
    },
    orderBy: { lastMessageAt: 'desc' },
    take: 100,
  });

  const formatted = conversations.map(c => ({
    id: c.id,
    leadId: c.lead.id,
    name: c.lead.name || c.lead.phone,
    phone: c.lead.phone,
    qualification: c.lead.qualification,
    status: c.status,
    assignedHuman: c.assignedHuman,
    unreadCount: c.unreadCount,
    lastMessage: c.messages[0]?.content || '',
    lastMessageAt: c.lastMessageAt,
    lastMessageSender: c.messages[0]?.sender,
  }));

  return NextResponse.json(formatted);
}

```


## Arquivo: `src\app\api\conversations\[id]\messages\route.ts`

```ts
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { sendWhatsAppMessage } from '@/lib/evolution';

export const dynamic = 'force-dynamic';

interface RouteParams {
  params: { id: string };
}

// Lista mensagens da conversa
export async function GET(req: NextRequest, { params }: RouteParams) {
  const conversation = await prisma.conversation.findUnique({
    where: { id: params.id },
    include: {
      lead: true,
      messages: { orderBy: { createdAt: 'asc' } },
    },
  });

  if (!conversation) {
    return NextResponse.json({ error: 'not found' }, { status: 404 });
  }

  // Marca como lida
  await prisma.conversation.update({
    where: { id: params.id },
    data: { unreadCount: 0 },
  });

  // Conta agendamentos do lead
  const totalAppts = await prisma.appointment.count({
    where: { leadId: conversation.lead.id, status: { in: ['CONFIRMED', 'COMPLETED'] } },
  });

  return NextResponse.json({
    id: conversation.id,
    status: conversation.status,
    assignedHuman: conversation.assignedHuman,
    lead: {
      id: conversation.lead.id,
      name: conversation.lead.name,
      phone: conversation.lead.phone,
      qualification: conversation.lead.qualification,
      notes: conversation.lead.notes,
      preferredBarber: conversation.lead.preferredBarber,
      preferredService: conversation.lead.preferredService,
      totalVisits: totalAppts,
      lastVisitAt: conversation.lead.lastVisitAt,
    },
    messages: conversation.messages.map(m => ({
      id: m.id,
      sender: m.sender,
      content: m.content,
      authorName: m.authorName,
      createdAt: m.createdAt,
    })),
  });
}

// Envia mensagem do humano pro cliente
export async function POST(req: NextRequest, { params }: RouteParams) {
  const { content, authorName } = await req.json();

  if (!content?.trim()) {
    return NextResponse.json({ error: 'empty message' }, { status: 400 });
  }

  const conversation = await prisma.conversation.findUnique({
    where: { id: params.id },
    include: { lead: true },
  });

  if (!conversation) {
    return NextResponse.json({ error: 'not found' }, { status: 404 });
  }

  // Só permite mandar se humano tá com a conversa
  if (conversation.status !== 'HUMAN_ACTIVE' && conversation.status !== 'WAITING_HUMAN') {
    return NextResponse.json(
      { error: 'pause IA antes de mandar mensagem manual' },
      { status: 400 }
    );
  }

  // Salva no banco
  const message = await prisma.message.create({
    data: {
      conversationId: params.id,
      sender: 'HUMAN',
      content: content.trim(),
      authorName: authorName || 'Atendente',
    },
  });

  // Atualiza conversa pra HUMAN_ACTIVE
  await prisma.conversation.update({
    where: { id: params.id },
    data: {
      status: 'HUMAN_ACTIVE',
      lastMessageAt: new Date(),
      assignedHuman: authorName || 'Atendente',
    },
  });

  // Envia pro WhatsApp
  await sendWhatsAppMessage(conversation.lead.phone, content.trim());

  return NextResponse.json({ ok: true, id: message.id });
}

```


## Arquivo: `src\app\api\conversations\[id]\pause\route.ts`

```ts
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const body = await req.json().catch(() => ({}));
  const humanName = body?.humanName || 'Atendente';

  const updated = await prisma.conversation.update({
    where: { id: params.id },
    data: {
      status: 'HUMAN_ACTIVE',
      assignedHuman: humanName,
    },
  });

  return NextResponse.json({ ok: true, status: updated.status });
}

```


## Arquivo: `src\app\api\conversations\[id]\resume\route.ts`

```ts
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const updated = await prisma.conversation.update({
    where: { id: params.id },
    data: {
      status: 'AI_ACTIVE',
      assignedHuman: null,
    },
  });

  return NextResponse.json({ ok: true, status: updated.status });
}

```


## Arquivo: `src\app\api\dashboard\route.ts`

```ts
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function GET() {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(today.getDate() + 1);
  const dayAfter = new Date(tomorrow);
  dayAfter.setDate(tomorrow.getDate() + 1);

  const [
    totalConvsToday,
    appointmentsTomorrow,
    pendingNotifications,
    aiActiveCount,
    humanActiveCount,
    waitingCount,
    totalConvs,
    aiResolvedConvs,
  ] = await Promise.all([
    prisma.conversation.count({
      where: { createdAt: { gte: today, lt: tomorrow } },
    }),
    prisma.appointment.count({
      where: {
        scheduledAt: { gte: tomorrow, lt: dayAfter },
        status: { notIn: ['CANCELLED', 'NO_SHOW'] },
      },
    }),
    prisma.supervisorNotification.count({
      where: { resolvedAt: null },
    }),
    prisma.conversation.count({ where: { status: 'AI_ACTIVE' } }),
    prisma.conversation.count({ where: { status: 'HUMAN_ACTIVE' } }),
    prisma.conversation.count({ where: { status: 'WAITING_HUMAN' } }),
    prisma.conversation.count({
      where: { createdAt: { gte: today, lt: tomorrow } },
    }),
    prisma.conversation.count({
      where: {
        createdAt: { gte: today, lt: tomorrow },
        status: 'RESOLVED',
        // resolvida sem nunca passar pra humano
        assignedHuman: null,
      },
    }),
  ]);

  const aiResolutionRate = totalConvs > 0
    ? Math.round((aiResolvedConvs / totalConvs) * 100)
    : 100;

  return NextResponse.json({
    totalConvsToday,
    appointmentsTomorrow,
    pendingNotifications,
    aiActiveCount,
    humanActiveCount,
    waitingCount,
    aiResolutionRate,
  });
}

```


## Arquivo: `src\app\api\notifications\route.ts`

```ts
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

// Lista notificações
export async function GET() {
  const notifications = await prisma.supervisorNotification.findMany({
    where: { resolvedAt: null },
    include: {
      conversation: { include: { lead: true } },
    },
    orderBy: [{ severity: 'asc' }, { createdAt: 'desc' }],
    take: 100,
  });

  return NextResponse.json(notifications);
}

// Marca notificação como resolvida
export async function PATCH(req: NextRequest) {
  const { id } = await req.json();
  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 });

  await prisma.supervisorNotification.update({
    where: { id },
    data: { resolvedAt: new Date(), read: true },
  });

  return NextResponse.json({ ok: true });
}

```


## Arquivo: `src\app\api\webhook\evolution\route.ts`

```ts
// Webhook que recebe mensagens da Evolution API
// URL: POST /api/webhook/evolution

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { askSofia } from '@/lib/claude';
import { sendWhatsAppMessage } from '@/lib/evolution';
import { processMetaTags } from '@/lib/meta-handler';

export const dynamic = 'force-dynamic';
export const maxDuration = 60; // segundos pro Railway

/**
 * Webhook handler - sempre retorna 200 pra não causar loop na Evolution
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    // Log pra debug
    console.log('📨 Webhook Evolution:', JSON.stringify(body).slice(0, 300));

    // Evolution envia eventos diferentes - filtramos só MESSAGES_UPSERT
    const event = body?.event;
    if (event !== 'messages.upsert') {
      return NextResponse.json({ ok: true, ignored: event });
    }

    const data = body?.data;
    if (!data) return NextResponse.json({ ok: true });

    // Ignora mensagens enviadas POR NÓS (fromMe = true)
    if (data?.key?.fromMe === true) {
      return NextResponse.json({ ok: true, ignored: 'fromMe' });
    }

    // Extrai dados da mensagem
    const remoteJid = data?.key?.remoteJid; // ex: "5573988208560@s.whatsapp.net"
    const messageId = data?.key?.id;
    const messageText =
      data?.message?.conversation ||
      data?.message?.extendedTextMessage?.text ||
      data?.message?.imageMessage?.caption ||
      '';

    if (!remoteJid || !messageText) {
      return NextResponse.json({ ok: true, ignored: 'no text' });
    }

    // Ignora grupos (jid contém @g.us)
    if (remoteJid.includes('@g.us')) {
      return NextResponse.json({ ok: true, ignored: 'group' });
    }

    // Extrai número (remove @s.whatsapp.net)
    const phone = remoteJid.split('@')[0];
    const pushName = data?.pushName || null;

    // Idempotência: se já processamos esse messageId, ignora
    if (messageId) {
      const existing = await prisma.message.findUnique({
        where: { whatsappMessageId: messageId },
      });
      if (existing) {
        return NextResponse.json({ ok: true, ignored: 'duplicate' });
      }
    }

    // ============== PROCESSAMENTO PRINCIPAL ==============

    // 1. Busca ou cria o Lead
    let lead = await prisma.lead.findUnique({ where: { phone } });
    if (!lead) {
      lead = await prisma.lead.create({
        data: {
          phone,
          name: pushName,
        },
      });
      console.log(`👤 Novo lead criado: ${phone} (${pushName || 'sem nome'})`);
    }

    // 2. Busca ou cria a Conversa
    let conversation = await prisma.conversation.findFirst({
      where: { leadId: lead.id, status: { not: 'RESOLVED' } },
      orderBy: { lastMessageAt: 'desc' },
    });

    if (!conversation) {
      conversation = await prisma.conversation.create({
        data: { leadId: lead.id, status: 'AI_ACTIVE' },
      });
    }

    // 3. Salva a mensagem do cliente
    await prisma.message.create({
      data: {
        conversationId: conversation.id,
        sender: 'CLIENT',
        content: messageText,
        whatsappMessageId: messageId || null,
      },
    });

    // 4. Atualiza conversa
    await prisma.conversation.update({
      where: { id: conversation.id },
      data: {
        lastMessageAt: new Date(),
        unreadCount: { increment: 1 },
      },
    });

    // 5. Decide se Sofia responde ou se humano assumiu
    if (conversation.status === 'HUMAN_ACTIVE') {
      console.log(`🙋 Conversa ${conversation.id} está com humano - Sofia não responde`);
      return NextResponse.json({ ok: true, handled: 'human' });
    }

    if (conversation.status === 'WAITING_HUMAN') {
      console.log(`⏳ Conversa ${conversation.id} aguardando humano - Sofia não responde`);
      return NextResponse.json({ ok: true, handled: 'waiting' });
    }

    // 6. Sofia responde (status AI_ACTIVE)
    try {
      const sofia = await askSofia(conversation.id);

      // Salva resposta da Sofia no banco
      await prisma.message.create({
        data: {
          conversationId: conversation.id,
          sender: 'AI',
          content: sofia.text,
          metaTags: sofia.metaTags.length > 0 ? JSON.parse(JSON.stringify(sofia.metaTags)) : undefined,
        },
      });

      // Processa META tags (cria agendamentos, escala pro humano, etc)
      if (sofia.metaTags.length > 0) {
        await processMetaTags(sofia.metaTags, conversation.id, lead.id);
      }

      // Envia pro WhatsApp
      await sendWhatsAppMessage(phone, sofia.text);

      // Atualiza conversa
      await prisma.conversation.update({
        where: { id: conversation.id },
        data: { lastMessageAt: new Date() },
      });

      return NextResponse.json({ ok: true, handled: 'sofia' });
    } catch (error) {
      console.error('❌ Erro chamando Sofia:', error);

      // Fallback: manda mensagem genérica de segurança
      const fallback =
        'Oi! Recebi sua mensagem 🙏 Estou com uma instabilidade momentânea, ' +
        'mas em breve te respondo. Se for urgente, ligue pra barbearia.';

      await sendWhatsAppMessage(phone, fallback);

      // Cria notificação pro supervisor
      await prisma.supervisorNotification.create({
        data: {
          conversationId: conversation.id,
          type: 'CUSTOM',
          severity: 'HIGH',
          title: 'Sofia falhou em responder',
          detail: `Erro: ${error instanceof Error ? error.message : 'desconhecido'}`,
        },
      });

      return NextResponse.json({ ok: true, handled: 'fallback' });
    }
  } catch (error) {
    // ⚠️ IMPORTANTE: sempre retorna 200 pra Evolution não ficar reenviando
    console.error('❌ Erro fatal no webhook:', error);
    return NextResponse.json({ ok: false, error: 'internal' }, { status: 200 });
  }
}

// Endpoint GET pra Evolution testar se está vivo
export async function GET() {
  return NextResponse.json({
    ok: true,
    service: 'galego-barbearia-webhook',
    timestamp: new Date().toISOString(),
  });
}

```


## Arquivo: `src\app\atendimentos\page.tsx`

```tsx
'use client';

export default function AtendimentosPage() {
  return (
    <div className="page animate-fade-up">
      <div className="px-10 pt-8 pb-6" style={{ borderBottom: '1px solid var(--border)' }}>
        <h1 className="font-display text-[36px] tracking-tight leading-none mb-1.5">Atendimentos</h1>
        <p style={{ color: 'var(--text-2)' }}>Histórico de tickets e classificação de urgência</p>
      </div>
      <div className="px-10 py-7">
        <div className="text-center py-20 text-sm" style={{ color: 'var(--text-3)' }}>
          Esta tela ainda está sendo construída. Por enquanto, use a <strong style={{color: 'var(--accent)'}}>Caixa de Conversas</strong> e <strong style={{color: 'var(--accent)'}}>Supervisor</strong>.
        </div>
      </div>
    </div>
  );
}

```


## Arquivo: `src\app\chat\page.tsx`

```tsx
'use client';

import { Suspense, useEffect, useState, useRef, useCallback } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';

interface ConversationListItem {
  id: string;
  name: string;
  phone: string;
  qualification: string;
  status: string;
  unreadCount: number;
  lastMessage: string;
  lastMessageAt: string;
}

interface MessageItem {
  id: string;
  sender: 'CLIENT' | 'AI' | 'HUMAN';
  content: string;
  authorName?: string;
  createdAt: string;
}

interface ConversationDetail {
  id: string;
  status: string;
  assignedHuman?: string;
  lead: {
    id: string;
    name?: string;
    phone: string;
    qualification: string;
    notes?: string;
    preferredBarber?: string;
    preferredService?: string;
    totalVisits: number;
    lastVisitAt?: string;
  };
  messages: MessageItem[];
}

// Wrapper com Suspense — necessário no Next.js 14 para useSearchParams()
export default function ChatPage() {
  return (
    <Suspense fallback={<div className="grid place-items-center h-screen" style={{ background: 'var(--bg)', color: 'var(--text-3)' }}>Carregando...</div>}>
      <ChatContent />
    </Suspense>
  );
}

function ChatContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const selectedId = searchParams.get('id');

  const [conversations, setConversations] = useState<ConversationListItem[]>([]);
  const [activeConv, setActiveConv] = useState<ConversationDetail | null>(null);
  const [filter, setFilter] = useState<string>('all');
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const loadInbox = useCallback(async () => {
    const res = await fetch('/api/conversations');
    if (res.ok) setConversations(await res.json());
  }, []);

  const loadConv = useCallback(async (id: string) => {
    const res = await fetch(`/api/conversations/${id}/messages`);
    if (res.ok) setActiveConv(await res.json());
  }, []);

  useEffect(() => {
    loadInbox();
    const interval = setInterval(loadInbox, 5000);
    return () => clearInterval(interval);
  }, [loadInbox]);

  useEffect(() => {
    if (selectedId) {
      loadConv(selectedId);
      const interval = setInterval(() => loadConv(selectedId), 3000);
      return () => clearInterval(interval);
    } else {
      setActiveConv(null);
    }
  }, [selectedId, loadConv]);

  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [activeConv?.messages.length]);

  const filteredConvs = conversations.filter(c => {
    if (filter === 'all') return true;
    if (filter === 'ai') return c.status === 'AI_ACTIVE';
    if (filter === 'human') return c.status === 'HUMAN_ACTIVE';
    if (filter === 'wait') return c.status === 'WAITING_HUMAN';
    return true;
  });

  const handlePauseAI = async () => {
    if (!activeConv) return;
    await fetch(`/api/conversations/${activeConv.id}/pause`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ humanName: 'Supervisor' }),
    });
    loadConv(activeConv.id);
    loadInbox();
  };

  const handleResumeAI = async () => {
    if (!activeConv) return;
    await fetch(`/api/conversations/${activeConv.id}/resume`, { method: 'POST' });
    loadConv(activeConv.id);
    loadInbox();
  };

  const handleSend = async () => {
    if (!input.trim() || !activeConv || sending) return;
    setSending(true);
    try {
      await fetch(`/api/conversations/${activeConv.id}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: input.trim(), authorName: 'Supervisor' }),
      });
      setInput('');
      await loadConv(activeConv.id);
      await loadInbox();
    } finally {
      setSending(false);
    }
  };

  const handleQualChange = async (qual: string) => {
    if (!activeConv) return;
    // (Endpoint simplificado - na prática teria PATCH /leads/[id])
    setActiveConv({ ...activeConv, lead: { ...activeConv.lead, qualification: qual } });
  };

  const isPaused = activeConv?.status === 'HUMAN_ACTIVE' || activeConv?.status === 'WAITING_HUMAN';

  return (
    <div className="grid h-screen" style={{ gridTemplateColumns: '320px 1fr 300px', background: 'var(--bg)' }}>
      {/* INBOX */}
      <div
        className="flex flex-col overflow-hidden"
        style={{ background: 'var(--bg-2)', borderRight: '1px solid var(--border)' }}
      >
        <div className="px-5 pt-5 pb-4" style={{ borderBottom: '1px solid var(--border)' }}>
          <h2 className="font-display font-medium text-[22px]">Caixa</h2>
          <small className="text-xs" style={{ color: 'var(--text-3)' }}>
            {filteredConvs.length} conversa{filteredConvs.length === 1 ? '' : 's'}
          </small>
        </div>

        <div className="flex gap-1 p-3 overflow-x-auto">
          {[
            { k: 'all', l: 'Todas' },
            { k: 'ai', l: 'IA' },
            { k: 'human', l: 'Humano' },
            { k: 'wait', l: 'Esperando' },
          ].map(f => (
            <button
              key={f.k}
              onClick={() => setFilter(f.k)}
              className="px-3 py-1 rounded-2xl text-[11px] whitespace-nowrap font-sans transition-all"
              style={{
                background: filter === f.k ? 'var(--surface-2)' : 'transparent',
                color: filter === f.k ? 'var(--accent)' : 'var(--text-2)',
                border: `1px solid ${filter === f.k ? 'var(--accent)' : 'var(--border)'}`,
              }}
            >
              {f.l}
            </button>
          ))}
        </div>

        <div className="flex-1 overflow-y-auto">
          {filteredConvs.length === 0 ? (
            <div className="px-5 py-10 text-center text-sm" style={{ color: 'var(--text-3)' }}>
              Nenhuma conversa por enquanto.<br />
              Mande &quot;oi&quot; pro número da barbearia pra testar.
            </div>
          ) : (
            filteredConvs.map(c => (
              <button
                key={c.id}
                onClick={() => router.push(`/chat?id=${c.id}`)}
                className="w-full text-left grid gap-3 px-5 py-3.5 transition-colors relative"
                style={{
                  gridTemplateColumns: '40px 1fr',
                  background: selectedId === c.id ? 'var(--surface-2)' : 'transparent',
                  borderBottom: '1px solid var(--border)',
                }}
              >
                {selectedId === c.id && (
                  <div className="absolute left-0 top-0 bottom-0 w-[3px]" style={{ background: 'var(--accent)' }} />
                )}
                <Avatar name={c.name} />
                <div className="min-w-0">
                  <div className="flex justify-between gap-2 mb-0.5">
                    <span className={`text-sm ${c.unreadCount > 0 ? 'font-semibold' : 'font-medium'}`}>{c.name}</span>
                    <span className="text-[11px] flex-shrink-0" style={{ color: 'var(--text-3)' }}>
                      {formatTime(c.lastMessageAt)}
                    </span>
                  </div>
                  <div className="text-xs truncate mb-1" style={{ color: c.unreadCount > 0 ? 'var(--text)' : 'var(--text-2)' }}>
                    {c.lastMessage || '—'}
                  </div>
                  <StatusBadge status={c.status} />
                </div>
              </button>
            ))
          )}
        </div>
      </div>

      {/* CONVERSATION PANE */}
      <div className="flex flex-col overflow-hidden">
        {!activeConv ? (
          <div className="grid place-items-center h-full text-center" style={{ color: 'var(--text-3)' }}>
            <div>
              <div
                className="w-16 h-16 rounded-full grid place-items-center mx-auto mb-4"
                style={{ background: 'var(--surface)', color: 'var(--accent)' }}
              >
                <svg width="28" height="28" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 0 1-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"/>
                </svg>
              </div>
              <h3 className="font-display font-medium text-[22px] mb-1.5" style={{ color: 'var(--text)' }}>
                Selecione uma conversa
              </h3>
              <small>Sofia atende sozinha. Você só assume quando precisar.</small>
            </div>
          </div>
        ) : (
          <>
            {/* Header */}
            <div
              className="px-6 py-4 flex justify-between items-center"
              style={{ borderBottom: '1px solid var(--border)', background: 'var(--bg-2)' }}
            >
              <div className="flex items-center gap-3">
                <Avatar name={activeConv.lead.name || activeConv.lead.phone} />
                <div>
                  <h3 className="font-semibold text-[15px]">{activeConv.lead.name || activeConv.lead.phone}</h3>
                  <small className="text-[11px]" style={{ color: 'var(--text-3)' }}>
                    {activeConv.lead.phone} · WhatsApp
                  </small>
                </div>
              </div>
              <div className="flex gap-2 items-center">
                <StatusPill status={activeConv.status} />
                {isPaused ? (
                  <button
                    onClick={handleResumeAI}
                    className="px-4 py-2 rounded-lg text-[13px] font-medium transition-all"
                    style={{ background: 'var(--surface)', border: '1px solid var(--border)', color: 'var(--text)' }}
                  >
                    Devolver pra Sofia
                  </button>
                ) : (
                  <button
                    onClick={handlePauseAI}
                    className="px-4 py-2 rounded-lg text-[13px] font-medium transition-all"
                    style={{
                      background: 'rgba(212, 130, 126, 0.1)',
                      border: '1px solid rgba(212, 130, 126, 0.3)',
                      color: 'var(--danger)',
                    }}
                  >
                    Pausar IA · Assumir
                  </button>
                )}
              </div>
            </div>

            {/* Banner pausado */}
            {isPaused && (
              <div
                className="px-6 py-2 text-xs flex justify-between items-center"
                style={{
                  background: 'linear-gradient(90deg, rgba(199,155,111,0.18), rgba(199,155,111,0.05))',
                  borderBottom: '1px solid rgba(199,155,111,0.25)',
                  color: 'var(--human)',
                }}
              >
                <span>⏸ A Sofia está pausada. Tudo que você digitar vai direto pro cliente.</span>
              </div>
            )}

            {/* Mensagens */}
            <div
              className="flex-1 overflow-y-auto px-6 py-5"
              style={{
                background: `radial-gradient(circle at 30% 20%, rgba(212,165,116,0.04), transparent 50%), radial-gradient(circle at 70% 80%, rgba(142,163,212,0.04), transparent 50%), var(--bg)`,
              }}
            >
              {activeConv.messages.map(m => (
                <MessageBubble key={m.id} message={m} />
              ))}
              <div ref={messagesEndRef} />
            </div>

            {/* Input */}
            <div style={{ background: 'var(--bg-2)', borderTop: '1px solid var(--border)' }}>
              <div className="px-6 py-4 flex gap-2.5 items-end">
                <textarea
                  value={input}
                  onChange={e => setInput(e.target.value)}
                  onKeyDown={e => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      handleSend();
                    }
                  }}
                  placeholder={isPaused ? 'Sua mensagem vai direto pro cliente...' : 'Sofia está atendendo. Pause a IA pra responder.'}
                  disabled={!isPaused || sending}
                  className="flex-1 rounded-[10px] px-3.5 py-3 text-sm resize-none font-sans"
                  style={{
                    background: 'var(--surface)',
                    border: '1px solid var(--border)',
                    color: 'var(--text)',
                    minHeight: '42px',
                    maxHeight: '120px',
                    outline: 'none',
                  }}
                />
                <button
                  onClick={handleSend}
                  disabled={!isPaused || sending || !input.trim()}
                  className="w-[42px] h-[42px] rounded-[10px] grid place-items-center transition-all"
                  style={{
                    background: isPaused && input.trim() ? 'var(--accent)' : 'var(--surface-2)',
                    color: isPaused && input.trim() ? '#1a1410' : 'var(--text-3)',
                    cursor: isPaused && input.trim() ? 'pointer' : 'not-allowed',
                  }}
                >
                  <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 12l14-7-7 14-2-5-5-2z"/>
                  </svg>
                </button>
              </div>
            </div>
          </>
        )}
      </div>

      {/* LEAD PANEL */}
      <div
        className="overflow-y-auto p-5"
        style={{ background: 'var(--bg-2)', borderLeft: '1px solid var(--border)' }}
      >
        {!activeConv ? (
          <div className="text-center text-sm py-10" style={{ color: 'var(--text-3)' }}>
            Selecione uma conversa para ver o perfil do lead.
          </div>
        ) : (
          <>
            <div className="text-center mb-4">
              <Avatar name={activeConv.lead.name || activeConv.lead.phone} large />
            </div>
            <div className="font-display text-[20px] font-medium text-center mb-1">
              {activeConv.lead.name || 'Sem nome'}
            </div>
            <div className="text-center text-xs font-mono mb-4" style={{ color: 'var(--text-3)' }}>
              {activeConv.lead.phone}
            </div>

            <Section title="Qualificação do lead">
              <div className="flex gap-1.5 mb-2">
                {[
                  { k: 'HOT', l: '🔥 Quente', c: 'var(--danger)', bg: 'var(--danger-glow)' },
                  { k: 'WARM', l: 'Morno', c: 'var(--warning)', bg: 'rgba(224,168,104,0.15)' },
                  { k: 'COLD', l: 'Frio', c: 'var(--ai)', bg: 'rgba(142,163,212,0.12)' },
                ].map(q => {
                  const active = activeConv.lead.qualification === q.k;
                  return (
                    <button
                      key={q.k}
                      onClick={() => handleQualChange(q.k)}
                      className="flex-1 p-2 rounded-lg text-xs font-sans transition-all"
                      style={{
                        background: active ? q.bg : 'transparent',
                        color: active ? q.c : 'var(--text-2)',
                        border: `1px solid ${active ? q.c : 'var(--border)'}`,
                      }}
                    >
                      {q.l}
                    </button>
                  );
                })}
              </div>
            </Section>

            <Section title="Atendimento">
              <Row label="Status" value={<StatusPill status={activeConv.status} />} />
              <Row label="Serviço" value={activeConv.lead.preferredService || '—'} />
              <Row label="Barbeiro" value={activeConv.lead.preferredBarber || '—'} />
            </Section>

            <Section title="Histórico">
              <Row label="Última visita" value={activeConv.lead.lastVisitAt ? new Date(activeConv.lead.lastVisitAt).toLocaleDateString('pt-BR') : 'Primeira vez'} />
              <Row label="Total de visitas" value={String(activeConv.lead.totalVisits)} />
            </Section>

            {activeConv.lead.notes && (
              <Section title="Anotações">
                <div className="rounded-lg p-3 text-xs italic leading-relaxed" style={{ background: 'var(--surface)', border: '1px solid var(--border)', color: 'var(--text-2)' }}>
                  &quot;{activeConv.lead.notes}&quot;
                </div>
              </Section>
            )}
          </>
        )}
      </div>
    </div>
  );
}

function MessageBubble({ message }: { message: MessageItem }) {
  const time = new Date(message.createdAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });

  if (message.sender === 'CLIENT') {
    return (
      <div className="mb-3 flex gap-2 max-w-[70%] animate-msg-in">
        <div>
          <div className="px-3.5 py-2.5 rounded-[14px] text-sm leading-relaxed rounded-bl-[4px]" style={{ background: 'var(--surface-2)', color: 'var(--text)' }}>
            {message.content}
          </div>
          <div className="text-[10px] mt-1 uppercase tracking-[0.06em]" style={{ color: 'var(--text-3)' }}>
            {time}
          </div>
        </div>
      </div>
    );
  }

  if (message.sender === 'AI') {
    return (
      <div className="mb-3 flex flex-row-reverse gap-2 max-w-[70%] ml-auto animate-msg-in">
        <div>
          <div
            className="px-3.5 py-2.5 rounded-[14px] text-sm leading-relaxed rounded-br-[4px]"
            style={{
              background: 'linear-gradient(135deg, rgba(142,163,212,0.18), rgba(142,163,212,0.08))',
              border: '1px solid rgba(142,163,212,0.25)',
              color: 'var(--text)',
            }}
          >
            {message.content}
          </div>
          <div className="text-[10px] mt-1 uppercase tracking-[0.06em] text-right" style={{ color: 'var(--text-3)' }}>
            <span className="font-semibold" style={{ color: 'var(--ai)' }}>Sofia</span> · {time}
          </div>
        </div>
      </div>
    );
  }

  // HUMAN
  return (
    <div className="mb-3 flex flex-row-reverse gap-2 max-w-[70%] ml-auto animate-msg-in">
      <div>
        <div
          className="px-3.5 py-2.5 rounded-[14px] text-sm leading-relaxed rounded-br-[4px] font-medium"
          style={{ background: 'linear-gradient(135deg, var(--accent), #c8985a)', color: '#1a1410' }}
        >
          {message.content}
        </div>
        <div className="text-[10px] mt-1 uppercase tracking-[0.06em] text-right" style={{ color: 'var(--text-3)' }}>
          <span className="font-semibold" style={{ color: 'var(--accent)' }}>{message.authorName || 'Você'}</span> · {time}
        </div>
      </div>
    </div>
  );
}

function StatusPill({ status }: { status: string }) {
  const map: Record<string, { label: string; bg: string; color: string }> = {
    AI_ACTIVE: { label: 'Sofia respondendo', bg: 'var(--ai-glow)', color: 'var(--ai)' },
    HUMAN_ACTIVE: { label: 'Você atendendo', bg: 'rgba(199, 155, 111, 0.15)', color: 'var(--human)' },
    WAITING_HUMAN: { label: 'Aguardando você', bg: 'rgba(224, 168, 104, 0.15)', color: 'var(--warning)' },
    RESOLVED: { label: 'Resolvida', bg: 'rgba(126, 184, 154, 0.12)', color: 'var(--success)' },
  };
  const s = map[status] || map.AI_ACTIVE;
  return (
    <span
      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-2xl text-[11px] font-medium uppercase tracking-[0.08em]"
      style={{ background: s.bg, color: s.color }}
    >
      <span className="w-1.5 h-1.5 rounded-full" style={{ background: s.color }} />
      {s.label}
    </span>
  );
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { label: string; bg: string; color: string }> = {
    AI_ACTIVE: { label: 'IA Ativa', bg: 'var(--ai-glow)', color: 'var(--ai)' },
    HUMAN_ACTIVE: { label: 'Humano', bg: 'rgba(199, 155, 111, 0.15)', color: 'var(--human)' },
    WAITING_HUMAN: { label: 'Aguardando', bg: 'rgba(224, 168, 104, 0.15)', color: 'var(--warning)' },
    RESOLVED: { label: 'Resolvida', bg: 'rgba(126, 184, 154, 0.12)', color: 'var(--success)' },
  };
  const s = map[status] || map.AI_ACTIVE;
  return (
    <span className="text-[10px] px-2 py-0.5 rounded uppercase tracking-[0.08em] font-medium" style={{ background: s.bg, color: s.color }}>
      {s.label}
    </span>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="py-4" style={{ borderTop: '1px solid var(--border)' }}>
      <h4 className="text-[11px] uppercase tracking-[0.1em] mb-2.5 font-medium" style={{ color: 'var(--text-3)' }}>
        {title}
      </h4>
      {children}
    </div>
  );
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex justify-between items-center py-2 text-[13px]">
      <span style={{ color: 'var(--text-2)' }}>{label}</span>
      <span className="font-medium" style={{ color: 'var(--text)' }}>{value}</span>
    </div>
  );
}

function Avatar({ name, large }: { name: string; large?: boolean }) {
  const initials = (name || '?').split(' ').slice(0, 2).map(s => s[0]).join('').toUpperCase();
  const colors = ['linear-gradient(135deg, #d4a574, #b88550)','linear-gradient(135deg, #8ea3d4, #5b6fa3)','linear-gradient(135deg, #7eb89a, #4d8a72)','linear-gradient(135deg, #d4827e, #a85551)','linear-gradient(135deg, #c79b6f, #8d6940)'];
  const idx = (name || '').charCodeAt(0) % colors.length;
  const size = large ? 'w-16 h-16 text-[24px]' : 'w-9 h-9 text-[13px]';
  return (
    <div className={`${size} rounded-full grid place-items-center font-semibold flex-shrink-0 mx-auto ${large ? 'font-display' : ''}`} style={{ background: colors[idx], color: '#1a1410' }}>
      {initials}
    </div>
  );
}

function formatTime(iso: string) {
  const d = new Date(iso);
  const now = new Date();
  const diff = now.getTime() - d.getTime();
  if (diff < 60000) return 'agora';
  if (diff < 3600000) return `${Math.floor(diff / 60000)}min`;
  if (diff < 86400000) return d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  return d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
}

```


## Arquivo: `src\app\globals.css`

```css
@tailwind base;
@tailwind components;
@tailwind utilities;

@import url('https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,400;9..144,500;9..144,700;9..144,900&family=Outfit:wght@300;400;500;600;700&family=JetBrains+Mono:wght@400;500&display=swap');

:root {
  --bg: #0c0c0e;
  --bg-2: #131316;
  --surface: #17171b;
  --surface-2: #1d1d22;
  --surface-3: #25252b;
  --border: #2a2a31;
  --border-2: #35353e;
  --text: #f2ece1;
  --text-2: #a39d92;
  --text-3: #6b665e;
  --text-4: #44413c;
  --accent: #d4a574;
  --accent-2: #e8c089;
  --accent-glow: rgba(212, 165, 116, 0.18);
  --ai: #8ea3d4;
  --ai-glow: rgba(142, 163, 212, 0.18);
  --human: #c79b6f;
  --success: #7eb89a;
  --warning: #e0a868;
  --danger: #d4827e;
  --danger-glow: rgba(212, 130, 126, 0.15);
}

* { box-sizing: border-box; margin: 0; padding: 0; }

html, body {
  height: 100%;
  background: var(--bg);
  color: var(--text);
  font-family: 'Outfit', system-ui, sans-serif;
  font-size: 14px;
  -webkit-font-smoothing: antialiased;
}

body {
  overflow: hidden;
}

::-webkit-scrollbar { width: 8px; height: 8px; }
::-webkit-scrollbar-track { background: var(--bg); }
::-webkit-scrollbar-thumb { background: var(--surface-3); border-radius: 4px; }
::-webkit-scrollbar-thumb:hover { background: var(--border-2); }

@keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.55; }
}

@keyframes fadeUp {
  from { opacity: 0; transform: translateY(8px); }
  to { opacity: 1; transform: translateY(0); }
}

@keyframes msgIn {
  from { opacity: 0; transform: translateY(6px); }
  to { opacity: 1; transform: translateY(0); }
}

@keyframes typing {
  0%, 60%, 100% { opacity: 0.3; transform: translateY(0); }
  30% { opacity: 1; transform: translateY(-3px); }
}

.font-display { font-family: 'Fraunces', Georgia, serif; }
.font-mono { font-family: 'JetBrains Mono', monospace; }

.animate-pulse-soft { animation: pulse 2s ease-in-out infinite; }
.animate-fade-up { animation: fadeUp 0.4s ease-out; }
.animate-msg-in { animation: msgIn 0.3s ease-out; }

```


## Arquivo: `src\app\layout.tsx`

```tsx
import type { Metadata } from 'next';
import './globals.css';
import { Sidebar } from '@/components/Sidebar';

export const metadata: Metadata = {
  title: 'Galego Barbearia · Painel',
  description: 'Sistema de atendimento inteligente da Galego Barbearia',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR">
      <body>
        <div className="grid h-screen" style={{ gridTemplateColumns: '260px 1fr' }}>
          <Sidebar />
          <main className="overflow-y-auto overflow-x-hidden relative">{children}</main>
        </div>
      </body>
    </html>
  );
}

```


## Arquivo: `src\app\page.tsx`

```tsx
'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';

interface DashboardData {
  totalConvsToday: number;
  appointmentsTomorrow: number;
  pendingNotifications: number;
  aiResolutionRate: number;
  aiActiveCount: number;
  humanActiveCount: number;
  waitingCount: number;
}

interface ConversationListItem {
  id: string;
  name: string;
  lastMessage: string;
  status: string;
}

interface AppointmentListItem {
  id: string;
  scheduledAt: string;
  lead: { name?: string; phone: string };
  barber: { name: string };
  service: { name: string };
  status: string;
}

export default function DashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [conversations, setConversations] = useState<ConversationListItem[]>([]);
  const [appointments, setAppointments] = useState<AppointmentListItem[]>([]);

  useEffect(() => {
    const load = async () => {
      const today = new Date().toISOString().split('T')[0];
      const [d, c, a] = await Promise.all([
        fetch('/api/dashboard').then(r => r.json()),
        fetch('/api/conversations').then(r => r.json()),
        fetch(`/api/appointments?date=${today}`).then(r => r.json()),
      ]);
      setData(d);
      setConversations(c.slice(0, 5));
      setAppointments(a.slice(0, 5));
    };
    load();
    const interval = setInterval(load, 15000);
    return () => clearInterval(interval);
  }, []);

  const greeting = (() => {
    const h = new Date().getHours();
    if (h < 12) return 'Bom dia';
    if (h < 18) return 'Boa tarde';
    return 'Boa noite';
  })();

  const dateStr = new Date().toLocaleDateString('pt-BR', {
    weekday: 'long', day: 'numeric', month: 'long',
  });

  return (
    <div className="page animate-fade-up">
      <div
        className="px-10 pt-8 pb-6 flex justify-between items-end gap-6"
        style={{ borderBottom: '1px solid var(--border)' }}
      >
        <div>
          <h1 className="font-display text-[36px] tracking-tight leading-none mb-1.5">
            {greeting},{' '}
            <em className="italic font-medium" style={{ color: 'var(--accent)' }}>
              supervisor
            </em>
          </h1>
          <p style={{ color: 'var(--text-2)' }}>
            {dateStr.charAt(0).toUpperCase() + dateStr.slice(1)} ·{' '}
            {data ? `${data.appointmentsTomorrow} agendamento${data.appointmentsTomorrow === 1 ? '' : 's'} amanhã` : 'carregando...'}
          </p>
        </div>
      </div>

      <div className="px-10 py-7">
        {/* KPIs */}
        <div className="grid grid-cols-4 gap-4 mb-7">
          <KpiCard label="Conversas hoje" value={data?.totalConvsToday ?? '—'} hint={`${data?.aiActiveCount ?? 0} ativas`} />
          <KpiCard label="Agendamentos amanhã" value={data?.appointmentsTomorrow ?? '—'} hint="ver agenda" />
          <KpiCard label="Esperando supervisor" value={data?.pendingNotifications ?? '—'} hint="notificações" alert={!!(data && data.pendingNotifications > 0)} />
          <KpiCard label="Taxa resolução Sofia" value={data ? `${data.aiResolutionRate}%` : '—'} hint="IA fechou sozinha" />
        </div>

        {/* 2 colunas */}
        <div className="grid gap-4" style={{ gridTemplateColumns: '2fr 1fr' }}>
          {/* Conversas em andamento */}
          <Panel title="Conversas em andamento" linkHref="/chat" linkLabel="Ver todas →">
            {conversations.length === 0 ? (
              <EmptyState text="Nenhuma conversa ativa" />
            ) : (
              conversations.map(c => (
                <Link
                  key={c.id}
                  href={`/chat?id=${c.id}`}
                  className="grid items-center gap-3.5 px-5 py-3 hover:bg-[var(--surface-2)] transition-colors"
                  style={{ gridTemplateColumns: 'auto 1fr auto' }}
                >
                  <Avatar name={c.name} />
                  <div className="min-w-0">
                    <div className="font-medium text-sm">{c.name}</div>
                    <div className="text-xs truncate" style={{ color: 'var(--text-2)' }}>
                      {c.lastMessage || '—'}
                    </div>
                  </div>
                  <StatusBadge status={c.status} />
                </Link>
              ))
            )}
          </Panel>

          {/* Próximos agendamentos */}
          <Panel title="Próximos agendamentos" linkHref="/agendamentos" linkLabel="Agenda →">
            {appointments.length === 0 ? (
              <EmptyState text="Sem agendamentos hoje" />
            ) : (
              appointments.map(a => {
                const time = new Date(a.scheduledAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
                return (
                  <div
                    key={a.id}
                    className="grid gap-3 px-5 py-3"
                    style={{ gridTemplateColumns: '56px 1fr', borderBottom: '1px solid var(--border)' }}
                  >
                    <div className="font-mono text-[13px] font-medium" style={{ color: 'var(--accent)' }}>
                      {time}
                      <small className="block text-[10px] mt-0.5" style={{ color: 'var(--text-3)' }}>
                        {a.barber.name}
                      </small>
                    </div>
                    <div>
                      <div className="text-[13px] font-medium">{a.lead.name || a.lead.phone}</div>
                      <div className="text-xs" style={{ color: 'var(--text-2)' }}>
                        {a.service.name} ·{' '}
                        <span style={{ color: a.status === 'CONFIRMED' ? 'var(--success)' : 'var(--warning)' }}>
                          {a.status === 'CONFIRMED' ? 'Confirmado' : 'Aguarda confirmação'}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </Panel>
        </div>
      </div>
    </div>
  );
}

function KpiCard({ label, value, hint, alert }: { label: string; value: number | string; hint?: string; alert?: boolean }) {
  return (
    <div
      className="p-5 rounded-xl transition-all hover:-translate-y-0.5"
      style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}
    >
      <div className="text-[11px] uppercase tracking-[0.1em] mb-3" style={{ color: 'var(--text-3)' }}>
        {label}
      </div>
      <div
        className="font-display font-medium text-[38px] leading-none tracking-tight"
        style={{ color: alert ? 'var(--danger)' : 'var(--text)' }}
      >
        {value}
      </div>
      {hint && (
        <div className="mt-2 text-xs" style={{ color: alert ? 'var(--danger)' : 'var(--success)' }}>
          {hint}
        </div>
      )}
    </div>
  );
}

function Panel({ title, children, linkHref, linkLabel }: {
  title: string; children: React.ReactNode; linkHref?: string; linkLabel?: string;
}) {
  return (
    <div className="rounded-xl overflow-hidden" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
      <div
        className="px-5 py-4 flex justify-between items-center"
        style={{ borderBottom: '1px solid var(--border)' }}
      >
        <div className="font-display font-medium text-[17px]">{title}</div>
        {linkHref && (
          <Link href={linkHref} className="text-xs hover:text-[var(--accent)] transition-colors" style={{ color: 'var(--text-2)' }}>
            {linkLabel}
          </Link>
        )}
      </div>
      <div className="py-2">{children}</div>
    </div>
  );
}

function EmptyState({ text }: { text: string }) {
  return (
    <div className="px-5 py-10 text-center text-sm" style={{ color: 'var(--text-3)' }}>
      {text}
    </div>
  );
}

function Avatar({ name }: { name: string }) {
  const initials = (name || '?').split(' ').slice(0, 2).map(s => s[0]).join('').toUpperCase();
  const colors = ['av-1', 'av-2', 'av-3', 'av-4', 'av-5'];
  const idx = (name || '').charCodeAt(0) % colors.length;
  const bg = ['linear-gradient(135deg, #d4a574, #b88550)','linear-gradient(135deg, #8ea3d4, #5b6fa3)','linear-gradient(135deg, #7eb89a, #4d8a72)','linear-gradient(135deg, #d4827e, #a85551)','linear-gradient(135deg, #c79b6f, #8d6940)'][idx];
  return (
    <div className="w-9 h-9 rounded-full grid place-items-center font-semibold text-[13px] flex-shrink-0" style={{ background: bg, color: '#1a1410' }}>
      {initials}
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { label: string; bg: string; color: string }> = {
    AI_ACTIVE: { label: 'IA Ativa', bg: 'var(--ai-glow)', color: 'var(--ai)' },
    HUMAN_ACTIVE: { label: 'Humano', bg: 'rgba(199, 155, 111, 0.15)', color: 'var(--human)' },
    WAITING_HUMAN: { label: 'Aguardando', bg: 'rgba(224, 168, 104, 0.15)', color: 'var(--warning)' },
    RESOLVED: { label: 'Resolvida', bg: 'rgba(126, 184, 154, 0.12)', color: 'var(--success)' },
  };
  const s = map[status] || map.AI_ACTIVE;
  return (
    <span
      className="text-[10px] px-2 py-0.5 rounded uppercase tracking-[0.08em] font-medium"
      style={{ background: s.bg, color: s.color }}
    >
      {s.label}
    </span>
  );
}

```


## Arquivo: `src\app\supervisor\page.tsx`

```tsx
'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';

interface Notification {
  id: string;
  type: string;
  severity: 'HIGH' | 'MEDIUM' | 'LOW';
  title: string;
  detail: string;
  createdAt: string;
  conversationId?: string;
  conversation?: { lead: { name?: string; phone: string } };
}

export default function SupervisorPage() {
  const router = useRouter();
  const [notifications, setNotifications] = useState<Notification[]>([]);

  const load = useCallback(async () => {
    const res = await fetch('/api/notifications');
    if (res.ok) setNotifications(await res.json());
  }, []);

  useEffect(() => {
    load();
    const interval = setInterval(load, 8000);
    return () => clearInterval(interval);
  }, [load]);

  const handleResolve = async (id: string) => {
    await fetch('/api/notifications', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id }),
    });
    load();
  };

  return (
    <div className="page animate-fade-up">
      <div className="px-10 pt-8 pb-6" style={{ borderBottom: '1px solid var(--border)' }}>
        <h1 className="font-display text-[36px] tracking-tight leading-none mb-1.5">
          Mesa do <em className="italic font-medium" style={{ color: 'var(--accent)' }}>supervisor</em>
        </h1>
        <p style={{ color: 'var(--text-2)' }}>
          {notifications.length === 0
            ? 'Sem notificações pendentes — tudo sob controle.'
            : `${notifications.length} notificaç${notifications.length === 1 ? 'ão' : 'ões'} pendente${notifications.length === 1 ? '' : 's'}`}
        </p>
      </div>

      <div className="px-10 py-7 max-w-[900px]">
        {notifications.length === 0 ? (
          <div className="text-center py-20 text-sm" style={{ color: 'var(--text-3)' }}>
            <div className="w-16 h-16 rounded-full mx-auto mb-4 grid place-items-center" style={{ background: 'var(--surface)' }}>
              <svg width="24" height="24" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7"/>
              </svg>
            </div>
            <p>Sofia tá dando conta sozinha por enquanto.</p>
          </div>
        ) : (
          notifications.map(n => {
            const sevColor = { HIGH: 'var(--danger)', MEDIUM: 'var(--warning)', LOW: 'var(--ai)' }[n.severity];
            const sevBg = { HIGH: 'var(--danger-glow)', MEDIUM: 'rgba(224,168,104,0.15)', LOW: 'rgba(142,163,212,0.12)' }[n.severity];
            const time = new Date(n.createdAt);
            const diff = Date.now() - time.getTime();
            const timeStr = diff < 60000 ? 'agora' : diff < 3600000 ? `há ${Math.floor(diff/60000)} min` : `há ${Math.floor(diff/3600000)}h`;

            return (
              <div
                key={n.id}
                className="rounded-xl p-5 mb-3 grid gap-4 items-start relative overflow-hidden"
                style={{
                  background: 'var(--surface)',
                  border: '1px solid var(--border)',
                  gridTemplateColumns: '40px 1fr auto',
                }}
              >
                <div
                  className="absolute left-0 top-0 bottom-0 w-[3px]"
                  style={{
                    background: sevColor,
                    boxShadow: n.severity === 'HIGH' ? `0 0 14px ${sevBg}` : 'none',
                  }}
                />
                <div className="w-9 h-9 rounded-lg grid place-items-center" style={{ background: 'var(--surface-2)', color: sevColor }}>
                  <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/>
                  </svg>
                </div>
                <div>
                  <div className="font-display text-base font-medium mb-1">{n.title}</div>
                  <div className="text-[13px] leading-relaxed mb-2" style={{ color: 'var(--text-2)' }}>{n.detail}</div>
                  <div className="text-[11px] flex gap-3" style={{ color: 'var(--text-3)' }}>
                    <span>{timeStr}</span>
                    {n.conversation && (
                      <span>
                        <strong style={{ color: 'var(--text-2)' }}>{n.conversation.lead.name || n.conversation.lead.phone}</strong>
                      </span>
                    )}
                  </div>
                </div>
                <div className="flex flex-col gap-1.5">
                  {n.conversationId && (
                    <button
                      onClick={() => router.push(`/chat?id=${n.conversationId}`)}
                      className="px-3 py-1.5 rounded-lg text-xs font-medium"
                      style={{ background: 'var(--accent)', color: '#1a1410' }}
                    >
                      Abrir conversa
                    </button>
                  )}
                  <button
                    onClick={() => handleResolve(n.id)}
                    className="px-3 py-1.5 rounded-lg text-xs"
                    style={{ background: 'transparent', color: 'var(--text-2)', border: '1px solid var(--border)' }}
                  >
                    Marcar resolvida
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}

```


## Arquivo: `src\components\Sidebar.tsx`

```tsx
'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';

interface NavItem {
  href: string;
  label: string;
  icon: React.ReactNode;
  badgeKey?: 'unreadConvs' | 'pendingNotifs' | 'tomorrowAppts';
}

const items: NavItem[] = [
  {
    href: '/',
    label: 'Painel',
    icon: (
      <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5">
        <path strokeLinecap="round" strokeLinejoin="round" d="M3 13a2 2 0 0 1 2-2h3a2 2 0 0 1 2 2v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-6Zm0-8a2 2 0 0 1 2-2h3a2 2 0 0 1 2 2v3a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5Zm11 0a2 2 0 0 1 2-2h3a2 2 0 0 1 2 2v3a2 2 0 0 1-2 2h-3a2 2 0 0 1-2-2V5Zm0 9a2 2 0 0 1 2-2h3a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-3a2 2 0 0 1-2-2v-5Z"/>
      </svg>
    ),
  },
  {
    href: '/chat',
    label: 'Caixa de Conversas',
    icon: (
      <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5">
        <path strokeLinecap="round" strokeLinejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 0 1-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8Z"/>
      </svg>
    ),
    badgeKey: 'unreadConvs',
  },
  {
    href: '/agendamentos',
    label: 'Agenda',
    icon: (
      <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5">
        <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2Z"/>
      </svg>
    ),
    badgeKey: 'tomorrowAppts',
  },
  {
    href: '/atendimentos',
    label: 'Atendimentos',
    icon: (
      <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5">
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h4m-7 4h12a2 2 0 0 0 2-2V8l-6-6H5a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2Z"/>
      </svg>
    ),
  },
  {
    href: '/supervisor',
    label: 'Supervisor',
    icon: (
      <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5">
        <path strokeLinecap="round" strokeLinejoin="round" d="M15 17h5l-1.4-1.4A2 2 0 0 1 18 14.2V11a6 6 0 0 0-12 0v3.2c0 .53-.21 1.04-.6 1.4L4 17h5m6 0a3 3 0 1 1-6 0m6 0H9"/>
      </svg>
    ),
    badgeKey: 'pendingNotifs',
  },
];

export function Sidebar() {
  const pathname = usePathname();
  const [counts, setCounts] = useState({ unreadConvs: 0, pendingNotifs: 0, tomorrowAppts: 0 });

  useEffect(() => {
    const fetchCounts = async () => {
      try {
        const res = await fetch('/api/dashboard');
        if (res.ok) {
          const data = await res.json();
          setCounts({
            unreadConvs: data.waitingCount + data.humanActiveCount,
            pendingNotifs: data.pendingNotifications,
            tomorrowAppts: data.appointmentsTomorrow,
          });
        }
      } catch {}
    };
    fetchCounts();
    const interval = setInterval(fetchCounts, 15000);
    return () => clearInterval(interval);
  }, []);

  return (
    <aside
      className="flex flex-col p-7 pt-7 pb-5 relative"
      style={{ background: 'var(--bg-2)', borderRight: '1px solid var(--border)' }}
    >
      {/* Brand */}
      <div className="pb-7 mb-4" style={{ borderBottom: '1px solid var(--border)' }}>
        <div className="flex items-center gap-2.5 mb-1.5">
          <div
            className="w-8 h-8 rounded-full grid place-items-center font-display font-black text-base"
            style={{
              background: 'linear-gradient(135deg, var(--accent), #b88550)',
              color: '#1a1410',
              boxShadow: '0 0 0 1px rgba(212,165,116,0.3), 0 0 20px var(--accent-glow)',
            }}
          >
            G
          </div>
          <h1 className="font-display text-[19px] leading-tight tracking-tight">
            Galego{' '}
            <span className="font-black italic" style={{ color: 'var(--accent)' }}>
              Barbearia
            </span>
          </h1>
        </div>
        <small className="text-[11px] tracking-[0.08em] uppercase ml-[42px] block" style={{ color: 'var(--text-3)' }}>
          Painel de Gestão
        </small>
      </div>

      <nav className="flex-1 flex flex-col gap-0.5">
        <div className="text-[10px] tracking-[0.14em] uppercase px-3 pt-4 pb-2" style={{ color: 'var(--text-4)' }}>
          Operação
        </div>

        {items.map(item => {
          const active = pathname === item.href || (item.href !== '/' && pathname.startsWith(item.href));
          const badgeValue = item.badgeKey ? counts[item.badgeKey] : 0;

          return (
            <Link
              key={item.href}
              href={item.href}
              className="flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all relative"
              style={{
                background: active ? 'linear-gradient(90deg, var(--accent-glow), transparent 60%)' : 'transparent',
                color: active ? 'var(--accent)' : 'var(--text-2)',
                fontWeight: active ? 500 : 400,
              }}
            >
              {active && (
                <div
                  className="absolute -left-[18px] top-2 bottom-2 w-[3px] rounded-r"
                  style={{ background: 'var(--accent)', boxShadow: '0 0 12px var(--accent-glow)' }}
                />
              )}
              {item.icon}
              <span className="flex-1">{item.label}</span>
              {badgeValue > 0 && (
                <span
                  className="text-[11px] px-1.5 py-px rounded-[10px] font-medium animate-pulse-soft"
                  style={{
                    background: 'rgba(212, 130, 126, 0.15)',
                    color: 'var(--danger)',
                  }}
                >
                  {badgeValue}
                </span>
              )}
            </Link>
          );
        })}
      </nav>

      {/* AI Status */}
      <div
        className="mt-4 p-3.5 rounded-[10px] relative overflow-hidden"
        style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}
      >
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background: 'radial-gradient(circle at 100% 0%, var(--ai-glow), transparent 50%)',
          }}
        />
        <div className="flex items-center gap-2 text-[11px] uppercase tracking-[0.08em] mb-1.5" style={{ color: 'var(--text-3)' }}>
          <div
            className="w-[7px] h-[7px] rounded-full animate-pulse-soft"
            style={{ background: 'var(--ai)', boxShadow: '0 0 8px var(--ai)' }}
          />
          Sofia · IA Ativa
        </div>
        <h3 className="font-display text-[15px] mb-1">Atendimento ao vivo</h3>
        <p className="text-xs" style={{ color: 'var(--text-2)' }}>
          {counts.unreadConvs > 0
            ? `${counts.unreadConvs} conversa${counts.unreadConvs === 1 ? '' : 's'} precisa${counts.unreadConvs === 1 ? '' : 'm'} de você`
            : 'Tudo em ordem por aqui'}
        </p>
      </div>
    </aside>
  );
}

```


## Arquivo: `src\lib\claude.ts`

```ts
import Anthropic from '@anthropic-ai/sdk';
import { prisma } from './prisma';
import { buildSofiaSystemPrompt } from './sofia-prompt';

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

const MODEL = process.env.ANTHROPIC_MODEL || 'claude-haiku-4-5-20251001';

export interface SofiaResponse {
  text: string;           // texto pra mandar pro cliente (sem META tags)
  metaTags: MetaTag[];    // tags extraídas
  raw: string;            // resposta bruta com META
}

export interface MetaTag {
  type: 'AGENDAR' | 'ESCALAR' | string;
  params: Record<string, string>;
}

/**
 * Chama a Sofia pra responder uma mensagem
 */
export async function askSofia(conversationId: string): Promise<SofiaResponse> {
  // Carrega últimas 30 mensagens da conversa
  const messages = await prisma.message.findMany({
    where: { conversationId },
    orderBy: { createdAt: 'asc' },
    take: 30,
  });

  // Converte pro formato da API Anthropic
  const apiMessages: { role: 'user' | 'assistant'; content: string }[] = messages.map(m => ({
    role: m.sender === 'CLIENT' ? 'user' : 'assistant',
    content: m.content,
  }));

  // Constrói o system prompt com dados frescos
  const systemPrompt = await buildSofiaSystemPrompt();

  // Chama a API
  const response = await anthropic.messages.create({
    model: MODEL,
    max_tokens: 500,
    system: systemPrompt,
    messages: apiMessages,
  });

  const rawText = response.content
    .filter(b => b.type === 'text')
    .map(b => (b as { type: 'text'; text: string }).text)
    .join('\n');

  // Extrai META tags
  const metaTags = extractMetaTags(rawText);

  // Remove META tags do texto que vai pro cliente
  const cleanText = rawText.replace(/\[META:[^\]]+\]/g, '').trim();

  return {
    text: cleanText,
    metaTags,
    raw: rawText,
  };
}

/**
 * Extrai tags [META:TIPO|param1=valor1|param2=valor2]
 */
function extractMetaTags(text: string): MetaTag[] {
  const regex = /\[META:([^\]]+)\]/g;
  const tags: MetaTag[] = [];
  let match;

  while ((match = regex.exec(text)) !== null) {
    const parts = match[1].split('|');
    const type = parts[0].trim();
    const params: Record<string, string> = {};

    for (let i = 1; i < parts.length; i++) {
      const [key, ...valueParts] = parts[i].split('=');
      if (key) {
        params[key.trim()] = valueParts.join('=').trim();
      }
    }

    tags.push({ type, params });
  }

  return tags;
}

```


## Arquivo: `src\lib\evolution.ts`

```ts
// Cliente da Evolution API - envia mensagens pro WhatsApp

const EVOLUTION_URL = process.env.EVOLUTION_API_URL!;
const EVOLUTION_KEY = process.env.EVOLUTION_API_KEY!;
const EVOLUTION_INSTANCE = process.env.EVOLUTION_INSTANCE || 'teste';

/**
 * Envia mensagem de texto pro WhatsApp via Evolution
 */
export async function sendWhatsAppMessage(phone: string, text: string): Promise<boolean> {
  if (!EVOLUTION_URL || !EVOLUTION_KEY) {
    console.error('❌ Evolution API não configurada (EVOLUTION_API_URL ou EVOLUTION_API_KEY faltando)');
    return false;
  }

  // Normaliza telefone (remove + e espaços)
  const cleanPhone = phone.replace(/\D/g, '');

  try {
    const response = await fetch(
      `${EVOLUTION_URL}/message/sendText/${EVOLUTION_INSTANCE}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': EVOLUTION_KEY,
        },
        body: JSON.stringify({
          number: cleanPhone,
          text: text,
        }),
      }
    );

    if (!response.ok) {
      const errorBody = await response.text();
      console.error(`❌ Evolution API erro ${response.status}:`, errorBody);
      return false;
    }

    const data = await response.json();
    console.log(`✅ Mensagem enviada pra ${cleanPhone}:`, data.key?.id || 'ok');
    return true;
  } catch (error) {
    console.error('❌ Erro ao enviar mensagem WhatsApp:', error);
    return false;
  }
}

/**
 * Verifica se a instância Evolution está conectada
 */
export async function checkEvolutionStatus(): Promise<{ connected: boolean; state?: string }> {
  if (!EVOLUTION_URL || !EVOLUTION_KEY) {
    return { connected: false };
  }

  try {
    const response = await fetch(
      `${EVOLUTION_URL}/instance/connectionState/${EVOLUTION_INSTANCE}`,
      {
        headers: { 'apikey': EVOLUTION_KEY },
      }
    );

    if (!response.ok) return { connected: false };

    const data = await response.json();
    const state = data?.instance?.state || data?.state;

    return {
      connected: state === 'open',
      state,
    };
  } catch (error) {
    console.error('❌ Erro ao verificar Evolution:', error);
    return { connected: false };
  }
}

```


## Arquivo: `src\lib\meta-handler.ts`

```ts
// Processa as META tags retornadas pela Sofia e executa as ações
// (criar agendamento, escalar pra supervisor, etc.)

import { prisma } from './prisma';
import type { MetaTag } from './claude';

export async function processMetaTags(
  tags: MetaTag[],
  conversationId: string,
  leadId: string
): Promise<void> {
  for (const tag of tags) {
    try {
      if (tag.type === 'AGENDAR') {
        await handleScheduling(tag, leadId);
      } else if (tag.type === 'ESCALAR') {
        await handleEscalation(tag, conversationId);
      }
    } catch (error) {
      console.error(`❌ Erro processando META ${tag.type}:`, error);
    }
  }
}

/**
 * [META:AGENDAR|barbeiro=Galego|servico=Corte|data=2026-04-28|hora=11:00]
 */
async function handleScheduling(tag: MetaTag, leadId: string) {
  const { barbeiro, servico, data, hora } = tag.params;

  if (!barbeiro || !servico || !data || !hora) {
    console.warn('⚠️ META AGENDAR incompleto:', tag.params);
    return;
  }

  // Busca barbeiro e serviço
  const [barber, service] = await Promise.all([
    prisma.barber.findFirst({ where: { name: { equals: barbeiro, mode: 'insensitive' } } }),
    prisma.service.findFirst({ where: { name: { equals: servico, mode: 'insensitive' } } }),
  ]);

  if (!barber || !service) {
    console.warn('⚠️ Barbeiro ou serviço não encontrado:', { barbeiro, servico });
    return;
  }

  // Monta o datetime no fuso de Brasília (UTC-3)
  // Cliente fala "11:00" → significa 11h no horário local da barbearia
  const scheduledAt = new Date(`${data}T${hora}:00-03:00`);

  if (isNaN(scheduledAt.getTime())) {
    console.warn('⚠️ Data/hora inválida:', { data, hora });
    return;
  }

  // Verifica conflito de horário (mesmo barbeiro no mesmo horário)
  const conflict = await prisma.appointment.findFirst({
    where: {
      barberId: barber.id,
      scheduledAt: scheduledAt,
      status: { notIn: ['CANCELLED', 'NO_SHOW'] },
    },
  });

  if (conflict) {
    console.warn('⚠️ Conflito de horário, agendamento ignorado:', { barbeiro, scheduledAt });
    // Cria notificação pro supervisor saber
    await prisma.supervisorNotification.create({
      data: {
        type: 'CUSTOM',
        severity: 'MEDIUM',
        title: 'Conflito de horário detectado',
        detail: `Sofia tentou marcar ${servico} com ${barbeiro} em ${scheduledAt.toLocaleString('pt-BR')}, mas já existe agendamento.`,
      },
    });
    return;
  }

  // Cria o agendamento
  const appointment = await prisma.appointment.create({
    data: {
      leadId,
      barberId: barber.id,
      serviceId: service.id,
      scheduledAt,
      status: 'PENDING_CONFIRMATION',
    },
  });

  // Atualiza preferências do lead
  await prisma.lead.update({
    where: { id: leadId },
    data: {
      preferredBarber: barber.name,
      preferredService: service.name,
    },
  });

  console.log(`📅 Agendamento criado: ${appointment.id} - ${servico} com ${barbeiro} em ${scheduledAt.toLocaleString('pt-BR')}`);
}

/**
 * [META:ESCALAR|motivo=...|severidade=HIGH]
 */
async function handleEscalation(tag: MetaTag, conversationId: string) {
  const { motivo, severidade } = tag.params;

  const sev = (severidade || 'MEDIUM').toUpperCase();
  const validSev = ['HIGH', 'MEDIUM', 'LOW'].includes(sev) ? sev : 'MEDIUM';

  // Busca dados da conversa
  const conv = await prisma.conversation.findUnique({
    where: { id: conversationId },
    include: { lead: true },
  });

  if (!conv) return;

  // Atualiza conversa pra WAITING_HUMAN
  await prisma.conversation.update({
    where: { id: conversationId },
    data: { status: 'WAITING_HUMAN' },
  });

  // Cria notificação
  await prisma.supervisorNotification.create({
    data: {
      conversationId,
      type: 'ESCALATION',
      severity: validSev as 'HIGH' | 'MEDIUM' | 'LOW',
      title: `${conv.lead.name || 'Cliente'} precisa de atendimento`,
      detail: motivo || 'Sofia escalou esta conversa',
    },
  });

  console.log(`🚨 Conversa ${conversationId} escalada pro supervisor: ${motivo}`);
}

```


## Arquivo: `src\lib\prisma.ts`

```ts
import { PrismaClient } from '@prisma/client';

const globalForPrisma = global as unknown as { prisma: PrismaClient };

export const prisma =
  globalForPrisma.prisma ||
  new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['error', 'warn'] : ['error'],
  });

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;

```


## Arquivo: `src\lib\sofia-prompt.ts`

```ts
// Prompt da Sofia - atendente IA da Galego Barbearia
// Esta é a "personalidade" e as regras que a Sofia segue

import { prisma } from './prisma';

export async function buildSofiaSystemPrompt() {
  // Busca dados dinâmicos do banco
  const [barbers, services, settings] = await Promise.all([
    prisma.barber.findMany({ where: { active: true } }),
    prisma.service.findMany({ where: { active: true } }),
    prisma.barbershopSettings.findMany(),
  ]);

  const cfg = Object.fromEntries(settings.map(s => [s.key, s.value]));

  const today = new Date().toLocaleDateString('pt-BR', {
    weekday: 'long',
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  });

  return `Você é a **Sofia**, atendente virtual da **${cfg.shop_name || 'Galego Barbearia'}** em ${cfg.shop_address || 'Teixeira de Freitas - BA'}.

# SEU PAPEL
Atender clientes pelo WhatsApp de forma simpática, rápida e direta. Você qualifica leads, tira dúvidas e marca horários.

# TOM DE VOZ
- Brasileiro, descontraído mas profissional
- Frases curtas (máximo 2 linhas por mensagem)
- Use emoji com moderação (✂️ 💈 👍 🙏 — só quando fizer sentido)
- NUNCA use linguagem corporativa ("prezado", "estamos à disposição")
- Trate o cliente pelo primeiro nome assim que souber

# DADOS DA BARBEARIA
- 📍 ${cfg.shop_address || 'Teixeira de Freitas - BA'}
- 🕐 ${cfg.shop_hours || 'Segunda a Sábado, 8h às 21h'}
- 💳 Pagamento: ${cfg.payment_methods || 'PIX, cartão, dinheiro'}

# BARBEIROS
${barbers.map(b => `- **${b.name}** (atende ${b.startHour}h às ${b.endHour}h)`).join('\n')}

# SERVIÇOS E PREÇOS
${services.map(s => `- **${s.name}**: R$ ${(s.priceInCents/100).toFixed(2).replace('.', ',')} (${s.durationMinutes}min)`).join('\n')}

# DATA DE HOJE
${today}

# COMO RESPONDER

1. **Primeiro contato**: Pergunta o nome do cliente (se ainda não souber).
2. **Identifica a intenção**: agendar, tirar dúvida, cancelar, reclamar.
3. **Para agendamentos**:
   - Pergunta serviço desejado
   - Pergunta barbeiro (ou sugere se não tiver preferência)
   - Pergunta dia/horário desejado
   - Confirma os detalhes antes de marcar
4. **Para dúvidas**: Responde direto com base nos dados acima.
5. **Para reclamações ou pedidos especiais** (descontos, parcelamentos fora do padrão, remarcação repetida): **Escala pra um humano**.

# COMO MARCAR HORÁRIO (REGRA CRÍTICA)

Quando o cliente CONFIRMAR um horário (não antes!), você DEVE incluir no FINAL da sua resposta uma tag invisível com os dados do agendamento, exatamente neste formato:

[META:AGENDAR|barbeiro=NOME|servico=NOME_DO_SERVICO|data=YYYY-MM-DD|hora=HH:MM]

Exemplo:
"Confirmadinho então, João! ✂️ Corte com o Galego amanhã às 11h. Te espero!
[META:AGENDAR|barbeiro=Galego|servico=Corte|data=2026-04-28|hora=11:00]"

A tag [META:...] será REMOVIDA antes de enviar pro cliente — ela só serve pro sistema marcar a agenda.

# COMO ESCALAR PRO HUMANO

Se o cliente:
- Pedir desconto que você não pode dar
- Reclamar de algo grave
- Quiser remarcar pela 3ª vez ou mais
- Ficar com raiva
- Pedir explicitamente "falar com humano/atendente/dono"

Responde algo tipo: "Entendi! Vou chamar um atendente humano pra te ajudar pessoalmente. Só um instante 🙏"

E inclui no final:
[META:ESCALAR|motivo=DESCRICAO_CURTA|severidade=HIGH|MEDIUM|LOW]

Exemplo:
"Entendi sua frustração, Carlos. Vou chamar o supervisor pra te atender direto, só um momentinho 🙏
[META:ESCALAR|motivo=Cliente quer remarcar pela 3a vez|severidade=HIGH]"

# REGRAS ABSOLUTAS

❌ NUNCA invente preços, horários ou serviços que não estão nos dados acima
❌ NUNCA prometa desconto sem escalar pro humano
❌ NUNCA marque horário fora de seg-sáb 8h-21h
❌ NUNCA marque dois clientes no mesmo barbeiro+horário
❌ NUNCA mencione que você é uma IA, robô ou Claude — você é a Sofia
✅ SEMPRE confirme os dados do agendamento antes de criar
✅ SEMPRE responda em português brasileiro
✅ SEMPRE seja breve

# EXEMPLOS DE BOAS RESPOSTAS

Cliente: "oi"
Você: "Oi! 👋 Sou a Sofia, da Galego Barbearia. Como posso te chamar?"

Cliente: "quanto é o corte"
Você: "O corte tá R$ 45 💈 Quer marcar um horário?"

Cliente: "marca pra amanhã 10h com o galego"
Você: "Show! Confirma pra mim: Corte (R$ 45) com o Galego amanhã (data) às 10h. Tá certo?"

Cliente: "sim"
Você: "Confirmado! ✂️ Te espero amanhã às 10h. Qualquer coisa é só chamar!
[META:AGENDAR|barbeiro=Galego|servico=Corte|data=2026-04-28|hora=10:00]"
`;
}

```


## Arquivo: `prisma\schema.prisma`

```prisma
// Schema do banco de dados - Galego Barbearia
// Documentação: https://pris.ly/d/prisma-schema

generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

// ============== ENUMS ==============

enum ConversationStatus {
  AI_ACTIVE       // Sofia respondendo
  HUMAN_ACTIVE    // Atendente humano assumiu
  WAITING_HUMAN   // Sofia escalou pra humano e aguarda
  RESOLVED        // Conversa fechada
}

enum LeadQualification {
  HOT
  WARM
  COLD
  UNKNOWN
}

enum MessageSender {
  CLIENT
  AI
  HUMAN
}

enum AppointmentStatus {
  PENDING_CONFIRMATION  // Marcado mas cliente ainda não confirmou
  CONFIRMED              // Cliente confirmou
  COMPLETED              // Atendido
  CANCELLED              // Cancelado
  NO_SHOW                // Cliente não compareceu
  RESCHEDULING           // Em processo de remarcação
}

enum NotificationSeverity {
  HIGH
  MEDIUM
  LOW
}

enum NotificationType {
  ESCALATION              // Sofia escalou pro humano
  CONFIRMATION_FAILED     // Cliente não respondeu confirmação
  RESCHEDULE_REQUEST      // Cliente quer remarcar
  REPEATED_NO_SHOW        // Cliente faltoso
  PAYMENT_ISSUE           // Problema de pagamento
  CUSTOM                  // Outro
}

// ============== MODELS ==============

// Cliente da barbearia (lead)
model Lead {
  id              String              @id @default(cuid())
  phone           String              @unique  // formato: 5573988208560
  name            String?
  email           String?
  qualification   LeadQualification   @default(UNKNOWN)
  notes           String?             @db.Text
  totalVisits     Int                 @default(0)
  lastVisitAt     DateTime?
  preferredBarber String?
  preferredService String?
  blocked         Boolean             @default(false)  // bloquear cliente faltoso

  conversations   Conversation[]
  appointments    Appointment[]

  createdAt       DateTime            @default(now())
  updatedAt       DateTime            @updatedAt

  @@index([phone])
  @@index([qualification])
}

// Conversa do WhatsApp
model Conversation {
  id              String              @id @default(cuid())
  leadId          String
  lead            Lead                @relation(fields: [leadId], references: [id], onDelete: Cascade)

  status          ConversationStatus  @default(AI_ACTIVE)
  assignedHuman   String?             // nome do atendente que assumiu
  lastMessageAt   DateTime            @default(now())
  unreadCount     Int                 @default(0)
  resolvedAt      DateTime?

  messages        Message[]
  notifications   SupervisorNotification[]

  createdAt       DateTime            @default(now())
  updatedAt       DateTime            @updatedAt

  @@index([status])
  @@index([lastMessageAt])
  @@index([leadId])
}

// Mensagem dentro de uma conversa
model Message {
  id              String              @id @default(cuid())
  conversationId  String
  conversation    Conversation        @relation(fields: [conversationId], references: [id], onDelete: Cascade)

  sender          MessageSender
  content         String              @db.Text
  authorName      String?             // nome do humano (se sender=HUMAN)

  // Idempotência - evita mensagem duplicada da Evolution
  whatsappMessageId String?           @unique

  // Metadata da Sofia
  metaTags        Json?               // tags [META] extraídas

  createdAt       DateTime            @default(now())

  @@index([conversationId, createdAt])
  @@index([whatsappMessageId])
}

// Barbeiro
model Barber {
  id          String          @id @default(cuid())
  name        String          @unique
  active      Boolean         @default(true)
  workingDays String          @default("1,2,3,4,5,6")  // dias da semana (0=dom, 6=sab)
  startHour   Int             @default(8)               // 8h
  endHour     Int             @default(21)              // 21h
  color       String          @default("#d4a574")

  appointments Appointment[]

  createdAt   DateTime        @default(now())
  updatedAt   DateTime        @updatedAt
}

// Serviço (corte, barba, etc)
model Service {
  id              String          @id @default(cuid())
  name            String          @unique
  priceInCents    Int             // R$ 45,00 = 4500
  durationMinutes Int             @default(45)
  active          Boolean         @default(true)

  appointments    Appointment[]

  createdAt       DateTime        @default(now())
  updatedAt       DateTime        @updatedAt
}

// Agendamento
model Appointment {
  id              String              @id @default(cuid())
  leadId          String
  lead            Lead                @relation(fields: [leadId], references: [id])
  barberId        String
  barber          Barber              @relation(fields: [barberId], references: [id])
  serviceId       String
  service         Service             @relation(fields: [serviceId], references: [id])

  scheduledAt     DateTime            // data e hora do agendamento
  status          AppointmentStatus   @default(PENDING_CONFIRMATION)
  notes           String?             @db.Text

  // Confirmação 30min antes
  confirmationSentAt DateTime?
  confirmedAt        DateTime?
  reminderSentAt     DateTime?

  createdAt       DateTime            @default(now())
  updatedAt       DateTime            @updatedAt

  @@index([scheduledAt, status])
  @@index([barberId, scheduledAt])
  @@index([leadId])
}

// Notificações pro supervisor
model SupervisorNotification {
  id              String              @id @default(cuid())
  conversationId  String?
  conversation    Conversation?       @relation(fields: [conversationId], references: [id], onDelete: SetNull)

  type            NotificationType
  severity        NotificationSeverity @default(MEDIUM)
  title           String
  detail          String              @db.Text
  read            Boolean             @default(false)
  resolvedAt      DateTime?

  createdAt       DateTime            @default(now())

  @@index([read, createdAt])
  @@index([severity])
}

// Configurações da barbearia (key-value pra ser dinâmico)
model BarbershopSettings {
  id          String   @id @default(cuid())
  key         String   @unique
  value       String   @db.Text
  updatedAt   DateTime @updatedAt
}

```


## Arquivo: `prisma\seed.ts`

```ts
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Populando banco com dados iniciais da Galego Barbearia...');

  // ===== BARBEIROS =====
  const barbeiros = [
    { name: 'Galego', color: '#d4a574' },
    { name: 'Heitor', color: '#8ea3d4' },
    { name: 'Loiro',  color: '#7eb89a' },
  ];

  for (const b of barbeiros) {
    await prisma.barber.upsert({
      where: { name: b.name },
      update: { color: b.color, active: true },
      create: {
        name: b.name,
        color: b.color,
        active: true,
        workingDays: '1,2,3,4,5,6', // seg a sab (dom = 0)
        startHour: 8,
        endHour: 21,
      },
    });
    console.log(`✂️  Barbeiro: ${b.name}`);
  }

  // ===== SERVIÇOS =====
  const servicos = [
    { name: 'Corte',         priceInCents: 4500, durationMinutes: 45 },
    { name: 'Barba',         priceInCents: 3000, durationMinutes: 45 },
    { name: 'Corte + Barba', priceInCents: 7000, durationMinutes: 45 },
    { name: 'Sobrancelha',   priceInCents: 1000, durationMinutes: 15 },
  ];

  for (const s of servicos) {
    await prisma.service.upsert({
      where: { name: s.name },
      update: {
        priceInCents: s.priceInCents,
        durationMinutes: s.durationMinutes,
        active: true,
      },
      create: { ...s, active: true },
    });
    console.log(`💈 Serviço: ${s.name} - R$ ${(s.priceInCents/100).toFixed(2)}`);
  }

  // ===== CONFIGURAÇÕES DA BARBEARIA =====
  const settings = [
    { key: 'shop_name',     value: 'Galego Barbearia' },
    { key: 'shop_address',  value: 'Teixeira de Freitas - BA' },
    { key: 'shop_hours',    value: 'Segunda a Sábado, 8h às 21h' },
    { key: 'payment_methods', value: 'PIX, cartão, dinheiro' },
    { key: 'sofia_active',  value: 'true' },
  ];

  for (const s of settings) {
    await prisma.barbershopSettings.upsert({
      where: { key: s.key },
      update: { value: s.value },
      create: s,
    });
  }
  console.log(`⚙️  Configurações da barbearia salvas`);

  console.log('\n✅ Banco populado com sucesso!\n');
}

main()
  .catch((e) => {
    console.error('❌ Erro ao popular banco:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

```


## Arquivo: `package.json`

```json
{
  "name": "barbearia-galego",
  "version": "1.0.0",
  "private": true,
  "scripts": {
    "dev": "next dev",
    "build": "prisma generate && next build",
    "start": "prisma db push --skip-generate && tsx prisma/seed.ts && next start",
    "lint": "next lint",
    "postinstall": "prisma generate",
    "db:migrate": "prisma migrate deploy",
    "db:push": "prisma db push",
    "db:seed": "tsx prisma/seed.ts",
    "db:studio": "prisma studio"
  },
  "dependencies": {
    "@anthropic-ai/sdk": "^0.32.1",
    "@prisma/client": "^5.22.0",
    "next": "14.2.35",
    "react": "^18.3.1",
    "react-dom": "^18.3.1",
    "tsx": "^4.19.2"
  },
  "devDependencies": {
    "@types/node": "^20.17.6",
    "@types/react": "^18.3.12",
    "@types/react-dom": "^18.3.1",
    "autoprefixer": "^10.4.20",
    "postcss": "^8.4.49",
    "prisma": "^5.22.0",
    "tailwindcss": "^3.4.15",
    "typescript": "^5.6.3"
  },
  "engines": {
    "node": ">=20.0.0"
  }
}

```


## Arquivo: `next.config.js`

```js
/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
};

module.exports = nextConfig;

```


## Arquivo: `tailwind.config.ts`

```ts
import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./src/**/*.{js,ts,jsx,tsx,mdx}'],
  theme: {
    extend: {
      fontFamily: {
        display: ['Fraunces', 'Georgia', 'serif'],
        sans: ['Outfit', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
      },
      colors: {
        bg: '#0c0c0e',
        'bg-2': '#131316',
        surface: '#17171b',
        'surface-2': '#1d1d22',
        'surface-3': '#25252b',
        border: '#2a2a31',
        'border-2': '#35353e',
        text: '#f2ece1',
        'text-2': '#a39d92',
        'text-3': '#6b665e',
        'text-4': '#44413c',
        accent: '#d4a574',
        'accent-2': '#e8c089',
        ai: '#8ea3d4',
        human: '#c79b6f',
        success: '#7eb89a',
        warning: '#e0a868',
        danger: '#d4827e',
      },
    },
  },
  plugins: [],
};

export default config;

```
