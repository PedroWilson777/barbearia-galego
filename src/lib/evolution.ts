// Cliente da Evolution API - envia mensagens pro WhatsApp

const EVOLUTION_URL = process.env.EVOLUTION_API_URL!;
const EVOLUTION_KEY = process.env.EVOLUTION_API_KEY!;
const EVOLUTION_INSTANCE = process.env.EVOLUTION_INSTANCE || 'teste';

/**
 * Envia mensagem de texto pro WhatsApp via Evolution
 */
export async function sendWhatsAppMessage(phone: string, text: string): Promise<boolean> {
  if (!EVOLUTION_URL || !EVOLUTION_KEY) {
    console.error('❌ Evolution API não configurada (EVOLUTION_API_URL ou EVOLUTION_API_KEY faltando)');
    return false;
  }

  // Normaliza telefone (remove + e espaços)
  const cleanPhone = phone.replace(/\D/g, '');

  try {
    const response = await fetch(
      `${EVOLUTION_URL}/message/sendText/${EVOLUTION_INSTANCE}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': EVOLUTION_KEY,
        },
        body: JSON.stringify({
          number: cleanPhone,
          text: text,
        }),
      }
    );

    if (!response.ok) {
      const errorBody = await response.text();
      console.error(`❌ Evolution API erro ${response.status}:`, errorBody);
      return false;
    }

    const data = await response.json();
    console.log(`✅ Mensagem enviada pra ${cleanPhone}:`, data.key?.id || 'ok');
    return true;
  } catch (error) {
    console.error('❌ Erro ao enviar mensagem WhatsApp:', error);
    return false;
  }
}

/**
 * Verifica se a instância Evolution está conectada
 */
export async function checkEvolutionStatus(): Promise<{ connected: boolean; state?: string }> {
  if (!EVOLUTION_URL || !EVOLUTION_KEY) {
    return { connected: false };
  }

  try {
    const response = await fetch(
      `${EVOLUTION_URL}/instance/connectionState/${EVOLUTION_INSTANCE}`,
      {
        headers: { 'apikey': EVOLUTION_KEY },
      }
    );

    if (!response.ok) return { connected: false };

    const data = await response.json();
    const state = data?.instance?.state || data?.state;

    return {
      connected: state === 'open',
      state,
    };
  } catch (error) {
    console.error('❌ Erro ao verificar Evolution:', error);
    return { connected: false };
  }
}
