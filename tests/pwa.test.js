import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import vm from "node:vm";
const manifest = JSON.parse(
  await readFile(new URL("../manifest.webmanifest", import.meta.url), "utf8"),
);
test("PRISM 설치 ID·시작 URL·scope·standalone과 PNG 크기", async () => {
  assert.equal(manifest.name, "PRISM");
  assert.equal(manifest.short_name, "PRISM");
  assert.equal(manifest.id, "/prism/");
  assert.equal(manifest.start_url, "/prism/");
  assert.equal(manifest.scope, "/prism/");
  assert.equal(manifest.display, "standalone");
  for (const size of [192, 512]) {
    const icon = manifest.icons.find((i) => i.sizes === `${size}x${size}`);
    assert.equal(icon.type, "image/png");
    assert.ok(icon.purpose.includes("any"));
    const png = await readFile(new URL("../" + icon.src, import.meta.url));
    assert.equal(png.subarray(0, 8).toString("hex"), "89504e470d0a1a0a");
    assert.equal(png.readUInt32BE(16), size);
    assert.equal(png.readUInt32BE(20), size);
  }
  const html = await readFile(
    new URL("../index.html", import.meta.url),
    "utf8",
  );
  assert.match(html, /rel="manifest" href="\.\/manifest.webmanifest"/);
  assert.match(html, /src="\.\/install.js"/);
});
test("서비스워커는 범위 내 GET만 network/no-store 전달, 캐시·업로드·다른 앱 간섭 없음", async () => {
  const handlers = {},
    calls = [];
  let skip = 0,
    claim = 0;
  const forbidden = new Proxy(
    {},
    {
      get() {
        throw Error("Cache/storage must never be accessed");
      },
    },
  );
  const self = {
    location: { origin: "https://sejin0523.github.io" },
    registration: { scope: "https://sejin0523.github.io/prism/" },
    addEventListener: (name, fn) => (handlers[name] = fn),
    skipWaiting: () => skip++,
    clients: { claim: () => claim++ },
  };
  vm.runInNewContext(
    await readFile(new URL("../sw.js", import.meta.url), "utf8"),
    {
      self,
      URL,
      caches: forbidden,
      localStorage: forbidden,
      fetch: async (request, options) => {
        calls.push({ request, options });
        return "network";
      },
    },
  );
  handlers.install();
  handlers.activate({ waitUntil: () => {} });
  assert.equal(skip, 1);
  assert.equal(claim, 1);
  for (const path of [
    "",
    "market.json",
    "future/analysis.json",
    "index.html",
  ]) {
    let reply;
    const request = { method: "GET", url: self.registration.scope + path };
    handlers.fetch({ request, respondWith: (p) => (reply = p) });
    assert.equal(await reply, "network");
    assert.equal(calls.at(-1).options.cache, "no-store");
    assert.equal(calls.at(-1).request, request);
  }
  for (const request of [
    { method: "POST", url: self.registration.scope + "records" },
    { method: "GET", url: "https://example.com/market.json" },
    { method: "GET", url: "https://sejin0523.github.io/close-score/" },
    { method: "GET", url: "https://sejin0523.github.io/prism-other/" },
  ])
    handlers.fetch({
      request,
      respondWith: () => assert.fail("out of scope or POST intercepted"),
    });
  assert.equal(calls.length, 4);
});
