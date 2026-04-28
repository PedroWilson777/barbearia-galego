'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState, useCallback } from 'react';

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
    label: 'Conversas',
    icon: (
      <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5">
        <path strokeLinecap="round" strokeLinejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 0 1-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8Z"/>
      </svg>
    ),
    badgeKey: 'unreadConvs',
  },
  {
    href: '/funil',
    label: 'Funil de Leads',
    icon: (
      <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5">
        <path strokeLinecap="round" strokeLinejoin="round" d="M3 4a1 1 0 0 1 1-1h16a1 1 0 0 1 .78 1.625L14 12.5V19a1 1 0 0 1-.553.894l-4 2A1 1 0 0 1 8 21v-8.5L3.22 5.625A1 1 0 0 1 3 5V4Z"/>
      </svg>
    ),
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

interface ToastNotif {
  id: string;
  title: string;
  detail: string;
  type: string;
}

export function Sidebar() {
  const pathname = usePathname();
  const [counts, setCounts] = useState({ unreadConvs: 0, pendingNotifs: 0, tomorrowAppts: 0 });
  const [toasts, setToasts] = useState<ToastNotif[]>([]);
  const [lastNotifCount, setLastNotifCount] = useState(0);
  const [lastAiCompleted, setLastAiCompleted] = useState(0);

  const dismissToast = (id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  };

  const fetchCounts = useCallback(async () => {
    try {
      const res = await fetch('/api/dashboard');
      if (!res.ok) return;
      const data = await res.json();
      const newPending = data.pendingNotifications ?? 0;
      setCounts({
        unreadConvs: data.waitingCount + data.humanActiveCount,
        pendingNotifs: newPending,
        tomorrowAppts: data.appointmentsTomorrow,
      });

      // Busca notificações novas de Sofia concluída
      if (newPending > lastNotifCount && lastNotifCount > 0) {
        const notifRes = await fetch('/api/notifications?limit=5');
        if (notifRes.ok) {
          const notifs = await notifRes.json();
          const aiNotifs = notifs.filter(
            (n: { type: string; id: string }) => n.type === 'AI_COMPLETED' && !n.id.startsWith('seen-')
          );
          const newAi = aiNotifs.filter((n: { createdAt: string }) => {
            const created = new Date(n.createdAt).getTime();
            return created > lastAiCompleted;
          });
          if (newAi.length > 0) {
            setLastAiCompleted(Date.now());
            setToasts(prev => [
              ...prev,
              ...newAi.slice(0, 3).map((n: { id: string; title: string; detail: string; type: string }) => ({
                id: n.id,
                title: n.title,
                detail: n.detail,
                type: n.type,
              })),
            ]);
          }
        }
      }
      setLastNotifCount(newPending);
    } catch {}
  }, [lastNotifCount, lastAiCompleted]);

  useEffect(() => {
    fetchCounts();
    const interval = setInterval(fetchCounts, 15000);
    return () => clearInterval(interval);
  }, [fetchCounts]);

  // Auto-dismiss toasts após 6s
  useEffect(() => {
    if (toasts.length === 0) return;
    const timer = setTimeout(() => {
      setToasts(prev => prev.slice(1));
    }, 6000);
    return () => clearTimeout(timer);
  }, [toasts]);

  return (
    <>
      {/* Toast notifications */}
      <div className="fixed top-4 right-4 z-50 flex flex-col gap-2" style={{ maxWidth: 320 }}>
        {toasts.map(toast => (
          <div
            key={toast.id}
            className="rounded-xl p-4 shadow-2xl flex gap-3 items-start animate-slide-in"
            style={{
              background: 'var(--surface)',
              border: '1px solid var(--border)',
              boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
            }}
          >
            <div
              className="w-8 h-8 rounded-full grid place-items-center flex-shrink-0"
              style={{ background: 'rgba(126,184,154,0.15)', color: '#7eb89a' }}
            >
              <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7"/>
              </svg>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[13px] font-medium leading-tight" style={{ color: 'var(--text-1)' }}>
                {toast.title}
              </p>
              <p className="text-[11px] mt-0.5 truncate" style={{ color: 'var(--text-3)' }}>
                {toast.detail}
              </p>
            </div>
            <button
              onClick={() => dismissToast(toast.id)}
              className="flex-shrink-0 opacity-50 hover:opacity-100"
              style={{ color: 'var(--text-3)' }}
            >
              <svg width="12" height="12" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12"/>
              </svg>
            </button>
          </div>
        ))}
      </div>

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
              A
            </div>
            <h1 className="font-display text-[17px] leading-tight tracking-tight">
              Atendimento{' '}
              <span className="font-black italic" style={{ color: 'var(--accent)' }}>
                IA
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
                    className="text-[11px] px-1.5 py-px rounded-[10px] font-medium"
                    style={{ background: 'rgba(212, 130, 126, 0.15)', color: 'var(--danger)' }}
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
            style={{ background: 'radial-gradient(circle at 100% 0%, var(--ai-glow), transparent 50%)' }}
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
    </>
  );
}
