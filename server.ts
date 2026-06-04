import express from "express";
import path from "path";
import dotenv from "dotenv";
import { GoogleGenAI, Type } from "@google/genai";
import fs from "fs";

// Load environment variables
dotenv.config();

const app = express();
const PORT = 3000;

// Maximum payload size for PDF uploads
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ limit: "50mb", extended: true }));

// Lazy init of Gemini Client
let aiClient: GoogleGenAI | null = null;
function getGeminiClient(): GoogleGenAI {
  if (!aiClient) {
    const key = process.env.GEMINI_API_KEY;
    if (!key) {
      throw new Error("GEMINI_API_KEY environment variable is required. Configure it in Settings > Secrets.");
    }
    aiClient = new GoogleGenAI({
      apiKey: key,
      httpOptions: {
        headers: {
          "User-Agent": "aistudio-build",
        },
      },
    });
  }
  return aiClient;
}

// Ensure custom courses file exists
const CUSTOM_CURSOS_PATH = path.join(process.cwd(), "src", "custom_cursos.json");
if (!fs.existsSync(CUSTOM_CURSOS_PATH)) {
  fs.writeFileSync(CUSTOM_CURSOS_PATH, JSON.stringify({ courses: [] }, null, 2));
}

// --- API ROUTES ---

// Health check
app.get("/api/health", (req, res) => {
  res.json({ status: "ok", gemini_api_configured: !!process.env.GEMINI_API_KEY });
});

// GET saved custom courses
app.get("/api/courses", (req, res) => {
  try {
    if (fs.existsSync(CUSTOM_CURSOS_PATH)) {
      const data = fs.readFileSync(CUSTOM_CURSOS_PATH, "utf-8");
      res.json(JSON.parse(data));
    } else {
      res.json({ courses: [] });
    }
  } catch (error: any) {
    res.status(500).json({ error: "Failed to read courses", details: error.message });
  }
});

// SAVE custom course
app.post("/api/courses", (req, res) => {
  try {
    const { id, title, disciplines } = req.body;
    if (!id || !title || !disciplines) {
      return res.status(400).json({ error: "Invalid data. Need id, title, and disciplines." });
    }

    let fileData = { courses: [] as any[] };
    if (fs.existsSync(CUSTOM_CURSOS_PATH)) {
      try {
        fileData = JSON.parse(fs.readFileSync(CUSTOM_CURSOS_PATH, "utf-8"));
      } catch (err) {
        fileData = { courses: [] };
      }
    }

    // Upsert by ID
    const existingIndex = fileData.courses.findIndex((c: any) => c.id === id);
    const newCourseObj = { id, title, disciplines, updated_at: new Date().toISOString() };
    if (existingIndex > -1) {
      fileData.courses[existingIndex] = newCourseObj;
    } else {
      fileData.courses.push(newCourseObj);
    }

    fs.writeFileSync(CUSTOM_CURSOS_PATH, JSON.stringify(fileData, null, 2));
    res.json({ success: true, course: newCourseObj });
  } catch (error: any) {
    res.status(500).json({ error: "Failed to save course", details: error.message });
  }
});

// DELETE a custom course
app.delete("/api/courses/:id", (req, res) => {
  try {
    const { id } = req.params;
    if (fs.existsSync(CUSTOM_CURSOS_PATH)) {
      const fileData = JSON.parse(fs.readFileSync(CUSTOM_CURSOS_PATH, "utf-8"));
      const isPresent = fileData.courses.some((c: any) => c.id === id);
      if (isPresent) {
        fileData.courses = fileData.courses.filter((c: any) => c.id !== id);
        fs.writeFileSync(CUSTOM_CURSOS_PATH, JSON.stringify(fileData, null, 2));
        return res.json({ success: true });
      }
    }
    res.status(404).json({ error: "Course not found" });
  } catch (error: any) {
    res.status(500).json({ error: "Failed to delete course", details: error.message });
  }
});

// Extract text syllabus/curriculum
app.post("/api/extract-syllabus", async (req, res) => {
  try {
    const { text, promptContext } = req.body;
    if (!text) {
      return res.status(400).json({ error: "No text provided to extract curriculum data from." });
    }

    const ai = getGeminiClient();

    const systemInstruction = 
      "Você é um assistente especialista em estruturas curriculares acadêmicas e PPCs de universidades. " +
      "Analise o texto fornecido que descreve disciplinas, plano de estudos ou ementas de um curso de nível superior. " +
      "Extraia todas as disciplinas de forma detalhada e estruturada segundo o schema fornecido. " +
      "Para cada uma: " +
      "- Encontre o nome da disciplina (name) " +
      "- Professor (professor), se não fornecido use uma string vazia ou '-' " +
      "- Código acadêmico (code), se houver; se não houver use as iniciais/slugs " +
      "- Período letivo recomendado (period) como inteiro (1, 2, ..., 9). Use 0 para disciplinas optativas, eletivas ou livre escolha. " +
      "- Sessions/Grade Horária: Se houver horários descritos no texto (ex: seg 18:30), extraia-os. Se não houver, crie sugestões lógicas no formato 'HH:MM - HH:MM' (ex: '18:30 - 20:10', '20:10 - 21:50') com base no período da disciplina de modo que não haja conflitos diretos e distribua entre Segunda (day=1) a Sexta (day=5). " +
      "- Mapeie os dias para números de 1 (Segunda) a 6 (Sábado).";

    const promptText = `Texto a ser analisado:\n${text}\n\nContexto adicional: ${promptContext || "Nenhum"}`;

    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: promptText,
      config: {
        systemInstruction,
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            title: { type: Type.STRING, description: "Título do Curso extraído ou nome sugerido para esta grade" },
            disciplines: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  id: { type: Type.STRING, description: "ID único legível por exemplo: code de minúsculo ou base de slug" },
                  code: { type: Type.STRING, description: "Código da disciplina, ex: CCMP3057" },
                  name: { type: Type.STRING, description: "Nome estruturado da disciplina" },
                  professor: { type: Type.STRING, description: "Nome do professor, ou '-' se indisponível" },
                  period: { type: Type.INTEGER, description: "Inteiro do período sugerido (1 a 9). Use 0 se optativa / desconhecido." },
                  sessions: {
                    type: Type.ARRAY,
                    items: {
                      type: Type.OBJECT,
                      properties: {
                        day: { type: Type.INTEGER, description: "Dia letivo: 1=Segunda, 2=Terça, 3=Quarta, 4=Quinta, 5=Sexta, 6=Sábado" },
                        time: { type: Type.STRING, description: "Format: HH:MM - HH:MM, ex: '18:30 - 20:10'" }
                      },
                      required: ["day", "time"]
                    }
                  }
                },
                required: ["id", "name", "professor", "period", "sessions"]
              }
            }
          },
          required: ["title", "disciplines"]
        }
      }
    });

    if (!response.text) {
      throw new Error("Zero response characters returned from Gemini.");
    }

    res.json(JSON.parse(response.text.trim()));
  } catch (error: any) {
    console.error("Extraction error:", error);
    res.status(500).json({ error: error.message || "Erro inesperado na inteligência artificial." });
  }
});

// Secure endpoint for PDF upload extraction (migrated server-side as required by guidelines)
app.post("/api/extract-pdf", async (req, res) => {
  try {
    const { base64Data, mimeType, fileName } = req.body;
    if (!base64Data) {
      return res.status(400).json({ error: "Missing PDF base64Data upload." });
    }

    const ai = getGeminiClient();

    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: [
        {
          text: "Extraia todas as disciplinas deste PDF de grade/horário letivo. Para cada disciplina, encontre o nome, o professor, o período e os horários das aulas. Mapeie os dias para 1 (Segunda) até 6 (Sábado). Mapeie os horários no formato HH:MM - HH:MM, por exemplo: '18:30 - 20:10' ou '20:10 - 21:50'. Gere um ID único para cada disciplina. Se o período não estiver claro, use 0."
        },
        {
          inlineData: {
            mimeType: mimeType || "application/pdf",
            data: base64Data
          }
        }
      ],
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              id: { type: Type.STRING },
              code: { type: Type.STRING },
              name: { type: Type.STRING },
              professor: { type: Type.STRING },
              period: { type: Type.INTEGER, description: "Use 0 for electives/optativas or if period is unknown." },
              sessions: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    day: { type: Type.INTEGER, description: "1=Monday, 2=Tuesday, 3=Wednesday, 4=Thursday, 5=Friday, 6=Saturday" },
                    time: { type: Type.STRING, description: "Format: HH:MM - HH:MM" }
                  },
                  required: ["day", "time"]
                }
              }
            },
            required: ["id", "name", "professor", "period", "sessions"]
          }
        }
      }
    });

    if (!response.text) {
      throw new Error("Zero content extracted from document.");
    }

    res.json({ disciplines: JSON.parse(response.text.trim()) });
  } catch (error: any) {
    console.error("PDF generation extraction error:", error);
    res.status(500).json({ error: error.message || "Falha ao analisar o documento com IA." });
  }
});

// --- VITE DEV OR PRODUCTION STATICS HANDLERS ---

async function bootstrap() {
  if (process.env.NODE_ENV !== "production") {
    // Dynamically import Vite in development context
    const { createServer: createViteServer } = await import("vite");
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`[FULL-STACK] Express secure environment server listening on http://localhost:${PORT}`);
  });
}

bootstrap().catch((err) => {
  console.error("Failed to kickstart server:", err);
});
