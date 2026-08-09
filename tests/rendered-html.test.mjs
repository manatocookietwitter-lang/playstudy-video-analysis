import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { promisify } from "node:util";

const root = new URL("../", import.meta.url);
const client = new URL("../dist/client/", import.meta.url);
const execFileAsync = promisify(execFile);

async function render(path = "/") {
  const workerUrl = new URL("../dist/server/index.js", import.meta.url);
  workerUrl.searchParams.set("test", `${process.pid}-${Date.now()}`);
  const { default: worker } = await import(workerUrl.href);

  return worker.fetch(
    new Request(`http://localhost${path}`, {
      headers: { accept: "text/html" },
    }),
    {
      ASSETS: {
        fetch: async () => new Response("Not found", { status: 404 }),
      },
    },
    {
      waitUntil() {},
      passThroughOnException() {},
    },
  );
}

test("opens PlayStudy directly at the site root", async () => {
  const response = await render();
  assert.equal(response.status, 200);
  assert.equal(response.headers.get("location"), null);
  assert.match(response.headers.get("content-type") ?? "", /^text\/html\b/i);

  const html = await response.text();
  assert.match(html, /id="app"/);
  assert.match(html, /href="\/playstudy\/styles\.css\?v=12"/);
  assert.match(html, /href="\/manifest\.webmanifest"/);
  assert.doesNotMatch(html, /\/playstudy\/index\.html[^"']*redirect/i);
});

test("ships an early root-scoped landscape PWA bootstrap", async () => {
  const [manifestText, rootWorker, legacyWorker, pwaBootstrap, appScript, styles, pageSource] = await Promise.all([
    readFile(new URL("manifest.webmanifest", client), "utf8"),
    readFile(new URL("sw.js", client), "utf8"),
    readFile(new URL("playstudy/sw.js", client), "utf8"),
    readFile(new URL("pwa.js", client), "utf8"),
    readFile(new URL("playstudy/app.js", client), "utf8"),
    readFile(new URL("playstudy/styles.css", client), "utf8"),
    readFile(new URL("app/page.tsx", root), "utf8"),
  ]);

  const manifest = JSON.parse(manifestText);
  assert.equal(manifest.id, "/playstudy");
  assert.equal(manifest.start_url, "/");
  assert.equal(manifest.scope, "/");
  assert.equal(manifest.orientation, "landscape");
  assert.equal(manifest.display, "standalone");
  assert.equal(manifest.prefer_related_applications, false);

  assert.deepEqual(manifest.display_override, ["standalone", "minimal-ui"]);
  assert.equal(manifest.icons.some((icon) => icon.sizes === "512x512" && icon.purpose === "maskable"), true);

  assert.match(pwaBootstrap, /beforeinstallprompt/);
  assert.match(pwaBootstrap, /navigator\.serviceWorker\.register/);
  assert.match(pwaBootstrap, /updateViaCache: "none"/);
  assert.match(pwaBootstrap, /playstudy-pwa-change/);
  assert.match(pwaBootstrap, /window\.isSecureContext/);
  assert.doesNotMatch(appScript, /navigator\.serviceWorker\.register/);
  assert.match(appScript, /id="install-app"/);
  assert.match(appScript, /id="install-guide"/);
  assert.match(appScript, /id="install-copy"/);
  assert.match(appScript, /\$\('#install-guide'\)\?\.showModal\(\)/);
  assert.doesNotMatch(appScript, /\(state\.canInstall\|\|iosInstallCandidate\(\)\)\?[^:]+:''/);
  assert.match(rootWorker, /playstudy-shell-/);
  assert.match(rootWorker, /v12/);
  assert.match(rootWorker, /const SCOPE_URL = new URL\(self\.registration\.scope\)/);
  assert.match(rootWorker, /cache\.addAll\(APP_SHELL/);
  assert.match(rootWorker, /navigationPreload\.enable/);
  assert.match(rootWorker, /name\.startsWith\("playstudy-"\)/);
  assert.match(rootWorker, /new Response\(/);
  assert.doesNotMatch(rootWorker, /share-target/);
  assert.match(legacyWorker, /registration\.unregister\(\)/);
  assert.match(legacyWorker, /client\.navigate\('\/'\)/);
  assert.match(pageSource, /useEffect\(\(\) =>/);
  assert.match(pageSource, /document\.createElement\("script"\)/);
  assert.match(pageSource, /loadScript\("\/pwa\.js\?v=12", "pwa"\)/);
  assert.match(pageSource, /loadScript\("\/playstudy\/app\.js\?v=12", "app"\)/);
  assert.match(pageSource, /href="\/playstudy\/styles\.css\?v=12"/);
  assert.doesNotMatch(appScript, /navigator\.share/);
  assert.match(appScript, /標準ブラウザで追加する/);
  assert.match(appScript, /requestVideoFrameCallback/);
  assert.match(appScript, /document\.body\.classList\.toggle\('player-active'/);
  assert.match(styles, /html\.player-active,body\.player-active/);
  assert.match(styles, /grid-template-rows:minmax\(0,1fr\) 50px 48px/);
  assert.doesNotMatch(pageSource, /redirect\(/);
  assert.doesNotMatch(pageSource, /<script[^>]+src=/);
});

test("builds a complete root GitHub Pages PWA", async () => {
  await execFileAsync(process.execPath, ["scripts/build-github-pages.mjs"], {
    cwd: root,
    env: {
      ...process.env,
      GITHUB_REPOSITORY: "manatocookietwitter-lang/manatocookietwitter-lang.github.io",
    },
  });

  const pages = new URL("../github-pages-dist/", import.meta.url);
  const [html, manifestText, pwaBootstrap, worker] = await Promise.all([
    readFile(new URL("index.html", pages), "utf8"),
    readFile(new URL("manifest.webmanifest", pages), "utf8"),
    readFile(new URL("pwa.js", pages), "utf8"),
    readFile(new URL("sw.js", pages), "utf8"),
  ]);
  const manifest = JSON.parse(manifestText);

  assert.equal(manifest.id, "/playstudy");
  assert.equal(manifest.start_url, "/");
  assert.equal(manifest.scope, "/");
  assert.match(html, /name="playstudy-root" content="\/"/);
  assert.match(html, /src="\/pwa\.js\?v=12"/);
  assert.match(html, /src="\/playstudy\/app\.js\?v=12"/);
  assert.match(pwaBootstrap, /serviceWorker\.register/);
  assert.match(worker, /playstudy-shell-/);
});
