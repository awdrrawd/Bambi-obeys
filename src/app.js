import {
    BASE_URL,
    CONNECTIONS_KEY,
    CONNECT_COMMAND,
    DEFAULT_SETTINGS,
    DISCONNECT_COMMAND,
    PENDING_KEY,
    PROTOCOL,
    SETTINGS_KEY,
    SLEEP_KEY,
    TRIGGERS,
    VERSION
} from "./config.js";
import { createI18n } from "./i18n.js";
import { createHooks } from "./hooks.js";
import { createUIController } from "./ui.js";

export async function start(namespace) {
    'use strict';

    // =========================================================
    // CONFIG
    // =========================================================

    const i18n = createI18n();
    const t = (key, params) => i18n.t(key, params);

    // =========================================================
    // BC MODSDK
    // =========================================================

    let bambiMod = null;

    function registerBambiMod() {
        if (bambiMod) {
            return true;
        }

        if (
            typeof bcModSdk === "undefined" ||
            !bcModSdk ||
            typeof bcModSdk.registerMod !== "function"
        ) {
            console.error(
                "Bambi Obeys: BC ModSDK unavailable."
            );

            return false;
        }

        try {
            bambiMod = bcModSdk.registerMod({
                name: "Bambi_Obeys",
                fullName: "Bambi Obeys",
                version: VERSION,
                repository:
                    "https://github.com/ophielilac/Bambi-obeys"
            });

            return true;
        } catch (error) {
            console.error(
                "Bambi Obeys: failed to register with ModSDK",
                error
            );

            return false;
        }
    }

    // =========================================================
    // STATE
    // =========================================================

    let settings =
        structuredCloneCompat(
            DEFAULT_SETTINGS
        );

    let ui = null;
    let hooks = null;

    let connectedUsers = new Map();
    let pendingRequests = new Map();
    let bambiPresence = new Map();


    let audioContext = null;

    const audioBuffers = new Map();
    const loadingBuffers = new Map();
    const activeLayers = new Set();

    // =========================================================
    // AUDIO SESSION STATE
    // =========================================================

    // Current BOTH-ear/main track.
    // While this exists, additional triggers use the
    // alternating left/right system.
    let mainAudioLayer = null;

    // Remembers the LAST secondary ear used.
    //
    // -1 = left
    //  1 = right
    //
    // This intentionally survives main-track endings.
    // The next secondary trigger always uses the opposite
    // ear from the last secondary trigger.
    let lastSecondaryPan = 1;

    let lastTriggerTime = 0;
    let triggerHistory = [];

    let sleepState = {
        active: false,
        startedAt: 0
    };

    let sleepTimer = null;

    // =========================================================
    // HELPERS
    // =========================================================

    function structuredCloneCompat(value) {
        try {
            return JSON.parse(
                JSON.stringify(value)
            );
        } catch {
            return Object.assign(
                {},
                value
            );
        }
    }

    function normalizeMemberNumber(value) {
        const n = Number(value);

        return Number.isFinite(n)
            ? n
            : 0;
    }

    function now() {
        return Date.now();
    }

    function triggerIndexByName(name) {
        return TRIGGERS.findIndex(
            trigger =>
                trigger.name.toLowerCase() ===
                name.toLowerCase()
        );
    }

    function getTriggerURL(index) {
        if (!TRIGGERS[index]) {
            return null;
        }

        return (
            BASE_URL +
            encodeURIComponent(
                TRIGGERS[index].file
            )
        );
    }

    // =========================================================
    // STORAGE
    // =========================================================

    function mergeSettings(saved) {
        if (
            !saved ||
            typeof saved !== "object"
        ) {
            return;
        }

        for (
            const [key, value]
            of Object.entries(
                DEFAULT_SETTINGS
            )
        ) {
            if (
                Object.prototype.hasOwnProperty.call(
                    saved,
                    key
                )
            ) {
                if (
                    key === "enabledTriggers" &&
                    value &&
                    typeof value === "object" &&
                    !Array.isArray(value)
                ) {
                    settings.enabledTriggers =
                        Object.assign(
                            {},
                            value,
                            saved.enabledTriggers ||
                                {}
                        );
                } else {
                    settings[key] =
                        saved[key];
                }
            }
        }
    }

    function loadStorage() {
        let savedSettings = null;

        try {
            savedSettings =
                JSON.parse(
                    localStorage.getItem(
                        SETTINGS_KEY
                    )
                );

            mergeSettings(
                savedSettings
            );
        } catch (error) {
            console.error(
                "Bambi Obeys: settings load failed",
                error
            );
        }

        for (
            const trigger
            of TRIGGERS
        ) {
            if (
                !Object.prototype.hasOwnProperty.call(
                    settings.enabledTriggers,
                    trigger.name
                )
            ) {
                settings.enabledTriggers[
                    trigger.name
                ] = true;
            }
        }

        if (
            !savedSettings ||
            !Object.prototype.hasOwnProperty.call(
                savedSettings,
                "labelXOffset"
            )
        ) {
            settings.labelXOffset =
                DEFAULT_SETTINGS.labelXOffset;
        }

        if (
            !savedSettings ||
            !Object.prototype.hasOwnProperty.call(
                savedSettings,
                "labelYOffset"
            )
        ) {
            settings.labelYOffset =
                DEFAULT_SETTINGS.labelYOffset;
        }

        try {
            const saved =
                JSON.parse(
                    localStorage.getItem(
                        CONNECTIONS_KEY
                    )
                );

            if (
                Array.isArray(saved)
            ) {
                connectedUsers.clear();

                for (
                    const entry
                    of saved
                ) {
                    const memberNumber =
                        normalizeMemberNumber(
                            entry?.memberNumber
                        );

                    if (!memberNumber) {
                        continue;
                    }

                    connectedUsers.set(
                        memberNumber,
                        {
                            memberNumber,
                            name:
                                entry.name ||
                                "Unknown"
                        }
                    );
                }
            }
        } catch (error) {
            console.error(
                "Bambi Obeys: connections load failed",
                error
            );
        }

        try {
            const saved =
                JSON.parse(
                    localStorage.getItem(
                        PENDING_KEY
                    )
                );

            if (
                Array.isArray(saved)
            ) {
                pendingRequests.clear();

                for (
                    const entry
                    of saved
                ) {
                    const memberNumber =
                        normalizeMemberNumber(
                            entry?.memberNumber
                        );

                    if (!memberNumber) {
                        continue;
                    }

                    pendingRequests.set(
                        memberNumber,
                        {
                            memberNumber,
                            name:
                                entry.name ||
                                "Unknown"
                        }
                    );
                }
            }
        } catch (error) {
            console.error(
                "Bambi Obeys: pending load failed",
                error
            );
        }

        try {
            const saved =
                JSON.parse(
                    localStorage.getItem(
                        SLEEP_KEY
                    )
                );

            if (
                saved?.active &&
                Number(
                    saved.startedAt
                ) > 0
            ) {
                sleepState.active =
                    true;

                sleepState.startedAt =
                    Number(
                        saved.startedAt
                    );
            }
        } catch (error) {
            console.error(
                "Bambi Obeys: sleep state load failed",
                error
            );
        }
    }

    function saveSettings() {
        try {
            localStorage.setItem(
                SETTINGS_KEY,
                JSON.stringify(
                    settings
                )
            );

            if (
                typeof Player !==
                "undefined"
            ) {
                announcePresence();
            }
        } catch (error) {
            console.error(
                "Bambi Obeys: settings save failed",
                error
            );
        }
    }

    function saveConnections() {
        try {
            localStorage.setItem(
                CONNECTIONS_KEY,
                JSON.stringify(
                    [...connectedUsers.values()]
                )
            );
        } catch (error) {
            console.error(
                "Bambi Obeys: connections save failed",
                error
            );
        }
    }

    function savePendingRequests() {
        try {
            localStorage.setItem(
                PENDING_KEY,
                JSON.stringify(
                    [...pendingRequests.values()]
                )
            );
        } catch (error) {
            console.error(
                "Bambi Obeys: pending save failed",
                error
            );
        }
    }

    function saveSleepState() {
        try {
            localStorage.setItem(
                SLEEP_KEY,
                JSON.stringify(
                    sleepState
                )
            );
        } catch (error) {
            console.error(
                "Bambi Obeys: sleep state save failed",
                error
            );
        }
    }

    // =========================================================
    // ROOM DATA
    // =========================================================

    function getRoomCharacters() {
        if (
            typeof ChatRoomData !==
                "undefined" &&
            ChatRoomData &&
            Array.isArray(
                ChatRoomData.Character
            )
        ) {
            return ChatRoomData.Character;
        }

        if (
            typeof ChatRoomCharacter !==
                "undefined" &&
            Array.isArray(
                ChatRoomCharacter
            )
        ) {
            return ChatRoomCharacter;
        }

        return [];
    }

    function isInCurrentRoom(
        memberNumber
    ) {
        const target =
            normalizeMemberNumber(
                memberNumber
            );

        return getRoomCharacters().some(
            character =>
                normalizeMemberNumber(
                    character?.MemberNumber
                ) === target
        );
    }

    function getCharacter(
        memberNumber
    ) {
        const target =
            normalizeMemberNumber(
                memberNumber
            );

        return (
            getRoomCharacters().find(
                character =>
                    normalizeMemberNumber(
                        character?.MemberNumber
                    ) === target
            ) || null
        );
    }

    function getCharacterName(
        memberNumber
    ) {
        const character =
            getCharacter(
                memberNumber
            );

        if (!character) {
            return "Unknown";
        }

        return (
            character.Nickname ||
            character.Name ||
            "Unknown"
        );
    }

    function getFriendNumbers() {
        const result =
            new Set();

        const possibleLists = [
            Player?.FriendList,
            Player?.Friends,
            Player?.FriendNumbers
        ];

        for (
            const list
            of possibleLists
        ) {
            if (!Array.isArray(list)) {
                continue;
            }

            for (
                const entry
                of list
            ) {
                const n =
                    normalizeMemberNumber(
                        typeof entry ===
                            "object"
                            ? entry?.MemberNumber ??
                                  entry?.memberNumber
                            : entry
                    );

                if (n) {
                    result.add(n);
                }
            }
        }

        return result;
    }

    function getOwnerNumber() {
        const candidates = [
            Player?.OwnerNumber,
            Player?.OwnerMemberNumber,
            Player?.Owner?.MemberNumber,
            Player?.Owner
        ];

        for (
            const value
            of candidates
        ) {
            const n =
                normalizeMemberNumber(
                    value
                );

            if (n) {
                return n;
            }
        }

        return 0;
    }

    // =========================================================
    // AUTHORITY
    // =========================================================

    function getWhitelist() {
        return new Set(
            String(
                settings.whitelist ||
                    ""
            )
                .split(",")
                .map(
                    x =>
                        Number(
                            x.trim()
                        )
                )
                .filter(
                    Number.isFinite
                )
                .filter(
                    n => n > 0
                )
        );
    }

    function canUseTrigger(
        memberNumber
    ) {
        const n =
            normalizeMemberNumber(
                memberNumber
            );

        if (!n) {
            return false;
        }

        if (
            getWhitelist().has(
                n
            )
        ) {
            return true;
        }

        switch (
            settings.authorityMode
        ) {
            case "owner":
                return (
                    getOwnerNumber() ===
                    n
                );

            case "friends":
                return getFriendNumbers().has(
                    n
                );

            case "connected":
                return connectedUsers.has(
                    n
                );

            case "anyone":
                return true;

            default:
                return false;
        }
    }

    // =========================================================
    // AUDIO ENGINE
    // =========================================================

    function ensureAudioContext() {
        if (!audioContext) {
            const Ctx =
                window.AudioContext ||
                window.webkitAudioContext;

            if (!Ctx) {
                console.error(
                    "Bambi Obeys: Web Audio API unavailable."
                );

                return null;
            }

            audioContext =
                new Ctx();
        }

        if (
            audioContext.state ===
            "suspended"
        ) {
            audioContext
                .resume()
                .catch(
                    () => {}
                );
        }

        return audioContext;
    }

    function installAudioUnlock() {
        const unlock =
            () => {
                if (!audioContext) {
                    return;
                }

                if (
                    audioContext.state ===
                    "suspended"
                ) {
                    audioContext
                        .resume()
                        .catch(
                            () => {}
                        );
                }
            };

        document.addEventListener(
            "pointerdown",
            unlock,
            {
                passive: true,
                capture: true
            }
        );

        document.addEventListener(
            "keydown",
            unlock,
            {
                passive: true,
                capture: true
            }
        );
    }

    async function loadAudioBuffer(
        index
    ) {
        if (
            audioBuffers.has(index)
        ) {
            return audioBuffers.get(
                index
            );
        }

        if (
            loadingBuffers.has(index)
        ) {
            return loadingBuffers.get(
                index
            );
        }

        const context =
            ensureAudioContext();

        if (!context) {
            return null;
        }

        const promise =
            (async () => {
                try {
                    const response =
                        await fetch(
                            getTriggerURL(
                                index
                            ),
                            {
                                cache:
                                    "default"
                            }
                        );

                    if (!response.ok) {
                        throw new Error(
                            `HTTP ${response.status} while loading ${TRIGGERS[index].file}`
                        );
                    }

                    const arrayBuffer =
                        await response.arrayBuffer();

                    const decoded =
                        await context.decodeAudioData(
                            arrayBuffer
                        );

                    audioBuffers.set(
                        index,
                        decoded
                    );

                    return decoded;
                } catch (error) {
                    console.error(
                        "Bambi Obeys: failed to load audio",
                        TRIGGERS[index]?.name,
                        error
                    );

                    return null;
                } finally {
                    loadingBuffers.delete(
                        index
                    );
                }
            })();

        loadingBuffers.set(
            index,
            promise
        );

        return promise;
    }

    async function playLayer(
        index
    ) {
        const context =
            ensureAudioContext();

        if (!context) {
            return;
        }

        if (!TRIGGERS[index]) {
            return;
        }

        const buffer =
            await loadAudioBuffer(
                index
            );

        if (!buffer) {
            return;
        }

        if (
            activeLayers.size >=
            Math.max(
                1,
                Number(
                    settings.maxSimultaneous
                )
            )
        ) {
            console.log(
                "Bambi Obeys: maximum simultaneous layers reached."
            );

            return;
        }

        const source =
            context.createBufferSource();

        const gain =
            context.createGain();

        const panner =
            context.createStereoPanner();

        source.buffer =
            buffer;

        // =====================================================
        // MAIN VS SECONDARY
        // =====================================================

        const isMain =
            mainAudioLayer === null;

        let pan = 0;

        if (isMain) {
            // Main track is BOTH ears.
            pan = 0;
        } else if (
            settings.alternateEars
        ) {
            // ALWAYS use the opposite ear from
            // the previous secondary trigger.
            pan =
                lastSecondaryPan === -1
                    ? 1
                    : -1;

            // Immediately remember the ear we used.
            lastSecondaryPan =
                pan;
        } else {
            pan = 0;
        }

        gain.gain.value =
            0;

        panner.pan.value =
            pan;

        source.connect(
            gain
        );

        gain.connect(
            panner
        );

        panner.connect(
            context.destination
        );

        const layer = {
            source,
            gain,
            panner,
            index,
            isMain
        };

        activeLayers.add(
            layer
        );

        if (isMain) {
            mainAudioLayer =
                layer;
        }

        const fadeIn =
            Math.max(
                0,
                Number(
                    settings.fadeInMs
                )
            ) / 1000;

        const fadeOut =
            Math.max(
                0,
                Number(
                    settings.fadeOutMs
                )
            ) / 1000;

        const initialGain =
            isMain
                ? 1
                : Math.max(
                      0,
                      Math.min(
                          1,
                          Number(
                              settings.secondaryVolume
                          )
                      )
                  );

        const startTime =
            context.currentTime;

        gain.gain.setValueAtTime(
            0,
            startTime
        );

        gain.gain.linearRampToValueAtTime(
            initialGain,
            startTime +
                Math.max(
                    0.01,
                    fadeIn
                )
        );

        source.onended =
            () => {
                activeLayers.delete(
                    layer
                );

                // Only the MAIN track determines
                // when a BOTH-ear session ends.
                if (
                    mainAudioLayer ===
                    layer
                ) {
                    mainAudioLayer =
                        null;

                    // IMPORTANT:
                    // We DO NOT reset lastSecondaryPan.
                    //
                    // The last secondary ear is remembered
                    // across main-track sessions.
                    console.log(
                        "Bambi Obeys: main track ended. Last secondary ear remembered."
                    );
                }

                try {
                    gain.disconnect();
                    panner.disconnect();
                    source.disconnect();
                } catch {}
            };

        source.start();

        const stopAt =
            startTime +
            Math.max(
                0,
                buffer.duration -
                    Math.max(
                        0.01,
                        fadeOut
                    )
            );

        if (
            fadeOut > 0 &&
            buffer.duration >
                fadeOut
        ) {
            gain.gain.setValueAtTime(
                initialGain,
                stopAt
            );

            gain.gain.linearRampToValueAtTime(
                0,
                stopAt +
                    fadeOut
            );
        }

        let location;

        if (pan === 0) {
            location =
                "both ears";
        } else if (pan < 0) {
            location =
                "left ear";
        } else {
            location =
                "right ear";
        }

        console.log(
            "Bambi Obeys: playing",
            TRIGGERS[index].name,
            `(${location})`,
            isMain
                ? "[MAIN]"
                : "[SECONDARY]",
            !isMain
                ? `next remembered ear: ${
                      lastSecondaryPan === -1
                          ? "left"
                          : "right"
                  }`
                : ""
        );
    }

    function triggerAllowedLocally(
        index
    ) {
        const trigger =
            TRIGGERS[index];

        if (!trigger) {
            return false;
        }

        if (
            settings.enabledTriggers &&
            settings.enabledTriggers[
                trigger.name
            ] === false
        ) {
            return false;
        }

        const cooldown =
            Math.max(
                0,
                Number(
                    settings.cooldownMs
                )
            );

        if (
            cooldown > 0 &&
            now() -
                lastTriggerTime <
                cooldown
        ) {
            return false;
        }

        const minute =
            60 * 1000;

        triggerHistory =
            triggerHistory.filter(
                timestamp =>
                    now() -
                        timestamp <
                    minute
            );

        const limit =
            Math.max(
                1,
                Number(
                    settings.maxTriggersPerMinute
                )
            );

        if (
            triggerHistory.length >=
            limit
        ) {
            return false;
        }

        return true;
    }

    async function playTrigger(
        index,
        options = {}
    ) {
        const trigger =
            TRIGGERS[index];

        if (!trigger) {
            return false;
        }

        if (
            !options.ignoreLocalSafety &&
            !triggerAllowedLocally(
                index
            )
        ) {
            console.log(
                "Bambi Obeys: trigger blocked by local limits/safety:",
                trigger.name
            );

            return false;
        }

        lastTriggerTime =
            now();

        triggerHistory.push(
            lastTriggerTime
        );

        if (
            options.trackSleep !==
            false
        ) {
            const sleepIndex =
                triggerIndexByName(
                    "Bambi sleep"
                );

            const wakeIndex =
                triggerIndexByName(
                    "Bambi wake and obey"
                );

            if (
                index ===
                sleepIndex
            ) {
                startAutoWakeTimer();
            } else if (
                index ===
                wakeIndex
            ) {
                cancelAutoWakeTimer();
            }
        }

        await playLayer(
            index
        );

        return true;
    }

    function stopAllLayers() {
        const context =
            ensureAudioContext();

        if (!context) {
            return;
        }

        const t =
            context.currentTime;

        const fade =
            Math.max(
                0.01,
                Number(
                    settings.fadeOutMs
                ) / 1000
            );

        for (
            const layer
            of [...activeLayers]
        ) {
            try {
                layer.gain.gain.cancelScheduledValues(
                    t
                );

                layer.gain.gain.setValueAtTime(
                    Math.max(
                        0,
                        layer.gain.gain.value
                    ),
                    t
                );

                layer.gain.gain.linearRampToValueAtTime(
                    0,
                    t + fade
                );

                layer.source.stop(
                    t +
                        fade +
                        0.02
                );
            } catch {}
        }

        // Completely end the main session.
        mainAudioLayer =
            null;

        // Intentionally DO NOT reset lastSecondaryPan.
        // The last-used ear must be remembered.
    }

    // =========================================================
    // AUTO WAKE
    // =========================================================

    function startAutoWakeTimer() {
        cancelAutoWakeTimer(
            false
        );

        sleepState.active =
            true;

        sleepState.startedAt =
            now();

        saveSleepState();

        scheduleRemainingWake();
    }

    function cancelAutoWakeTimer(
        save = true
    ) {
        if (sleepTimer) {
            clearTimeout(
                sleepTimer
            );

            sleepTimer =
                null;
        }

        sleepState.active =
            false;

        sleepState.startedAt =
            0;

        if (save) {
            saveSleepState();
        }
    }

    function scheduleRemainingWake() {
        if (sleepTimer) {
            clearTimeout(
                sleepTimer
            );

            sleepTimer =
                null;
        }

        if (
            !sleepState.active ||
            !settings.autoWakeEnabled ||
            Number(
                settings.autoWakeMinutes
            ) <= 0
        ) {
            return;
        }

        const maxMs =
            Math.max(
                0,
                Number(
                    settings.autoWakeMinutes
                )
            ) *
            60 *
            1000;

        const elapsed =
            now() -
            sleepState.startedAt;

        const remaining =
            Math.max(
                0,
                maxMs -
                    elapsed
            );

        if (
            remaining <= 0
        ) {
            performAutoWake();
            return;
        }

        sleepTimer =
            setTimeout(
                performAutoWake,
                remaining
            );
    }

    function performAutoWake() {
        if (
            !sleepState.active
        ) {
            return;
        }

        const wakeIndex =
            triggerIndexByName(
                "Bambi wake and obey"
            );

        sleepState.active =
            false;

        sleepState.startedAt =
            0;

        saveSleepState();

        if (sleepTimer) {
            clearTimeout(
                sleepTimer
            );

            sleepTimer =
                null;
        }

        if (
            wakeIndex >= 0
        ) {
            playTrigger(
                wakeIndex,
                {
                    ignoreLocalSafety:
                        false,

                    trackSleep:
                        false
                }
            );
        }
    }

    // =========================================================
    // NETWORK
    // =========================================================

    function sendWhisper(
        memberNumber,
        content
    ) {
        if (
            typeof ServerSend !==
            "function"
        ) {
            return false;
        }

        try {
            ServerSend(
                "ChatRoomChat",
                {
                    Content:
                        content,

                    Type:
                        "Whisper",

                    Target:
                        normalizeMemberNumber(
                            memberNumber
                        )
                }
            );

            return true;
        } catch (error) {
            console.error(
                "Bambi Obeys: whisper failed",
                error
            );

            return false;
        }
    }

    function sendBambiMessage(
        targetMemberNumber,
        payload
    ) {
        if (
            typeof ServerSend !==
            "function"
        ) {
            return false;
        }

        try {
            const packet = {
                Type:
                    "Hidden",

                Content:
                    PROTOCOL,

                Sender:
                    Player.MemberNumber,

                Dictionary: [
                    {
                        message:
                            payload
                    }
                ]
            };

            const target =
                normalizeMemberNumber(
                    targetMemberNumber
                );

            if (target) {
                packet.Target =
                    target;
            }

            ServerSend(
                "ChatRoomChat",
                packet
            );

            return true;
        } catch (error) {
            console.error(
                "Bambi Obeys: failed to send Bambi packet",
                error
            );

            return false;
        }
    }

    function announcePresence() {
        const myNumber =
            normalizeMemberNumber(
                Player?.MemberNumber
            );

        if (!myNumber) {
            return;
        }

        for (
            const character
            of getRoomCharacters()
        ) {
            const memberNumber =
                normalizeMemberNumber(
                    character?.MemberNumber
                );

            if (
                !memberNumber ||
                memberNumber ===
                    myNumber
            ) {
                continue;
            }

            // Presence is intentionally broadcast.
            // It contains no target and every Bambi
            // client can use the player's position.
            sendBambiMessage(
                null,
                {
                    type:
                        "presence",

                    memberNumber:
                        myNumber,

                    name:
                        Player?.Name ||
                        "Bambi",

                    labelXOffset:
                        Number(
                            settings.labelXOffset
                        ),

                    labelYOffset:
                        Number(
                            settings.labelYOffset
                        )
                }
            );
        }
    }

    function requestConnection(
        memberNumber
    ) {
        const target =
            normalizeMemberNumber(
                memberNumber
            );

        const myNumber =
            normalizeMemberNumber(
                Player?.MemberNumber
            );

        if (!target) {
            return;
        }

        if (
            target ===
            myNumber
        ) {
            ui?.setStatus(
                t("status.selfConnect")
            );

            return;
        }

        sendWhisper(
            target,
            CONNECT_COMMAND
        );

        ui?.setStatus(
            t("status.requestSent", {
                name: getCharacterName(target)
            })
        );
    }

    function acceptConnection(
        memberNumber
    ) {
        const target =
            normalizeMemberNumber(
                memberNumber
            );

        const myNumber =
            normalizeMemberNumber(
                Player?.MemberNumber
            );

        if (
            !target ||
            target ===
                myNumber
        ) {
            return;
        }

        const name =
            pendingRequests.get(
                target
            )?.name ||
            getCharacterName(
                target
            );

        pendingRequests.delete(
            target
        );

        connectedUsers.set(
            target,
            {
                memberNumber:
                    target,

                name
            }
        );

        savePendingRequests();
        saveConnections();

        // Explicit target.
        sendBambiMessage(
            target,
            {
                type:
                    "connection_accepted",

                targetMemberNumber:
                    target
            }
        );

        ui?.refresh();
    }

    function disconnectUser(
        memberNumber
    ) {
        const target =
            normalizeMemberNumber(
                memberNumber
            );

        const myNumber =
            normalizeMemberNumber(
                Player?.MemberNumber
            );

        if (
            !target ||
            target ===
                myNumber
        ) {
            return;
        }

        connectedUsers.delete(
            target
        );

        saveConnections();

        // Explicit target.
        sendBambiMessage(
            target,
            {
                type:
                    "connection_removed",

                targetMemberNumber:
                    target
            }
        );

        ui?.refresh();
    }

    function sendTriggerToUser(
        memberNumber,
        triggerIndex
    ) {
        const target =
            normalizeMemberNumber(
                memberNumber
            );

        const myNumber =
            normalizeMemberNumber(
                Player?.MemberNumber
            );

        if (!target) {
            return;
        }

        if (
            target ===
            myNumber
        ) {
            ui?.setStatus(
                t("status.selfTrigger")
            );

            return;
        }

        if (
            !connectedUsers.has(
                target
            )
        ) {
            ui?.setStatus(
                t("status.notConnected")
            );

            return;
        }

        if (
            !isInCurrentRoom(
                target
            )
        ) {
            ui?.setStatus(
                t("status.notInRoom")
            );

            return;
        }

        if (
            !TRIGGERS[
                triggerIndex
            ]
        ) {
            return;
        }

        // The target is stored INSIDE the payload.
        // This makes targeting work even if the game's
        // Hidden packet itself reaches everyone.
        sendBambiMessage(
            target,
            {
                type:
                    "trigger",

                trigger:
                    triggerIndex,

                targetMemberNumber:
                    target
            }
        );

        ui?.setStatus(
            t("status.triggerSent", {
                trigger: TRIGGERS[triggerIndex].name,
                name: getCharacterName(target)
            })
        );
    }

    // =========================================================
    // TARGET VALIDATION
    // =========================================================

    function packetIsForMe(
        payload
    ) {
        if (
            !payload ||
            typeof payload !==
                "object"
        ) {
            return false;
        }

        // Presence packets are intentionally broadcast.
        if (
            payload.type ===
            "presence"
        ) {
            return true;
        }

        const myNumber =
            normalizeMemberNumber(
                Player?.MemberNumber
            );

        const target =
            normalizeMemberNumber(
                payload.targetMemberNumber
            );

        return (
            target !== 0 &&
            target ===
                myNumber
        );
    }

    // =========================================================
    // BAMBI MESSAGE HANDLING
    // =========================================================

    function handleBambiMessage(
        data
    ) {
        if (
            !data ||
            data.Type !== "Hidden" ||
            data.Content !== PROTOCOL ||
            !Array.isArray(data.Dictionary) ||
            !data.Dictionary[0]
        ) {
            return;
        }

        const payload =
            data.Dictionary[0].message;

        if (
            !payload ||
            typeof payload !== "object"
        ) {
            return;
        }

        const sender =
            normalizeMemberNumber(
                data.Sender
            );

        if (!sender) {
            return;
        }

        const myNumber =
            normalizeMemberNumber(
                Player?.MemberNumber
            );

        // Never process our own packet.
        if (
            sender ===
            myNumber
        ) {
            return;
        }

        // =====================================================
        // PRESENCE
        // =====================================================

        if (
            payload.type ===
            "presence"
        ) {
            let labelXOffset =
                Number(
                    payload.labelXOffset
                );

            let labelYOffset =
                Number(
                    payload.labelYOffset
                );

            if (
                !Number.isFinite(
                    labelXOffset
                )
            ) {
                labelXOffset =
                    300;
            }

            if (
                !Number.isFinite(
                    labelYOffset
                )
            ) {
                labelYOffset =
                    -30;
            }

            bambiPresence.set(
                sender,
                {
                    memberNumber:
                        sender,

                    name:
                        payload.name ||
                        getCharacterName(
                            sender
                        ),

                    labelXOffset:
                        labelXOffset,

                    labelYOffset:
                        labelYOffset,

                    lastSeen:
                        now()
                }
            );

            return;
        }

        // =====================================================
        // TARGETED PACKETS
        // =====================================================

        if (
            !packetIsForMe(
                payload
            )
        ) {
            return;
        }

        // =====================================================
        // CONNECTION ACCEPTED
        // =====================================================

        if (
            payload.type ===
            "connection_accepted"
        ) {
            connectedUsers.set(
                sender,
                {
                    memberNumber:
                        sender,

                    name:
                        getCharacterName(
                            sender
                        )
                }
            );

            saveConnections();

            ui?.refresh();

            return;
        }

        // =====================================================
        // CONNECTION REMOVED
        // =====================================================

        if (
            payload.type ===
            "connection_removed"
        ) {
            connectedUsers.delete(
                sender
            );

            saveConnections();

            ui?.refresh();

            return;
        }

        // =====================================================
        // TRIGGER
        // =====================================================

        if (
            payload.type ===
            "trigger"
        ) {
            if (
                !settings.acceptIncoming
            ) {
                return;
            }

            if (
                !connectedUsers.has(
                    sender
                ) &&
                !canUseTrigger(
                    sender
                )
            ) {
                return;
            }

            const index =
                Number(
                    payload.trigger
                );

            if (
                !Number.isInteger(
                    index
                )
            ) {
                return;
            }

            if (
                !TRIGGERS[index]
            ) {
                return;
            }

            const trigger =
                TRIGGERS[index];

            if (
                settings.enabledTriggers &&
                settings.enabledTriggers[
                    trigger.name
                ] === false
            ) {
                return;
            }

            if (
                !canUseTrigger(
                    sender
                )
            ) {
                return;
            }

            playTrigger(
                index
            );

            return;
        }
    }

    function handleBambiChatMessage(
        data
    ) {
        if (
            !data ||
            (
                data.Type !== "Whisper" &&
                data.Type !== "Chat"
            )
        ) {
            return;
        }

        if (
            typeof data.Content !==
            "string"
        ) {
            return;
        }

        const sender =
            normalizeMemberNumber(
                data.Sender
            );

        if (!sender) {
            return;
        }

        const myNumber =
            normalizeMemberNumber(
                Player?.MemberNumber
            );

        // Ignore our own chat / whisper.
        if (
            sender ===
            myNumber
        ) {
            return;
        }

        const message =
            data.Content.trim();

        // =====================================================
        // CONNECT
        // =====================================================

        if (
            data.Type === "Whisper" &&
            message.toLowerCase() ===
                CONNECT_COMMAND.toLowerCase()
        ) {
            const name =
                getCharacterName(
                    sender
                );

            if (
                settings.autoAcceptConnections
            ) {
                acceptConnection(
                    sender
                );
            } else {
                pendingRequests.set(
                    sender,
                    {
                        memberNumber:
                            sender,

                        name
                    }
                );

                savePendingRequests();

                ui?.refresh();
            }

            return;
        }

        // =====================================================
        // DISCONNECT
        // =====================================================

        if (
            data.Type === "Whisper" &&
            message.toLowerCase() ===
                DISCONNECT_COMMAND.toLowerCase()
        ) {
            disconnectUser(
                sender
            );
        }
    }

    // =========================================================
    // ROOM MAINTENANCE
    // =========================================================

    function refreshRoomData() {
        const currentMembers =
            new Set(
                getRoomCharacters()
                    .map(
                        character =>
                            normalizeMemberNumber(
                                character?.MemberNumber
                            )
                    )
                    .filter(
                        Boolean
                    )
            );

        for (
            const memberNumber
            of bambiPresence.keys()
        ) {
            if (
                !currentMembers.has(
                    memberNumber
                )
            ) {
                bambiPresence.delete(
                    memberNumber
                );
            }
        }

        for (
            const memberNumber
            of connectedUsers.keys()
        ) {
            const user =
                connectedUsers.get(
                    memberNumber
                );

            if (
                currentMembers.has(
                    memberNumber
                )
            ) {
                user.name =
                    getCharacterName(
                        memberNumber
                    );
            }
        }

        saveConnections();

        announcePresence();
        ui?.refresh();
    }

    // =========================================================
    // INITIALIZATION
    // =========================================================

    loadStorage();
    settings.language = i18n.setLocale(settings.language);

    ui = createUIController({
        settings,
        t,
        setLocale: locale => i18n.setLocale(locale),
        saveSettings,
        acceptConnection,
        disconnectUser,
        requestConnection,
        playTrigger,
        sendTriggerToUser,
        stopAllLayers,
        scheduleRemainingWake,
        pendingRequests,
        connectedUsers,
        isInCurrentRoom,
        getRoomCharacters,
        normalizeMemberNumber,
        getCharacterName
    });

    namespace.version = VERSION;
    namespace.config = Object.freeze({
        version: VERSION,
        triggerCount: TRIGGERS.length,
        storageKeys: Object.freeze({
            settings: SETTINGS_KEY,
            connections: CONNECTIONS_KEY,
            pending: PENDING_KEY,
            sleep: SLEEP_KEY
        })
    });
    namespace.i18n = Object.freeze({
        getLocale: () => i18n.resolvedLocale,
        getPreference: () => i18n.locale,
        setLocale: locale => {
            settings.language = i18n.setLocale(locale);
            saveSettings();
            if (ui?.isMounted()) ui.create();
            return i18n.resolvedLocale;
        },
        t
    });
    namespace.api = Object.freeze({
        refresh: refreshRoomData,
        stopAllAudio: stopAllLayers,
        getSettings: () => structuredCloneCompat(settings),
        getConnections: () => [...connectedUsers.values()].map(structuredCloneCompat)
    });
    installAudioUnlock();

    const wait =
        setInterval(
            () => {
                if (
                    typeof Player ===
                    "undefined"
                ) {
                    return;
                }

                if (
                    typeof ChatRoomData ===
                    "undefined"
                ) {
                    return;
                }

                if (
                    !registerBambiMod()
                ) {
                    return;
                }

                if (!hooks) {
                    hooks = createHooks({
                        bambiMod,
                        settings,
                        bambiPresence,
                        normalizeMemberNumber,
                        now,
                        isInCurrentRoom,
                        handleBambiMessage,
                        handleBambiChatMessage
                    });
                }

                const messageHookReady =
                    hooks.installMessageHook();

                const labelHookReady =
                    hooks.installLabelHook();

                if (
                    !messageHookReady ||
                    !labelHookReady
                ) {
                    return;
                }

                clearInterval(
                    wait
                );

                ui.create();

                scheduleRemainingWake();

                setTimeout(
                    refreshRoomData,
                    1000
                );

                setInterval(
                    refreshRoomData,
                    5000
                );

                setInterval(
                    () => {
                        const cutoff =
                            now() -
                            15000;

                        for (
                            const [
                                memberNumber,
                                presence
                            ]
                            of bambiPresence
                        ) {
                            if (
                                presence.lastSeen <
                                cutoff
                            ) {
                                bambiPresence.delete(
                                    memberNumber
                                );
                            }
                        }
                    },
                    5000
                );

                console.log(
                    `Bambi Obeys ${VERSION} loaded successfully.`
                );

                namespace.state = "ready";
            },
            1000
        );

}
