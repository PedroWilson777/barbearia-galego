import Anthropic from '@anthropic-ai/sdk';
import { prisma } from './prisma';
import { buildSofiaSystemPrompt } from './sofia-prompt';

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

const MODEL = process.env.ANTHROPIC_MODEL || 'claude-haiku-4-5-20251001';

export interface SofiaResponse {
  text: string;           // texto pra mandar pro cliente (sem META tags)
  metaTags: MetaTag[];    // tags extraídas
  raw: string;            // resposta bruta com META
}

export interface MetaTag {
  type: 'AGENDAR' | 'ESCALAR' | string;
  params: Record<string, string>;
}

/**
 * Chama a Sofia pra responder uma mensagem
 */
export async function askSofia(conversationId: string): Promise<SofiaResponse> {
  // Carrega últimas 30 mensagens da conversa
  const messages = await prisma.message.findMany({
    where: { conversationId },
    orderBy: { createdAt: 'asc' },
    take: 30,
  });

  // Converte pro formato da API Anthropic
  const apiMessages: { role: 'user' | 'assistant'; content: string }[] = messages.map(m => ({
    role: m.sender === 'CLIENT' ? 'user' : 'assistant',
    content: m.content,
  }));

  // Constrói o system prompt com dados frescos
  const systemPrompt = await buildSofiaSystemPrompt();

  // Chama a API
  const response = await anthropic.messages.create({
    model: MODEL,
    max_tokens: 500,
    system: systemPrompt,
    messages: apiMessages,
  });

  const rawText = response.content
    .filter(b => b.type === 'text')
    .map(b => (b as { type: 'text'; text: string }).text)
    .join('\n');

  // Extrai META tags
  const metaTags = extractMetaTags(rawText);

  // Remove META tags do texto que vai pro cliente
  const cleanText = rawText.replace(/\[META:[^\]]+\]/g, '').trim();

  return {
    text: cleanText,
    metaTags,
    raw: rawText,
  };
}

/**
 * Extrai tags [META:TIPO|param1=valor1|param2=valor2]
 */
function extractMetaTags(text: string): MetaTag[] {
  const regex = /\[META:([^\]]+)\]/g;
  const tags: MetaTag[] = [];
  let match;

  while ((match = regex.exec(text)) !== null) {
    const parts = match[1].split('|');
    const type = parts[0].trim();
    const params: Record<string, string> = {};

    for (let i = 1; i < parts.length; i++) {
      const [key, ...valueParts] = parts[i].split('=');
      if (key) {
        params[key.trim()] = valueParts.join('=').trim();
      }
    }

    tags.push({ type, params });
  }

  return tags;
}
