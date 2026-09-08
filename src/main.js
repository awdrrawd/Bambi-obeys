// Keep this bootstrap free of static imports so the duplicate guard runs first.
if (globalThis.Bambi_Obeys) {
    console.warn("[Bambi Obeys] Already loaded; duplicate initialization skipped.");
} else {
    const namespace = globalThis.Bambi_Obeys = {
        state: "loading"
    };

    import("./app.js")
        .then(({ start }) => start(namespace))
        .then(() => {
            if (namespace.state === "loading") namespace.state = "waiting";
        })
        .catch(error => {
            if (globalThis.Bambi_Obeys === namespace) {
                delete globalThis.Bambi_Obeys;
            }
            console.error("[Bambi Obeys] Failed to load:", error);
        });
}
