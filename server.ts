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
const CUSTOM_CURSOS_PATH = path.join(process.cwd(), "src", "data", "custom_cursos.json");
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


// Secure endpoint for PDF upload extraction (migrated server-side as required by guidelines)
app.post("/api/extract-pdf", async (req, res) => {
  try {
    const { base64Data, mimeType, fileName, model } = req.body;
    if (!base64Data) {
      return res.status(400).json({ error: "Missing PDF base64Data upload." });
    }

    const ai = getGeminiClient();

    const systemInstruction = 
      "Você é um cientista de dados acadêmicos especialista em extração e mapeamento de grades horárias e grades curriculares universitárias da UFAPE (Universidade Federal do Agreste de Pernambuco).\n" +
      "Analise detalhadamente o documento PDF fornecido contendo os quadros de horário letivo.\n\n" +
      "--- REGRAS DE EXTRAÇÃO CRITICAS (PADRÃO DO SISTEMA) ---\n" +
      "1. IDENTIFICAÇÃO DE TURMA E PERÍODO:\n" +
      "   - Cada tabela começa com um cabeçalho identificando a turma, por exemplo: 'TURMA: 1º período (Turma 1) CC5' ou 'TURMA: 2º período (Turma 2) CC2'.\n" +
      "   - Extraia o período recomendado como um número inteiro. Ex: '1º período' -> 1, '2º período' -> 2, '6º período' -> 6. Se for eletiva/optativa ou desconhecido, use 0.\n" +
      "   - Inclua a informação da turma no nome da disciplina caso a tabela indique. Ex: 'Introdução à Programação I (Turma 1)' ou 'Introdução à Programação I (Turma 2)'.\n\n" +
      "2. MAPEAMENTO DE DIAS DA SEMANA (INTEIROS SEGUNDO O SISTEMA):\n" +
      "   - seg ou Segunda -> 1\n" +
      "   - ter ou Terça -> 2\n" +
      "   - qua ou Quarta -> 3\n" +
      "   - qui ou Quinta -> 4\n" +
      "   - sex ou Sexta -> 5\n" +
      "   - sab, Sábado ou Sábado -> 6\n\n" +
      "3. ADAPTAÇÃO E DIVISÃO DE HORÁRIOS PARA OS TIMESLOTS PADRÃO DO SISTEMA:\n" +
      "   O sistema suporta estritamente os seguintes horários de aulas (TimeSlots):\n" +
      "   - '14:00 - 16:00'\n" +
      "   - '16:00 - 18:00'\n" +
      "   - '18:30 - 20:10'\n" +
      "   - '20:10 - 21:50'\n" +
      "   Qualquer horário extraído deve se adaptar para uma dessas fatias. Se houver um bloco de 4 horas como 'h1400_1800' ou '14:00 - 18:00', divida-o obrigatoriamente em DUAS sessões para aquela mesma disciplina no mesmo dia: uma na faixa '14:00 - 16:00' e outra na faixa '16:00 - 18:00'!\n" +
      "   Mapeie 'h1830_2010' para '18:30 - 20:10' e 'h2010_2150' para '20:10 - 21:50'.\n\n" +
      "4. AGREGAÇÃO DAS SESSÕES POR DISCIPLINA (MUITO IMPORTANTE):\n" +
      "   - NÃO crie múltiplos itens de disciplina repetidos para a mesma matéria e mesma turma!\n" +
      "   - Uma disciplina deve ser um único objeto no array de resultado, aglutinando todas as suas aulas encontradas na tabela dentro do seu array 'sessions'.\n" +
      "   - Por exemplo, se 'Lógica Matemática I (Marcius)' ocorre na Quarta às 18:30 - 20:10 e na Sexta às 18:30 - 20:10, crie apenas uma disciplina no array contendo as duas sessões dentro do parâmetro 'sessions'.\n\n" +
      "5. NOMES DOS PROFESSORES:\n" +
      "   - Identifique e extraia o professor fornecido entre parênteses no final do conteúdo da célula. Ex: 'Cálculo I (Normando)' -> Nome da disciplina: 'Cálculo I', Professor: 'Normando'.\n" +
      "   - Caso o professor não esteja disponível, preencha com '-'.\n\n" +
      "6. CÓDIGOS ACADÊMICOS INTERNOS (CODE):\n" +
      "   - Gere um código acadêmico realista se ele não tiver na célula, seguindo o padrão de 4 letras e 4 números (ex: CCMP3057 para Introdução à Programação, MATM3008 para matemática, ou baseado nas iniciais da disciplina como ALGE3021 para Álgebra Linear, etc.).\n" +
      "   - O ID deve ser um slug amigável em minúsculo do nome e turma, por exemplo: 'p1_introducao_programacao_t1'.";

    const response = await ai.models.generateContent({
      model: model || "gemini-3.5-flash",
      contents: [
        {
          text: `Extraia cuidadosamente todas as turmas, horários e disciplinas descritos neste documento curricular seguindo os critérios estruturais sistêmicos descritos.`
        },
        {
          inlineData: {
            mimeType: mimeType || "application/pdf",
            data: base64Data
          }
        }
      ],
      config: {
        systemInstruction,
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            title: { type: Type.STRING, description: "Título do curso ou nome sugerido para a grade baseada no arquivo, por exemplo: 'BCC 2026.1 - Horário Letivo'" },
            disciplines: {
              type: Type.ARRAY,
              description: "Lista estruturada de todas as disciplinas encontradas unificadas sem duplicações",
              items: {
                type: Type.OBJECT,
                properties: {
                  id: { type: Type.STRING, description: "ID único em minúsculo, por exemplo: p1_intro_prog_t1" },
                  code: { type: Type.STRING, description: "Código acadêmico de 4 letras e 4 números, ex: CCMP1234" },
                  name: { type: Type.STRING, description: "Nome limpo da disciplina com respectiva turma (se aplicável), ex: Introdução à Programação I (Turma 1)" },
                  professor: { type: Type.STRING, description: "Nome do professor da disciplina" },
                  period: { type: Type.INTEGER, description: "Período correto extraído do cabeçalho da turma (de 1 a 9). Use 0 se for optativa/eletiva." },
                  sessions: {
                    type: Type.ARRAY,
                    items: {
                      type: Type.OBJECT,
                      properties: {
                        day: { type: Type.INTEGER, description: "Inteiro do dia da semana: 1=Seg, 2=Ter, 3=Qua, 4=Qui, 5=Sex, 6=Sáb" },
                        time: { type: Type.STRING, description: "Formatado estritamente em um dos slots do sistema: '14:00 - 16:00', '16:00 - 18:00', '18:30 - 20:10', '20:10 - 21:50'" }
                      },
                      required: ["day", "time"]
                    }
                  }
                },
                required: ["id", "code", "name", "professor", "period", "sessions"]
              }
            }
          },
          required: ["title", "disciplines"]
        }
      }
    });

    if (!response.text) {
      throw new Error("Não foi possível extrair nenhum dado texto do documento PDF.");
    }

    const parsedResult = JSON.parse(response.text.trim());
    res.json(parsedResult);
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
