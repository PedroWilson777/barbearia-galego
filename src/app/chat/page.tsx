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
