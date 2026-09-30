export const CALENDAR_MIN_ZOOM = 1;
export const CALENDAR_MAX_ZOOM = 4;
const PAGE_PADDING = 12;

export function clampCalendarZoom(zoom: number): number {
  return Math.max(CALENDAR_MIN_ZOOM, Math.min(CALENDAR_MAX_ZOOM, zoom));
}

export function calendarImageLayout(viewportWidth: number, aspectRatio: number, zoom: number) {
  const width = Math.max(1, Math.min(1100, viewportWidth - PAGE_PADDING * 2)) * clampCalendarZoom(zoom);
  const height = width * aspectRatio;
  const contentWidth = Math.max(viewportWidth, width + PAGE_PADDING * 2);
  return { width, height, contentWidth, contentHeight: height + PAGE_PADDING * 2, left: (contentWidth - width) / 2, top: PAGE_PADDING };
}

// Keep the same point of the image under the cursor or between the fingers.
export function calendarZoomScroll({ viewportWidth, aspectRatio, fromZoom, toZoom, scrollLeft, scrollTop, fromAnchor, toAnchor = fromAnchor }: {
  viewportWidth: number; aspectRatio: number; fromZoom: number; toZoom: number;
  scrollLeft: number; scrollTop: number;
  fromAnchor: { x: number; y: number }; toAnchor?: { x: number; y: number };
}) {
  const before = calendarImageLayout(viewportWidth, aspectRatio, fromZoom);
  const after = calendarImageLayout(viewportWidth, aspectRatio, toZoom);
  const ratio = after.width / before.width;
  return {
    left: after.left + (scrollLeft + fromAnchor.x - before.left) * ratio - toAnchor.x,
    top: after.top + (scrollTop + fromAnchor.y - before.top) * ratio - toAnchor.y,
  };
}
