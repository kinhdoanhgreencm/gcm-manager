
import { GoogleGenAI, Type } from "@google/genai";

// Initializing GoogleGenAI using process.env.GEMINI_API_KEY for Next.js (server-side only)
const apiKey = process.env.GEMINI_API_KEY || '';
const ai = apiKey ? new GoogleGenAI({ apiKey }) : null;

export const getBusinessInsights = async (inventory: any[], finance: any[]) => {
  try {
    if (!ai || !apiKey) {
      console.warn("GEMINI_API_KEY not configured");
      return ["Không thể tải phân tích thông minh vào lúc này."];
    }

    const prompt = `
      Analyze this car dealership data and provide 3 key business insights in Vietnamese.
      Inventory: ${JSON.stringify(inventory)}
      Financial Transactions: ${JSON.stringify(finance)}
      
      Focus on inventory turnover, cash flow health, and specific suggestions for profit improvement.
      Return the response as a JSON array of strings.
    `;

    // Updated to gemini-3-pro-preview for advanced reasoning tasks involving data analysis
    const response = await ai.models.generateContent({
      model: "gemini-3-pro-preview",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: { type: Type.STRING }
        }
      }
    });

    // Accessing .text property directly as per guidelines
    return JSON.parse(response.text || "[]");
  } catch (error) {
    console.error("AI Insight Error:", error);
    return ["Không thể tải phân tích thông minh vào lúc này."];
  }
};
