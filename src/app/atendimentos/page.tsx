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
