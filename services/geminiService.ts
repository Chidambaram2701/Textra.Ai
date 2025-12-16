import { GoogleGenAI, Chat, GenerateContentResponse } from "@google/genai";

// Initialize the Gemini AI client with the API key from environment variables
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

// Models
// Using gemini-2.5-flash for the fastest response times
const CHAT_MODEL = 'gemini-2.5-flash';
const IMAGE_MODEL = 'gemini-2.5-flash-image';

/**
 * Creates a new chat session with system instructions.
 */
export const createChatSession = (): Chat => {
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