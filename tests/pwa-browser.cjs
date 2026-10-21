const { chromium } = require(process.env.PRISM_PLAYWRIGHT_PATH || "playwright");
const assert = require("node:assert/strict");
const base = process.env.PRISM_BASE_URL || "http://127.0.0.1:4180/prism/";
(async () => {
  const fs = require("node:fs"),
    os = require("node:os"),
    path = require("node:path");
  const profile = fs.mkdtempSync(path.join(os.tmpdir(), "prism-install-"));
  const context = await chromium.launchPersistentContext(profile, {
    executablePath: "/usr/bin/chromium",
    headless: true,
    args: ["--no-sandbox"],
    viewport: { width: 390, height: 844 },
  });
  const p = await context.newPage();
  const errors = [],
    uploads = [];
  p.on("pageerror", (e) => errors.push(e.message));
  context.on("request", (r) => {
    if (r.method() !== "GET") uploads.push(r.url());
  });
  await p.goto(base + "#settings");
  await p.waitForSelector("#target");
  const registration = await p.evaluate(async () => {
    const r = await navigator.serviceWorker.ready;
    return { scope: r.scope, script: r.active.scriptURL };
  });
  assert.equal(registration.scope, base);
  assert.equal(registration.script, base + "sw.js");
  await p.reload();
  await p.waitForFunction(() => !!navigator.serviceWorker.controller);
  const cdp = await context.newCDPSession(p);
  await cdp.send("Page.enable");
  const m = await cdp.send("Page.getAppManifest");
  assert.deepEqual(m.errors, []);
  const manifest = JSON.parse(m.data);
  assert.equal(new URL(manifest.start_url, base).href, base);
  assert.equal(manifest.display, "standalone");
  const install = await cdp.send("Page.getInstallabilityErrors");
  assert.deepEqual(install.installabilityErrors, []);
  for (const size of [192, 512]) {
    const dimensions = await p.evaluate(async (size) => {
      const img = new Image();
      img.src = `./icons/icon-${size}.png`;
      await img.decode();
      return [img.naturalWidth, img.naturalHeight];
    }, size);
    assert.deepEqual(dimensions, [size, size]);
  }
  await p.locator("[data-action=capital]").click();
  await p.locator("[name=capital]").fill("1234");
  await p.locator("dialog [type=submit]").click();
  const saved = await p.evaluate(() => localStorage.getItem("prism-v1-state"));
  await p.evaluate(async () => {
    await fetch("./manifest.webmanifest");
    await fetch("./future-market.json").catch(() => {});
  });
  assert.deepEqual(await p.evaluate(() => caches.keys()), []);
  assert.deepEqual(errors, []);
  assert.deepEqual(uploads, []);
  await context.setOffline(true);
  const networkFailed = await p.evaluate(async () => {
    try {
      await fetch("./index.html");
      return false;
    } catch {
      return true;
    }
  });
  assert.equal(networkFailed, true);
  assert.equal(
    await p.evaluate(() => localStorage.getItem("prism-v1-state")),
    saved,
  );
  await context.setOffline(false);
  await p.reload();
  await p.waitForSelector("#target");
  assert.equal(
    await p.evaluate(() => localStorage.getItem("prism-v1-state")),
    saved,
  );
  await p.goto(new URL("../close-score/", base).href);
  assert.equal(
    await p.evaluate(() => navigator.serviceWorker.controller),
    null,
  );
  console.log(
    "PASS: Chromium manifest/installability errors 0; scope/icons/network-only/empty caches/offline failure/persistent records/no uploads/no Claude control",
  );
  await context.close();
  fs.rmSync(profile, { recursive: true, force: true });
})();
