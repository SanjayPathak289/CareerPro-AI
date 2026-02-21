import { GoogleGenAI, Type } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || "" });

export async function optimizeAndBenchmark(params: {
  role: string;
  industry?: string;
  characterLimit: number;
  rawPoint: string;
}) {
  const { role, industry, characterLimit, rawPoint } = params;

  const systemInstruction = `
You are The Executive Resume Architect, a world-class AI resume strategist.
Your mission: Simultaneously benchmark the role and transform the raw input into a high-impact, metric-led resume bullet.

TRANSFORMATION FRAMEWORK:
Rewrite the raw CV point using: RESULT → HOW → WHAT
1. Start with the impact or metric
2. Describe how it was achieved (tools, methods, skills)
3. End with what the user did (context & action)

STRICT OUTPUT RULES FOR BULLET:
- Character Limit: EXACTLY ${characterLimit} characters EXCLUDING spaces.
- Style: Internally determine the most appropriate elite style (e.g., FAANG, Consulting, Investment Banking).
- Plain Text Only: No formatting, symbols, emojis, bold, bullets, or special styling.
- No Repetition: No repeated verbs or sentence structures.
- Metric-First: Always start with results/impact.

BENCHMARKING RULES:
- Identify top skills, core responsibilities, industry KPIs, and ATS keywords for the role.

Return a JSON object containing the optimized bullet and the benchmarking data.
`;

  const prompt = `
role: ${role}
industry: ${industry || "Inferred from role"}
character_limit_excluding_spaces: ${characterLimit}
raw_point: ${rawPoint}
`;

  const response = await ai.models.generateContent({
    model: "gemini-2.5-flash",
    contents: [{ parts: [{ text: prompt }] }],
    config: {
      systemInstruction,
      temperature: 0.7,
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          optimizedBullet: { type: Type.STRING },
          benchmarking: {
            type: Type.OBJECT,
            properties: {
              topSkills: { type: Type.ARRAY, items: { type: Type.STRING } },
              coreResponsibilities: { type: Type.ARRAY, items: { type: Type.STRING } },
              kpis: { type: Type.ARRAY, items: { type: Type.STRING } },
              atsKeywords: { type: Type.ARRAY, items: { type: Type.STRING } },
            },
            required: ["topSkills", "coreResponsibilities", "kpis", "atsKeywords"],
          }
        },
        required: ["optimizedBullet", "benchmarking"],
      },
    },
  });

  try {
    return JSON.parse(response.text || "{}");
  } catch (e) {
    console.error("Failed to parse response", e);
    return null;
  }
}
