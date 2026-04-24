/**
 * Client-side W3C Trace Context helpers. Stores the most recent
 * `traceparent` seen on a server response and injects it into the next
 * outbound request as a child span. Enables log + error correlation
 * between client actions and the backend work they triggered.
 */

const KEY = "__traceparent__";

let lastTraceparent: string | null = null;

export function setTraceparent(header: string | null): void {
  lastTraceparent = header;
  if (typeof window !== "undefined" && window.sessionStorage) {
    if (header) window.sessionStorage.setItem(KEY, header);
    else window.sessionStorage.removeItem(KEY);
  }
}

export function getTraceparent(): string | null {
  if (lastTraceparent) return lastTraceparent;
  if (typeof window !== "undefined" && window.sessionStorage) {
    lastTraceparent = window.sessionStorage.getItem(KEY);
  }
  return lastTraceparent;
}
