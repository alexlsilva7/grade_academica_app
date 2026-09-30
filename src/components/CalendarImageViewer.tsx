import { useEffect, useLayoutEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from 'react';
import { ChevronLeft, ChevronRight, LoaderCircle, Minus, Plus, RotateCcw } from 'lucide-react';
import { academicCalendarImages } from '../data/academicCalendarImages';
import { CALENDAR_MAX_ZOOM, CALENDAR_MIN_ZOOM, calendarImageLayout, calendarZoomScroll, clampCalendarZoom } from '../utils/calendarImageZoom';

type Point = { x: number; y: number };
type Gesture = { zoom: number; distance: number; anchor: Point; left: number; top: number };
const distance = (a: Point, b: Point) => Math.hypot(a.x - b.x, a.y - b.y);
const midpoint = (a: Point, b: Point): Point => ({ x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 });

export function CalendarImageViewer({ page, onPageChange }: { page: number; onPageChange: (page: number) => void }) {
  const viewportRef = useRef<HTMLDivElement>(null);
  const [viewportWidth, setViewportWidth] = useState(0);
  const [zoom, setZoom] = useState(1);
  const zoomRef = useRef(zoom);
  const pendingScroll = useRef<{ left: number; top: number } | null>(null);
  const pointers = useRef(new Map<number, Point>());
  const gesture = useRef<Gesture | null>(null);
  const [dragging, setDragging] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const [imageStatus, setImageStatus] = useState<{ key: string; state: 'ready' | 'error' } | null>(null);
  const visiblePage = Math.max(1, Math.min(page, academicCalendarImages.length));
  const image = academicCalendarImages[visiblePage - 1];
  const aspectRatio = image.height / image.width;
  const layout = calendarImageLayout(viewportWidth, aspectRatio, zoom);
  const imageKey = `${visiblePage}-${attempt}`;
  const state = imageStatus?.key === imageKey ? imageStatus.state : 'loading';

  useEffect(() => {
    const viewport = viewportRef.current;
    if (!viewport) return;
    const resize = () => setViewportWidth(viewport.clientWidth);
    resize();
    const observer = new ResizeObserver(resize);
    observer.observe(viewport);
    return () => observer.disconnect();
  }, []);

  useLayoutEffect(() => {
    const viewport = viewportRef.current;
    if (viewport && pendingScroll.current) {
      viewport.scrollTo(pendingScroll.current.left, pendingScroll.current.top);
      pendingScroll.current = null;
    }
  }, [zoom]);

  useLayoutEffect(() => {
    // Keep the chosen zoom while navigating, starting at the top of each page.
    viewportRef.current?.scrollTo(0, 0);
    pointers.current.clear();
    gesture.current = null;
    setDragging(false);
  }, [visiblePage]);

  const applyZoom = (requestedZoom: number, anchor?: Point, start?: Gesture) => {
    const viewport = viewportRef.current;
    if (!viewport) return;
    const target = clampCalendarZoom(requestedZoom);
    const point = anchor ?? { x: viewport.clientWidth / 2, y: viewport.clientHeight / 2 };
    const scroll = calendarZoomScroll({
      viewportWidth: viewport.clientWidth, aspectRatio,
      fromZoom: start?.zoom ?? zoomRef.current, toZoom: target,
      scrollLeft: start?.left ?? viewport.scrollLeft, scrollTop: start?.top ?? viewport.scrollTop,
      fromAnchor: start?.anchor ?? point, toAnchor: point,
    });
    if (target === zoomRef.current) {
      if (pendingScroll.current) pendingScroll.current = scroll;
      viewport.scrollTo(scroll.left, scroll.top);
    }
    else {
      pendingScroll.current = scroll;
      zoomRef.current = target;
      setZoom(target);
    }
  };
  const applyZoomRef = useRef(applyZoom);
  useLayoutEffect(() => { applyZoomRef.current = applyZoom; });

  useEffect(() => {
    const viewport = viewportRef.current;
    if (!viewport) return;
    const wheel = (event: WheelEvent) => {
      if (!event.ctrlKey && !event.metaKey) return;
      event.preventDefault();
      const rect = viewport.getBoundingClientRect();
      applyZoomRef.current(zoomRef.current * Math.exp(-event.deltaY * 0.01), { x: event.clientX - rect.left, y: event.clientY - rect.top });
    };
    viewport.addEventListener('wheel', wheel, { passive: false });
    return () => viewport.removeEventListener('wheel', wheel);
  }, []);

  const pointFor = (event: ReactPointerEvent<HTMLDivElement>): Point => {
    const rect = event.currentTarget.getBoundingClientRect();
    return { x: event.clientX - rect.left, y: event.clientY - rect.top };
  };
  const startPinch = () => {
    const viewport = viewportRef.current;
    const [a, b] = Array.from(pointers.current.values());
    if (!viewport || !a || !b) return;
    gesture.current = { zoom: zoomRef.current, distance: Math.max(1, distance(a, b)), anchor: midpoint(a, b), left: viewport.scrollLeft, top: viewport.scrollTop };
  };
  const pointerDown = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (event.pointerType === 'mouse' && event.button !== 0) return;
    if (state !== 'ready') return;
    event.currentTarget.setPointerCapture(event.pointerId);
    pointers.current.set(event.pointerId, pointFor(event));
    setDragging(true);
    if (pointers.current.size === 2) startPinch();
  };
  const pointerMove = (event: ReactPointerEvent<HTMLDivElement>) => {
    const previous = pointers.current.get(event.pointerId);
    if (!previous) return;
    const point = pointFor(event);
    pointers.current.set(event.pointerId, point);
    if (pointers.current.size >= 2) {
      const [a, b] = Array.from(pointers.current.values());
      const start = gesture.current;
      if (start) applyZoom(start.zoom * distance(a, b) / start.distance, midpoint(a, b), start);
    } else {
      event.currentTarget.scrollLeft += previous.x - point.x;
      event.currentTarget.scrollTop += previous.y - point.y;
    }
  };
  const pointerEnd = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (!pointers.current.has(event.pointerId)) return;
    pointers.current.delete(event.pointerId);
    if (pointers.current.size >= 2) startPinch();
    else gesture.current = null;
    if (pointers.current.size === 0) setDragging(false);
  };
  const fitToWidth = () => {
    pendingScroll.current = null;
    zoomRef.current = 1;
    setZoom(1);
    viewportRef.current?.scrollTo(0, 0);
  };
  const controlClass = 'inline-flex items-center justify-center h-10 w-10 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-40 disabled:cursor-not-allowed';

  return <section aria-label="Leitor do calendário acadêmico" className="flex flex-col flex-1 min-h-0 overflow-hidden rounded-xl border border-slate-200 dark:border-slate-800">
    <div className="flex flex-wrap items-center justify-between gap-2 p-2 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 shrink-0">
      <div className="flex items-center gap-1">
        <button type="button" aria-label="Página anterior" className={controlClass} disabled={visiblePage <= 1} onClick={() => onPageChange(visiblePage - 1)}><ChevronLeft size={18} /></button>
        <select aria-label="Página do calendário" value={visiblePage} onChange={event => onPageChange(Number(event.target.value))} className="h-10 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-2">
          {academicCalendarImages.map(entry => <option key={entry.page} value={entry.page}>{entry.page}</option>)}
        </select>
        <span className="text-sm px-1">/ {academicCalendarImages.length}</span>
        <button type="button" aria-label="Próxima página" className={controlClass} disabled={visiblePage >= academicCalendarImages.length} onClick={() => onPageChange(visiblePage + 1)}><ChevronRight size={18} /></button>
      </div>
      <div className="flex items-center gap-1">
        <button type="button" aria-label="Diminuir zoom" className={controlClass} disabled={zoom <= CALENDAR_MIN_ZOOM} onClick={() => applyZoom(zoomRef.current - 0.25)}><Minus size={18} /></button>
        <output aria-label="Zoom" className="text-sm tabular-nums w-11 text-center">{Math.round(zoom * 100)}%</output>
        <button type="button" aria-label="Aumentar zoom" className={controlClass} disabled={zoom >= CALENDAR_MAX_ZOOM} onClick={() => applyZoom(zoomRef.current + 0.25)}><Plus size={18} /></button>
        <button type="button" aria-label="Ajustar à largura" title="Ajustar à largura" className={controlClass} onClick={fitToWidth}><RotateCcw size={18} /></button>
      </div>
    </div>
    <div ref={viewportRef} tabIndex={0} aria-label="Conteúdo do calendário" aria-busy={state === 'loading'}
      onPointerDown={pointerDown} onPointerMove={pointerMove} onPointerUp={pointerEnd} onPointerCancel={pointerEnd} onLostPointerCapture={pointerEnd}
      onDoubleClick={event => { const rect = event.currentTarget.getBoundingClientRect(); applyZoom(zoomRef.current > 1 ? 1 : 2, { x: event.clientX - rect.left, y: event.clientY - rect.top }); }}
      onKeyDown={event => {
        if (event.key === '+' || event.key === '=' || event.key === '-') {
          event.preventDefault(); applyZoom(zoomRef.current + (event.key === '-' ? -0.25 : 0.25));
        } else if (event.key === '0') { event.preventDefault(); fitToWidth(); }
      }}
      className={`relative flex-1 min-h-0 overflow-auto overscroll-contain bg-slate-100 dark:bg-slate-950 select-none ${dragging ? 'cursor-grabbing' : 'cursor-grab'}`}
      style={{ touchAction: 'none' }}>
      {state === 'loading' && <p role="status" className="absolute inset-x-0 top-8 flex items-center justify-center gap-2"><LoaderCircle size={18} className="animate-spin" />Carregando página {visiblePage}…</p>}
      {state === 'error' && <div role="alert" className="p-6 text-center space-y-3">
        <p>Não foi possível carregar esta página. Verifique sua conexão e tente novamente.</p>
        <button type="button" className="admin-secondary" onClick={() => setAttempt(current => current + 1)}>Tentar novamente</button>
      </div>}
      {viewportWidth > 0 && <div style={{ width: layout.contentWidth, height: layout.contentHeight, position: 'relative', display: state === 'error' ? 'none' : undefined }}>
        <img key={imageKey} src={`${image.sources[0].path}${attempt ? `?retry=${attempt}` : ''}`}
          srcSet={image.sources.map(source => `${source.path}${attempt ? `?retry=${attempt}` : ''} ${source.width}w`).join(', ')} sizes={`${Math.ceil(layout.width)}px`}
          width={image.width} height={image.height} alt={`Página ${visiblePage} do calendário acadêmico da UFAPE`}
          draggable={false} decoding="async" fetchPriority="high"
          onLoad={() => setImageStatus({ key: imageKey, state: 'ready' })} onError={() => setImageStatus({ key: imageKey, state: 'error' })}
          className="absolute max-w-none bg-white shadow-sm"
          style={{ width: layout.width, height: layout.height, left: layout.left, top: layout.top, visibility: state === 'ready' ? 'visible' : 'hidden' }} />
      </div>}
    </div>
    <p className="text-[11px] text-center px-2 py-1 bg-white dark:bg-slate-900 text-slate-500 shrink-0">Arraste para mover · use dois dedos ou os botões para ampliar</p>
  </section>;
}
