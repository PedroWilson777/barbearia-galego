import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { sendWhatsAppMessage } from '@/lib/evolution';

export const dynamic = 'force-dynamic';

interface RouteParams {
  params: { id: string };
}

// Lista mensagens da conversa
export async function GET(req: NextRequest, { params }: RouteParams) {
  const conversation = await prisma.conversation.findUnique({
    where: { id: params.id },
    include: {
      lead: true,
      messages: { orderBy: { createdAt: 'asc' } },
    },
  });

  if (!conversation) {
    return NextResponse.json({ error: 'not found' }, { status: 404 });
  }

  // Marca como lida
  await prisma.conversation.update({
    where: { id: params.id },
    data: { unreadCount: 0 },
  });

  // Conta agendamentos do lead
  const totalAppts = await prisma.appointment.count({
    where: { leadId: conversation.lead.id, status: { in: ['CONFIRMED', 'COMPLETED'] } },
  });

  return NextResponse.json({
    id: conversation.id,
    status: conversation.status,
    assignedHuman: conversation.assignedHuman,
    lead: {
      id: conversation.lead.id,
      name: conversation.lead.name,
      phone: conversation.lead.phone,
      qualification: conversation.lead.qualification,
      notes: conversation.lead.notes,
      preferredBarber: conversation.lead.preferredBarber,
      preferredService: conversation.lead.preferredService,
      totalVisits: totalAppts,
      lastVisitAt: conversation.lead.lastVisitAt,
    },
    messages: conversation.messages.map(m => ({
      id: m.id,
      sender: m.sender,
      content: m.content,
      authorName: m.authorName,
      createdAt: m.createdAt,
    })),
  });
}

// Envia mensagem do humano pro cliente
export async function POST(req: NextRequest, { params }: RouteParams) {
  const { content, authorName } = await req.json();

  if (!content?.trim()) {
    return NextResponse.json({ error: 'empty message' }, { status: 400 });
  }

  const conversation = await prisma.conversation.findUnique({
    where: { id: params.id },
    include: { lead: true },
  });

  if (!conversation) {
    return NextResponse.json({ error: 'not found' }, { status: 404 });
  }

  // Só permite mandar se humano tá com a conversa
  if (conversation.status !== 'HUMAN_ACTIVE' && conversation.status !== 'WAITING_HUMAN') {
    return NextResponse.json(
      { error: 'pause IA antes de mandar mensagem manual' },
      { status: 400 }
    );
  }

  // Salva no banco
  const message = await prisma.message.create({
    data: {
      conversationId: params.id,
      sender: 'HUMAN',
      content: content.trim(),
      authorName: authorName || 'Atendente',
    },
  });

  // Atualiza conversa pra HUMAN_ACTIVE
  await prisma.conversation.update({
    where: { id: params.id },
    data: {
      status: 'HUMAN_ACTIVE',
      lastMessageAt: new Date(),
      assignedHuman: authorName || 'Atendente',
    },
  });

  // Envia pro WhatsApp
  await sendWhatsAppMessage(conversation.lead.phone, content.trim());

  return NextResponse.json({ ok: true, id: message.id });
}
