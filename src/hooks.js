export function createHooks({
    bambiMod,
    settings,
    bambiPresence,
    normalizeMemberNumber,
    now,
    isInCurrentRoom,
    handleBambiMessage,
    handleBambiChatMessage
}) {
    let bambiMessageHookInstalled = false;
    let bambiDrawHookInstalled = false;

    function installBambiMessageHook() {
        if (
            bambiMessageHookInstalled
        ) {
            return true;
        }
    
        if (
            !bambiMod ||
            typeof bambiMod.hookFunction !==
                "function"
        ) {
            return false;
        }
    
        try {
            bambiMod.hookFunction(
                "ChatRoomMessage",
                1,
                (args, next) => {
                    const data =
                        args[0];
    
                    try {
                        handleBambiMessage(
                            data
                        );
    
                        handleBambiChatMessage(
                            data
                        );
                    } catch (error) {
                        console.error(
                            "Bambi Obeys: message error",
                            error
                        );
                    }
    
                    return next(
                        args
                    );
                }
            );
    
            bambiMessageHookInstalled =
                true;
    
            return true;
        } catch (error) {
            console.error(
                "Bambi Obeys: message hook failed",
                error
            );
    
            return false;
        }
    }
    
    // =========================================================
    // BAMBI LABELS
    // =========================================================
    
    function getMainCanvasContext() {
        try {
            if (
                typeof MainCanvasCtx !==
                    "undefined" &&
                MainCanvasCtx &&
                typeof MainCanvasCtx.fillText ===
                    "function"
            ) {
                return MainCanvasCtx;
            }
        } catch {}
    
        try {
            if (
                typeof MainCanvas !==
                    "undefined" &&
                MainCanvas
            ) {
                if (
                    typeof MainCanvas.fillText ===
                    "function"
                ) {
                    return MainCanvas;
                }
    
                if (
                    typeof MainCanvas.getContext ===
                        "function"
                ) {
                    const ctx =
                        MainCanvas.getContext(
                            "2d"
                        );
    
                    if (
                        ctx &&
                        typeof ctx.fillText ===
                            "function"
                    ) {
                        return ctx;
                    }
                }
            }
        } catch {}
    
        return null;
    }
    
    function drawBambiLabel(
        context,
        memberNumber,
        CharX,
        CharY,
        Zoom
    ) {
        if (
            !settings.showBambiLabels
        ) {
            return;
        }
    
        const normalized =
            normalizeMemberNumber(
                memberNumber
            );
    
        if (!normalized) {
            return;
        }
    
        const myNumber =
            normalizeMemberNumber(
                Player?.MemberNumber
            );
    
        const isMe =
            normalized ===
            myNumber;
    
        let labelXOffset;
        let labelYOffset;
    
        if (isMe) {
            labelXOffset =
                Number(
                    settings.labelXOffset
                );
    
            labelYOffset =
                Number(
                    settings.labelYOffset
                );
        } else {
            const presence =
                bambiPresence.get(
                    normalized
                );
    
            if (!presence) {
                return;
            }
    
            if (
                now() -
                    Number(
                        presence.lastSeen
                    ) >
                15000
            ) {
                return;
            }
    
            if (
                !isInCurrentRoom(
                    normalized
                )
            ) {
                return;
            }
    
            labelXOffset =
                Number(
                    presence.labelXOffset
                );
    
            labelYOffset =
                Number(
                    presence.labelYOffset
                );
        }
    
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
    
        const x =
            Number(
                CharX
            );
    
        const y =
            Number(
                CharY
            );
    
        const zoomValue =
            Number(
                Zoom
            );
    
        if (
            !Number.isFinite(x) ||
            !Number.isFinite(y) ||
            !Number.isFinite(
                zoomValue
            )
        ) {
            return;
        }
    
        const oldAlpha =
            context.globalAlpha;
    
        const oldFillStyle =
            context.fillStyle;
    
        const oldFont =
            context.font;
    
        const oldTextAlign =
            context.textAlign;
    
        const oldTextBaseline =
            context.textBaseline;
    
        const text =
            String(
                settings.labelText ||
                    "Bambi"
            );
    
        const alpha =
            Math.max(
                0,
                Math.min(
                    1,
                    Number(
                        settings.labelOpacity
                    )
                )
            );
    
        try {
            context.save();
    
            context.globalAlpha =
                alpha;
    
            context.fillStyle =
                "#ff8fc7";
    
            context.font =
                "bold 18px Arial";
    
            context.textAlign =
                "center";
    
            context.textBaseline =
                "middle";
    
            const labelX =
                x +
                labelXOffset;
    
            const labelY =
                y +
                950 *
                    zoomValue +
                labelYOffset;
    
            if (
                typeof context.shadowColor !==
                    "undefined"
            ) {
                context.shadowColor =
                    "rgba(255,105,180,0.9)";
    
                context.shadowBlur =
                    4;
            }
    
            context.fillText(
                text,
                labelX,
                labelY
            );
        } catch (error) {
            console.error(
                "Bambi Obeys: label draw failed",
                error
            );
        } finally {
            try {
                context.restore();
            } catch {}
    
            try {
                context.globalAlpha =
                    oldAlpha;
    
                context.fillStyle =
                    oldFillStyle;
    
                context.font =
                    oldFont;
    
                context.textAlign =
                    oldTextAlign;
    
                context.textBaseline =
                    oldTextBaseline;
            } catch {}
        }
    }
    
    function installBambiLabelHook() {
        if (
            bambiDrawHookInstalled
        ) {
            return true;
        }
    
        if (
            !bambiMod ||
            typeof bambiMod.hookFunction !==
                "function"
        ) {
            return false;
        }
    
        try {
            bambiMod.hookFunction(
                "ChatRoomDrawCharacterStatusIcons",
                1,
                (args, next) => {
                    const result =
                        next(args);
    
                    try {
                        const [
                            C,
                            CharX,
                            CharY,
                            Zoom
                        ] = args;
    
                        if (
                            !settings.showBambiLabels ||
                            !C ||
                            !C.MemberNumber
                        ) {
                            return result;
                        }
    
                        const memberNumber =
                            normalizeMemberNumber(
                                C.MemberNumber
                            );
    
                        if (!memberNumber) {
                            return result;
                        }
    
                        const context =
                            getMainCanvasContext();
    
                        if (!context) {
                            return result;
                        }
    
                        drawBambiLabel(
                            context,
                            memberNumber,
                            CharX,
                            CharY,
                            Zoom
                        );
                    } catch (error) {
                        console.error(
                            "Bambi Obeys: label hook error",
                            error
                        );
                    }
    
                    return result;
                }
            );
    
            bambiDrawHookInstalled =
                true;
    
            return true;
        } catch (error) {
            console.error(
                "Bambi Obeys: failed to hook ChatRoomDrawCharacterStatusIcons",
                error
            );
    
            return false;
        }
    }

    return Object.freeze({
        installMessageHook: installBambiMessageHook,
        installLabelHook: installBambiLabelHook
    });
}
