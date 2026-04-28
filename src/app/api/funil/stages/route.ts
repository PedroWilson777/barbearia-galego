import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

// Lista todas as etapas + leads de cada etapa
export async function GET() {
  const stages = await prisma.funnelStage.findMany({
    orderBy: { order: 'asc' },
    include: {
      leads: {
        where: { blocked: false },
        orderBy: { updatedAt: 'desc' },
        include: {
          conversations: {
            where: { status: { not: 'RESOLVED' } },
            orderBy: { lastMessageAt: 'desc' },
            take: 1,
          },
          appointments: {
            where: { status: { notIn: ['CANCELLED', 'NO_SHOW'] } },
            orderBy: { scheduledAt: 'desc' },
            take: 1,
          },
        },
      },
    },
  });

  // Leads sem etapa (inbox)
  const unstagedLeads = await prisma.lead.findMany({
    where: { funnelStageId: null, blocked: false },
    orderBy: { createdAt: 'desc' },
    include: {
      conversations: {
        where: { status: { not: 'RESOLVED' } },
        orderBy: { lastMessageAt: 'desc' },
        take: 1,
      },
      appointments: {
        where: { status: { notIn: ['CANCELLED', 'NO_SHOW'] } },
        orderBy: { scheduledAt: 'desc' },
        take: 1,
      },
    },
  });

  return NextResponse.json({ stages, unstagedLeads });
}

// Cria nova etapa
export async function POST(req: NextRequest) {
  const body = await req.json();
  const { name, color, icon } = body;
  if (!name) return NextResponse.json({ error: 'name required' }, { status: 400 });

  const lastStage = await prisma.funnelStage.findFirst({ orderBy: { order: 'desc' } });
  const stage = await prisma.funnelStage.create({
    data: { name, color: color || '#d4a574', icon: icon || 'circle', order: (lastStage?.order ?? -1) + 1 },
  });

  return NextResponse.json(stage);
}

// Atualiza etapa (nome, cor)
export async function PATCH(req: NextRequest) {
  const body = await req.json();
  const { id, name, color, icon, order } = body;
  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 });

  const stage = await prisma.funnelStage.update({
    where: { id },
    data: { ...(name && { name }), ...(color && { color }), ...(icon && { icon }), ...(order !== undefined && { order }) },
  });

  return NextResponse.json(stage);
}

// Deleta etapa
export async function DELETE(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const id = searchParams.get('id');
  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 });

  // Move leads desta etapa pra null
  await prisma.lead.updateMany({ where: { funnelStageId: id }, data: { funnelStageId: null } });
  await prisma.funnelStage.delete({ where: { id } });

  return NextResponse.json({ ok: true });
}
