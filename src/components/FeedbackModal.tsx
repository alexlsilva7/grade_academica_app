import { useEffect, useRef, useState, type FormEvent } from 'react';
import { CheckCircle2, Loader2, MessageSquare, X } from 'lucide-react';
import { FEEDBACK_CATEGORIES, sanitizeFeedbackMetadata, validateFeedbackInput, type FeedbackCategory, type FeedbackMetadata } from '../utils/feedback';

function browserName(userAgent: string) {
  if (/Edg\//.test(userAgent)) return 'Edge';
  if (/OPR\//.test(userAgent)) return 'Opera';
  if (/Firefox|FxiOS/.test(userAgent)) return 'Firefox';
  if (/Chrome|CriOS/.test(userAgent)) return 'Chrome';
  if (/Safari/.test(userAgent)) return 'Safari';
  return 'Outro';
}

export function FeedbackModal({ context, onClose }: { context: FeedbackMetadata; onClose: () => void }) {
  const dialog = useRef<HTMLDialogElement>(null);
  const submissionId = useRef(crypto.randomUUID());
  const lastAttempt = useRef('');
  const sending = useRef(false);
  const [category, setCategory] = useState<FeedbackCategory>('suggestion');
  const [message, setMessage] = useState('');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [website, setWebsite] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [metadata] = useState(() => sanitizeFeedbackMetadata({ ...context,
    browser: browserName(navigator.userAgent),
    device: /Mobi|iPhone|Android.*Mobile/i.test(navigator.userAgent) ? 'Celular' : /iPad|Tablet|Android/i.test(navigator.userAgent) ? 'Tablet' : 'Computador',
    viewport: `${window.innerWidth} × ${window.innerHeight}`, version: __APP_VERSION__,
  }));
  useEffect(() => {
    const element = dialog.current;
    element?.showModal();
    return () => element?.close();
  }, []);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (sending.current) return;
    setError('');
    const signature = JSON.stringify({ category, message, name, email, metadata });
    if (lastAttempt.current && lastAttempt.current !== signature) submissionId.current = crypto.randomUUID();
    let input;
    try { input = validateFeedbackInput({ submissionId: submissionId.current, category, message, name, email, metadata }); }
    catch (error) { setError((error as Error).message); return; }
    sending.current = true;
    lastAttempt.current = signature;
    setIsSending(true);
    try {
      const response = await fetch('/api/feedback', { method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...input, website }), signal: AbortSignal.timeout(20_000) });
      const data = await response.json();
      if (!response.ok || !data.received) throw new Error(data.error || 'Não foi possível enviar. Tente novamente.');
      setSuccess(true);
    } catch (error) {
      setError(error instanceof Error && error.name !== 'TimeoutError' && error.name !== 'SyntaxError'
        ? error.message === 'Failed to fetch' ? 'Falha de conexão. Sua mensagem foi mantida; tente novamente.' : error.message
        : 'Não foi possível confirmar o envio. Sua mensagem foi mantida; tente novamente.');
    } finally { sending.current = false; setIsSending(false); }
  };

  return <dialog ref={dialog} aria-labelledby="feedback-title" aria-describedby="feedback-description"
    onCancel={event => { event.preventDefault(); if (!sending.current) onClose(); }}
    className="fixed inset-0 m-auto max-h-[90dvh] w-[calc(100%-2rem)] max-w-lg overflow-y-auto rounded-2xl border border-slate-200 bg-white p-6 text-slate-800 shadow-2xl backdrop:bg-slate-950/60 backdrop:backdrop-blur-sm dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100">
    <div className="flex items-start justify-between gap-3">
      <h2 id="feedback-title" className="flex items-center gap-2 text-lg font-bold"><MessageSquare size={20} className="text-indigo-500" aria-hidden="true" />Enviar feedback</h2>
      <button type="button" onClick={onClose} disabled={isSending} aria-label="Fechar formulário de feedback" className="rounded-lg p-2 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-40"><X size={20} /></button>
    </div>
    <p id="feedback-description" className="mt-2 text-sm text-slate-500 dark:text-slate-400">Ajude a melhorar o My UFAPE. Sua mensagem ficará disponível apenas para a administração.</p>
    {success ? <div className="mt-8 space-y-4 text-center" role="status">
      <CheckCircle2 className="mx-auto text-emerald-500" size={40} aria-hidden="true" />
      <p className="font-semibold">Feedback recebido. Obrigado!</p>
      <p className="text-sm text-slate-500 dark:text-slate-400">Sua mensagem foi salva para análise.</p>
      <button type="button" autoFocus onClick={onClose} className="admin-primary min-h-11">Concluir</button>
    </div> : <form onSubmit={submit} className="mt-5 space-y-4">
      <fieldset disabled={isSending} className="space-y-4 disabled:opacity-60">
        <label className="block text-sm font-medium" htmlFor="feedback-category">Tipo
          <select id="feedback-category" autoFocus className="admin-input mt-1" value={category} onChange={event => setCategory(event.target.value as FeedbackCategory)}>
            {Object.entries(FEEDBACK_CATEGORIES).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
          </select>
        </label>
        <label className="block text-sm font-medium" htmlFor="feedback-message">Mensagem
          <textarea id="feedback-message" required minLength={10} maxLength={3000} rows={5} className="admin-input mt-1 resize-y" placeholder="Conte sua ideia ou descreva o problema…" value={message} onChange={event => setMessage(event.target.value)} aria-describedby="feedback-message-help" />
        </label>
        <p id="feedback-message-help" className="-mt-2 text-xs text-slate-500 dark:text-slate-400">De 10 a 3.000 caracteres · {message.length}/3.000</p>
        <div className="grid gap-3 sm:grid-cols-2">
          <label htmlFor="feedback-name" className="text-sm">Nome <span className="text-xs text-slate-500">(opcional)</span><input id="feedback-name" autoComplete="name" maxLength={100} className="admin-input mt-1" value={name} onChange={event => setName(event.target.value)} /></label>
          <label htmlFor="feedback-email" className="text-sm">E-mail <span className="text-xs text-slate-500">(opcional)</span><input id="feedback-email" type="email" autoComplete="email" maxLength={254} className="admin-input mt-1" value={email} onChange={event => setEmail(event.target.value)} /></label>
        </div>
        <p className="text-xs text-slate-500 dark:text-slate-400">Preencha seu contato se quiser receber uma resposta. Você também pode enviar sem se identificar.</p>
        <div className="absolute -left-[10000px]" aria-hidden="true"><label htmlFor="feedback-website">Website<input id="feedback-website" tabIndex={-1} autoComplete="off" value={website} onChange={event => setWebsite(event.target.value)} /></label></div>
      </fieldset>
      {error && <p role="alert" className="rounded-lg bg-rose-50 p-3 text-sm text-rose-700 dark:bg-rose-950/40 dark:text-rose-300">{error}</p>}
      <button type="submit" disabled={isSending} className="admin-primary flex min-h-11 w-full items-center justify-center gap-2">{isSending && <Loader2 size={16} className="animate-spin" aria-hidden="true" />}{isSending ? 'Enviando…' : 'Enviar feedback'}</button>
    </form>}
  </dialog>;
}
