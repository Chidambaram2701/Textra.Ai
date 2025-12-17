import { GoogleGenAI, Chat, GenerateContentResponse, Content, Part } from "@google/genai";
import { Message, Role } from '../types';

// Models
export const MODELS = {
  FLASH: {
    id: 'gemini-3-flash-preview',
    name: 'Gemini 3 Flash',
    description: 'Fastest · Low Latency',
  },
  PRO: {
    id: 'gemini-3-pro-preview',
    name: 'Gemini 3 Pro',
    description: 'Smartest · Reasoning',
  },
  IMAGE_GEN: 'gemini-2.5-flash-image'
};

/**
 * Safely retrieves the API Key. 
 */
const getApiKey = (): string => {
  const key = process.env.API_KEY;
  // Handle empty or placeholder strings that might be injected during build
  if (!key || key === 'undefined' || key.trim() === '' || key.startsWith('YOUR_API')) {
    console.error("Critical: API Key is missing from the environment.");
    throw new Error("API Key is missing. Please ensure API_KEY is set in your deployment environment variables.");
  }
  return key;
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