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
