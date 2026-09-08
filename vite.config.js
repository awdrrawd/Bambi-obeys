import { defineConfig } from "vite";
import packageJson from "./package.json" with { type: "json" };

function privateNetworkAccessPlugin() {
    const addHeaders = (_request, response, next) => {
        response.setHeader("Access-Control-Allow-Private-Network", "true");
        response.setHeader("Access-Control-Expose-Headers", "ETag, Last-Modified");
        next();
    };

    return {
        name: "private-network-access-header",
        configureServer(server) {
            server.middlewares.use(addHeaders);
        },
        configurePreviewServer(server) {
            server.middlewares.use(addHeaders);
        }
    };
}

function userscriptHeaderPlugin(header) {
    return {
        name: "userscript-header",
        enforce: "post",
        generateBundle(_options, bundle) {
            for (const output of Object.values(bundle)) {
                if (output.type === "chunk" && output.isEntry) {
                    output.code = `${header}\n\n${output.code}`;
                }
            }
        }
    };
}

const userscriptHeader = `// ==UserScript==
// @name         Bambi Obeys (Standalone)
// @name:zh-CN   Bambi Obeys（单文件版）
// @namespace    BC-Hypnosis
// @version      ${packageJson.version}
// @description  Standalone Bambi Obeys trigger system for Bondage Club
// @description:zh-CN Bondage Club 的 Bambi Obeys 触发器系统（单文件版）
// @match        https://*.bondageprojects.elementfx.com/R*/*
// @match        https://*.bondage-europe.com/R*/*
// @match        https://*.bondageprojects.com/R*/*
// @match        https://*.bondage-asia.com/club/R*
// @grant        none
// @run-at       document-end
// @updateURL    https://raw.githubusercontent.com/ophielilac/Bambi-obeys/main/dist/Bambi-Obeys.user.js
// @downloadURL  https://raw.githubusercontent.com/ophielilac/Bambi-obeys/main/dist/Bambi-Obeys.user.js
// ==/UserScript==`;

export default defineConfig({
    plugins: [privateNetworkAccessPlugin(), userscriptHeaderPlugin(userscriptHeader)],
    base: "./",
    server: {
        cors: true
    },
    preview: {
        cors: true
    },
    build: {
        sourcemap: false,
        minify: "esbuild",
        modulePreload: false,
        emptyOutDir: true,
        rollupOptions: {
            input: "src/main.js",
            output: {
                format: "iife",
                inlineDynamicImports: true,
                entryFileNames: "Bambi-Obeys.user.js"
            }
        }
    }
});
