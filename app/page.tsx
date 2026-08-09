"use client";

import { useEffect } from "react";

type PlayStudyWindow = Window & {
  __playStudyLoaded?: boolean;
};

function loadScript(src: string, marker: string) {
  return new Promise<void>((resolve, reject) => {
    const existing = document.querySelector<HTMLScriptElement>(`script[data-playstudy="${marker}"]`);
    if (existing) {
      if (existing.dataset.loaded === "true") resolve();
      else existing.addEventListener("load", () => resolve(), { once: true });
      return;
    }

    const script = document.createElement("script");
    script.src = src;
    script.dataset.playstudy = marker;
    script.addEventListener("load", () => {
      script.dataset.loaded = "true";
      resolve();
    }, { once: true });
    script.addEventListener("error", () => reject(new Error(`Failed to load ${src}`)), { once: true });
    document.head.appendChild(script);
  });
}

export default function Home() {
  useEffect(() => {
    const playStudyWindow = window as PlayStudyWindow;
    if (playStudyWindow.__playStudyLoaded) return;
    playStudyWindow.__playStudyLoaded = true;

    loadScript("/pwa.js?v=13", "pwa")
      .then(() => loadScript("/playstudy/app.js?v=13", "app"))
      .catch(() => {
        playStudyWindow.__playStudyLoaded = false;
      });
  }, []);

  return (
    <>
      {/* eslint-disable-next-line @next/next/no-css-tags */}
      <link
        rel="stylesheet"
        href="/playstudy/styles.css?v=13"
        precedence="default"
      />
      <div id="app" />
      <input id="video-file" type="file" accept="video/*" multiple hidden />
      <input id="relink-file-global" type="file" accept="video/*" hidden />
    </>
  );
}
