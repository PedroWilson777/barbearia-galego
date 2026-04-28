'use client';

import { useEffect, useState, useRef } from 'react';

interface Lead {
  id: string;
  name: string | null;
  phone: string;
  qualification: string;
  score: number;
  preferredService: string | null;
  preferredBarber: string | null;
  createdAt: string;
  conversations: { id: string; status: string; lastMessageAt: string }[];
  appointments: { id: string; scheduledAt: string; status: string }[];
}

interface FunnelStage {
  id: string;
  name: string;
  color: string;
  order: number;
  icon: string;
  leads: Lead[];
}

const qualBadge: Record<string, { label: string; color: string }> = {
  HOT:     { label: '🔥 Quente', color: '#e07070' },
  WARM:    { label: '🌤️ Morno',  color: '#d4c574' },
  COLD:    { label: '🧊 Frio',   color: '#8ea3d4' },
  UNKNOWN: { label: '❓ N/A',    color: '#888' },
};

export default function FunilPage() {
  const [stages, setStages]           = useState<FunnelStage[]>([]);
  const [unstaged, setUnstaged]       = useState<Lead[]>([]);
  const [loading, setLoading]         = useState(true);
  const [draggingLead, setDraggingLead] = useState<Lead | null>(null);
  const [draggingFrom, setDraggingFrom] = useState<string | null>(null);
  const [dragOver, setDragOver]       = useState<string | null>(null);
  const [showAddStage, setShowAddStage] = useState(false);
  const [newStageName, setNewStageName] = useState('');
  const [newStageColor, setNewStageColor] = useState('#8ea3d4');
  const dragRef = useRef<HTMLDivElement>(null);

  const fetchData = async () => {
    try {
      const res = await fetch('/api/funil/stages');
      const data = await res.json();
      setStages(data.stages || []);
      setUnstaged(data.unstagedLeads || []);
    } catch {}
    setLoading(false);
  };

  useEffect(() => { fetchData(); }, []);

  const handleDragStart = (lead: Lead, fromStageId: string | 'unstaged') => {
    setDraggingLead(lead);
    setDraggingFrom(fromStageId);
  };

  const handleDrop = async (toStageId: string | null) => {
    if (!draggingLead) return;
    setDragOver(null);

    // Optimistic update
    if (draggingFrom === 'unstaged') {
      setUnstaged(prev => prev.filter(l => l.id !== draggingLead.id));
    } else {
      setStages(prev => prev.map(s =>
        s.id === draggingFrom ? { ...s, leads: s.leads.filter(l => l.id !== draggingLead.id) } : s
      ));
    }

    if (toStageId === null) {
      setUnstaged(prev => [draggingLead, ...prev]);
    } else {
      setStages(prev => prev.map(s =>
        s.id === toStageId ? { ...s, leads: [draggingLead, ...s.leads] } : s
      ));
    }

    setDraggingLead(null);
    setDraggingFrom(null);

    await fetch('/api/funil/leads', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ leadId: draggingLead.id, stageId: toStageId }),
    });
  };

  const addStage = async () => {
    if (!newStageName.trim()) return;
    await fetch('/api/funil/stages', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: newStageName.trim(), color: newStageColor }),
    });
    setNewStageName('');
    setShowAddStage(false);
    fetchData();
  };

  const deleteStage = async (id: string) => {
    if (!confirm('Deletar esta etapa? Os leads voltam para sem etapa.')) return;
    await fetch(`/api/funil/stages?id=${id}`, { method: 'DELETE' });
    fetchData();
  };

  const totalLeads = stages.reduce((acc, s) => acc + s.leads.length, 0) + unstaged.length;

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full" style={{ color: 'var(--text-3)' }}>
        <div className="text-center">
          <div className="w-8 h-8 rounded-full border-2 animate-spin mx-auto mb-3"
            style={{ borderColor: 'var(--accent)', borderTopColor: 'transparent' }} />
          <p className="text-sm">Carregando funil...</p>
        </div>
      </div>
    );
  }

  const allColumns = [
    { id: 'unstaged', name: 'Sem Etapa', color: '#666', leads: unstaged, isSystem: true },
    ...stages.map(s => ({ ...s, isSystem: false })),
  ];

  return (
    <div className="flex flex-col h-full" style={{ background: 'var(--bg-1)' }}>
      {/* Header */}
      <div className="flex items-center justify-between px-8 py-6"
        style={{ borderBottom: '1px solid var(--border)', background: 'var(--bg-2)' }}>
        <div>
          <h1 className="font-display text-2xl font-bold">
            Funil de <span style={{ color: 'var(--accent)' }}>Leads</span>
          </h1>
          <p className="text-sm mt-0.5" style={{ color: 'var(--text-3)' }}>
            {totalLeads} lead{totalLeads !== 1 ? 's' : ''} no funil · Arraste para mover entre etapas
          </p>
        </div>
        <button
          onClick={() => setShowAddStage(true)}
          className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all"
          style={{ background: 'var(--accent)', color: '#1a1410' }}
        >
          <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4"/>
          </svg>
          Nova Etapa
        </button>
      </div>

      {/* Modal nova etapa */}
      {showAddStage && (
        <div className="fixed inset-0 z-50 flex items-center justify-center"
          style={{ background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)' }}>
          <div className="rounded-2xl p-6 w-80" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
            <h3 className="font-display text-lg mb-4">Nova Etapa do Funil</h3>
            <input
              className="w-full px-3 py-2.5 rounded-lg text-sm mb-3"
              style={{ background: 'var(--bg-1)', border: '1px solid var(--border)', color: 'var(--text-1)' }}
              placeholder="Nome da etapa (ex: Negociando)"
              value={newStageName}
              onChange={e => setNewStageName(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && addStage()}
              autoFocus
            />
            <div className="flex items-center gap-3 mb-4">
              <label className="text-sm" style={{ color: 'var(--text-2)' }}>Cor:</label>
              <input type="color" value={newStageColor} onChange={e => setNewStageColor(e.target.value)}
                className="w-10 h-8 rounded cursor-pointer border-0" />
            </div>
            <div className="flex gap-2">
              <button onClick={() => setShowAddStage(false)}
                className="flex-1 py-2.5 rounded-lg text-sm" style={{ background: 'var(--bg-1)', color: 'var(--text-2)' }}>
                Cancelar
              </button>
              <button onClick={addStage}
                className="flex-1 py-2.5 rounded-lg text-sm font-medium" style={{ background: 'var(--accent)', color: '#1a1410' }}>
                Criar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Kanban board */}
      <div className="flex-1 overflow-x-auto p-6">
        <div className="flex gap-4 h-full" style={{ minWidth: `${allColumns.length * 280}px` }} ref={dragRef}>
          {allColumns.map(column => (
            <div
              key={column.id}
              className="flex flex-col rounded-xl flex-shrink-0"
              style={{
                width: 268,
                background: dragOver === column.id ? 'rgba(212,165,116,0.06)' : 'var(--bg-2)',
                border: `1px solid ${dragOver === column.id ? 'var(--accent)' : 'var(--border)'}`,
                transition: 'border-color 0.15s, background 0.15s',
              }}
              onDragOver={e => { e.preventDefault(); setDragOver(column.id); }}
              onDragLeave={() => setDragOver(null)}
              onDrop={() => handleDrop(column.isSystem && column.id === 'unstaged' ? null : column.id)}
            >
              {/* Column header */}
              <div className="flex items-center justify-between px-4 py-3.5"
                style={{ borderBottom: '1px solid var(--border)' }}>
                <div className="flex items-center gap-2">
                  <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: column.color }} />
                  <span className="text-sm font-medium" style={{ color: 'var(--text-1)' }}>{column.name}</span>
                  <span className="text-[11px] px-1.5 py-px rounded-full ml-1"
                    style={{ background: 'var(--surface)', color: 'var(--text-3)' }}>
                    {column.leads.length}
                  </span>
                </div>
                {!column.isSystem && (
                  <button onClick={() => deleteStage(column.id)} className="opacity-30 hover:opacity-70 transition-opacity"
                    style={{ color: 'var(--danger)' }} title="Deletar etapa">
                    <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12"/>
                    </svg>
                  </button>
                )}
              </div>

              {/* Cards */}
              <div className="flex-1 overflow-y-auto p-3 flex flex-col gap-2">
                {column.leads.length === 0 && (
                  <div className="flex flex-col items-center justify-center py-8 opacity-30">
                    <svg width="24" height="24" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M19 11H5m14 0-4-4m4 4-4 4"/>
                    </svg>
                    <p className="text-xs mt-2" style={{ color: 'var(--text-4)' }}>Solte leads aqui</p>
                  </div>
                )}

                {column.leads.map((lead) => {
                  const qual = qualBadge[lead.qualification] || qualBadge.UNKNOWN;
                  const hasActiveConv = lead.conversations.length > 0;
                  const nextAppt = lead.appointments[0];

                  return (
                    <div
                      key={lead.id}
                      draggable
                      onDragStart={() => handleDragStart(lead, column.id)}
                      onDragEnd={() => { setDraggingLead(null); setDraggingFrom(null); setDragOver(null); }}
                      className="rounded-xl p-3.5 cursor-grab active:cursor-grabbing select-none"
                      style={{
                        background: 'var(--surface)',
                        border: '1px solid var(--border)',
                        opacity: draggingLead?.id === lead.id ? 0.4 : 1,
                        transition: 'opacity 0.15s, box-shadow 0.15s',
                        boxShadow: draggingLead?.id === lead.id ? 'none' : '0 1px 3px rgba(0,0,0,0.15)',
                      }}
                    >
                      {/* Lead name + score */}
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <div>
                          <p className="text-[13px] font-medium leading-tight" style={{ color: 'var(--text-1)' }}>
                            {lead.name || 'Sem nome'}
                          </p>
                          <p className="text-[11px] mt-0.5" style={{ color: 'var(--text-3)' }}>
                            {lead.phone}
                          </p>
                        </div>
                        {lead.score > 0 && (
                          <div className="flex-shrink-0 flex items-center gap-1 px-2 py-1 rounded-lg"
                            style={{
                              background: lead.score >= 7 ? 'rgba(224,112,112,0.12)' : lead.score >= 4 ? 'rgba(212,197,116,0.12)' : 'rgba(142,163,212,0.12)',
                              color: lead.score >= 7 ? '#e07070' : lead.score >= 4 ? '#c4b565' : '#8ea3d4',
                            }}>
                            <svg width="10" height="10" fill="currentColor" viewBox="0 0 24 24">
                              <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2Z"/>
                            </svg>
                            <span className="text-[11px] font-bold">{lead.score}</span>
                          </div>
                        )}
                      </div>

                      {/* Qualification badge */}
                      <div className="flex flex-wrap gap-1.5 mb-2">
                        <span className="text-[10px] px-2 py-0.5 rounded-full font-medium"
                          style={{ background: `${qual.color}20`, color: qual.color }}>
                          {qual.label}
                        </span>
                        {lead.preferredService && (
                          <span className="text-[10px] px-2 py-0.5 rounded-full"
                            style={{ background: 'var(--bg-1)', color: 'var(--text-3)' }}>
                            {lead.preferredService}
                          </span>
                        )}
                      </div>

                      {/* Status indicators */}
                      <div className="flex items-center gap-3 mt-2.5 pt-2.5" style={{ borderTop: '1px solid var(--border)' }}>
                        {hasActiveConv && (
                          <div className="flex items-center gap-1 text-[10px]" style={{ color: 'var(--ai)' }}>
                            <div className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: 'var(--ai)' }} />
                            Ativo
                          </div>
                        )}
                        {nextAppt && (
                          <div className="flex items-center gap-1 text-[10px]" style={{ color: 'var(--text-3)' }}>
                            <svg width="10" height="10" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                              <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2Z"/>
                            </svg>
                            {new Date(nextAppt.scheduledAt).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })}
                          </div>
                        )}
                        <span className="ml-auto text-[10px]" style={{ color: 'var(--text-4)' }}>
                          {new Date(lead.createdAt).toLocaleDateString('pt-BR')}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
