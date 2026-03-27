import { GoogleGenAI, ThinkingLevel } from "@google/genai";
import { Project } from "../components/Dashboard";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || '' });

export const analyzeProjects = async (projects: Project[]) => {
  if (projects.length === 0) return "No project data available for analysis.";

  const model = ai.models.generateContent({
    model: "gemini-3.1-pro-preview",
    contents: `
      As a construction project management expert, analyze the following project data and provide 3-4 concise, high-level insights. 
      Focus on budget efficiency, progress risks, and overall health.
      
      Data: ${JSON.stringify(projects.map(p => ({ 
        name: p.name, 
        status: p.status, 
        progress: p.progress, 
        budget: p.budget 
      })))}
      
      Format the response in Markdown with clear headings. Keep it professional and actionable.
    `,
    config: {
      thinkingConfig: { thinkingLevel: ThinkingLevel.HIGH }
    }
  });

  const response = await model;
  return response.text;
};
