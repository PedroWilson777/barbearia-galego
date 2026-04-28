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
