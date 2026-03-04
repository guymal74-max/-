
import { GoogleGenAI, Type } from "@google/genai";

// Initialize the Gemini API client using the API key from environment variables as per guidelines.
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

export const analyzeServiceCall = async (description: string) => {
  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `Analyze this service request: "${description}". 
      Return Hebrew analysis in JSON format.`,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            summary: { type: Type.STRING, description: "Technical summary in Hebrew" },
            suggestedTools: { 
              type: Type.ARRAY, 
              items: { type: Type.STRING },
              description: "List of tools in Hebrew"
            },
            estimatedDuration: { type: Type.STRING, description: "Estimated time in Hebrew" },
            suggestedPriority: { 
              type: Type.STRING, 
              enum: ["Low", "Medium", "High", "Critical"]
            },
            troubleshootingSteps: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
              description: "3-5 initial steps in Hebrew"
            }
          },
          required: ["summary", "suggestedTools", "estimatedDuration", "suggestedPriority", "troubleshootingSteps"]
        }
      }
    });

    // Directly access the text property as per guidelines (not as a method).
    return JSON.parse(response.text || "{}");
  } catch (error) {
    console.error("AI Analysis failed:", error);
    return null;
  }
};
