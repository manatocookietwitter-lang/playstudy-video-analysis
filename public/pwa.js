document.documentElement.setAttribute("data-pwa-boot", "started");
(() => {
  const rootMeta = document.querySelector('meta[name="playstudy-root"]')?.content || "/";
  const rootUrl = new URL(rootMeta, location.href);
  const standalone = () =>
    matchMedia("(display-mode: standalone)").matches ||
    matchMedia("(display-mode: fullscreen)").matches ||
    window.navigator.standalone === true;

  let installPrompt = null;
  let registration = null;
  let registrationError = null;

  const notify = () => {
    const status = window.playStudyPWA.status();
    document.documentElement.dataset.pwaMode = status.standalone ? "standalone" : "browser";
    document.documentElement.dataset.pwaInstall = status.canPrompt ? "ready" : "manual";
    document.documentElement.dataset.pwaWorker = status.serviceWorker || (status.serviceWorkerError ? "error" : "registering");
    window.dispatchEvent(new CustomEvent("playstudy-pwa-change", { detail: status }));
  };

  window.addEventListener("beforeinstallprompt", (event) => {
    event.preventDefault();
    installPrompt = event;
    notify();
  });

  window.addEventListener("appinstalled", () => {
    installPrompt = null;
    notify();
  });

  window.playStudyPWA = {
    status() {
      return {
        standalone: standalone(),
        canPrompt: Boolean(installPrompt),
        serviceWorker: registration?.active?.state || registration?.installing?.state || null,
        serviceWorkerScope: registration?.scope || null,
        serviceWorkerError: registrationError ? String(registrationError) : null,
        isIOS: /iphone|ipad|ipod/i.test(navigator.userAgent),
        isSafari: /safari/i.test(navigator.userAgent) && !/crios|fxios|edgios|chrome|android/i.test(navigator.userAgent)
      };
    },
    async install() {
      if (standalone()) return { outcome: "installed" };
      if (!installPrompt) return { outcome: "manual" };
      const prompt = installPrompt;
      installPrompt = null;
      await prompt.prompt();
      const choice = await prompt.userChoice;
      notify();
      return choice;
    },
    async update() {
      await registration?.update();
    }
  };

  notify();
  const register = async () => {
    if (!("serviceWorker" in navigator) || !window.isSecureContext) {
      registrationError = new Error("Service Worker is unavailable in this browser");
      notify();
      return;
    }
    try {
      const workerUrl = new URL("sw.js", rootUrl);
      registration = await navigator.serviceWorker.register(workerUrl.pathname, {
        scope: rootUrl.pathname,
        updateViaCache: "none"
      });
      await registration.update();
      const trackWorker = (worker) => worker?.addEventListener("statechange", notify);
      registration.addEventListener("updatefound", () => {
        trackWorker(registration.installing);
        notify();
      });
      trackWorker(registration.installing);
      trackWorker(registration.waiting);
      trackWorker(registration.active);
    } catch (error) {
      registrationError = error;
    }
    notify();
  };

  register();
})();
