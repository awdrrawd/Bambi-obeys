// ==UserScript==
// @name         Local Test - Bambi Obeys
// @name:zh-CN   本地测试 - Bambi Obeys
// @namespace    BC-Hypnosis
// @version      0.1.0
// @description  Loads the local Bambi Obeys development bundle.
// @description:zh-CN 加载本机的 Bambi Obeys 开发构建。
// @match        https://*.bondageprojects.elementfx.com/R*/*
// @match        https://*.bondage-europe.com/R*/*
// @match        https://*.bondageprojects.com/R*/*
// @match        https://*.bondage-asia.com/club/R*
// @grant        none
// @run-at       document-end
// ==/UserScript==

if (globalThis.Bambi_Obeys) {
    console.warn("[Bambi Obeys] Already loaded; duplicate local import skipped.");
} else {
    import(`http://localhost:5174/Bambi-Obeys.user.js?v=${Date.now()}`)
        .catch(error => console.error("[Bambi Obeys] Local loader failed:", error));
}
