/**
 * PWA (Progressive Web App) utilities
 */

/**
 * Detects if the app is running as an installed PWA
 * @returns true if running as PWA, false otherwise
 */
export function isPWA(): boolean {
  // Check if running in standalone mode (iOS, Android)
  if (window.matchMedia("(display-mode: standalone)").matches) {
    return true;
  }

  // Check if running in standalone mode (iOS Safari)
  if (
    "standalone" in window.navigator &&
    // eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/consistent-type-assertions
    (window.navigator as any).standalone
  ) {
    return true;
  }

  return false;
}

/**
 * Shows the PWA install prompt dialog if available
 * Uses the pwa-install custom element if present on the page
 */
export function showPWAInstallPrompt(): void {
  const pwaInstall = document.getElementsByTagName("pwa-install")[0];
  localStorage.removeItem("pwa-hide-install");
  if (pwaInstall) {
    // @ts-expect-error - pwa-install is a custom element with showDialog method
    pwaInstall.showDialog();
  }
}
