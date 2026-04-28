import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function GET() {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(today.getDate() + 1);
  const dayAfter = new Date(tomorrow);
  dayAfter.setDate(tomorrow.getDate() + 1);

  const [
    totalConvsToday,
    appointmentsTomorrow,
    pendingNotifications,
    aiActiveCount,
    humanActiveCount,
    waitingCount,
    totalConvs,
    aiResolvedConvs,
  ] = await Promise.all([
    prisma.conversation.count({
      where: { createdAt: { gte: today, lt: tomorrow } },
    }),
    prisma.appointment.count({
      where: {
        scheduledAt: { gte: tomorrow, lt: dayAfter },
        status: { notIn: ['CANCELLED', 'NO_SHOW'] },
      },
    }),
    prisma.supervisorNotification.count({
      where: { resolvedAt: null },
    }),
    prisma.conversation.count({ where: { status: 'AI_ACTIVE' } }),
    prisma.conversation.count({ where: { status: 'HUMAN_ACTIVE' } }),
    prisma.conversation.count({ where: { status: 'WAITING_HUMAN' } }),
    prisma.conversation.count({
      where: { createdAt: { gte: today, lt: tomorrow } },
    }),
    prisma.conversation.count({
      where: {
        createdAt: { gte: today, lt: tomorrow },
        status: 'RESOLVED',
        // resolvida sem nunca passar pra humano
        assignedHuman: null,
      },
    }),
  ]);

  const aiResolutionRate = totalConvs > 0
    ? Math.round((aiResolvedConvs / totalConvs) * 100)
    : 100;

  return NextResponse.json({
    totalConvsToday,
    appointmentsTomorrow,
    pendingNotifications,
    aiActiveCount,
    humanActiveCount,
    waitingCount,
    aiResolutionRate,
  });
}
