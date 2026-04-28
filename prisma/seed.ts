import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Populando banco com dados iniciais - ATENDIMENTO IA...');

  // ===== BARBEIROS =====
  const barbeiros = [
    { name: 'Galego', color: '#d4a574' },
    { name: 'Heitor', color: '#8ea3d4' },
    { name: 'Loiro',  color: '#7eb89a' },
  ];
  for (const b of barbeiros) {
    await prisma.barber.upsert({
      where: { name: b.name },
      update: { color: b.color, active: true },
      create: { name: b.name, color: b.color, active: true, workingDays: '1,2,3,4,5,6', startHour: 8, endHour: 21 },
    });
    console.log(`✂️  Barbeiro: ${b.name}`);
  }

  // ===== SERVIÇOS =====
  const servicos = [
    { name: 'Corte',         priceInCents: 4500, durationMinutes: 45 },
    { name: 'Barba',         priceInCents: 3000, durationMinutes: 45 },
    { name: 'Corte + Barba', priceInCents: 7000, durationMinutes: 45 },
    { name: 'Sobrancelha',   priceInCents: 1000, durationMinutes: 15 },
  ];
  for (const s of servicos) {
    await prisma.service.upsert({
      where: { name: s.name },
      update: { priceInCents: s.priceInCents, durationMinutes: s.durationMinutes, active: true },
      create: { ...s, active: true },
    });
    console.log(`💈 Serviço: ${s.name} - R$ ${(s.priceInCents / 100).toFixed(2)}`);
  }

  // ===== ETAPAS DO FUNIL =====
  const etapasFunil = [
    { name: 'Novo Lead',   color: '#8ea3d4', order: 0, icon: 'user-plus' },
    { name: 'Interessado', color: '#d4c574', order: 1, icon: 'star' },
    { name: 'Agendado',    color: '#7eb89a', order: 2, icon: 'calendar' },
    { name: 'Fechado',     color: '#d4a574', order: 3, icon: 'check-circle' },
    { name: 'Perdido',     color: '#a07070', order: 4, icon: 'x-circle' },
  ];
  for (const e of etapasFunil) {
    await prisma.funnelStage.upsert({
      where: { name: e.name },
      update: { color: e.color, order: e.order, icon: e.icon },
      create: e,
    });
    console.log(`🗂️  Etapa do funil: ${e.name}`);
  }

  // ===== CONFIGURAÇÕES =====
  const settings = [
    { key: 'shop_name',       value: 'Galego Barbearia' },
    { key: 'shop_address',    value: 'Teixeira de Freitas - BA' },
    { key: 'shop_hours',      value: 'Segunda a Sábado, 8h às 21h' },
    { key: 'payment_methods', value: 'PIX, cartão, dinheiro' },
    { key: 'sofia_active',    value: 'true' },
  ];
  for (const s of settings) {
    await prisma.barbershopSettings.upsert({
      where: { key: s.key },
      update: { value: s.value },
      create: s,
    });
  }
  console.log(`⚙️  Configurações salvas`);
  console.log('\n✅ Banco populado com sucesso!\n');
}

main()
  .catch((e) => { console.error('❌ Erro ao popular banco:', e); process.exit(1); })
  .finally(async () => { await prisma.$disconnect(); });
