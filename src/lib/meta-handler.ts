import { prisma } from './prisma';
import type { MetaTag } from './claude';

export async function processMetaTags(
  tags: MetaTag[],
  conversationId: string,
  leadId: string
): Promise<void> {
  for (const tag of tags) {
    try {
      if (tag.type === 'AGENDAR')     await handleScheduling(tag, leadId);
      else if (tag.type === 'ESCALAR') await handleEscalation(tag, conversationId);
      else if (tag.type === 'QUALIFICAR') await handleQualification(tag, leadId);
      else if (tag.type === 'CONCLUIR')   await handleCompletion(tag, conversationId, leadId);
    } catch (error) {
      console.error(`❌ Erro processando META ${tag.type}:`, error);
    }
  }
}

async function handleScheduling(tag: MetaTag, leadId: string) {
  const { barbeiro, servico, data, hora } = tag.params;
  if (!barbeiro || !servico || !data || !hora) {
    console.warn('⚠️ META AGENDAR incompleto:', tag.params);
    return;
  }

  const [barber, service] = await Promise.all([
    prisma.barber.findFirst({ where: { name: { equals: barbeiro, mode: 'insensitive' } } }),
    prisma.service.findFirst({ where: { name: { equals: servico, mode: 'insensitive' } } }),
  ]);

  if (!barber || !service) {
    console.warn('⚠️ Barbeiro ou serviço não encontrado:', { barbeiro, servico });
    return;
  }

  const scheduledAt = new Date(`${data}T${hora}:00-03:00`);
  if (isNaN(scheduledAt.getTime())) {
    console.warn('⚠️ Data/hora inválida:', { data, hora });
    return;
  }

  const conflict = await prisma.appointment.findFirst({
    where: { barberId: barber.id, scheduledAt, status: { notIn: ['CANCELLED', 'NO_SHOW'] } },
  });

  if (conflict) {
    await prisma.supervisorNotification.create({
      data: {
        type: 'CUSTOM', severity: 'MEDIUM',
        title: 'Conflito de horário detectado',
        detail: `Sofia tentou marcar ${servico} com ${barbeiro} em ${scheduledAt.toLocaleString('pt-BR')}, mas já existe agendamento.`,
      },
    });
    return;
  }

  await prisma.appointment.create({
    data: { leadId, barberId: barber.id, serviceId: service.id, scheduledAt, status: 'PENDING_CONFIRMATION' },
  });

  // Move lead pro funil "Agendado"
  const agendadoStage = await prisma.funnelStage.findFirst({ where: { name: 'Agendado' } });
  if (agendadoStage) {
    await prisma.lead.update({ where: { id: leadId }, data: { funnelStageId: agendadoStage.id } });
  }

  await prisma.lead.update({
    where: { id: leadId },
    data: { preferredBarber: barber.name, preferredService: service.name },
  });

  console.log(`📅 Agendamento criado: ${servico} com ${barbeiro} em ${scheduledAt.toLocaleString('pt-BR')}`);
}

async function handleEscalation(tag: MetaTag, conversationId: string) {
  const { motivo, severidade } = tag.params;
  const sev = (['HIGH', 'MEDIUM', 'LOW'].includes((severidade || '').toUpperCase())
    ? severidade.toUpperCase()
    : 'MEDIUM') as 'HIGH' | 'MEDIUM' | 'LOW';

  const conv = await prisma.conversation.findUnique({
    where: { id: conversationId },
    include: { lead: true },
  });
  if (!conv) return;

  await prisma.conversation.update({ where: { id: conversationId }, data: { status: 'WAITING_HUMAN' } });
  await prisma.supervisorNotification.create({
    data: {
      conversationId, type: 'ESCALATION', severity: sev,
      title: `${conv.lead.name || 'Cliente'} precisa de atendimento`,
      detail: motivo || 'Sofia escalou esta conversa',
    },
  });

  console.log(`🚨 Conversa ${conversationId} escalada: ${motivo}`);
}

/**
 * [META:QUALIFICAR|score=8|etapa=Interessado|qualificacao=HOT]
 * Sofia avalia o lead e move ele no funil automaticamente
 */
async function handleQualification(tag: MetaTag, leadId: string) {
  const { score, etapa, qualificacao } = tag.params;

  const updateData: Record<string, unknown> = {};

  if (score) {
    const scoreNum = Math.min(10, Math.max(0, parseInt(score)));
    if (!isNaN(scoreNum)) updateData.score = scoreNum;
  }

  if (qualificacao && ['HOT', 'WARM', 'COLD', 'UNKNOWN'].includes(qualificacao.toUpperCase())) {
    updateData.qualification = qualificacao.toUpperCase();
  }

  if (etapa) {
    const stage = await prisma.funnelStage.findFirst({
      where: { name: { equals: etapa, mode: 'insensitive' } },
    });
    if (stage) updateData.funnelStageId = stage.id;
  }

  if (Object.keys(updateData).length > 0) {
    await prisma.lead.update({ where: { id: leadId }, data: updateData });
    console.log(`⭐ Lead ${leadId} qualificado:`, updateData);
  }
}

/**
 * [META:CONCLUIR|motivo=Agendamento confirmado]
 * Sofia sinaliza que o atendimento está completo
 */
async function handleCompletion(tag: MetaTag, conversationId: string, leadId: string) {
  const { motivo } = tag.params;

  await prisma.conversation.update({
    where: { id: conversationId },
    data: { status: 'RESOLVED', resolvedAt: new Date() },
  });

  // Move lead pra etapa "Fechado" no funil
  const fechadoStage = await prisma.funnelStage.findFirst({ where: { name: 'Fechado' } });
  if (fechadoStage) {
    await prisma.lead.update({ where: { id: leadId }, data: { funnelStageId: fechadoStage.id } });
  }

  // Notifica supervisor que a Sofia concluiu
  const conv = await prisma.conversation.findUnique({
    where: { id: conversationId },
    include: { lead: true },
  });

  await prisma.supervisorNotification.create({
    data: {
      conversationId,
      type: 'AI_COMPLETED',
      severity: 'LOW',
      title: `✅ Sofia concluiu atendimento com ${conv?.lead?.name || 'cliente'}`,
      detail: motivo || 'Atendimento finalizado pela IA sem necessidade de humano.',
    },
  });

  console.log(`✅ Conversa ${conversationId} concluída pela Sofia`);
}
