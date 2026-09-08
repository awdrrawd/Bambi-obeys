export const VERSION = "1.6.0";

export const BASE_URL =
    "https://ophielilac.github.io/Bambi-obeys/bambi%20triggers/";

export const TRIGGERS = [
    ["Bambi Focus", "Bambi Focus.m4a", "triggers.focus"],
    ["Bambi Freeze", "Bambi Freeze.m4a", "triggers.freeze"],
    ["Bambi Reset", "Bambi Reset.m4a", "triggers.reset"],
    ["Bambi does as she's told", "Bambi does as she's told.m4a", "triggers.obey"],
    ["Bambi sleep", "Bambi sleep.m4a", "triggers.sleep"],
    ["Bambi wake and obey", "Bambi wake and obey.m4a", "triggers.wake"],
    ["Blonde Moment", "Blonde moment.m4a", "triggers.blonde"],
    ["Drop for cock", "Drop for cock.m4a", "triggers.drop"],
    ["Good girl", "Good girl.m4a", "triggers.goodGirl"],
    ["Safe and Secure", "Safe and Secure.m4a", "triggers.safe"],
    ["Snap and forget", "Snap and forget.m4a", "triggers.forget"],
    ["Zap cock drain obey", "Zap cock drain obey.m4a", "triggers.zap"],
    ["Bambi Obeys", "Bambi Obeys.m4a", "triggers.bambiObeys"],
    ["Airhead barbie", "Airhead barbie.m4a", "triggers.airhead"],
    ["Braindead bobblehead", "Braindead bobblehead.m4a", "triggers.braindead"],
    ["Cockblank lovedoll", "Cockblank lovedoll.m4a", "triggers.lovedoll"]
].map(([name, file, descriptionKey]) => ({ name, file, descriptionKey }));

export const SETTINGS_KEY = "bambiObeysSettings_v5";
export const CONNECTIONS_KEY = "bambiObeysConnections_v4";
export const PENDING_KEY = "bambiObeysPending_v4";
export const SLEEP_KEY = "bambiObeysSleep_v2";
export const PROTOCOL = "BambiObeysMsg";
export const CONNECT_COMMAND = ":Bambi Connect";
export const DISCONNECT_COMMAND = ":Bambi Disconnect";

export const DEFAULT_SETTINGS = {
    language: "auto",
    authorityMode: "connected",
    whitelist: "",
    acceptIncoming: true,
    autoAcceptConnections: false,
    autoWakeMinutes: 30,
    autoWakeEnabled: true,
    enabledTriggers: {},
    maxSimultaneous: 5,
    secondaryVolume: 0.40,
    fadeInMs: 150,
    fadeOutMs: 300,
    alternateEars: true,
    cooldownMs: 0,
    maxTriggersPerMinute: 30,
    showBambiLabels: true,
    labelOpacity: 0.42,
    labelText: "Bambi",
    labelXOffset: 300,
    labelYOffset: -30
};
