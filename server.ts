import express from "express";
import path from "path";
import dotenv from "dotenv";
import fs from "fs";
import { extractionRoutes } from './extractionRoutes';
import { validateExtraction } from './src/utils/extraction';
import { createAcademicAIClient, type AcademicAIClient } from './aiProvider';

// Load environment variables
dotenv.config();

const app = express();
const PORT = 3000;

// Maximum payload size for PDF uploads and large curriculums
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ limit: "50mb", extended: true }));

// The provider is chosen exclusively by the model selected for the extraction.
let aiClient: AcademicAIClient | null = null;
function getAIClient(): AcademicAIClient {
  if (!aiClient) {
    aiClient = createAcademicAIClient();
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
      hasCurriculum: true,
      hasSchedule: true,
      semesters: ["2026.1"],
      profiles: ["EAL03"]
    },
    {
      id: "medicina-veterinaria",
      name: "Medicina Veterinária",
      shortName: "MVET",
      hasCurriculum: true,
      hasSchedule: true,
      semesters: ["2026.1"],
      profiles: ["MVET03", "MVET02"]
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

function isLocalhostIp(req: express.Request): boolean {
  const remoteIp = req.socket.remoteAddress || req.ip || "";
  return (
    remoteIp === "127.0.0.1" ||
    remoteIp === "::1" ||
    remoteIp === "::ffff:127.0.0.1" ||
    remoteIp === "localhost"
  );
}

// Middleware de proteção exclusivo para localhost
const localhostOnly: express.RequestHandler = (req, res, next) => {
  if (isLocalhostIp(req)) {
    return next();
  }
  
  console.warn(`[SEGURANÇA] Bloqueado acesso externo à rota administrativa ${req.method} ${req.originalUrl} a partir do IP: ${req.ip}`);
  res.status(403).json({
    error: "Acesso não autorizado. Esta operação é restrita ao ambiente local (localhost)."
  });
};

// --- API ROUTES ---

// Health check
app.get("/api/health", (req, res) => {
  res.json({
    status: "ok",
    nvidia_api_configured: !!process.env.NVIDIA_API_KEY,
    moonshot_api_configured: !!process.env.MOONSHOT_API_KEY,
    openrouter_api_configured: !!process.env.OPENROUTER_API_KEY,
    gemini_api_configured: !!process.env.GEMINI_API_KEY
  });
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
      let semesters: string[] = Array.isArray(c.semesters) ? [...c.semesters] : [];
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
        const schedFiles = files.filter(f => f.startsWith("horario_") && f.endsWith(".json"));
        schedFiles.forEach(f => {
          const match = f.match(/^horario_[a-z0-9_-]+_(\d{4}_\d)\.json$/);
          if (match) {
            semesters.push(match[1].replace('_', '.'));
          }
        });
        const schedFile = schedFiles.sort().reverse()[0];
        if (schedFile) {
          try {
            const sched = JSON.parse(fs.readFileSync(path.join(courseDir, schedFile), "utf-8"));
            const schedProfiles = extractProfilesFromSchedule(sched);
            profiles = Array.from(new Set([...profiles, ...schedProfiles]));
          } catch {}
        }
      }
      return { 
        ...c, 
        profiles: profiles.length > 0 ? profiles : undefined,
        semesters: Array.from(new Set(semesters)).sort()
      };
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
    const cleanId = id.toLowerCase();
    const requestedSemester = req.query.semester as string | undefined; // Permite ?semester=2026.2
    const courses = getRegistry();
    const courseMeta = courses.find((c: any) => 
      c.id === cleanId ||
      c.id.toLowerCase() === cleanId ||
      (c.shortName && c.shortName.toLowerCase() === cleanId) ||
      (cleanId === 'engenharia-de-alimentos' && c.id === 'eal') ||
      (cleanId === 'eal' && c.id === 'engenharia-de-alimentos') ||
      (cleanId === 'mvet' && c.id === 'medicina-veterinaria') ||
      (cleanId === 'medicina-veterinaria' && c.id === 'mvet') ||
      (cleanId === 'vet' && c.id === 'medicina-veterinaria')
    );

    if (!courseMeta) {
      return res.status(404).json({ error: `Curso '${id}' não encontrado.` });
    }

    let courseDir = path.join(DATA_DIR, courseMeta.id);
    if (!fs.existsSync(courseDir)) {
      if ((courseMeta.id === 'engenharia-de-alimentos' || courseMeta.id === 'eal') && fs.existsSync(path.join(DATA_DIR, 'eal'))) {
        courseDir = path.join(DATA_DIR, 'eal');
      } else if (courseMeta.id === 'medicina-veterinaria' && fs.existsSync(path.join(DATA_DIR, 'mvet'))) {
        courseDir = path.join(DATA_DIR, 'mvet');
      }
    }
    let curriculum: any = null;
    let schedule: any = null;
    let scheduleExtraction: any = null;

    if (fs.existsSync(courseDir)) {
      const files = fs.readdirSync(courseDir);

      // Identifica todos os semestres disponíveis nos arquivos horario_<id>_<semestre>.json
      const availableSemesters: string[] = [];
      files.forEach(f => {
        const match = f.match(/^horario_[a-z0-9_-]+_(\d{4}_\d)\.json$/);
        if (match) {
          availableSemesters.push(match[1].replace('_', '.'));
        }
      });
      if (availableSemesters.length > 0) {
        courseMeta.semesters = Array.from(new Set(availableSemesters)).sort();
      }

      // Procura currículo
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

      // Procura o arquivo de horário correspondente ao semestre solicitado ou o mais recente
      let targetSchedFile: string | undefined;
      if (requestedSemester) {
        const semClean = requestedSemester.replace(/\./g, '_');
        targetSchedFile = files.find(f => f === `horario_${courseMeta.id}_${semClean}.json` || (f.startsWith('horario_') && f.endsWith(`_${semClean}.json`)));
      }
      if (!targetSchedFile) {
        // Pega o mais recente ou o primeiro
        const schedFiles = files.filter(f => f.startsWith("horario_") && f.endsWith(".json")).sort().reverse();
        targetSchedFile = schedFiles[0];
      }

      if (targetSchedFile) {
        try {
          schedule = JSON.parse(fs.readFileSync(path.join(courseDir, targetSchedFile), "utf-8"));
          const reportPath = path.join(courseDir, `extracao_${targetSchedFile}`);
          if (fs.existsSync(reportPath)) {
            scheduleExtraction = JSON.parse(fs.readFileSync(reportPath, 'utf-8'));
          }
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
      schedule,
      scheduleExtraction
    });
  } catch (error: any) {
    res.status(500).json({ error: "Failed to load course details", details: error.message });
  }
});

// POST save or update a course with its curriculum and/or schedule
app.post("/api/courses", localhostOnly, (req, res) => {
  try {
    const { id, name, shortName, curriculum, schedule, semester } = req.body;
    if (!id || !name) {
      return res.status(400).json({ error: "Campos obrigatórios ausentes: 'id' e 'name'." });
    }

    // Reject invalid academic values before creating directories or writing any data.
    const validation = [
      ...(schedule ? validateExtraction(schedule, 'schedule') : []),
      ...(curriculum ? validateExtraction(Array.isArray(curriculum) ? curriculum : curriculum.subjects || [], 'linear') : []),
      ...(curriculum?.treeSubjects ? validateExtraction(curriculum.treeSubjects, 'tree') : []),
      ...(!curriculum?.treeSubjects && curriculum?.profiles ? curriculum.profiles.flatMap((p: any) => validateExtraction(p.subjects || [], 'tree')) : [])
    ];
    const errors = validation.filter(issue => issue.severity === 'error');
    if (errors.length) return res.status(422).json({ error: 'Corrija os dados inválidos antes de salvar.', issues: errors });

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
          treeSubjects: curriculum.treeSubjects,
          extraction: curriculum.extraction,
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
      if (req.body.scheduleExtraction) fs.writeFileSync(path.join(courseDir, `extracao_${path.basename(schedFilePath)}`), JSON.stringify(req.body.scheduleExtraction, null, 2), 'utf-8');
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

    // Atualizar semestres acumulando os existentes
    const existingSemesters = Array.isArray(existingMeta?.semesters) ? existingMeta.semesters : [];
    const diskFiles = fs.existsSync(courseDir) ? fs.readdirSync(courseDir) : [];
    const diskSemesters: string[] = [];
    diskFiles.forEach(f => {
      const match = f.match(/^horario_[a-z0-9_-]+_(\d{4}_\d)\.json$/);
      if (match) {
        diskSemesters.push(match[1].replace('_', '.'));
      }
    });
    const formattedSem = sem.replace(/_/g, ".");
    const mergedSemesters = Array.from(new Set([...existingSemesters, ...diskSemesters, formattedSem])).sort();

    const updatedMeta: any = {
      id: cleanId,
      name: name.trim(),
      shortName: (shortName || cleanId.toUpperCase()).trim(),
      hasCurriculum,
      hasSchedule,
      semesters: mergedSemesters
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
app.delete("/api/courses/:id", localhostOnly, (req, res) => {
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

app.use('/api', localhostOnly, extractionRoutes(getAIClient));

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
