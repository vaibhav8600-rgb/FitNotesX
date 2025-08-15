import { registerSW } from 'virtual:pwa-register';

export function initSW() {
  const updateSW = registerSW({
    onNeedRefresh() {
      // Show a simple confirm; could be upgraded to a toast/modal
      if (confirm('New version available. Reload now?')) {
        updateSW(true);
      }
    },
    onOfflineReady() {
      // Optional: notify offline ready
      // console.log('App ready to work offline');
    },
  });
}
