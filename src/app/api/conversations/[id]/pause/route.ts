import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const body = await req.json().catch(() => ({}));
  const humanName = body?.humanName || 'Atendente';

  const updated = await prisma.conversation.update({
    where: { id: params.id },
    data: {
      status: 'HUMAN_ACTIVE',
      assignedHuman: humanName,
    },
  });

  return NextResponse.json({ ok: true, status: updated.status });
}
