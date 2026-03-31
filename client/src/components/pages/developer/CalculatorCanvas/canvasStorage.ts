const KEY = (templateId: string) =>
  `bow-mark:canvas:${templateId}:positions`;

export function loadPositions(
  templateId: string
): Record<string, { x: number; y: number }> | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(KEY(templateId));
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function savePositions(
  templateId: string,
  positions: Record<string, { x: number; y: number }>
): void {
  try {
    localStorage.setItem(KEY(templateId), JSON.stringify(positions));
  } catch {
    // Ignore storage errors (e.g., private browsing quota exceeded)
  }
}
