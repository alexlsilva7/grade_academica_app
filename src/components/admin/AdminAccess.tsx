import { FormEvent, ReactNode, useEffect, useState } from 'react';
import { ArrowLeft, LoaderCircle, LockKeyhole, LogOut } from 'lucide-react';
import { supabaseBrowser } from '../../utils/supabaseClient';

type AdminConfig = { authRequired: boolean; authConfigured: boolean; dataSource: 'files' | 'supabase' };

export function AdminAccess({ children, onBack }: { children: ReactNode; onBack: () => void }) {
  const [config, setConfig] = useState<AdminConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [authorized, setAuthorized] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    let cancelled = false;
    async function initialize() {
      try {
        const response = await fetch('/api/admin/config');
        if (!response.ok) throw new Error('Não foi possível consultar a configuração administrativa.');
        const nextConfig = await response.json() as AdminConfig;
        if (cancelled) return;
        setConfig(nextConfig);
        if (!nextConfig.authRequired) {
          setAuthorized(true);
          setLoading(false);
          return;
        }
        if (!supabaseBrowser) {
          setMessage('Configure VITE_SUPABASE_URL e VITE_SUPABASE_PUBLISHABLE_KEY no ambiente de build.');
          setLoading(false);
          return;
        }
        const { data, error } = await supabaseBrowser.auth.getSession();
        if (error) throw error;
        if (data.session) await verifyAdmin(data.session.access_token, cancelled);
        else setLoading(false);
      } catch (error) {
        if (!cancelled) {
          setMessage((error as Error).message || 'Falha ao preparar o acesso administrativo.');
          setLoading(false);
        }
      }
    }
    void initialize();
    return () => { cancelled = true; };
  }, []);

  async function verifyAdmin(accessToken: string, cancelled = false): Promise<boolean> {
    const response = await fetch('/api/admin/session', { headers: { Authorization: `Bearer ${accessToken}` } });
    if (cancelled) return false;
    if (response.ok) {
      setAuthorized(true);
      setMessage('');
      setLoading(false);
      return true;
    }
    const payload = await response.json().catch(() => ({}));
    setAuthorized(false);
    setMessage(payload.error || 'Esta conta não possui acesso administrativo.');
    setLoading(false);
    return false;
  }

  async function handleLogin(event: FormEvent) {
    event.preventDefault();
    if (!supabaseBrowser) return;
    setSubmitting(true);
    setMessage('');
    try {
      const { data, error } = await supabaseBrowser.auth.signInWithPassword({ email: email.trim(), password });
      if (error) throw error;
      if (!data.session || !(await verifyAdmin(data.session.access_token))) {
        await supabaseBrowser.auth.signOut();
      }
    } catch (error) {
      setMessage((error as Error).message || 'Não foi possível entrar.');
    } finally {
      setSubmitting(false);
    }
  }

  async function handleLogout() {
    await supabaseBrowser?.auth.signOut();
    setAuthorized(false);
    setPassword('');
    setMessage('Sessão encerrada.');
  }

  if (loading || !config) {
    return <div className="min-h-screen grid place-items-center bg-slate-50 dark:bg-slate-950 text-slate-600 dark:text-slate-300"><LoaderCircle className="animate-spin mr-2" size={18} />Carregando acesso administrativo…</div>;
  }

  if (authorized) {
    if (!config.authRequired) return <>{children}</>;
    return <div className="min-h-screen flex flex-col">
      <div className="flex items-center justify-end gap-3 px-5 py-3 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
        <button onClick={onBack} className="mr-auto text-sm text-slate-500 hover:text-slate-800 dark:hover:text-slate-100">Voltar ao início</button>
        <span className="text-xs text-slate-500">Sessão administrativa</span>
        <button onClick={() => void handleLogout()} className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm hover:bg-slate-100 dark:hover:bg-slate-800"><LogOut size={15} />Sair</button>
      </div>
      <div className="flex-1 min-h-0">{children}</div>
    </div>;
  }

  return <main className="min-h-screen grid place-items-center bg-slate-50 dark:bg-slate-950 p-5 text-slate-800 dark:text-slate-100">
    <section className="w-full max-w-md rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-7 shadow-xl">
      <button onClick={onBack} className="mb-6 flex items-center gap-2 text-sm text-slate-500 hover:text-indigo-600"><ArrowLeft size={16} />Voltar ao início</button>
      <div className="mb-6 flex h-12 w-12 items-center justify-center rounded-xl bg-indigo-50 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300"><LockKeyhole /></div>
      <h1 className="text-2xl font-bold">Admin My UFAPE</h1>
      <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">Entre com uma conta autorizada para administrar os dados acadêmicos.</p>
      {config.authRequired && !config.authConfigured && <p role="alert" className="mt-5 rounded-lg bg-amber-50 p-3 text-sm text-amber-900 dark:bg-amber-950/40 dark:text-amber-200">Configure as variáveis do Supabase no servidor para habilitar o acesso.</p>}
      {config.authConfigured && <form onSubmit={handleLogin} className="mt-6 space-y-4">
        <label className="block text-sm font-medium">E-mail<input type="email" autoComplete="username" required value={email} onChange={event => setEmail(event.target.value)} className="mt-1.5 w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 dark:border-slate-700 dark:bg-slate-950" /></label>
        <label className="block text-sm font-medium">Senha<input type="password" autoComplete="current-password" required value={password} onChange={event => setPassword(event.target.value)} className="mt-1.5 w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 dark:border-slate-700 dark:bg-slate-950" /></label>
        <button disabled={submitting} className="w-full rounded-lg bg-indigo-600 px-4 py-2.5 font-semibold text-white hover:bg-indigo-700 disabled:opacity-60">{submitting ? 'Verificando…' : 'Entrar'}</button>
      </form>}
      {message && <p role="alert" className="mt-4 rounded-lg bg-red-50 p-3 text-sm text-red-800 dark:bg-red-950/40 dark:text-red-200">{message}</p>}
    </section>
  </main>;
}
