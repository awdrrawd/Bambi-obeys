import { TRIGGERS } from "./config.js";

export function createUIController({
    settings,
    t,
    setLocale,
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
}) {
    let selectedTrigger = 0;
    let selectedTarget = "";
    let panelOpen = false;
    let activeTab = "Triggers";
    let targetSelect = null;
    let connectSelect = null;
    let statusText = null;
    let panel = null;
    let container = null;
    let tabs = {};
    let tabContents = {};

    // =========================================================
    // UI HELPERS
    // =========================================================
    
    function setStatus(
        text
    ) {
        if (
            statusText
        ) {
            statusText.textContent =
                text;
        }
    }
    
    function makeButton(
        text,
        onClick,
        accent = false
    ) {
        const button =
            document.createElement(
                "button"
            );
    
        button.textContent =
            text;
    
        Object.assign(
            button.style,
            {
                width:
                    "100%",
    
                padding:
                    "7px",
    
                marginBottom:
                    "7px",
    
                cursor:
                    "pointer",
    
                background:
                    accent
                        ? "#ff4fa3"
                        : "#6b3158",
    
                color:
                    "#fff",
    
                border:
                    "1px solid #ff8fc7",
    
                borderRadius:
                    "5px"
            }
        );
    
        button.onclick =
            onClick;
    
        return button;
    }
    
    function makeCheckbox(
        labelText,
        checked,
        onChange
    ) {
        const row =
            document.createElement(
                "label"
            );
    
        Object.assign(
            row.style,
            {
                display:
                    "flex",
    
                alignItems:
                    "center",
    
                gap:
                    "7px",
    
                marginBottom:
                    "8px",
    
                cursor:
                    "pointer"
            }
        );
    
        const checkbox =
            document.createElement(
                "input"
            );
    
        checkbox.type =
            "checkbox";
    
        checkbox.checked =
            checked;
    
        checkbox.onchange =
            () =>
                onChange(
                    checkbox.checked
                );
    
        const text =
            document.createElement(
                "span"
            );
    
        text.textContent =
            labelText;
    
        row.appendChild(
            checkbox
        );
    
        row.appendChild(
            text
        );
    
        return row;
    }
    
    function makeNumberSlider(
        labelText,
        min,
        max,
        step,
        value,
        format,
        onChange
    ) {
        const wrap =
            document.createElement(
                "div"
            );
    
        wrap.style.marginBottom =
            "10px";
    
        const label =
            document.createElement(
                "div"
            );
    
        Object.assign(
            label.style,
            {
                fontSize:
                    "12px",
    
                color:
                    "#ffb8d9",
    
                marginBottom:
                    "4px"
            }
        );
    
        const valueText =
            document.createElement(
                "span"
            );
    
        valueText.textContent =
            format(value);
    
        label.textContent =
            labelText +
            ": ";
    
        label.appendChild(
            valueText
        );
    
        const range =
            document.createElement(
                "input"
            );
    
        range.type =
            "range";
    
        range.min =
            String(min);
    
        range.max =
            String(max);
    
        range.step =
            String(step);
    
        range.value =
            String(value);
    
        range.style.width =
            "100%";
    
        range.oninput =
            () => {
                const numeric =
                    Number(
                        range.value
                    );
    
                valueText.textContent =
                    format(
                        numeric
                    );
    
                onChange(
                    numeric
                );
            };
    
        wrap.appendChild(
            label
        );
    
        wrap.appendChild(
            range
        );
    
        return wrap;
    }
    
    function buildTabButton(
        name,
        label
    ) {
        const button =
            document.createElement(
                "button"
            );
    
        button.textContent =
            label;
    
        Object.assign(
            button.style,
            {
                flex:
                    "1",
    
                padding:
                    "7px 4px",
    
                cursor:
                    "pointer",
    
                background:
                    "#5b2447",
    
                color:
                    "#fff",
    
                border:
                    "1px solid #ff69b4",
    
                borderRadius:
                    "4px",
    
                fontSize:
                    "11px"
            }
        );
    
        button.onclick =
            () =>
                switchTab(
                    name
                );
    
        tabs[name] =
            button;
    
        return button;
    }
    
    function createContentArea() {
        const content =
            document.createElement(
                "div"
            );
    
        Object.assign(
            content.style,
            {
                maxHeight:
                    "480px",
    
                overflowY:
                    "auto",
    
                paddingRight:
                    "3px"
            }
        );
    
        return content;
    }
    
    function switchTab(
        name
    ) {
        activeTab =
            name;
    
        for (
            const [
                tabName,
                button
            ]
            of Object.entries(
                tabs
            )
        ) {
            button.style.background =
                tabName ===
                    activeTab
                    ? "#ff4fa3"
                    : "#5b2447";
        }
    
        for (
            const [
                tabName,
                content
            ]
            of Object.entries(
                tabContents
            )
        ) {
            content.style.display =
                tabName ===
                    activeTab
                    ? "block"
                    : "none";
        }
    }
    
    function styleSelect(
        select
    ) {
        Object.assign(
            select.style,
            {
                width:
                    "100%",
    
                padding:
                    "7px",
    
                marginBottom:
                    "7px",
    
                boxSizing:
                    "border-box",
    
                background:
                    "#fff0f7",
    
                color:
                    "#48172f",
    
                border:
                    "1px solid #ff69b4",
    
                borderRadius:
                    "5px"
            }
        );
    }
    
    // =========================================================
    // AUTHORITY TAB
    // =========================================================
    
    function buildAuthorityTab(
        content
    ) {
        const heading =
            document.createElement(
                "div"
            );
    
        heading.textContent =
            t("authority.heading");
    
        heading.style.marginBottom =
            "6px";
    
        heading.style.fontWeight =
            "bold";
    
        content.appendChild(
            heading
        );
    
        const modes = [
            [
                "owner",
                t("authority.owner")
            ],
            [
                "friends",
                t("authority.friends")
            ],
            [
                "connected",
                t("authority.connected")
            ],
            [
                "anyone",
                t("authority.anyone")
            ]
        ];
    
        for (
            const [
                value,
                label
            ]
            of modes
        ) {
            const row =
                document.createElement(
                    "label"
                );
    
            row.style.display =
                "flex";
    
            row.style.gap =
                "7px";
    
            row.style.marginBottom =
                "6px";
    
            const input =
                document.createElement(
                    "input"
                );
    
            input.type =
                "radio";
    
            input.name =
                "bambi-authority";
    
            input.value =
                value;
    
            input.checked =
                settings.authorityMode ===
                value;
    
            input.onchange =
                () => {
                    if (
                        !input.checked
                    ) {
                        return;
                    }
    
                    settings.authorityMode =
                        value;
    
                    saveSettings();
                };
    
            const text =
                document.createElement(
                    "span"
                );
    
            text.textContent =
                label;
    
            row.appendChild(
                input
            );
    
            row.appendChild(
                text
            );
    
            content.appendChild(
                row
            );
        }
    
        const whitelistLabel =
            document.createElement(
                "div"
            );
    
        whitelistLabel.textContent =
            t("authority.whitelist");
    
        Object.assign(
            whitelistLabel.style,
            {
                color:
                    "#ffb8d9",
    
                fontSize:
                    "12px",
    
                marginTop:
                    "12px",
    
                marginBottom:
                    "4px"
            }
        );
    
        content.appendChild(
            whitelistLabel
        );
    
        const whitelist =
            document.createElement(
                "textarea"
            );
    
        whitelist.value =
            settings.whitelist;
    
        whitelist.placeholder =
            "12345, 67890, 13579";
    
        Object.assign(
            whitelist.style,
            {
                width:
                    "100%",
    
                minHeight:
                    "55px",
    
                boxSizing:
                    "border-box",
    
                background:
                    "#fff0f7",
    
                color:
                    "#48172f",
    
                border:
                    "1px solid #ff69b4",
    
                borderRadius:
                    "5px",
    
                padding:
                    "6px",
    
                resize:
                    "vertical"
            }
        );
    
        whitelist.onchange =
            () => {
                settings.whitelist =
                    whitelist.value;
    
                saveSettings();
            };
    
        content.appendChild(
            whitelist
        );
    
        content.appendChild(
            document.createElement(
                "hr"
            )
        );
    
        content.appendChild(
            makeCheckbox(
                t("authority.autoAccept"),
                settings.autoAcceptConnections,
                checked => {
                    settings.autoAcceptConnections =
                        checked;
    
                    saveSettings();
                }
            )
        );
    
        content.appendChild(
            makeButton(
                t("authority.disconnect"),
                () => {
                    if (
                        selectedTarget
                    ) {
                        disconnectUser(
                            selectedTarget
                        );
                    }
                }
            )
        );
    
        const note =
            document.createElement(
                "div"
            );
    
        note.textContent =
            t("authority.note");
    
        Object.assign(
            note.style,
            {
                fontSize:
                    "11px",
    
                color:
                    "#d994ba",
    
                marginTop:
                    "8px",
    
                lineHeight:
                    "1.4"
            }
        );
    
        content.appendChild(
            note
        );
    }
    
    // =========================================================
    // TRIGGERS TAB
    // =========================================================
    
    function buildTriggersTab(
        content
    ) {
        const connectLabel =
            document.createElement(
                "div"
            );
    
        connectLabel.textContent =
            t("connection.connectTo");
    
        connectLabel.style.color =
            "#ffb8d9";
    
        connectLabel.style.fontSize =
            "12px";
    
        connectLabel.style.marginBottom =
            "4px";
    
        content.appendChild(
            connectLabel
        );
    
        connectSelect =
            document.createElement(
                "select"
            );
    
        styleSelect(
            connectSelect
        );
    
        content.appendChild(
            connectSelect
        );
    
        content.appendChild(
            makeButton(
                t("connection.sendConnect"),
                () => {
                    if (
                        connectSelect.value
                    ) {
                        requestConnection(
                            connectSelect.value
                        );
                    }
                },
                true
            )
        );
    
        const pending =
            document.createElement(
                "div"
            );
    
        pending.id =
            "bambi-pending-area";
    
        content.appendChild(
            pending
        );
    
        const sendLabel =
            document.createElement(
                "div"
            );
    
        sendLabel.textContent =
            t("connection.sendTo");
    
        sendLabel.style.color =
            "#ffb8d9";
    
        sendLabel.style.fontSize =
            "12px";
    
        sendLabel.style.marginBottom =
            "4px";
    
        content.appendChild(
            sendLabel
        );
    
        targetSelect =
            document.createElement(
                "select"
            );
    
        styleSelect(
            targetSelect
        );
    
        targetSelect.onchange =
            () => {
                selectedTarget =
                    targetSelect.value;
            };
    
        content.appendChild(
            targetSelect
        );
    
        statusText =
            document.createElement(
                "div"
            );
    
        Object.assign(
            statusText.style,
            {
                fontSize:
                    "11px",
    
                color:
                    "#ff9bce",
    
                marginBottom:
                    "8px"
            }
        );
    
        content.appendChild(
            statusText
        );
    
        const triggerLabel =
            document.createElement(
                "div"
            );
    
        triggerLabel.textContent =
            t("trigger.label");
    
        triggerLabel.style.color =
            "#ffb8d9";
    
        triggerLabel.style.fontSize =
            "12px";
    
        triggerLabel.style.marginBottom =
            "4px";
    
        content.appendChild(
            triggerLabel
        );
    
        const triggerSelect =
            document.createElement(
                "select"
            );
    
        styleSelect(
            triggerSelect
        );
    
        TRIGGERS.forEach(
            (
                trigger,
                index
            ) => {
                const option =
                    document.createElement(
                        "option"
                    );
    
                option.value =
                    index;
    
                option.textContent =
                    trigger.name;
    
                triggerSelect.appendChild(
                    option
                );
            }
        );
    
        triggerSelect.value =
            selectedTrigger;
    
        const description =
            document.createElement(
                "div"
            );
    
        Object.assign(
            description.style,
            {
                fontSize:
                    "11px",
    
                color:
                    "#d994ba",
    
                lineHeight:
                    "1.4",
    
                minHeight:
                    "30px",
    
                marginBottom:
                    "8px"
            }
        );
    
        function updateDescription() {
            description.textContent =
                TRIGGERS[
                    selectedTrigger
                ]?.descriptionKey
                    ? t(TRIGGERS[selectedTrigger].descriptionKey)
                    :
                "";
        }
    
        triggerSelect.onchange =
            () => {
                selectedTrigger =
                    Number(
                        triggerSelect.value
                    );
    
                updateDescription();
            };
    
        content.appendChild(
            triggerSelect
        );
    
        updateDescription();
    
        content.appendChild(
            description
        );
    
        content.appendChild(
            makeButton(
                t("trigger.send"),
                () => {
                    if (
                        selectedTarget
                    ) {
                        sendTriggerToUser(
                            selectedTarget,
                            selectedTrigger
                        );
                    }
                },
                true
            )
        );
    
        content.appendChild(
            makeButton(
                t("trigger.test"),
                () => {
                    playTrigger(
                        selectedTrigger
                    );
                }
            )
        );
    
        content.appendChild(
            makeCheckbox(
                t("trigger.acceptIncoming"),
                settings.acceptIncoming,
                checked => {
                    settings.acceptIncoming =
                        checked;
    
                    saveSettings();
                }
            )
        );
    }
    
    // =========================================================
    // SAFETY TAB
    // =========================================================
    
    function buildSafetyTab(
        content
    ) {
        content.appendChild(
            makeCheckbox(
                t("safety.autoWake"),
                settings.autoWakeEnabled,
                checked => {
                    settings.autoWakeEnabled =
                        checked;
    
                    saveSettings();
    
                    scheduleRemainingWake();
                }
            )
        );
    
        content.appendChild(
            makeNumberSlider(
                t("safety.autoWakeAfter"),
                0,
                60,
                1,
                settings.autoWakeMinutes,
                value =>
                    value ===
                        0
                        ? t("safety.disabled")
                        : t("safety.minutes", { value }),
                value => {
                    settings.autoWakeMinutes =
                        value;
    
                    saveSettings();
    
                    scheduleRemainingWake();
                }
            )
        );
    
        const explanation =
            document.createElement(
                "div"
            );
    
        explanation.textContent =
            t("safety.explanation");
    
        Object.assign(
            explanation.style,
            {
                fontSize:
                    "11px",
    
                color:
                    "#d994ba",
    
                lineHeight:
                    "1.4",
    
                marginBottom:
                    "12px"
            }
        );
    
        content.appendChild(
            explanation
        );
    
        const heading =
            document.createElement(
                "div"
            );
    
        heading.textContent =
            t("safety.heading");
    
        heading.style.fontWeight =
            "bold";
    
        heading.style.marginBottom =
            "7px";
    
        content.appendChild(
            heading
        );
    
        TRIGGERS.forEach(
            trigger => {
                content.appendChild(
                    makeCheckbox(
                        trigger.name,
                        settings
                            .enabledTriggers[
                            trigger.name
                        ] !== false,
                        checked => {
                            settings
                                .enabledTriggers[
                                trigger.name
                            ] =
                                checked;
    
                            saveSettings();
                        }
                    )
                );
            }
        );
    
        content.appendChild(
            makeButton(
                t("safety.stopAudio"),
                stopAllLayers
            )
        );
    }
    
    // =========================================================
    // LIMITS TAB
    // =========================================================
    
    function buildLimitsTab(
        content
    ) {
        content.appendChild(
            makeNumberSlider(
                t("limits.layers"),
                1,
                10,
                1,
                settings.maxSimultaneous,
                value =>
                    `${value}`,
                value => {
                    settings.maxSimultaneous =
                        value;
    
                    saveSettings();
                }
            )
        );
    
        content.appendChild(
            makeNumberSlider(
                t("limits.volume"),
                10,
                100,
                5,
                Math.round(
                    Number(
                        settings.secondaryVolume
                    ) *
                        100
                ),
                value =>
                    `${value}%`,
                value => {
                    settings.secondaryVolume =
                        value / 100;
    
                    saveSettings();
                }
            )
        );
    
        content.appendChild(
            makeNumberSlider(
                t("limits.fadeIn"),
                0,
                1000,
                10,
                settings.fadeInMs,
                value =>
                    `${value} ms`,
                value => {
                    settings.fadeInMs =
                        value;
    
                    saveSettings();
                }
            )
        );
    
        content.appendChild(
            makeNumberSlider(
                t("limits.fadeOut"),
                0,
                2000,
                10,
                settings.fadeOutMs,
                value =>
                    `${value} ms`,
                value => {
                    settings.fadeOutMs =
                        value;
    
                    saveSettings();
                }
            )
        );
    
        content.appendChild(
            makeCheckbox(
                t("limits.alternateEars"),
                settings.alternateEars,
                checked => {
                    settings.alternateEars =
                        checked;
    
                    saveSettings();
                }
            )
        );
    
        content.appendChild(
            makeNumberSlider(
                t("limits.cooldown"),
                0,
                5000,
                50,
                settings.cooldownMs,
                value =>
                    value ===
                        0
                        ? t("limits.off")
                        : `${value} ms`,
                value => {
                    settings.cooldownMs =
                        value;
    
                    saveSettings();
                }
            )
        );
    
        content.appendChild(
            makeNumberSlider(
                t("limits.perMinute"),
                1,
                60,
                1,
                settings.maxTriggersPerMinute,
                value =>
                    `${value}`,
                value => {
                    settings.maxTriggersPerMinute =
                        value;
    
                    saveSettings();
                }
            )
        );
    
        const labelHeading =
            document.createElement(
                "div"
            );
    
        labelHeading.textContent =
            t("labels.heading");
    
        labelHeading.style.fontWeight =
            "bold";
    
        labelHeading.style.marginTop =
            "8px";
    
        labelHeading.style.marginBottom =
            "7px";
    
        content.appendChild(
            labelHeading
        );
    
        content.appendChild(
            makeCheckbox(
                t("labels.show"),
                settings.showBambiLabels,
                checked => {
                    settings.showBambiLabels =
                        checked;
    
                    saveSettings();
                }
            )
        );
    
        content.appendChild(
            makeNumberSlider(
                t("labels.opacity"),
                5,
                100,
                5,
                Math.round(
                    Number(
                        settings.labelOpacity
                    ) *
                        100
                ),
                value =>
                    `${value}%`,
                value => {
                    settings.labelOpacity =
                        value / 100;
    
                    saveSettings();
                }
            )
        );
    
        content.appendChild(
            makeNumberSlider(
                t("labels.xOffset"),
                150,
                450,
                1,
                settings.labelXOffset,
                value =>
                    `${value}px`,
                value => {
                    settings.labelXOffset =
                        value;
    
                    saveSettings();
                }
            )
        );
    
        content.appendChild(
            makeNumberSlider(
                t("labels.yOffset"),
                -180,
                120,
                1,
                settings.labelYOffset,
                value =>
                    `${value}px`,
                value => {
                    settings.labelYOffset =
                        value;
    
                    saveSettings();
                }
            )
        );
    
        const labelText =
            document.createElement(
                "input"
            );
    
        labelText.type =
            "text";
    
        labelText.value =
            settings.labelText;
    
        labelText.placeholder =
            "Bambi";
    
        Object.assign(
            labelText.style,
            {
                width:
                    "100%",
    
                boxSizing:
                    "border-box",
    
                padding:
                    "6px",
    
                marginBottom:
                    "7px",
    
                background:
                    "#fff0f7",
    
                color:
                    "#48172f",
    
                border:
                    "1px solid #ff69b4",
    
                borderRadius:
                    "5px"
            }
        );
    
        labelText.onchange =
            () => {
                settings.labelText =
                    labelText.value ||
                    "Bambi";
    
                saveSettings();
            };
    
        content.appendChild(
            labelText
        );
    }
    
    // =========================================================
    // PENDING REQUESTS
    // =========================================================
    
    function refreshPendingArea() {
        const area =
            document.getElementById(
                "bambi-pending-area"
            );
    
        if (!area) {
            return;
        }
    
        area.innerHTML =
            "";
    
        const requests =
            [...pendingRequests.values()]
                .filter(
                    request =>
                        isInCurrentRoom(
                            request.memberNumber
                        )
                );
    
        if (
            !requests.length
        ) {
            return;
        }
    
        const heading =
            document.createElement(
                "div"
            );
    
        heading.textContent =
            t("connection.requests");
    
        Object.assign(
            heading.style,
            {
                fontSize:
                    "12px",
    
                color:
                    "#ffb8d9",
    
                marginBottom:
                    "5px"
            }
        );
    
        area.appendChild(
            heading
        );
    
        for (
            const request
            of requests
        ) {
            const row =
                document.createElement(
                    "div"
                );
    
            Object.assign(
                row.style,
                {
                    display:
                        "flex",
    
                    gap:
                        "5px",
    
                    marginBottom:
                        "5px"
                }
            );
    
            const name =
                document.createElement(
                    "span"
                );
    
            name.textContent =
                request.name;
    
            name.style.flex =
                "1";
    
            const accept =
                document.createElement(
                    "button"
                );
    
            accept.textContent =
                t("connection.accept");
    
            accept.onclick =
                () => {
                    acceptConnection(
                        request.memberNumber
                    );
                };
    
            row.appendChild(
                name
            );
    
            row.appendChild(
                accept
            );
    
            area.appendChild(
                row
            );
        }
    }
    
    function refreshConnectDropdown() {
        if (!connectSelect) {
            return;
        }
    
        connectSelect.innerHTML =
            "";
    
        const others =
            getRoomCharacters()
                .filter(
                    character =>
                        normalizeMemberNumber(
                            character?.MemberNumber
                        ) !==
                        normalizeMemberNumber(
                            Player?.MemberNumber
                        )
                )
                .sort(
                    (a, b) =>
                        getCharacterName(
                            a.MemberNumber
                        ).localeCompare(
                            getCharacterName(
                                b.MemberNumber
                            )
                        )
                );
    
        if (
            !others.length
        ) {
            const option =
                document.createElement(
                    "option"
                );
    
            option.value =
                "";
    
            option.textContent =
                t("connection.noOne");
    
            connectSelect.appendChild(
                option
            );
    
            return;
        }
    
        for (
            const character
            of others
        ) {
            const option =
                document.createElement(
                    "option"
                );
    
            option.value =
                character.MemberNumber;
    
            option.textContent =
                getCharacterName(
                    character.MemberNumber
                );
    
            connectSelect.appendChild(
                option
            );
        }
    }
    
    function refreshTargetDropdown() {
        if (!targetSelect) {
            return;
        }
    
        targetSelect.innerHTML =
            "";
    
        const available =
            [
                ...connectedUsers.values()
            ]
                .filter(
                    user =>
                        isInCurrentRoom(
                            user.memberNumber
                        )
                )
                .filter(
                    user =>
                        normalizeMemberNumber(
                            user.memberNumber
                        ) !==
                        normalizeMemberNumber(
                            Player?.MemberNumber
                        )
                )
                .sort(
                    (a, b) =>
                        a.name.localeCompare(
                            b.name
                        )
                );
    
        if (
            !available.length
        ) {
            const option =
                document.createElement(
                    "option"
                );
    
            option.value =
                "";
    
            option.textContent =
                t("connection.noUsers");
    
            targetSelect.appendChild(
                option
            );
    
            selectedTarget =
                "";
    
            return;
        }
    
        for (
            const user
            of available
        ) {
            const option =
                document.createElement(
                    "option"
                );
    
            option.value =
                user.memberNumber;
    
            option.textContent =
                user.name;
    
            targetSelect.appendChild(
                option
            );
        }
    
        if (
            available.some(
                user =>
                    String(
                        user.memberNumber
                    ) ===
                    String(
                        selectedTarget
                    )
            )
        ) {
            targetSelect.value =
                selectedTarget;
        } else {
            selectedTarget =
                String(
                    available[0]
                        .memberNumber
                );
    
            targetSelect.value =
                selectedTarget;
        }
    }
    
    function refreshStatus() {
        if (
            !statusText
        ) {
            return;
        }
    
        const count =
            [
                ...connectedUsers.values()
            ]
                .filter(
                    user =>
                        isInCurrentRoom(
                            user.memberNumber
                        )
                )
                .filter(
                    user =>
                        normalizeMemberNumber(
                            user.memberNumber
                        ) !==
                        normalizeMemberNumber(
                            Player?.MemberNumber
                        )
                )
                .length;
    
        statusText.textContent =
            t("connection.count", { count });
    }
    
    function refreshAllUI() {
        refreshConnectDropdown();
        refreshTargetDropdown();
        refreshPendingArea();
        refreshStatus();
    }
    
    // =========================================================
    // DRAGGING
    // =========================================================
    
    function makeDraggable(
        element,
        handle
    ) {
        let dragging =
            false;
    
        let moved =
            false;
    
        let offsetX =
            0;
    
        let offsetY =
            0;
    
        let startX =
            0;
    
        let startY =
            0;
    
        handle.addEventListener(
            "mousedown",
            event => {
                if (
                    event.button !==
                    0
                ) {
                    return;
                }
    
                const rect =
                    element.getBoundingClientRect();
    
                offsetX =
                    event.clientX -
                    rect.left;
    
                offsetY =
                    event.clientY -
                    rect.top;
    
                startX =
                    event.clientX;
    
                startY =
                    event.clientY;
    
                moved =
                    false;
    
                dragging =
                    true;
    
                handle.style.cursor =
                    "grabbing";
    
                document.body.style.userSelect =
                    "none";
    
                event.preventDefault();
            }
        );
    
        document.addEventListener(
            "mousemove",
            event => {
                if (!dragging) {
                    return;
                }
    
                if (
                    Math.abs(
                        event.clientX -
                        startX
                    ) > 5 ||
                    Math.abs(
                        event.clientY -
                        startY
                    ) > 5
                ) {
                    moved =
                        true;
                }
    
                let left =
                    event.clientX -
                    offsetX;
    
                let top =
                    event.clientY -
                    offsetY;
    
                const maxLeft =
                    window.innerWidth -
                    element.offsetWidth;
    
                const maxTop =
                    window.innerHeight -
                    element.offsetHeight;
    
                left =
                    Math.max(
                        0,
                        Math.min(
                            left,
                            maxLeft
                        )
                    );
    
                top =
                    Math.max(
                        0,
                        Math.min(
                            top,
                            maxTop
                        )
                    );
    
                element.style.left =
                    `${left}px`;
    
                element.style.top =
                    `${top}px`;
    
                element.style.right =
                    "auto";
    
                element.style.bottom =
                    "auto";
            }
        );
    
        document.addEventListener(
            "mouseup",
            () => {
                if (!dragging) {
                    return;
                }
    
                dragging =
                    false;
    
                handle.style.cursor =
                    "grab";
    
                document.body.style.userSelect =
                    "";
    
                handle.__bambiMoved =
                    moved;
            }
        );
    }
    
    // =========================================================
    // UI
    // =========================================================
    
    function createUI() {
        if (container) {
            container.remove();
        }
    
        tabs = {};
        tabContents = {};
        targetSelect = null;
        connectSelect = null;
        statusText = null;
    
        container =
            document.createElement(
                "div"
            );
    
        Object.assign(
            container.style,
            {
                position:
                    "fixed",
    
                left:
                    "20px",
    
                top:
                    "100px",
    
                zIndex:
                    "999999",
    
                fontFamily:
                    "Arial, sans-serif"
            }
        );
    
        const floatingButton =
            document.createElement(
                "button"
            );
    
        floatingButton.textContent =
            "B";
    
        Object.assign(
            floatingButton.style,
            {
                width:
                    "44px",
    
                height:
                    "44px",
    
                borderRadius:
                    "50%",
    
                border:
                    "2px solid #ff8fc7",
    
                background:
                    "#ff4fa3",
    
                color:
                    "#fff",
    
                fontSize:
                    "18px",
    
                fontWeight:
                    "bold",
    
                cursor:
                    "grab",
    
                boxShadow:
                    "0 4px 12px rgba(255, 50, 150, 0.4)"
            }
        );
    
        floatingButton.title =
            "Bambi Obeys";
    
        panel =
            document.createElement(
                "div"
            );
    
        Object.assign(
            panel.style,
            {
                display:
                    "none",
    
                width:
                    "305px",
    
                marginTop:
                    "8px",
    
                background:
                    "#3a1730",
    
                color:
                    "#fff",
    
                padding:
                    "12px",
    
                borderRadius:
                    "10px",
    
                boxShadow:
                    "0 4px 18px rgba(0,0,0,0.45)",
    
                border:
                    "1px solid #ff69b4"
            }
        );
    
        const header =
            document.createElement(
                "div"
            );
    
        Object.assign(
            header.style,
            {
                display:
                    "flex",
    
                alignItems:
                    "center",
    
                justifyContent:
                    "space-between",
    
                marginBottom:
                    "10px"
            }
        );
    
        const title =
            document.createElement(
                "span"
            );
    
        title.textContent =
            "Bambi Obeys";
    
        Object.assign(
            title.style,
            {
                fontWeight:
                    "bold",
    
                fontSize:
                    "16px",
    
                color:
                    "#ff9bce"
            }
        );
    
        const close =
            document.createElement(
                "button"
            );
    
        close.textContent =
            "×";
    
        Object.assign(
            close.style,
            {
                background:
                    "transparent",
    
                border:
                    "none",
    
                color:
                    "#ff9bce",
    
                fontSize:
                    "22px",
    
                cursor:
                    "pointer"
            }
        );
    
        close.onclick =
            () => {
                panelOpen =
                    false;
    
                panel.style.display =
                    "none";
            };
    
        const languageSelect =
            document.createElement(
                "select"
            );
    
        languageSelect.title =
            t("language.label");
    
        for (const [value, labelKey] of [
            ["auto", "language.auto"],
            ["en", "language.en"],
            ["zh-CN", "language.zh-CN"]
        ]) {
            const option = document.createElement("option");
            option.value = value;
            option.textContent = t(labelKey);
            languageSelect.appendChild(option);
        }
    
        languageSelect.value = settings.language || "auto";
        Object.assign(languageSelect.style, {
            marginLeft: "auto",
            marginRight: "8px",
            maxWidth: "105px",
            background: "#fff0f7",
            color: "#48172f",
            border: "1px solid #ff69b4",
            borderRadius: "4px"
        });
    
        languageSelect.onchange = () => {
            settings.language = languageSelect.value;
            setLocale(settings.language);
            saveSettings();
            createUI();
        };
    
        header.appendChild(
            title
        );
    
        header.appendChild(
            languageSelect
        );
    
        header.appendChild(
            close
        );
    
        panel.appendChild(
            header
        );
    
        const tabBar =
            document.createElement(
                "div"
            );
    
        Object.assign(
            tabBar.style,
            {
                display:
                    "flex",
    
                gap:
                    "4px",
    
                marginBottom:
                    "10px"
            }
        );
    
        const tabDefinitions = [
            ["Authority", "tabs.authority"],
            ["Triggers", "tabs.triggers"],
            ["Safety", "tabs.safety"],
            ["Limits", "tabs.limits"]
        ];
    
        for (
            const [name, labelKey]
            of tabDefinitions
        ) {
            tabBar.appendChild(
                buildTabButton(
                    name,
                    t(labelKey)
                )
            );
        }
    
        panel.appendChild(
            tabBar
        );
    
        for (
            const [name]
            of tabDefinitions
        ) {
            const content =
                createContentArea();
    
            content.style.display =
                "none";
    
            tabContents[name] =
                content;
    
            panel.appendChild(
                content
            );
        }
    
        buildAuthorityTab(
            tabContents.Authority
        );
    
        buildTriggersTab(
            tabContents.Triggers
        );
    
        buildSafetyTab(
            tabContents.Safety
        );
    
        buildLimitsTab(
            tabContents.Limits
        );
    
        container.appendChild(
            floatingButton
        );
    
        container.appendChild(
            panel
        );
    
        document.body.appendChild(
            container
        );
    
        makeDraggable(
            container,
            floatingButton
        );
    
        floatingButton.addEventListener(
            "click",
            () => {
                if (
                    floatingButton.__bambiMoved
                ) {
                    floatingButton.__bambiMoved =
                        false;
    
                    return;
                }
    
                panelOpen =
                    !panelOpen;
    
                panel.style.display =
                    panelOpen
                        ? "block"
                        : "none";
            }
        );
    
        switchTab(
            activeTab
        );
    
        refreshAllUI();
    }

    return Object.freeze({
        create: createUI,
        refresh: refreshAllUI,
        setStatus,
        isMounted: () => Boolean(container)
    });
}
