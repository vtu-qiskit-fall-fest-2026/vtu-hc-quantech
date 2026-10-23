// QuantaLearn AI - PWA & Service Worker Registration
export function registerServiceWorker(onSuccess) {
  if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
    if (!import.meta.env.PROD) {
      // In development mode, unregister any active service worker and clear caches to prevent stale modules
      navigator.serviceWorker.getRegistrations().then((registrations) => {
        for (const reg of registrations) {
          reg.unregister();
        }
      });
      if ('caches' in window) {
        caches.keys().then((keys) => {
          for (const key of keys) {
            caches.delete(key);
          }
        });
      }
      return;
    }

    window.addEventListener('load', () => {
      navigator.serviceWorker
        .register('/sw.js')
        .then((registration) => {
          console.log('[PWA] Service Worker active with scope:', registration.scope);
          if (onSuccess) onSuccess(registration);
        })
        .catch((error) => {
          console.warn('[PWA] Service Worker registration failed:', error);
        });
    });
  }
}
