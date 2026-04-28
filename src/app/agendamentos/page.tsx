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
