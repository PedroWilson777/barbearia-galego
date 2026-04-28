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

  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const today = new Date().toISOString().split('T')[0];
        const [d, c, a] = await Promise.all([
          fetch('/api/dashboard').then(r => r.json()),
          fetch('/api/conversations').then(r => r.json()),
          fetch(`/api/appointments?date=${today}`).then(r => r.json()),
        ]);
        setData(d);
        setConversations(c.slice(0, 5));
        setAppointments(a.slice(0, 5));
      } catch (err) {
        console.error('Erro ao carregar dashboard:', err);
      } finally {
        setLoading(false);
      }
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
