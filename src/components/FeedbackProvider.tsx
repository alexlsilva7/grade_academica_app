import { createContext, lazy, Suspense, useContext, useState, type ReactNode } from 'react';
import type { FeedbackMetadata } from '../utils/feedback';

const FeedbackModal = lazy(() => import('./FeedbackModal').then(module => ({ default: module.FeedbackModal })));
const FeedbackContext = createContext<(() => void) | null>(null);

export function useFeedback() {
  const open = useContext(FeedbackContext);
  if (!open) throw new Error('FeedbackProvider ausente.');
  return open;
}

export function FeedbackProvider({ children, context }: { children: ReactNode; context: FeedbackMetadata }) {
  const [snapshot, setSnapshot] = useState<FeedbackMetadata | null>(null);
  return <FeedbackContext.Provider value={() => setSnapshot({ ...context })}>
    {children}
    {snapshot && <Suspense fallback={<div role="status" className="fixed inset-0 z-[400] flex items-center justify-center bg-slate-950/60 text-white">Abrindo formulário…</div>}>
      <FeedbackModal context={snapshot} onClose={() => setSnapshot(null)} />
    </Suspense>}
  </FeedbackContext.Provider>;
}
