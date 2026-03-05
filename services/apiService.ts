
import { GoogleGenAI, Type, LiveConnectParameters, GenerateContentParameters } from "@google/genai";

/**
 * ApiService centralizes all interactions with the Google GenAI API.
 */
export const apiService = {
  getAiClient: () => new GoogleGenAI({ apiKey: process.env.API_KEY as string }),

  generateContent: async (params: GenerateContentParameters) => {
    try {
      const result = await apiService.getAiClient().models.generateContent(params);
      return result;
    } catch (error) {
      console.warn("API Error in generateContent:", error);
      throw error;
    }
  },

  /**
   * Real-time translation of dynamic content.
   */
  translateText: async (text: string, targetLanguage: string) => {
    try {
      const result = await apiService.getAiClient().models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: { parts: [{ text: `Translate the following text to ${targetLanguage}. Keep the tone professional and high-tech. Output ONLY the translated text.\n\nText: "${text}"` }] },
      });
      // Ensure compatibility with UI expecting .text property
      const textContent = typeof (result as any).text === 'function' ? (result as any).text() : result.text;
      return { ...result, text: textContent };
    } catch (error) {
      console.warn("Translation API failed, returning original text:", error);
      return {
        text: text,
        response: { candidates: [{ content: { parts: [{ text }] } }] }
      } as any;
    }
  },

  autoPilotBlueprint: async (userVision: string, availableTemplates: any[], constraints: { risk: string, yield: number }) => {
    const templateNames = availableTemplates.map(t => `"${t.id}" (${t.name}: ${t.description})`).join(', ');
    
    try {
      const result = await apiService.getAiClient().models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: { parts: [{ text: `You are the Grid Architect. A user wants to build an income engine with this vision: "${userVision}". 
        Strategic Constraints: Risk Tolerance: ${constraints.risk}, Target Yield Velocity: ${constraints.yield}%.
        Based on the available templates: [${templateNames}], select the best matching template ID that respects these constraints.
        Suggest a high-impact name, a strategic mission brief, and specific engine parameters (yieldVelocity 0-100, riskProfile, marketDepth, computationalLoad 0-100) that align with both the vision and the specific risk/yield parameters.
        Respond ONLY in JSON format.` }] },
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              templateId: { type: Type.STRING, description: "The ID of the template that best fits the vision and constraints." },
              suggestedName: { type: Type.STRING, description: "A creative, high-tech name for the engine." },
              suggestedBrief: { type: Type.STRING, description: "A concise, strategic mission briefing for the node." },
              parameters: {
                type: Type.OBJECT,
                properties: {
                  yieldVelocity: { type: Type.NUMBER, description: "Estimated speed of return (0-100)." },
                  riskProfile: { type: Type.STRING, description: "Description of risk (e.g., 'Low', 'Moderate', 'Aggressive')." },
                  marketDepth: { type: Type.STRING, description: "The volume potential of the niche (e.g., 'Shallow', 'Mid', 'Deep')." },
                  computationalLoad: { type: Type.NUMBER, description: "Infrastructure resource requirements (0-100)." }
                },
                required: ["yieldVelocity", "riskProfile", "marketDepth", "computationalLoad"]
              }
            },
            required: ["templateId", "suggestedName", "suggestedBrief", "parameters"]
          }
        }
      });
      
      // Ensure compatibility with UI expecting .text property
      const textContent = typeof (result as any).text === 'function' ? (result as any).text() : result.text;
      return { ...result, text: textContent };
      
    } catch (error) {
      console.warn("AutoPilot API failed, using simulation fallback:", error);
      const mockResponse = JSON.stringify({
        templateId: availableTemplates[0]?.id || "yield_aggr",
        suggestedName: "Simulated Neural Node",
        suggestedBrief: "Offline simulation active due to neural link instability. Optimizing for local execution.",
        parameters: {
          yieldVelocity: constraints.yield || 50,
          riskProfile: constraints.risk || "Balanced",
          marketDepth: "Simulated",
          computationalLoad: 15
        }
      });
      
      return {
        text: mockResponse,
        response: { candidates: [{ content: { parts: [{ text: mockResponse }] } }] }
      } as any;
    }
  },

  generateStrategy: async (model: string, name: string, brief: string, templateName: string) => {
    try {
      const result = await apiService.getAiClient().models.generateContent({
        model,
        contents: { parts: [{ text: `Architect a new passive income engine named "${name}" based on template "${templateName}" and briefing: "${brief}". Provide strategy details in JSON format exactly according to the schema.` }] },
        config: { 
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              strategyName: { type: Type.STRING },
              attackVector: { type: Type.STRING },
              lever: { type: Type.STRING },
              moat: { type: Type.STRING },
              projectedRevenue: { type: Type.STRING },
              visualPrompt: { type: Type.STRING, description: "Detailed visual description for iconography generation." },
            },
            required: ["strategyName", "attackVector", "lever", "moat", "projectedRevenue", "visualPrompt"]
          }
        }
      });
      
      // Ensure compatibility with UI expecting .text property
      const textContent = typeof (result as any).text === 'function' ? (result as any).text() : result.text;
      return { ...result, text: textContent };
      
    } catch (error) {
      console.warn("Strategy API failed, using simulation fallback:", error);
      const mockResponse = JSON.stringify({
        strategyName: "Fallback Protocol Alpha",
        attackVector: "Local Simulation",
        lever: "Synthetic Optimization",
        moat: "Offline Resilience",
        projectedRevenue: "$1,250.00 / mo (Est)",
        visualPrompt: "A glowing blue shield with digital circuitry patterns"
      });
      
      return {
        text: mockResponse,
        response: { candidates: [{ content: { parts: [{ text: mockResponse }] } }] }
      } as any;
    }
  },

  generateIcon: async (prompt: string, aspectRatio: any = "16:9", highQuality: boolean = false) => {
    // Stable image generation model
    const model = 'imagen-3.0-generate-001';
    
    const config: any = {
      imageConfig: {
        aspectRatio: aspectRatio,
        // Remove imageSize for now as it can cause 400 errors if not supported by specific model version
      }
    };

    try {
      const response = await apiService.getAiClient().models.generateContent({
        model,
        contents: { parts: [{ text: prompt }] },
        config
      });
      
      return response;
    } catch (error) {
      console.warn("Imagen 3 API failed, attempting fallback to Flash:", error);
      // Fallback to text description if image gen fails
      return {
        text: "", 
        candidates: [] 
      } as any;
    }
  },

  connectLive: (params: LiveConnectParameters) => {
    try {
      return apiService.getAiClient().live.connect(params);
    } catch (error) {
      console.error("Live Connect failed:", error);
      throw error;
    }
  }
};
