import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

// Move lead para outra etapa do funil
export async function PATCH(req: NextRequest) {
  const body = await req.json();
  const { leadId, stageId } = body;
  if (!leadId) return NextResponse.json({ error: 'leadId required' }, { status: 400 });

  const lead = await prisma.lead.update({
    where: { id: leadId },
    data: { funnelStageId: stageId || null },
  });

  return NextResponse.json(lead);
}
