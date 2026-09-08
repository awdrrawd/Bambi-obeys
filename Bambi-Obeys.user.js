// ==UserScript==
// @name         Bambi Obeys
// @name:zh-CN   Bambi Obeys
// @namespace    BC-Hypnosis
// @version      1.6.0
// @description  Bambi Obeys trigger system for Bondage Club
// @description:zh-CN Bondage Club 的 Bambi Obeys 触发器系统
// @match        https://*.bondageprojects.elementfx.com/R*/*
// @match        https://*.bondage-europe.com/R*/*
// @match        https://*.bondageprojects.com/R*/*
// @match        https://*.bondage-asia.com/club/R*
// @grant        none
// @run-at       document-end
// @updateURL    https://raw.githubusercontent.com/ophielilac/Bambi-obeys/main/Bambi-Obeys.user.js
// @downloadURL  https://raw.githubusercontent.com/ophielilac/Bambi-obeys/main/Bambi-Obeys.user.js
// ==/UserScript==

// The bootstrap repeats this guard, so concurrent loaders and direct module
// imports are also safe. The loader deliberately does not own the namespace.
if (globalThis.Bambi_Obeys) {
    console.warn("[Bambi Obeys] Already loaded; duplicate import skipped.");
} else {
    import(`https://ophielilac.github.io/Bambi-obeys/dist/Bambi-Obeys.user.js?v=${Date.now()}`)
        .catch(error => console.error("[Bambi Obeys] Loader failed:", error));
}
