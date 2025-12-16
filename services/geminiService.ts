import { GoogleGenAI, Chat, GenerateContentResponse } from "@google/genai";

// Models
// Using gemini-2.5-flash for the fastest response times
const CHAT_MODEL = 'gemini-2.5-flash';
const IMAGE_MODEL = 'gemini-2.5-flash-image';

let aiInstance: GoogleGenAI | null = null;

// Lazy initialization to prevent app crash on load if API key is missing
const getAiClient = (): GoogleGenAI => {
  if (!aiInstance) {
    const apiKey = process.env.API_KEY;
    if (!apiKey) {
      // This error will now be caught by the UI and shown to the user
      throw new Error("API key is missing. Please set the API_KEY environment variable in Vercel.");
    }
    aiInstance = new GoogleGenAI({ apiKey: apiKey });
  }
  return aiInstance;
};

/**
 * Creates a new chat session with system instructions.
 */
export const createChatSession = (): Chat => {
  const ai = getAiClient();
  return ai.chats.create({
    model: CHAT_MODEL,
    config: {
      systemInstruction: "You are Textra AI, a helpful, intelligent, and knowledgeable AI assistant. You provide clear, concise, and accurate answers using Markdown formatting.",
      // Explicitly disable thinking to improve latency/speed
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
    model: IMAGE_MODEL,
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