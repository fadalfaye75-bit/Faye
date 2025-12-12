import { GoogleGenAI } from "@google/genai";

export interface ChatMessage {
  role: 'user' | 'model';
  text: string;
}

export type CorrectionStyle = 'FIX' | 'PROFESSIONAL' | 'ACADEMIC' | 'SIMPLE' | 'CONCISE' | 'CASUAL' | 'PERSUASIVE';

// Initialize the client with the API key from the environment variable.
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

/**
 * Sends a message to the Gemini assistant with conversation history.
 */
export const chatWithAssistant = async (history: ChatMessage[], message: string): Promise<string> => {
  try {
    // Transform the simplified ChatMessage history into the SDK's Content format.
    const chatHistory = history.map(msg => ({
      role: msg.role,
      parts: [{ text: msg.text }],
    }));

    const chat = ai.chats.create({
      model: 'gemini-2.5-flash',
      history: chatHistory,
      config: {
        systemInstruction: "Tu es un assistant éducatif intelligent pour Class Connect. Tes réponses doivent être pédagogiques, claires et bien structurées.",
      },
    });

    const result = await chat.sendMessage({ message });
    return result.text || "";
  } catch (error) {
    console.error("Erreur Gemini Chat:", error);
    return "Désolé, je rencontre des difficultés pour répondre pour le moment.";
  }
};

/**
 * Corrects or rewrites text based on the requested style.
 */
export const correctTextAdvanced = async (text: string, style: CorrectionStyle): Promise<string> => {
  try {
    let prompt = `Corrige et améliore le texte suivant :\n"${text}"`;

    switch (style) {
      case 'PROFESSIONAL':
        prompt = `Reformule le texte suivant sur un ton professionnel et formel :\n"${text}"`;
        break;
      case 'ACADEMIC':
        prompt = `Reformule le texte suivant sur un ton académique et soutenu :\n"${text}"`;
        break;
      case 'SIMPLE':
        prompt = `Simplifie le texte suivant pour qu'il soit compréhensible par un collégien :\n"${text}"`;
        break;
      case 'CONCISE':
        prompt = `Rends le texte suivant plus concis et direct :\n"${text}"`;
        break;
      case 'CASUAL':
        prompt = `Reformule le texte suivant sur un ton amical et décontracté :\n"${text}"`;
        break;
      case 'PERSUASIVE':
        prompt = `Rends le texte suivant plus persuasif et engageant :\n"${text}"`;
        break;
      case 'FIX':
      default:
        prompt = `Corrige uniquement les fautes d'orthographe et de grammaire du texte suivant, sans changer le style :\n"${text}"`;
        break;
    }

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
      config: {
        temperature: 0.3, // Lower temperature for more deterministic correction
      }
    });

    return response.text || text;
  } catch (error) {
    console.error("Erreur Gemini Correction:", error);
    throw new Error("Impossible de traiter le texte.");
  }
};
