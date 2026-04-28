import type { Metadata } from 'next';
import './globals.css';
import { Sidebar } from '@/components/Sidebar';

export const metadata: Metadata = {
  title: 'Atendimento IA · Painel',
  description: 'Sistema de atendimento inteligente com IA',
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
