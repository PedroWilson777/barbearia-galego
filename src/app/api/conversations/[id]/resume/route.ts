import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const updated = await prisma.conversation.update({
    where: { id: params.id },
    data: {
      status: 'AI_ACTIVE',
      assignedHuman: null,
    },
  });

  return NextResponse.json({ ok: true, status: updated.status });
}
