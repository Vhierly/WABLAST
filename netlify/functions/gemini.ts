import { GoogleGenAI } from "@google/genai";

export const handler = async (event: any) => {
  if (event.httpMethod !== "POST") {
    return { statusCode: 405, body: "Method Not Allowed" };
  }

  try {
    const { prompt, model: modelName } = JSON.parse(event.body);
    
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return { 
        statusCode: 500, 
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ error: "GEMINI_API_KEY not configured on server" }) 
      };
    }

    const ai = new GoogleGenAI({ apiKey });
    const response = await ai.models.generateContent({
      model: modelName || "gemini-3-flash-preview",
      contents: [{ parts: [{ text: prompt }] }],
    });

    return {
      statusCode: 200,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text: response.text }),
    };
  } catch (error: any) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: error.message }),
    };
  }
};
