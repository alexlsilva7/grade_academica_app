import type { RequestHandler } from 'express';
import { getSupabaseAuthClient, hasSupabaseAuthConfig } from './supabaseClient.js';

declare global {
  namespace Express {
    interface Request {
      adminUserId?: string;
    }
  }
}

export function getAcademicDataSource(): 'files' | 'supabase' {
  return process.env.ACADEMIC_DATA_SOURCE?.trim().toLowerCase() === 'supabase' ? 'supabase' : 'files';
}

function allowedAdminIds(): Set<string> {
  return new Set((process.env.ADMIN_USER_IDS || '').split(',').map(id => id.trim().toLowerCase()).filter(Boolean));
}

export const requireAdmin: RequestHandler = async (req, res, next) => {
  const token = req.header('authorization')?.match(/^Bearer\s+(.+)$/i)?.[1];
  if (!token) return res.status(401).json({ error: 'Entre com uma conta administrativa para continuar.' });
  if (!hasSupabaseAuthConfig()) {
    return res.status(503).json({ error: 'A autenticação administrativa do Supabase não está configurada.' });
  }

  try {
    const { data, error } = await getSupabaseAuthClient().auth.getUser(token);
    if (error || !data.user) return res.status(401).json({ error: 'Sessão inválida ou expirada.' });
    const admins = allowedAdminIds();
    if (!admins.has(data.user.id.toLowerCase())) {
      return res.status(403).json({ error: 'Esta conta não possui permissão administrativa.' });
    }
    req.adminUserId = data.user.id;
    return next();
  } catch (error) {
    console.error('Falha ao validar sessão administrativa:', (error as Error).message);
    return res.status(503).json({ error: 'Não foi possível validar a sessão com o Supabase.' });
  }
};
