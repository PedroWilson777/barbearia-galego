import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

// Lista agendamentos (com filtros opcionais)
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const date = searchParams.get('date'); // YYYY-MM-DD
  const barberId = searchParams.get('barberId');

  const where: { scheduledAt?: { gte: Date; lt: Date }; barberId?: string } = {};

  if (date) {
    const start = new Date(`${date}T00:00:00-03:00`);
    const end = new Date(`${date}T23:59:59-03:00`);
    where.scheduledAt = { gte: start, lt: end };
  }

  if (barberId) {
    where.barberId = barberId;
  }

  const appointments = await prisma.appointment.findMany({
    where,
    include: {
      lead: true,
      barber: true,
      service: true,
    },
    orderBy: { scheduledAt: 'asc' },
  });

  return NextResponse.json(appointments);
}
