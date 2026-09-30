import { registerSW } from 'virtual:pwa-register';

/** Registers the service worker; updates are applied automatically on next load. */
export function setupPwa() {
  if (!('serviceWorker' in navigator)) return;
  registerSW({ immediate: true });
}

let deferredPrompt: (Event & { prompt: () => Promise<void>; userChoice: Promise<{ outcome: string }> }) | null = null;
const listeners = new Set<() => void>();

window.addEventListener('beforeinstallprompt', (e) => {
  e.preventDefault();
  deferredPrompt = e as typeof deferredPrompt;
  listeners.forEach((l) => l());
});
window.addEventListener('appinstalled', () => {
  deferredPrompt = null;
  listeners.forEach((l) => l());
});

export function canPromptInstall(): boolean {
  return deferredPrompt != null;
}

export async function promptInstall(): Promise<boolean> {
  if (!deferredPrompt) return false;
  await deferredPrompt.prompt();
  const choice = await deferredPrompt.userChoice;
  deferredPrompt = null;
  listeners.forEach((l) => l());
  return choice.outcome === 'accepted';
}

export function onInstallChange(fn: () => void): () => void {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

export function isStandalone(): boolean {
  return window.matchMedia('(display-mode: standalone)').matches || (navigator as unknown as { standalone?: boolean }).standalone === true;
}

export function isIos(): boolean {
  return /iphone|ipad|ipod/i.test(navigator.userAgent);
}
