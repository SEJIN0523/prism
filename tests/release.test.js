import test from "node:test";
import assert from "node:assert/strict";
import {
  mkdtemp,
  writeFile,
  readFile,
  mkdir,
  rm,
  readdir,
} from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { buildPages } from "../scripts/build-pages.mjs";
import { defaults, STORAGE_KEY, RECOVERY_KEY } from "../config/app.js";
import {
  save,
  restore,
  currentRaw,
  restoreSafely,
  recoveryBackup,
  resetPersonalRecords,
} from "../services/storage.js";
function store() {
  const values = new Map([["claude-test", "unchanged"]]);
  globalThis.localStorage = {
    getItem: (k) => values.get(k) ?? null,
    setItem: (k, v) => values.set(k, v),
    removeItem: (k) => values.delete(k),
  };
  return values;
}
test("복원 전 원문 보존 및 복구 파일 왕복, 기존 Claude 키 유지", () => {
  const values = store();
  const old = defaults();
  old.initialCash = 1234;
  save(old);
  const expected = currentRaw();
  const next = defaults();
  next.initialCash = 9000;
  restoreSafely(next, expected);
  assert.equal(currentRaw(), JSON.stringify(next));
  assert.equal(recoveryBackup(), expected);
  assert.deepEqual(restore(recoveryBackup()), old);
  assert.equal(values.get("claude-test"), "unchanged");
});
test("잘못된 복원·다른 탭 변경은 기존 기록과 복구 기록을 유지", () => {
  const values = store();
  save(defaults());
  const old = currentRaw();
  assert.throws(() => restoreSafely({}, old));
  assert.equal(values.has(RECOVERY_KEY), false);
  assert.throws(() => restoreSafely(defaults(), "outdated"), /다른 탭/);
  assert.equal(currentRaw(), old);
});
test("안전 보관 실패 시 원본 유지, 최종 저장 실패 시 원본 및 복구본 유지", () => {
  const values = store();
  save(defaults());
  const old = currentRaw();
  for (const failureKey of [RECOVERY_KEY, STORAGE_KEY]) {
    localStorage.setItem = (k, v) => {
      if (k === failureKey) throw Error("QuotaExceededError");
      values.set(k, v);
    };
    assert.throws(
      () => restoreSafely({ ...defaults(), initialCash: 100 }, old),
      /Quota/,
    );
    assert.equal(currentRaw(), old);
  }
  assert.equal(recoveryBackup(), old);
});
test("손상된 기존 원문도 복원 전에 보존, 초기화는 PRISM 두 키만 삭제·초기화", () => {
  const values = store();
  values.set(STORAGE_KEY, "damaged-json");
  restoreSafely(defaults(), "damaged-json");
  assert.equal(recoveryBackup(), "damaged-json");
  resetPersonalRecords();
  assert.equal(currentRaw(), JSON.stringify(defaults()));
  assert.equal(values.has(RECOVERY_KEY), false);
  assert.equal(values.get("claude-test"), "unchanged");
});
test("독립 Pages 루트 패키징, 실행 파일만 포함, 재실행 시 잔여 파일 제거", async () => {
  const dir = await mkdtemp(join(tmpdir(), "prism-build-"));
  try {
    await buildPages(dir);
    await writeFile(join(dir, "stale.json"), "not public");
    await buildPages(dir);
    const files = (await readdir(dir, { recursive: true })).map(f=>f.replaceAll("\\", "/"));
    assert.ok(files.includes("index.html"));
    assert.equal(
      await readFile(join(dir, "index.html"), "utf8"),
      await readFile(new URL("../index.html", import.meta.url), "utf8"),
    );
    assert.ok(
      !files.some((f) =>
        /tests|backup|stale|README|package|stage-pages/.test(f),
      ),
    );
    assert.equal(files.filter((f) => f.endsWith(".js")).length, 9);
    assert.ok(!files.includes("prism"));
    assert.deepEqual(await readFile(join(dir,"data/prism-market.json")), await readFile(new URL("../data/prism-market.json",import.meta.url)));
    for (const asset of [
      "manifest.webmanifest",
      "install.js",
      "sw.js",
      "icons/icon-192.png",
      "icons/icon-512.png",
    ])
      assert.ok(files.includes(asset));
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});
test("소스 디렉터리를 빌드 출력으로 덮어쓰지 않음", async () => {
  await assert.rejects(
    buildPages(fileURLToPath(new URL("..", import.meta.url))),
    /source directory/,
  );
});
