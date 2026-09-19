import express from "express";
import path from "path";
import dotenv from "dotenv";
import { GoogleGenAI, Type } from "@google/genai";
import fs from "fs";

// Load environment variables
dotenv.config();

const app = express();
const PORT = 3000;

// Maximum payload size for PDF uploads and large curriculums
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ limit: "50mb", extended: true }));

// Lazy init of Gemini Client
let aiClient: GoogleGenAI | null = null;
function getGeminiClient(): GoogleGenAI {
  if (!aiClient) {
    const key = process.env.GEMINI_API_KEY;
    if (!key) {
      throw new Error("GEMINI_API_KEY environment variable is required. Configure it in Settings > Secrets or .env file.");
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

// Ensure data directories and central registry exist
const DATA_DIR = path.join(process.cwd(), "src", "data");
const REGISTRY_PATH = path.join(DATA_DIR, "courses_registry.json");

if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

if (!fs.existsSync(REGISTRY_PATH)) {
  const initialRegistry = [
    {
      id: "bcc",
      name: "Ciência da Computação",
      shortName: "BCC",
      hasCurriculum: true,
      hasSchedule: true,
      semesters: ["2026.1"]
    },
    {
      id: "adm",
      name: "Administração",
      shortName: "ADM",
      hasCurriculum: true,
      hasSchedule: true,
      semesters: ["2026.1"]
    },
    {
      id: "eal",
      name: "Engenharia de Alimentos",
      shortName: "EAL",
      hasCurriculum: false,
      hasSchedule: true,
      semesters: ["2026.1"]
    }
  ];
  fs.writeFileSync(REGISTRY_PATH, JSON.stringify(initialRegistry, null, 2), "utf-8");
}

function getRegistry(): any[] {
  try {
    if (fs.existsSync(REGISTRY_PATH)) {
      return JSON.parse(fs.readFileSync(REGISTRY_PATH, "utf-8"));
    }
  } catch (e) {
    console.error("Error reading courses registry:", e);
  }
  return [];
}

function saveRegistry(registry: any[]) {
  fs.writeFileSync(REGISTRY_PATH, JSON.stringify(registry, null, 2), "utf-8");
}

// --- API ROUTES ---

// Health check
app.get("/api/health", (req, res) => {
  res.json({ status: "ok", gemini_api_configured: !!process.env.GEMINI_API_KEY });
});

// Helper to extract profile IDs from curriculum data
function extractProfilesFromCurriculum(curr: any): string[] {
  if (!curr) return [];
  let list: string[] = [];
  if (curr.profiles && Array.isArray(curr.profiles)) {
    list = curr.profiles.map((p: any) => p.id || p.name).filter(Boolean);
  } else if (Array.isArray(curr.subjects)) {
    list = curr.subjects.map((s: any) => s.profile).filter(Boolean);
  } else if (Array.isArray(curr)) {
    list = curr.map((s: any) => s.profile).filter(Boolean);
  }
  return Array.from(new Set(
    list.filter((p: any) => typeof p === 'string' && p.trim().length > 0 && p.trim().toLowerCase() !== 'optativa' && p.trim().toLowerCase() !== 'sem perfil')
  ));
}

// Helper to extract profile IDs from schedule data
function extractProfilesFromSchedule(sched: any): string[] {
  if (!sched || !Array.isArray(sched)) return [];
  return Array.from(new Set(
    sched
      .map((s: any) => s.profile)
      .filter((p: any) => typeof p === 'string' && p.trim().length > 0 && p.trim().toLowerCase() !== 'optativa' && p.trim().toLowerCase() !== 'sem perfil')
  ));
}

// GET all courses metadata
app.get("/api/courses", (req, res) => {
  try {
    const courses = getRegistry();
    const enriched = courses.map((c: any) => {
      let profiles: string[] = Array.isArray(c.profiles) ? [...c.profiles] : [];
      const courseDir = path.join(DATA_DIR, c.id);
      if (fs.existsSync(courseDir)) {
        const files = fs.readdirSync(courseDir);
        const currFile = files.find(f => f.startsWith("curriculo_") && f.endsWith(".json"));
        if (currFile) {
          try {
            const curr = JSON.parse(fs.readFileSync(path.join(courseDir, currFile), "utf-8"));
            const currProfiles = extractProfilesFromCurriculum(curr);
            profiles = Array.from(new Set([...profiles, ...currProfiles]));
          } catch {}
        }
        const schedFile = files.find(f => f.startsWith("horario_") && f.endsWith(".json"));
        if (schedFile) {
          try {
            const sched = JSON.parse(fs.readFileSync(path.join(courseDir, schedFile), "utf-8"));
            const schedProfiles = extractProfilesFromSchedule(sched);
            profiles = Array.from(new Set([...profiles, ...schedProfiles]));
          } catch {}
        }
      }
      return { ...c, profiles: profiles.length > 0 ? profiles : undefined };
    });
    res.json({ courses: enriched });
  } catch (error: any) {
    res.status(500).json({ error: "Failed to read courses registry", details: error.message });
  }
});

// GET full course details (curriculum + schedule files)
app.get("/api/courses/:id", (req, res) => {
  try {
    const { id } = req.params;
    const courses = getRegistry();
    const courseMeta = courses.find((c: any) => c.id === id);

    if (!courseMeta) {
      return res.status(404).json({ error: `Curso '${id}' não encontrado.` });
    }

    const courseDir = path.join(DATA_DIR, id);
    let curriculum: any = null;
    let schedule: any = null;

    if (fs.existsSync(courseDir)) {
      const files = fs.readdirSync(courseDir);

      // Look for curriculum file
      const currFile = files.find(f => f.startsWith("curriculo_") && f.endsWith(".json"));
      if (currFile) {
        try {
          curriculum = JSON.parse(fs.readFileSync(path.join(courseDir, currFile), "utf-8"));
          if (curriculum) {
            const profiles = extractProfilesFromCurriculum(curriculum);
            if (profiles.length > 0) {
              courseMeta.profiles = Array.from(new Set([...(courseMeta.profiles || []), ...profiles]));
            }
          }
        } catch (e) {
          console.error(`Error reading curriculum for ${id}:`, e);
        }
      }

      // Look for schedule file
      const schedFile = files.find(f => f.startsWith("horario_") && f.endsWith(".json"));
      if (schedFile) {
        try {
          schedule = JSON.parse(fs.readFileSync(path.join(courseDir, schedFile), "utf-8"));
          if (schedule) {
            const schedProfiles = extractProfilesFromSchedule(schedule);
            if (schedProfiles.length > 0) {
              courseMeta.profiles = Array.from(new Set([...(courseMeta.profiles || []), ...schedProfiles]));
            }
          }
        } catch (e) {
          console.error(`Error reading schedule for ${id}:`, e);
        }
      }
    }

    res.json({
      course: courseMeta,
      curriculum,
      schedule
    });
  } catch (error: any) {
    res.status(500).json({ error: "Failed to load course details", details: error.message });
  }
});

// POST save or update a course with its curriculum and/or schedule
app.post("/api/courses", (req, res) => {
  try {
    const { id, name, shortName, curriculum, schedule, semester } = req.body;
    if (!id || !name) {
      return res.status(400).json({ error: "Campos obrigatórios ausentes: 'id' e 'name'." });
    }

    const cleanId = id.toLowerCase().replace(/[^a-z0-9_-]/g, "");
    const courseDir = path.join(DATA_DIR, cleanId);
    if (!fs.existsSync(courseDir)) {
      fs.mkdirSync(courseDir, { recursive: true });
    }

    const sem = (semester || "2026.1").replace(/[^a-zA-Z0-9_.-]/g, "_");

    let hasCurriculum = false;
    let hasSchedule = false;

    // Save Curriculum if provided
    if (curriculum) {
      const currFilePath = path.join(courseDir, `curriculo_${cleanId}.json`);
      let formattedCurriculum: any;
      if (Array.isArray(curriculum)) {
        formattedCurriculum = { export_date: new Date().toISOString(), subjects: curriculum };
      } else {
        formattedCurriculum = {
          export_date: curriculum.export_date || new Date().toISOString(),
          courseName: curriculum.courseName || name,
          courseShortName: curriculum.courseShortName || shortName,
          activeProfileId: curriculum.activeProfileId,
          profiles: curriculum.profiles,
          subjects: curriculum.subjects || []
        };
      }

      fs.writeFileSync(currFilePath, JSON.stringify(formattedCurriculum, null, 2), "utf-8");
      hasCurriculum = true;
    } else {
      // Check if curriculum already exists on disk
      const files = fs.existsSync(courseDir) ? fs.readdirSync(courseDir) : [];
      hasCurriculum = files.some(f => f.startsWith("curriculo_") && f.endsWith(".json"));
    }

    // Save Schedule if provided
    if (schedule && Array.isArray(schedule)) {
      const schedFilePath = path.join(courseDir, `horario_${cleanId}_${sem.replace(/\./g, "_")}.json`);
      fs.writeFileSync(schedFilePath, JSON.stringify(schedule, null, 2), "utf-8");
      hasSchedule = true;
    } else {
      // Check if schedule already exists on disk
      const files = fs.existsSync(courseDir) ? fs.readdirSync(courseDir) : [];
      hasSchedule = files.some(f => f.startsWith("horario_") && f.endsWith(".json"));
    }

    // Determine profiles from curriculum and schedule
    let detectedProfiles: string[] = [];
    if (curriculum) {
      detectedProfiles = extractProfilesFromCurriculum(curriculum);
    }
    if (schedule && Array.isArray(schedule)) {
      const schedProfiles = Array.from(new Set(schedule.map((d: any) => d.profile).filter(Boolean)));
      detectedProfiles = Array.from(new Set([...detectedProfiles, ...schedProfiles]));
    }

    // Update Registry
    const registry = getRegistry();
    const existingIndex = registry.findIndex((c: any) => c.id === cleanId);
    const existingMeta = existingIndex > -1 ? registry[existingIndex] : null;

    const mergedProfiles = Array.from(new Set([
      ...(existingMeta?.profiles || []),
      ...detectedProfiles
    ])).filter(Boolean);

    const updatedMeta: any = {
      id: cleanId,
      name: name.trim(),
      shortName: (shortName || cleanId.toUpperCase()).trim(),
      hasCurriculum,
      hasSchedule,
      semesters: [sem.replace(/_/g, ".")]
    };

    if (mergedProfiles.length > 0) {
      updatedMeta.profiles = mergedProfiles;
    }

    if (existingIndex > -1) {
      registry[existingIndex] = {
        ...registry[existingIndex],
        ...updatedMeta
      };
    } else {
      registry.push(updatedMeta);
    }

    saveRegistry(registry);

    res.json({
      success: true,
      message: `Curso '${name}' salvo com sucesso no projeto!`,
      course: updatedMeta
    });
  } catch (error: any) {
    console.error("Error saving course:", error);
    res.status(500).json({ error: "Falha ao salvar curso", details: error.message });
  }
});

// DELETE a custom course from registry and disk
app.delete("/api/courses/:id", (req, res) => {
  try {
    const { id } = req.params;
    const cleanId = id.toLowerCase().replace(/[^a-z0-9_-]/g, "");
    let registry = getRegistry();
    const isPresent = registry.some((c: any) => c.id === cleanId);

    if (!isPresent) {
      return res.status(404).json({ error: "Curso não encontrado no registro." });
    }

    registry = registry.filter((c: any) => c.id !== cleanId);
    saveRegistry(registry);

    // Also remove files from disk if present
    const courseDir = path.join(DATA_DIR, cleanId);
    if (fs.existsSync(courseDir)) {
      try {
        fs.rmSync(courseDir, { recursive: true, force: true });
      } catch (dirErr) {
        console.error(`Failed to remove course directory ${courseDir}:`, dirErr);
      }
    }

    res.json({ success: true, message: `Curso '${cleanId}' excluído com sucesso.` });
  } catch (error: any) {
    res.status(500).json({ error: "Falha ao excluir curso", details: error.message });
  }
});

// --- AI EXTRACTION PIPELINES (GEMINI) ---

// Safe JSON parser dealing with code block fences if any
function cleanAndParseJson(text: string): any {
  let cleaned = text.trim();
  if (cleaned.startsWith("```json")) {
    cleaned = cleaned.slice(7);
  } else if (cleaned.startsWith("```")) {
    cleaned = cleaned.slice(3);
  }
  if (cleaned.endsWith("```")) {
    cleaned = cleaned.slice(0, -3);
  }
  return JSON.parse(cleaned.trim());
}

// Clean error message parser for GoogleGenAI errors
function cleanErrorMessage(err: any): { message: string; code?: number; status?: string } {
  if (!err) return { message: "Erro desconhecido na comunicação com a IA." };
  let raw = err.message || String(err);
  try {
    const parsed = typeof raw === 'string' && raw.trim().startsWith('{') ? JSON.parse(raw) : null;
    if (parsed && parsed.error) {
      return {
        message: parsed.error.message || raw,
        code: parsed.error.code,
        status: parsed.error.status
      };
    }
  } catch {}
  return { message: raw, code: err.status || err.code };
}

// Helper function to generate content with fallback across available Gemini models
async function generateWithFallback(
  ai: GoogleGenAI,
  preferredModel: string,
  params: { contents: any[]; config: any }
): Promise<{ response: any; modelUsed: string }> {
  // Candidate fallback chain starting with the user-selected model
  const candidateModels = [
    preferredModel,
    "gemini-3.8-flash",
    "gemini-3.7-flash",
    "gemini-3.6-flash",
    "gemini-3.1-pro-preview",
    "gemini-3.5-flash-lite",
    "gemini-2.5-flash"
  ];

  // Unique list preserving order
  const modelsToTry = Array.from(new Set(candidateModels.filter(Boolean)));
  let lastError: any = null;

  for (const model of modelsToTry) {
    try {
      console.log(`[Gemini AI] Iniciando extração com o modelo '${model}'...`);
      const response = await ai.models.generateContent({
        model,
        contents: params.contents,
        config: params.config
      });

      if (response && response.text) {
        console.log(`[Gemini AI] Extração concluída com sucesso usando '${model}'!`);
        return { response, modelUsed: model };
      }
    } catch (err: any) {
      console.warn(`[Gemini AI] Modelo '${model}' falhou (status ${err?.status || err?.code}):`, err?.message || err);
      lastError = err;
      // Continue to next available model in the fallback chain
    }
  }

  throw lastError || new Error("Falha ao comunicar com os modelos Gemini disponíveis.");
}

// 1. Extração da Estrutura Curricular / Matriz / PPC (Aceita PDF ou Texto)
app.post("/api/extract-curriculum", async (req, res) => {
  try {
    const { base64Data, textContent, mimeType, model } = req.body;

    if (!base64Data && !textContent) {
      return res.status(400).json({ error: "Forneça o arquivo PDF (base64Data) ou o texto das ementas/matriz (textContent)." });
    }

    const ai = getGeminiClient();

    const systemInstruction =
      "Você é um cientista de dados acadêmicos especialista em extração e mapeamento de Projetos Pedagógicos de Curso (PPC), matrizes curriculares e catálogos de disciplinas da UFAPE (Universidade Federal do Agreste de Pernambuco).\n" +
      "Analise detalhadamente o documento ou texto curricular fornecido.\n\n" +
      "--- REGRAS DE EXTRAÇÃO DO CATÁLOGO CURRICULAR ---\n" +
      "1. DISCIPLINAS E PERÍODOS:\n" +
      "   - Extraia todas as disciplinas do curso.\n" +
      "   - 'period': use uma string com o número do período ideal (ex: '1', '2', '3', '4', '5', '6', '7', '8', '9'). Se for optativa ou eletiva, use 'Optativa'.\n" +
      "   - 'type': classifique estritamente como 'Obrigatório' ou 'Optativa'.\n\n" +
      "2. CÓDIGO DA DISCIPLINA (code):\n" +
      "   - Use o código acadêmico presente no documento (ex: CCMP3057, MATM3008, ADMN3012). Se não estiver explícito, gere um código realista seguindo o padrão de 4 letras maiúsculas e 4 dígitos baseado na área da matéria.\n\n" +
      "3. CARGA HORÁRIA (workload) E CRÉDITOS:\n" +
      "   - workload deve conter números inteiros em horas: { teorica, pratica, extensao, total }.\n" +
      "   - Se a divisão teórica/prática não for especificada, atribua o total para 'teorica' com prática e extensão 0.\n" +
      "   - 'credits': número inteiro de créditos (geralmente horas totais dividido por 15 ou 30, ex: 60h = 4 créditos; 90h = 6 créditos; 30h = 2 créditos).\n\n" +
      "4. PRÉ-REQUISITOS (prerequisites):\n" +
      "   - Extraia a lista de pré-requisitos com { code, name }.\n" +
      "   - Se não houver pré-requisito, retorne array vazio [].\n\n" +
      "5. EMENTAS (ementa):\n" +
      "   - Extraia o texto descritivo oficial da ementa com tópicos de estudo da disciplina. Se não houver no texto, forneça uma síntese coerente baseada no nome da disciplina universitária.\n\n" +
      "6. PERFIL OU MATRIZ CURRICULAR (profile):\n" +
      "   - Se o documento indicar perfis curriculares ou matrizes distintas (ex: 'MVET03', 'MVET02', 'Matriz 2023'), extraia no campo 'profile'. Caso contrário, deixe em branco.\n\n" +
      "7. IDENTIFICAÇÃO DO CURSO E TÍTULO (courseName, courseShortName, title):\n" +
      "   - Identifique no documento o Curso de Graduação correspondente.\n" +
      "   - 'courseName': Nome oficial completo do curso (ex: 'Medicina Veterinária', 'Agronomia', 'Ciência da Computação', 'Engenharia de Alimentos', 'Zootecnia', 'Administração').\n" +
      "   - 'courseShortName': Sigla de 3 a 5 letras em maiúsculo (ex: 'MVET', 'AGRO', 'BCC', 'EAL', 'ZOO', 'ADM').\n" +
      "   - 'title': Título descritivo do catálogo ou projeto curricular (ex: 'Medicina Veterinária - Projeto Pedagógico').";

    const contents: any[] = [];
    if (textContent) {
      contents.push({
        text: `Extraia o catálogo curricular completo e estruturado a partir deste conteúdo:\n\n${textContent}`
      });
    } else {
      contents.push({
        text: "Extraia todas as disciplinas, períodos, cargas horárias, pré-requisitos e ementas contidas neste documento curricular/PPC."
      });
    }

    if (base64Data) {
      contents.push({
        inlineData: {
          mimeType: mimeType || "application/pdf",
          data: base64Data
        }
      });
    }

    const { response, modelUsed } = await generateWithFallback(ai, model || "gemini-3.8-flash", {
      contents,
      config: {
        systemInstruction,
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            courseName: { type: Type.STRING, description: "Nome do curso identificado no documento (ex: 'Medicina Veterinária', 'Agronomia', 'Ciência da Computação')" },
            courseShortName: { type: Type.STRING, description: "Sigla de 3 a 5 letras em maiúsculo do curso (ex: 'MVET', 'AGRO', 'BCC', 'EAL', 'ZOO', 'ADM')" },
            title: { type: Type.STRING, description: "Título do catálogo curricular (ex: 'Medicina Veterinária - Projeto Pedagógico')" },
            subjects: {
              type: Type.ARRAY,
              description: "Lista de todas as disciplinas curriculares",
              items: {
                type: Type.OBJECT,
                properties: {
                  code: { type: Type.STRING, description: "Código acadêmico ex: CCMP3057" },
                  name: { type: Type.STRING, description: "Nome limpo oficial da disciplina" },
                  type: { type: Type.STRING, description: "'Obrigatório' ou 'Optativa'" },
                  period: { type: Type.STRING, description: "'1', '2', '3' ou 'Optativa'" },
                  profile: { type: Type.STRING, description: "Código do perfil ou matriz curricular (ex: 'MVET03', 'MVET02')" },
                  credits: { type: Type.INTEGER, description: "Número de créditos acadêmicos" },
                  workload: {
                    type: Type.OBJECT,
                    properties: {
                      teorica: { type: Type.INTEGER },
                      pratica: { type: Type.INTEGER },
                      extensao: { type: Type.INTEGER },
                      total: { type: Type.INTEGER }
                    },
                    required: ["teorica", "pratica", "extensao", "total"]
                  },
                  prerequisites: {
                    type: Type.ARRAY,
                    items: {
                      type: Type.OBJECT,
                      properties: {
                        code: { type: Type.STRING },
                        name: { type: Type.STRING }
                      },
                      required: ["code", "name"]
                    }
                  },
                  ementa: { type: Type.STRING, description: "Descrição do conteúdo e objetivos da disciplina" }
                },
                required: ["code", "name", "type", "period", "workload", "ementa"]
              }
            }
          },
          required: ["subjects"]
        }
      }
    });

    if (!response.text) {
      throw new Error("Não foi possível gerar dados a partir da IA.");
    }

    const result = cleanAndParseJson(response.text);
    res.json({ ...result, _modelUsed: modelUsed });
  } catch (error: any) {
    console.error("Curriculum extraction error:", error);
    const cleaned = cleanErrorMessage(error);
    res.status(cleaned.code === 503 ? 503 : 500).json({ error: cleaned.message, code: cleaned.code, status: cleaned.status });
  }
});

// 1.1 Extração da Matriz Curricular em Árvore / Grafo Multimodal (Aceita Múltiplos Arquivos: PDF + Imagem)
app.post("/api/extract-curriculum-tree", async (req, res) => {
  try {
    const { files, base64Data, textContent, mimeType, model } = req.body || {};

    const hasFiles = (Array.isArray(files) && files.length > 0) || !!base64Data || !!textContent;
    if (!hasFiles) {
      return res.status(400).json({ 
        error: "Forneça pelo menos um arquivo (PDF ou Imagem) ou texto para a extração em árvore." 
      });
    }

    const ai = getGeminiClient();

    const systemInstruction =
      "Você é um cientista de dados acadêmicos especialista em extração e mapeamento de Projetos Pedagógicos de Curso (PPC) e Matrizes Curriculares em Árvore/Grafo da UFAPE (Universidade Federal do Agreste de Pernambuco).\n" +
      "Você receberá um ou mais arquivos complementares do mesmo curso (por exemplo: o PDF completo do PPC com tabelas de disciplinas e a Imagem gráfica do Fluxograma da Matriz com setas direcionadas de pré-requisitos).\n\n" +
      "Sua missão é correlacionar os documentos visuais e textuais para gerar um Grafo Acíclico Dirigido (DAG) estruturado da matriz curricular do curso.\n\n" +
      "--- REGRAS DE EXTRAÇÃO DA MATRIZ EM ÁRVORE ---\n" +
      "1. IDENTIFICAÇÃO DO CURSO E PERFIL CURRICULAR:\n" +
      "   - 'courseName': Nome oficial completo do curso (ex: 'Ciência da Computação', 'Medicina Veterinária', 'Engenharia de Alimentos').\n" +
      "   - 'courseShortName': Sigla de 3 a 5 letras em maiúsculo (ex: 'BCC', 'MVET', 'EAL', 'ADM').\n" +
      "   - 'profile': Objeto com os metadados do perfil curricular correspondente:\n" +
      "     * 'id': Código identificador do perfil (ex: 'BCC03' para o perfil 3/2024, 'BCC02' para perfil 2/2011, 'MVET03', 'EAL02', etc.).\n" +
      "     * 'name': Nome descritivo (ex: 'Grade Nova (Perfil 3/2024)', 'Perfil 3/2024.2').\n" +
      "     * 'description': Síntese da vigência (ex: 'Perfil vigente a partir do semestre 2024.2').\n" +
      "     * 'validFromSemester': Semestre de vigência inicial (ex: '2024.2').\n" +
      "     * 'totalHours': Carga horária total do curso (ex: 3200).\n" +
      "     * 'acexHours': Carga horária de extensão curricular ACEx (ex: 320). Se não houver, use 0.\n" +
      "     * 'accHours': Carga de atividades complementares ACC (ex: 90). Se não houver, use 0.\n" +
      "     * 'optativeHours': Carga horária mínima de disciplinas optativas (ex: 480).\n" +
      "     * 'mandatoryHours': Carga horária total de disciplinas obrigatórias (ex: 2310).\n\n" +
      "2. EXTRAÇÃO DOS NÓS DA ÁRVORE (subjects):\n" +
      "   - Mapeie cada disciplina do fluxograma/matriz:\n" +
      "     * 'id': Identificador único curto em snake_case (ex: 'log_mat_1', 'calc_1', 'intro_prog_1', 'aed_1', 'poo', 'sist_dig', 'banco_dados', 'paa', 'eng_soft_1', 'tcc', 'estagio').\n" +
      "     * 'code': Código oficial da disciplina (ex: 'MATM3008', 'CCMP3057', 'BCC00022'). Obtenha nas tabelas do PDF.\n" +
      "     * 'name': Nome oficial limpo da disciplina (ex: 'Lógica Matemática I', 'Introdução à Programação I').\n" +
      "     * 'period': Número inteiro do período regular (1 a 9, 1 a 10). Se for optativa solta, use 0.\n" +
      "     * 'hours': Carga horária total da disciplina em horas inteiras (ex: 30, 60, 90, 300).\n" +
      "     * 'type': Classificação da disciplina para estilização visual. Use estritamente: 'basico', 'computacao', 'optativa', 'estagio' ou 'outros'.\n" +
      "     * 'prereqs': ARRAY com os 'id's das disciplinas que são PRÉ-REQUISITOS DIRETOS desta disciplina (ou seja, de onde partem as setas direcionadas que apontam para ela na imagem do fluxograma).\n" +
      "       IMPORTANTE: Garanta que os IDs em 'prereqs' correspondam EXATAMENTE aos IDs dos nós das matérias antecedentes. Se não possuir pré-requisitos, retorne array vazio [].\n" +
      "     * 'desc': Ementa concisa com os principais tópicos da disciplina.\n" +
      "     * 'equivalences': Lista de equivalências se houver tabela de transição no documento.\n\n" +
      "3. PRECISÃO VISUAL E TOPOLÓGICA:\n" +
      "   - Se uma imagem do fluxograma estiver presente, rastreie cuidadosamente as setas entre as caixas de cada período para preencher 'prereqs'.\n" +
      "   - Correlacione os nomes das caixas da imagem com os códigos e cargas horárias das tabelas do PDF.";

    const contents: any[] = [];

    // Instruction prompt
    contents.push({
      text: textContent || "Extraia a matriz curricular completa em formato de árvore/grafo com todos os nós de disciplinas, períodos, cargas horárias e pré-requisitos direcionados a partir dos documentos fornecidos."
    });

    // Ingest all files (PDF, images, etc.)
    if (Array.isArray(files) && files.length > 0) {
      for (const f of files) {
        if (f.base64Data) {
          contents.push({
            inlineData: {
              mimeType: f.mimeType || "application/pdf",
              data: f.base64Data
            }
          });
        }
      }
    } else if (base64Data) {
      contents.push({
        inlineData: {
          mimeType: mimeType || "application/pdf",
          data: base64Data
        }
      });
    }

    const { response, modelUsed } = await generateWithFallback(ai, model || "gemini-3.8-flash", {
      contents,
      config: {
        systemInstruction,
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            courseName: { type: Type.STRING, description: "Nome oficial do curso" },
            courseShortName: { type: Type.STRING, description: "Sigla oficial do curso (ex: BCC)" },
            profile: {
              type: Type.OBJECT,
              properties: {
                id: { type: Type.STRING, description: "Código do perfil curricular (ex: BCC03)" },
                name: { type: Type.STRING, description: "Nome descritivo (ex: Grade Nova - Perfil 3/2024)" },
                description: { type: Type.STRING, description: "Vigência ou notas do perfil" },
                validFromSemester: { type: Type.STRING, description: "Semestre inicial (ex: 2024.2)" },
                totalHours: { type: Type.INTEGER, description: "Carga horária total (ex: 3200)" },
                acexHours: { type: Type.INTEGER, description: "Carga de extensão ACEx (ex: 320)" },
                accHours: { type: Type.INTEGER, description: "Carga de atividades complementares ACC (ex: 90)" },
                optativeHours: { type: Type.INTEGER, description: "Carga mínima de optativas (ex: 480)" },
                mandatoryHours: { type: Type.INTEGER, description: "Carga de obrigatórias (ex: 2310)" }
              },
              required: ["id", "name", "totalHours"]
            },
            subjects: {
              type: Type.ARRAY,
              description: "Lista de disciplinas com períodos e pré-requisitos direcionados",
              items: {
                type: Type.OBJECT,
                properties: {
                  id: { type: Type.STRING, description: "ID único em snake_case (ex: log_mat_1, calc_1)" },
                  code: { type: Type.STRING, description: "Código acadêmico oficial (ex: CCMP3057)" },
                  name: { type: Type.STRING, description: "Nome limpo oficial da matéria" },
                  period: { type: Type.INTEGER, description: "Período regular (1 a 10)" },
                  hours: { type: Type.INTEGER, description: "Carga horária total em horas (ex: 60)" },
                  type: { type: Type.STRING, description: "Tipo visual: 'basico', 'computacao', 'optativa', 'estagio', 'outros'" },
                  prereqs: {
                    type: Type.ARRAY,
                    description: "IDs das disciplinas antecedentes / pré-requisitos",
                    items: { type: Type.STRING }
                  },
                  desc: { type: Type.STRING, description: "Ementa concisa dos tópicos da matéria" }
                },
                required: ["id", "name", "period", "hours", "type", "prereqs"]
              }
            }
          },
          required: ["courseName", "profile", "subjects"]
        }
      }
    });

    if (!response.text) {
      throw new Error("Não foi possível gerar a árvore curricular a partir da IA.");
    }

    const result = cleanAndParseJson(response.text);
    res.json({ ...result, _modelUsed: modelUsed });
  } catch (error: any) {
    console.error("Curriculum tree extraction error:", error);
    const cleaned = cleanErrorMessage(error);
    res.status(cleaned.code === 503 ? 503 : 500).json({ error: cleaned.message, code: cleaned.code, status: cleaned.status });
  }
});

// 2. Extração do Horário Semestral das Turmas (Aceita PDF ou Texto)
async function handleExtractSchedule(req: express.Request, res: express.Response) {
  try {
    const { base64Data, textContent, mimeType, model } = req.body || {};

    if (!base64Data && !textContent) {
      return res.status(400).json({ error: "Forneça o arquivo PDF (base64Data) ou o texto da grade de horários (textContent)." });
    }

    const ai = getGeminiClient();

    const systemInstruction =
      "Você é um cientista de dados acadêmicos especialista em extração e mapeamento de quadros de horários letivos da UFAPE (Universidade Federal do Agreste de Pernambuco).\n" +
      "Analise detalhadamente o documento PDF ou texto de horários letivos fornecido.\n\n" +
      "--- REGRAS DE EXTRAÇÃO CRÍTICAS (PADRÃO DO SISTEMA) ---\n" +
      "1. IDENTIFICAÇÃO DE TURMA E PERÍODO:\n" +
      "   - Extraia o período recomendado como número inteiro (1 a 9). Se for optativa ou desconhecido, use 0.\n" +
      "   - Se a disciplina possuir identificação de turma (ex: Turma 1, Turma 2), inclua no nome.\n\n" +
      "2. MAPEAMENTO DE DIAS DA SEMANA:\n" +
      "   - 1=Segunda, 2=Terça, 3=Quarta, 4=Quinta, 5=Sexta, 6=Sábado.\n\n" +
      "3. EXTRAÇÃO DOS HORÁRIOS REAIS DO DOCUMENTO (time):\n" +
      "   - Extraia os horários reais exatos de início e término informados no documento ou grade de horários (ex: '07:30 - 09:10', '08:00 - 10:00', '10:00 - 12:00', '13:00 - 15:00', '14:00 - 16:00', '16:00 - 18:00', '18:30 - 20:10', '20:10 - 21:50').\n" +
      "   - Padronize sempre a string no formato 'HH:MM - HH:MM' com dois dígitos e espaço em volta do hífen.\n" +
      "   - Se houver bloco de 4 horas (ex: '14:00 - 18:00' ou '08:00 - 12:00'), divida em duas sessões contíguas de 2 horas para correta representação na grade semanal.\n\n" +
      "4. AGREGAÇÃO DE SESSÕES:\n" +
      "   - NÃO crie itens duplicados para a mesma matéria e mesma turma!\n" +
      "   - Agrupe todos os horários da disciplina dentro do seu array 'sessions'.\n\n" +
      "5. PROFESSORES:\n" +
      "   - Extraia o professor responsável. Se não informado, use '-'.\n\n" +
      "6. CÓDIGO E ID:\n" +
      "   - code: código acadêmico de 4 letras e 4 números (ex: CCMP3057, MORF3003, MVET0001).\n" +
      "   - id: slug amigável em minúsculo, ex: 'p1_intro_prog_t1'.\n\n" +
      "7. PERFIL CURRICULAR OU MATRIZ (profile) - CAMPO OBRIGATÓRIO SEPARADO:\n" +
      "   - NUNCA, SOB HIPÓTESE ALGUMA, CONCATENE O PERFIL, MATRIZ OU SUFIXOS COMO '(Matriz Nova - MVET03)', '(Perfil MVET02)', '(Matriz Antiga)' NO CAMPO 'name'!\n" +
      "   - O campo 'name' deve conter ESTRITAMENTE o nome limpo e oficial da matéria (ex: 'Anatomia Descritiva dos Animais Domésticos', 'Genética', 'Bioquímica e Biofísica Veterinária').\n" +
      "   - O código do perfil curricular ou matriz DEVE ser colocado EXCLUSIVAMENTE no atributo separado 'profile' (ex: 'MVET03', 'MVET02', 'BCC03').\n" +
      "   - ATENÇÃO: 'Optativa' NÃO é um perfil curricular! Disciplinas optativas pertencem a todos os perfis. Para disciplinas de tabelas de optativas, preencha o campo 'profile' com string vazia \"\" e 'period' com 0.\n" +
      "   - Observe atentamente os cabeçalhos de cada período/página para detectar perfis ou matrizes curriculares (ex: 'PERFIL: MVET03', 'MATRIZ NOVA', 'PERFIL - MVET02', 'MATRIZ ANTIGA').\n" +
      "   - Se o documento não fizer divisão de perfis, preencha com string vazia \"\".\n\n" +
      "8. IDENTIFICAÇÃO DO CURSO E TÍTULO (courseName, courseShortName, title):\n" +
      "   - Analise os cabeçalhos, rodapés ou texto do documento para identificar o Curso de Graduação (ex: 'Medicina Veterinária', 'Agronomia', 'Bacharelado em Ciência da Computação', 'Engenharia de Alimentos', 'Zootecnia', 'Administração', 'Pedagogia', 'Letras').\n" +
      "   - 'courseName': Nome oficial limpo do curso (ex: 'Medicina Veterinária', 'Agronomia', 'Ciência da Computação').\n" +
      "   - 'courseShortName': Sigla de 3 a 5 letras em maiúsculo (ex: 'MVET', 'AGRO', 'BCC', 'EAL', 'ZOO', 'ADM').\n" +
      "   - 'title': Título descritivo oficial para a grade semestral (ex: 'Medicina Veterinária 2026.1 - Horário Letivo', 'BCC 2026.1 - Horário Letivo').";

    const contents: any[] = [];
    if (textContent) {
      contents.push({
        text: `Extraia cuidadosamente todas as turmas, horários e disciplinas a partir deste texto:\n\n${textContent}`
      });
    } else {
      contents.push({
        text: "Extraia cuidadosamente todas as turmas, horários e disciplinas descritos neste documento curricular seguindo os critérios descritos."
      });
    }

    if (base64Data) {
      contents.push({
        inlineData: {
          mimeType: mimeType || "application/pdf",
          data: base64Data
        }
      });
    }

    const { response, modelUsed } = await generateWithFallback(ai, model || "gemini-3.8-flash", {
      contents,
      config: {
        systemInstruction,
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            courseName: { type: Type.STRING, description: "Nome oficial completo do curso identificado no documento (ex: 'Medicina Veterinária', 'Agronomia', 'Ciência da Computação')" },
            courseShortName: { type: Type.STRING, description: "Sigla de 3 a 5 letras em maiúsculo do curso (ex: 'MVET', 'AGRO', 'BCC', 'EAL', 'ZOO', 'ADM')" },
            title: { type: Type.STRING, description: "Título descritivo oficial sugerido para a grade (ex: 'Medicina Veterinária 2026.1 - Horário Letivo')" },
            profiles: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
              description: "Lista de todos os códigos de perfis/matrizes curriculares identificados (ex: ['MVET03', 'MVET02'])"
            },
            disciplines: {
              type: Type.ARRAY,
              description: "Lista estruturada de todas as disciplinas encontradas unificadas sem duplicações",
              items: {
                type: Type.OBJECT,
                properties: {
                  id: { type: Type.STRING, description: "ID único em minúsculo" },
                  code: { type: Type.STRING, description: "Código acadêmico ex: CCMP1234" },
                  name: { type: Type.STRING, description: "Nome oficial LIMPO da disciplina (SEM sufixos de matriz/perfil)" },
                  professor: { type: Type.STRING, description: "Nome do professor da disciplina" },
                  period: { type: Type.INTEGER, description: "Período correto (de 1 a 9). 0 para optativas." },
                  profile: { type: Type.STRING, description: "Código do perfil curricular ou matriz correspondente (ex: 'MVET03', 'MVET02'). Não preencha com 'Optativa' nem com o nome no campo 'name'!" },
                  sessions: {
                    type: Type.ARRAY,
                    items: {
                      type: Type.OBJECT,
                      properties: {
                        day: { type: Type.INTEGER, description: "1=Seg, 2=Ter, 3=Qua, 4=Qui, 5=Sex, 6=Sáb" },
                        time: { type: Type.STRING, description: "Horário da aula no formato 'HH:MM - HH:MM' extraído diretamente do documento ou tabela (ex: '08:00 - 10:00', '14:00 - 16:00', '18:30 - 20:10', etc.)" }
                      },
                      required: ["day", "time"]
                    }
                  }
                },
                required: ["id", "code", "name", "professor", "period", "profile", "sessions"]
              }
            }
          },
          required: ["title", "disciplines"]
        }
      }
    });

    if (!response.text) {
      throw new Error("Não foi possível extrair dados do documento.");
    }

    const parsedResult = cleanAndParseJson(response.text);

    // Defensive Sanitization: Ensure profile is in a separate attribute and not in the discipline name
    if (parsedResult && Array.isArray(parsedResult.disciplines)) {
      const detectedProfiles = new Set<string>();
      if (Array.isArray(parsedResult.profiles)) {
        parsedResult.profiles.forEach((p: any) => {
          if (typeof p === "string" && p.trim() && p.trim().toLowerCase() !== 'optativa' && p.trim().toLowerCase() !== 'sem perfil') {
            detectedProfiles.add(p.trim());
          }
        });
      }

      parsedResult.disciplines = parsedResult.disciplines.map((d: any) => {
        let cleanName = d.name || "";
        let extractedProfile = (d.profile || "").trim();

        // Detect patterns like "(Matriz Nova - MVET03)", "(Perfil MVET02)", "(Matriz Antiga - MVET02)", "(MVET03)"
        const profileRegex = /\s*\((?:matriz\s+(?:nova|antiga)\s*[-–:]*\s*|perfil\s*[-–:]*\s*)?([A-Za-z0-9_-]+)\)/i;
        const match = cleanName.match(profileRegex);
        if (match) {
          const matchedProfile = match[1]?.trim();
          if (!extractedProfile && matchedProfile) {
            extractedProfile = matchedProfile;
          }
          cleanName = cleanName.replace(match[0], "").trim();
        }

        // Also clean general matrix labels like "(Matriz Nova)", "(Matriz Antiga)"
        cleanName = cleanName.replace(/\s*\((?:matriz\s+nova|matriz\s+antiga)\)/gi, "").trim();

        // "Optativa" não é perfil curricular
        if (extractedProfile && (extractedProfile.toLowerCase() === 'optativa' || extractedProfile.toLowerCase() === 'sem perfil')) {
          extractedProfile = "";
        }
        if (d.period === 0 && extractedProfile.toLowerCase() === 'optativa') {
          extractedProfile = "";
        }

        if (extractedProfile && extractedProfile.toLowerCase() !== 'optativa' && extractedProfile.toLowerCase() !== 'sem perfil') {
          detectedProfiles.add(extractedProfile);
        }

        return {
          ...d,
          name: cleanName,
          profile: extractedProfile
        };
      });

      parsedResult.profiles = Array.from(detectedProfiles);
    }

    res.json({ ...parsedResult, _modelUsed: modelUsed });
  } catch (error: any) {
    console.error("Schedule extraction error:", error);
    const cleaned = cleanErrorMessage(error);
    res.status(cleaned.code === 503 ? 503 : 500).json({ error: cleaned.message, code: cleaned.code, status: cleaned.status });
  }
}

app.post("/api/extract-schedule", handleExtractSchedule);
app.post("/api/extract-pdf", handleExtractSchedule);

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
