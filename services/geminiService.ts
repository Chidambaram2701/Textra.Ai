
import { GoogleGenAI, Chat, GenerateContentResponse, Content } from "@google/genai";
import { Message, Role } from '../types';

// Models
export const MODELS = {
  FLASH: {
    id: 'gemini-3-flash-preview',
    name: 'Gemini 3 Flash',
    description: 'Fastest · Low Latency',
    provider: 'google'
  },
  PRO: {
    id: 'gemini-3-pro-preview',
    name: 'Gemini 3 Pro',
    description: 'Smartest · Reasoning',
    provider: 'google'
  },
  DEEPSEEK_V3: {
    id: 'deepseek-chat',
    name: 'DeepSeek V3',
    description: 'Balanced · Efficient',
    provider: 'deepseek'
  },
  DEEPSEEK_R1: {
    id: 'deepseek-reasoner',
    name: 'DeepSeek R1',
    description: 'Advanced · Chain of Thought',
    provider: 'deepseek'
  },
  IMAGE_GEN: 'gemini-2.5-flash-image'
};

/**
 * Safely retrieves the Gemini API Key. 
 */
const getApiKey = (): string => {
  const envKey = process.env.API_KEY;
  if (envKey && envKey !== 'undefined' && envKey !== '' && !envKey.startsWith('YOUR_API')) {
    return envKey;
  }
  return 'AIzaSyDTNzmXXVEnblV5CCnq_UYcNMCWeZTLt14';
};

/**
 * Safely retrieves the DeepSeek API Key.
 */
const getDeepSeekKey = (): string => {
  return process.env.DEEPSEEK_API_KEY || '';
};

let aiInstance: GoogleGenAI | null = null;

const getAiClient = (): GoogleGenAI => {
  if (!aiInstance) {
    aiInstance = new GoogleGenAI({ apiKey: getApiKey() });
  }
  return aiInstance;
};

/**
 * Converts messages to Gemini API format.
 */
const formatHistory = (messages: Message[]): Content[] => {
  return messages
    .filter(m => !m.error && !m.isStreaming)
    .map(m => ({
      role: m.role,
      parts: [{ text: m.content }]
    }));
};

/**
 * Initializes a new chat session.
 */
export const createChatSession = (modelId: string = MODELS.FLASH.id, historyMessages: Message[] = []): Chat => {
  const ai = getAiClient();
  const history = formatHistory(historyMessages);

  return ai.chats.create({
    model: modelId,
    history: history,
    config: {
      systemInstruction: "You are Textra AI, a powerful and helpful assistant. Provide clear, accurate, and detailed responses using Markdown formatting. Maintain a professional yet friendly tone.",
      thinkingConfig: { thinkingBudget: 0 }
    },
  });
};

/**
 * DeepSeek API Handler
 */
export async function* streamDeepSeekChat(modelId: string, messages: Message[]) {
  const apiKey = getDeepSeekKey();
  const formattedMessages = messages.map(m => ({
    role: m.role === Role.USER ? 'user' : 'assistant',
    content: m.content
  }));

  const response = await fetch('https://api.deepseek.com/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`
    },
    body: JSON.stringify({
      model: modelId,
      messages: formattedMessages,
      stream: true
    })
  });

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.error?.message || 'DeepSeek API Error');
  }

  const reader = response.body?.getReader();
  if (!reader) throw new Error('No body in response');

  const decoder = new TextDecoder();
  let buffer = '';

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split('\n');
    buffer = lines.pop() || '';

    for (const line of lines) {
      if (line.startsWith('data: ')) {
        const dataStr = line.slice(6).trim();
        if (dataStr === '[DONE]') return;
        
        try {
          const data = JSON.parse(dataStr);
          const delta = data.choices[0].delta;
          if (delta.content || delta.reasoning_content) {
            yield {
              content: delta.content || '',
              reasoning: delta.reasoning_content || ''
            };
          }
        } catch (e) {
          console.error('Error parsing stream chunk', e);
        }
      }
    }
  }
}

/**
 * Handles image editing/prompting.
 */
export const generateImageEdit = async (prompt: string, imageBase64: string, mimeType: string): Promise<GenerateContentResponse> => {
  const ai = getAiClient();
  return await ai.models.generateContent({
    model: MODELS.IMAGE_GEN,
    contents: {
      parts: [
        {
          inlineData: {
            mimeType: mimeType,
            data: imageBase64,
          },
        },
        {
          text: prompt,
        },
      ],
    },
  });
};
