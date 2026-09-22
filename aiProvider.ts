import { GoogleGenAI } from '@google/genai';
import type { OpenRouter } from '@openrouter/sdk';
import OpenAI from 'openai';

type GenerateContentArgs = {
  model: string;
  contents: Array<{ text?: string; inlineData?: { mimeType: string; data: string } }>;
  config: {
    systemInstruction: string;
    onProgress?: (stage: 'preparation' | 'extraction', message: string) => void;
    responseMimeType?: string;
    responseSchema?: any;
    abortSignal?: AbortSignal;
    httpOptions?: { timeout?: number };
  };
};

function toJsonSchema(schema: any): any {
  if (!schema || typeof schema !== 'object') return schema;
  const rawType = String(schema.type || '').toLowerCase();
  let converted: any;
  if (rawType === 'object') {
    converted = {
      type: 'object',
      properties: Object.fromEntries(Object.entries(schema.properties || {}).map(([key, value]) => [key, toJsonSchema(value)])),
      required: schema.required || Object.keys(schema.properties || {}),
      additionalProperties: false
    };
  } else if (rawType === 'array') converted = { type: 'array', items: toJsonSchema(schema.items) };
  else if (rawType === 'integer') converted = { type: 'integer' };
  else if (rawType === 'number') converted = { type: 'number' };
  else if (rawType === 'boolean') converted = { type: 'boolean' };
  else converted = { type: 'string' };
  return schema.nullable ? { anyOf: [converted, { type: 'null' }] } : converted;
}

function systemPrompt(args: GenerateContentArgs) {
  return args.config.systemInstruction + (args.config.responseSchema ? `\nRetorne exclusivamente JSON seguindo este JSON Schema completo: ${JSON.stringify(toJsonSchema(args.config.responseSchema))}` : '');
}

export type AcademicAIClient = {
  models: { generateContent(args: GenerateContentArgs): Promise<{ text?: string; candidates?: Array<{ finishReason?: string }> }> };
  defaultModel?: string;
  defaultFileModel?: string;
};

/** Adapts NVIDIA's OpenAI-compatible endpoint to the extraction pipeline. */
class NvidiaClient implements AcademicAIClient {
  readonly models: AcademicAIClient['models'];

  constructor(private readonly client: OpenAI) {
    this.models = { generateContent: this.generateContent.bind(this) };
  }

  private async generateContent(args: GenerateContentArgs) {
    const content: any[] = [];
    for (const part of args.contents) {
      if (part.text) content.push({ type: 'text', text: part.text });
      if (part.inlineData) {
        if (part.inlineData.mimeType === 'application/pdf') {
          throw Object.assign(new Error('Para enviar PDF, selecione Moonshot, OpenRouter ou Gemini. Modelos NVIDIA estão disponíveis para texto colado.'), { status: 400 });
        }
        content.push({ type: 'image_url', image_url: { url: `data:${part.inlineData.mimeType};base64,${part.inlineData.data}` } });
      }
    }
    try {
      args.config.onProgress?.('extraction', 'Solicitação enviada à NVIDIA. Aguardando o JSON completo.');
      const completion = await this.client.chat.completions.create({
        model: args.model,
        messages: [{ role: 'system', content: systemPrompt(args) }, { role: 'user', content }],
        response_format: { type: 'json_object' },
        temperature: 0.2,
        top_p: 1,
        max_tokens: 8192,
        stream: false
      }, { signal: args.config.abortSignal, timeout: args.config.httpOptions?.timeout ?? 180000 });
      return {
        text: completion.choices[0]?.message?.content || undefined,
        candidates: [{ finishReason: completion.choices[0]?.finish_reason === 'stop' ? 'STOP' : completion.choices[0]?.finish_reason || 'EMPTY' }]
      };
    } catch (cause: any) { throw cause; }
  }
}

/** Direct Moonshot/Kimi client using its OpenAI-compatible API. */
class MoonshotClient implements AcademicAIClient {
  readonly models: AcademicAIClient['models'];

  constructor(private readonly client: OpenAI) {
    this.models = { generateContent: this.generateContent.bind(this) };
  }

  private extractPdf(base64Data: string, signal?: AbortSignal, report?: GenerateContentArgs['config']['onProgress']): Promise<string> {
    const extraction = (async () => {
      const file = new File([Buffer.from(base64Data, 'base64')], 'documento.pdf', { type: 'application/pdf' });
      report?.('preparation', 'Enviando PDF ao serviço de leitura da Moonshot.');
      const uploaded = await this.client.files.create({ file, purpose: 'file-extract' } as any, { signal, timeout: 180000 });
      try {
        report?.('preparation', 'PDF recebido pela Moonshot. Obtendo o texto do documento.');
        const response = await this.client.files.content(uploaded.id, { signal, timeout: 180000 });
        return await response.text();
      } finally {
        void this.client.files.delete(uploaded.id).catch(() => undefined);
      }
    })();
    return extraction;
  }

  private async generateContent(args: GenerateContentArgs) {
    const content: any[] = [];
    for (const part of args.contents) {
      if (part.text) content.push({ type: 'text', text: part.text });
      if (part.inlineData) {
        if (part.inlineData.mimeType === 'application/pdf') {
          const extractedText = await this.extractPdf(part.inlineData.data, args.config.abortSignal, args.config.onProgress);
          content.push({ type: 'text', text: `CONTEÚDO EXTRAÍDO DO PDF:\n${extractedText}` });
        } else content.push({ type: 'image_url', image_url: { url: `data:${part.inlineData.mimeType};base64,${part.inlineData.data}` } });
      }
    }
    args.config.onProgress?.('extraction', 'Documento preparado. Aguardando o JSON completo da Moonshot.');
    const completion = await this.client.chat.completions.create({
      model: args.model.replace(/^moonshot\//, ''),
      messages: [{
        role: 'system',
        content: systemPrompt(args)
      }, { role: 'user', content }],
      response_format: { type: 'json_object' },
      temperature: 0.6,
      top_p: 0.95,
      max_tokens: 32768,
      stream: false,
      thinking: { type: 'disabled' }
    } as any, { signal: args.config.abortSignal, timeout: args.config.httpOptions?.timeout ?? 180000 });
    return {
      text: completion.choices[0]?.message?.content || undefined,
      candidates: [{ finishReason: completion.choices[0]?.finish_reason === 'stop' ? 'STOP' : completion.choices[0]?.finish_reason || 'EMPTY' }]
    };
  }
}

/** OpenRouter accepts PDF file parts and parses them before the model runs. */
class OpenRouterClient implements AcademicAIClient {
  readonly models: AcademicAIClient['models'];
  private client?: Promise<OpenRouter>;

  constructor(private readonly apiKey: string) {
    this.models = { generateContent: this.generateContent.bind(this) };
  }

  private async generateContent(args: GenerateContentArgs) {
    const content: any[] = [];
    let hasPdf = false;
    for (const part of args.contents) {
      if (part.text) content.push({ type: 'text', text: part.text });
      if (part.inlineData) {
        const dataUrl = `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`;
        if (part.inlineData.mimeType === 'application/pdf') {
          hasPdf = true;
          content.push({ type: 'file', file: { fileData: dataUrl, filename: 'documento.pdf' } });
        } else {
          content.push({ type: 'image_url', imageUrl: { url: dataUrl } });
        }
      }
    }
    const providerName = process.env.OPENROUTER_PROVIDER?.trim();
    // Avoid loading the entire SDK when the selected pipeline does not use OpenRouter.
    const client = await (this.client ??= import('@openrouter/sdk').then(({ OpenRouter }) => new OpenRouter({ apiKey: this.apiKey, appTitle: 'Grade Acadêmica' })));
    args.config.abortSignal?.throwIfAborted();
    args.config.onProgress?.('extraction', hasPdf ? 'OpenRouter recebeu a solicitação com PDF. Aguardando leitura do arquivo e geração do JSON.' : 'Solicitação enviada ao OpenRouter. Aguardando o JSON completo.');
    const response = await client.chat.send({
      chatRequest: {
        model: args.model.replace(/^openrouter\//, ''),
        messages: [{ role: 'system', content: systemPrompt(args) }, { role: 'user', content }],
        responseFormat: { type: 'json_object' },
        temperature: 0.2,
        topP: 1,
        maxTokens: 8192,
        stream: false,
        // OpenRouter's file-parser gives every compatible model PDF support.
        plugins: hasPdf ? [{ id: 'file-parser', pdf: { engine: 'mistral-ocr' } }] : undefined,
        provider: providerName ? { only: [providerName], allowFallbacks: false } : undefined
      }
    }, { signal: args.config.abortSignal ? AbortSignal.any([args.config.abortSignal, AbortSignal.timeout(args.config.httpOptions?.timeout || 180000)]) : AbortSignal.timeout(args.config.httpOptions?.timeout || 180000) }) as any;
    return {
      text: response.choices?.[0]?.message?.content || undefined,
      candidates: [{ finishReason: response.choices?.[0]?.finishReason === 'stop' ? 'STOP' : response.choices?.[0]?.finishReason || 'EMPTY' }]
    };
  }
}

class PrioritizedClient implements AcademicAIClient {
  readonly defaultModel: string;
  readonly defaultFileModel?: string;
  readonly models: AcademicAIClient['models'];

  constructor(
    private readonly nvidia: NvidiaClient | null,
    private readonly moonshot: MoonshotClient | null,
    private readonly openRouter: OpenRouterClient | null,
    private readonly gemini: GoogleGenAI | null
  ) {
    if (!nvidia && !moonshot && !openRouter && !gemini) throw new Error('Defina NVIDIA_API_KEY, MOONSHOT_API_KEY, OPENROUTER_API_KEY ou GEMINI_API_KEY no arquivo .env.');
    this.defaultModel = nvidia ? (process.env.NVIDIA_MODEL || 'z-ai/glm-5.3') :
      moonshot ? `moonshot/${(process.env.MOONSHOT_MODEL || 'kimi-k2.6').replace(/^moonshot\//, '')}` :
      openRouter ? `openrouter/${(process.env.OPENROUTER_MODEL || 'z-ai/glm-5.2:free').replace(/^openrouter\//, '')}` : (process.env.GEMINI_MODEL || 'gemini-3.6-flash');
    this.defaultFileModel = moonshot ? `moonshot/${(process.env.MOONSHOT_MODEL || 'kimi-k2.6').replace(/^moonshot\//, '')}` :
      openRouter ? `openrouter/${(process.env.OPENROUTER_MODEL || 'z-ai/glm-5.2:free').replace(/^openrouter\//, '')}` :
      gemini ? (process.env.GEMINI_MODEL || 'gemini-3.6-flash') : undefined;
    this.models = { generateContent: this.generateContent.bind(this) };
  }

  private generateContent(args: GenerateContentArgs) {
    const name = args.model.toLowerCase();
    const [client, key] = name.startsWith('openrouter/') ? [this.openRouter, 'OPENROUTER_API_KEY'] :
      name.startsWith('moonshot/') || name.startsWith('kimi-') ? [this.moonshot, 'MOONSHOT_API_KEY'] :
      name.startsWith('gemini') ? [this.gemini, 'GEMINI_API_KEY'] : [this.nvidia, 'NVIDIA_API_KEY'];
    if (!client) throw new Error(`Configure ${key} no .env para usar ${args.model}.`);
    if (client === this.gemini) {
      const { onProgress, ...config } = args.config;
      onProgress?.('extraction', 'Solicitação enviada ao Gemini. Aguardando o JSON completo.');
      return client.models.generateContent({ ...args, config } as any) as any;
    }
    return client.models.generateContent(args as any) as any;
  }
}

export function createAcademicAIClient(): AcademicAIClient {
  const nvidiaKey = process.env.NVIDIA_API_KEY;
  const moonshotKey = process.env.MOONSHOT_API_KEY;
  const openRouterKey = process.env.OPENROUTER_API_KEY;
  const geminiKey = process.env.GEMINI_API_KEY;
  // Retries are coordinated by the extraction pipeline so Retry-After, progress
  // and each attempt stay observable and cancellable.
  const nvidia = nvidiaKey ? new NvidiaClient(new OpenAI({ apiKey: nvidiaKey, baseURL: 'https://integrate.api.nvidia.com/v1', maxRetries: 0 })) : null;
  const moonshot = moonshotKey ? new MoonshotClient(new OpenAI({ apiKey: moonshotKey, baseURL: 'https://api.moonshot.ai/v1', maxRetries: 0 })) : null;
  const openRouter = openRouterKey ? new OpenRouterClient(openRouterKey) : null;
  const gemini = geminiKey ? new GoogleGenAI({ apiKey: geminiKey, httpOptions: { headers: { 'User-Agent': 'aistudio-build' } } }) : null;
  return new PrioritizedClient(nvidia, moonshot, openRouter, gemini);
}
