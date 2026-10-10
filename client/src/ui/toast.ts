/**
 * toast.ts — transient on-screen notifications.
 */
export type ToastKind = 'info' | 'success' | 'warn' | 'error';

let host: HTMLElement | null = null;

function getHost(): HTMLElement {
  if (host && document.body.contains(host)) return host;
  host = document.getElementById('toast');
  if (!host) {
    host = document.createElement('div');
    host.id = 'toast';
    host.className = 'toast';
    document.body.appendChild(host);
  }
  return host;
}

/** Show a message for `durationMs`, then fade it out. */
export function show(message: string, kind: ToastKind = 'info', durationMs = 3200): void {
  const el = getHost();
  const item = document.createElement('div');
  item.className = `toast-item toast-${kind}`;
  item.textContent = message;
  el.appendChild(item);

  requestAnimationFrame(() => item.classList.add('toast-visible'));

  window.setTimeout(() => {
    item.classList.remove('toast-visible');
    window.setTimeout(() => item.remove(), 300);
  }, durationMs);
}

export const info = (m: string): void => show(m, 'info');
export const success = (m: string): void => show(m, 'success');
export const warn = (m: string): void => show(m, 'warn');
export const error = (m: string): void => show(m, 'error', 5000);
