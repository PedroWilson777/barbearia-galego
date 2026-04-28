import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function GET() {
  const conversations = await prisma.conversation.findMany({
    where: { status: { not: 'RESOLVED' } },
    include: {
      lead: true,
      messages: {
        orderBy: { createdAt: 'desc' },
        take: 1,
      },
    },
    orderBy: { lastMessageAt: 'desc' },
    take: 100,
  });

  const formatted = conversations.map(c => ({
    id: c.id,
    leadId: c.lead.id,
    name: c.lead.name || c.lead.phone,
    phone: c.lead.phone,
    qualification: c.lead.qualification,
    status: c.status,
    assignedHuman: c.assignedHuman,
    unreadCount: c.unreadCount,
    lastMessage: c.messages[0]?.content || '',
    lastMessageAt: c.lastMessageAt,
    lastMessageSender: c.messages[0]?.sender,
  }));

  return NextResponse.json(formatted);
}
