// Webhook que recebe mensagens da Evolution API
// URL: POST /api/webhook/evolution

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { askSofia } from '@/lib/claude';
import { sendWhatsAppMessage } from '@/lib/evolution';
import { processMetaTags } from '@/lib/meta-handler';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    console.log('📨 Webhook Evolution:', JSON.stringify(body).slice(0, 300));

    const event = body?.event;
    if (event !== 'messages.upsert') {
      return NextResponse.json({ ok: true, ignored: event });
    }

    const data = body?.data;
    if (!data) return NextResponse.json({ ok: true });

    if (data?.key?.fromMe === true) {
      return NextResponse.json({ ok: true, ignored: 'fromMe' });
    }

    const remoteJid = data?.key?.remoteJid;
    const messageId = data?.key?.id;
    const messageText =
      data?.message?.conversation ||
      data?.message?.extendedTextMessage?.text ||
      data?.message?.imageMessage?.caption ||
      '';

    if (!remoteJid || !messageText) {
      return NextResponse.json({ ok: true, ignored: 'no text' });
    }

    if (remoteJid.includes('@g.us')) {
      return NextResponse.json({ ok: true, ignored: 'group' });
    }

    const phone = remoteJid.split('@')[0];
    const pushName = data?.pushName || null;

    if (messageId) {
      const existing = await prisma.message.findUnique({
        where: { whatsappMessageId: messageId },
      });
      if (existing) {
        return NextResponse.json({ ok: true, ignored: 'duplicate' });
      }
    }

    // 1. Busca ou cria Lead — coloca em "Novo Lead" se for novo
    let lead = await prisma.lead.findUnique({ where: { phone } });
    if (!lead) {
      const novoLeadStage = await prisma.funnelStage.findFirst({ where: { name: 'Novo Lead' } });
      lead = await prisma.lead.create({
        data: {
          phone,
          name: pushName,
          funnelStageId: novoLeadStage?.id ?? null,
        },
      });
      console.log(`👤 Novo lead: ${phone} (${pushName || 'sem nome'})`);
    }

    // 2. Busca ou cria Conversa
    let conversation = await prisma.conversation.findFirst({
      where: { leadId: lead.id, status: { not: 'RESOLVED' } },
      orderBy: { lastMessageAt: 'desc' },
    });

    if (!conversation) {
      conversation = await prisma.conversation.create({
        data: { leadId: lead.id, status: 'AI_ACTIVE' },
      });
    }

    // 3. Salva mensagem do cliente
    await prisma.message.create({
      data: {
        conversationId: conversation.id,
        sender: 'CLIENT',
        content: messageText,
        whatsappMessageId: messageId || null,
      },
    });

    // 4. Atualiza conversa
    await prisma.conversation.update({
      where: { id: conversation.id },
      data: { lastMessageAt: new Date(), unreadCount: { increment: 1 } },
    });

    // 5. Decide quem responde
    if (conversation.status === 'HUMAN_ACTIVE') {
      console.log(`🙋 Conversa ${conversation.id} com humano`);
      return NextResponse.json({ ok: true, handled: 'human' });
    }

    if (conversation.status === 'WAITING_HUMAN') {
      console.log(`⏳ Conversa ${conversation.id} aguardando humano`);
      return NextResponse.json({ ok: true, handled: 'waiting' });
    }

    // 6. Sofia responde
    try {
      const sofia = await askSofia(conversation.id);

      await prisma.message.create({
        data: {
          conversationId: conversation.id,
          sender: 'AI',
          content: sofia.text,
          metaTags: sofia.metaTags.length > 0 ? JSON.parse(JSON.stringify(sofia.metaTags)) : undefined,
        },
      });

      if (sofia.metaTags.length > 0) {
        await processMetaTags(sofia.metaTags, conversation.id, lead.id);
      }

      await sendWhatsAppMessage(phone, sofia.text);

      await prisma.conversation.update({
        where: { id: conversation.id },
        data: { lastMessageAt: new Date() },
      });

      return NextResponse.json({ ok: true, handled: 'sofia' });
    } catch (error) {
      console.error('❌ Erro chamando Sofia:', error);

      const fallback =
        'Oi! Recebi sua mensagem 🙏 Estou com uma instabilidade momentânea, ' +
        'mas em breve te respondo. Se for urgente, ligue pra barbearia.';

      await sendWhatsAppMessage(phone, fallback);

      await prisma.supervisorNotification.create({
        data: {
          conversationId: conversation.id,
          type: 'CUSTOM',
          severity: 'HIGH',
          title: 'Sofia falhou em responder',
          detail: `Erro: ${error instanceof Error ? error.message : 'desconhecido'}`,
        },
      });

      return NextResponse.json({ ok: true, handled: 'fallback' });
    }
  } catch (error) {
    console.error('❌ Erro fatal no webhook:', error);
    return NextResponse.json({ ok: false, error: 'internal' }, { status: 200 });
  }
}

export async function GET() {
  return NextResponse.json({
    ok: true,
    service: 'atendimento-ia-webhook',
    timestamp: new Date().toISOString(),
  });
}
