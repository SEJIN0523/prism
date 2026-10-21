// No install prompt interception: Samsung Internet / Chrome expose their own menu.
if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker
      .register(new URL("./sw.js", import.meta.url), {
        scope: "./",
        updateViaCache: "none",
      })
      .catch((error) => {
        // Installation support is optional; the existing web app remains usable.
        console.warn("PRISM 설치 지원을 등록하지 못했습니다.", error);
      });
  });
}
