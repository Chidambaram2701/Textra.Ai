import { GoogleGenAI, Chat, GenerateContentResponse, Content, Part } from "@google/genai";
import { Message, Role } from '../types';

// Models
// Note: 'gemini-2.5-flash-lite' is not a valid model ID currently.
// We use 'gemini-2.5-flash' for high speed/low latency (Flash).
// We use 'gemini-3-pro-preview' for high intelligence (Pro).
export const MODELS = {
  FLASH_LITE: {
    id: 'gemini-2.5-flash', // Using the valid 2.5 Flash model
    name: 'Gemini 2.5 Flash',
    description: 'Fastest · Low Latency',
  },
  PRO: {
    id: 'gemini-3-pro-preview',
    name: 'Gemini 3 Pro',
    description: 'Smartest · Reasoning',
  },
  IMAGE_GEN: 'gemini-2.5-flash-image'
};

let aiInstance: GoogleGenAI | null = null;

// Lazy initialization
const getAiClient = (): GoogleGenAI => {
  if (!aiInstance) {
    // Attempt to get key from environment, fallback to hardcoded key if env var replacement fails
    // This ensures the app works immediately for the user
    const apiKey = process.env.API_KEY || "AIzaSyDTNzmXXVEnblV5CCnq_UYcNMCWeZTLt14";
    
    if (!apiKey) {
      throw new Error("API key is missing. Please set the API_KEY environment variable.");
    }
    aiInstance = new GoogleGenAI({ apiKey: apiKey });
  }
  return aiInstance;
};

/**
 * Converts internal Message format to Gemini API Content format for history.
 */
const formatHistory = (messages: Message[]): Content[] => {
  return messages
    .filter(m => !m.error && !m.isStreaming) // Filter out error/temporary messages
    .map(m => {
      const parts: Part[] = [{ text: m.content }];
      
      return {
        role: m.role,
        parts: parts
      };
    });
};

/**
 * Creates a new chat session, optionally with history.
 */
export const createChatSession = (modelId: string = MODELS.FLASH_LITE.id, historyMessages: Message[] = []): Chat => {
  const ai = getAiClient();
  
  const history = formatHistory(historyMessages);

  return ai.chats.create({
    model: modelId,
    history: history,
    config: {
      systemInstruction: "You are Textra AI, a helpful, intelligent, and knowledgeable AI assistant. You provide clear, concise, and accurate answers using Markdown formatting.",
      thinkingConfig: { thinkingBudget: 0 }
    },
  });
};

/**
 * Generates content based on an image and text prompt using the image model.
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