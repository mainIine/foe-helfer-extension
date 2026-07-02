/*
 * *************************************************************************************
 *
 * Copyright (C) 2026 FoE-Helper team - All Rights Reserved
 * You may use, distribute and modify this code under the
 * terms of the AGPL license.
 *
 * See file LICENSE.md or go to
 * https://github.com/mainIine/foe-helfer-extension/blob/master/LICENSE.md
 * for full license details.
 *
 * *************************************************************************************
 */

/**
 * Namespace responsible for tracking mouse movements, managing custom click zones (actions),
 * and simulating coordinate-accurate mouse events on the game canvas.
 */
let mouseActions = {
    actions: [],
    randomClickRadius: 3,
    targetEl: null,
    lastMouseCoords: {},


    /**
     * Initializes the mouse action listeners and hooks into the openfl-content container.
     * @async
     * @returns {Promise<void>}
     */
    init: async () => {
        await ExistenceConfirmed('$("#openfl-content canvas")');

        mouseActions.targetEl = $("#openfl-content canvas")[0];

        $("#openfl-content").on("click", (e) => {
            const X = e.clientX;
            const Y = e.clientY;

            for (const action of mouseActions.actions) {
                const coords1 = mouseActions.calcCoords(action.area[0]);
                const coords2 = mouseActions.calcCoords(action.area[1]);

                const X1 = Math.min(coords1[0], coords2[0]);
                const X2 = Math.max(coords1[0], coords2[0]);
                const Y1 = Math.min(coords1[1], coords2[1]);
                const Y2 = Math.max(coords1[1], coords2[1]);

                const inside = action.area[2] ?? true;
                const isWithinBounds = X >= X1 && X <= X2 && Y >= Y1 && Y <= Y2;

                // Vergleicht logisch, ob das Event innerhalb/außerhalb wie gewünscht triggert
                if (isWithinBounds === inside) {
                    action.callback(X, Y);
                }
            }
        });

        $("#openfl-content").on("mousemove", (e) => {
            mouseActions.lastMouseCoords = { clientX: e.clientX, clientY: e.clientY };
        });
    },


    /**
     * Registers a bounding box zone with a specific callback.
     * @param {Array} area - Format: [[x1, y1, anchor1], [x2, y2, anchor2], insideBoolean]
     * @param {Function} callback - Triggered when a match occurs. Passes (X, Y).
     */
    addAction: (area, callback) => {
        mouseActions.actions.push({ area: area, callback: callback });
    },


    /**
     * Synthesizes and dispatches a low-level MouseEvent to a target element.
     * @param {HTMLElement} element - Target DOM node.
     * @param {string} eventName - Type of mouse event (e.g., 'click', 'mousedown').
     * @param {Object} [options={}] - Custom event properties (clientX, clientY, bubbles, etc.).
     */
    simulate: (element, eventName, options = {}) => {
        if (!/^(?:click|dblclick|mouse(?:down|enter|leave|up|over|move|out))$/.test(eventName)) return;

        const oEvent = new MouseEvent(eventName, options);
        element.dispatchEvent(oEvent);
    },


    /**
     * Executes a combined mousedown and mouseup sequence onto the target element.
     * @param {Object} [vars={}] - Coordinate options object.
     */
    click: (vars = {}) => {
        mouseActions.simulate(mouseActions.targetEl, "mousedown", vars);
        mouseActions.simulate(mouseActions.targetEl, "mouseup", vars);
    },


    /**
     * Converts game layout coordinates from an older dynamic anchor layout to a newer destination anchor.
     * @param {Array} coords - Format: [x, y, anchorString]
     * @param {string} [anchorNew="TopLeft"] - Target anchor strategy.
     * @returns {Array} Formatted as [xNew, yNew, anchorNew]
     */
    calcCoords: (coords, anchorNew = "TopLeft") => {
        const H = window.innerHeight;
        const W = window.innerWidth;
        const xOld = coords[0];
        const yOld = coords[1];
        const anchorOld = coords[2] || "TopLeft";

        let x = xOld;
        let y = yOld;
        let xNew, yNew;

        if (anchorOld.includes("Center")) {
            x = xOld + Math.floor(W / 2);
            y = yOld + Math.floor(H / 2);
        }
        if (anchorOld.includes("Top")) y = yOld;
        if (anchorOld.includes("Bottom")) y = yOld + H;
        if (anchorOld.includes("Left")) x = xOld;
        if (anchorOld.includes("Right")) x = xOld + W;

        if (anchorNew.includes("Center")) {
            xNew = x - Math.floor(W / 2);
            yNew = y - Math.floor(H / 2);
        }
        if (anchorNew.includes("Top")) yNew = y;
        if (anchorNew.includes("Bottom")) yNew = y - H;
        if (anchorNew.includes("Left")) xNew = x;
        if (anchorNew.includes("Right")) xNew = x - W;

        return [xNew, yNew, anchorNew];
    },


    /**
     * Moves the cursor, performs n clicks within a randomized micro-radius, and snaps back.
     * @param {Array} coords - Original location coordinates array.
     * @param {number} [n=1] - Number of clicks to repeat.
     */
    randomClick: (coords, n = 1) => {
        const previousCoords = Object.assign({}, mouseActions.lastMouseCoords);
        const r = () => Math.floor(Math.random() * (2 * mouseActions.randomClickRadius + 1)) - mouseActions.randomClickRadius;
        const limits = (min, value, max) => Math.min(Math.max(value + r(), min), max);

        const TLCoords = mouseActions.calcCoords(coords, "TopLeft");
        const randomCoords = {
            clientX: limits(0, TLCoords[0], window.innerWidth - 1),
            clientY: limits(0, TLCoords[1], window.innerHeight - 1)
        };

        mouseActions.simulate(mouseActions.targetEl, "mousemove", randomCoords);
        for (let i = 0; i < n; i++) {
            mouseActions.click(randomCoords);
        }
        mouseActions.simulate(mouseActions.targetEl, "mousemove", previousCoords);
    }
};


/**
 * Module dedicated to transforming paste and raw string text directly into sequential key injection sequences.
 */
let KeyboardEvents = (() => {
    const selector = '#openfl-content input';
    const charDelay = 5; // ms execution gap per character


    /**
     * Converts a string into asynchronous programmatic KeyboardEvents.
     * @async
     * @param {string} text - Payload characters to inject.
     * @param {string} [sel=selector] - Target input element selector string.
     * @param {number} [delay=charDelay] - Throttle time between letters.
     * @returns {Promise<boolean>} Resolves true when processing completes.
     */
    async function pasteAsKeyEvents(text, sel = selector, delay = charDelay) {
        const el = document.querySelector(sel);
        if (!el) return false;

        for (let i = 0; i < text.length; i++) {
            const ch = text[i];
            const isUpper = ch.toUpperCase() === ch && /[A-Z]/.test(ch);
            const key = ch;
            const charCode = ch.charCodeAt(0);
            const keyCode = charCode;

            const kd = new KeyboardEvent('keydown', {
                key,
                code: /[a-zA-Z]/.test(ch) ? 'Key' + ch.toUpperCase() : 'Unidentified',
                keyCode,
                which: keyCode,
                charCode: 0,
                bubbles: true,
                cancelable: true,
                composed: true,
                shiftKey: isUpper
            });
            el.dispatchEvent(kd);

            const pos = (el.selectionStart !== null) ? el.selectionStart : el.value.length;
            el.value = el.value.slice(0, pos) + ch + el.value.slice(el.selectionEnd || pos);
            el.setSelectionRange(pos + 1, pos + 1);

            el.dispatchEvent(new InputEvent('input', {
                bubbles: true,
                composed: true
            }));

            if (delay > 0) {
                await new Promise(r => setTimeout(r, delay));
            }
        }
        return true;
    }


    /**
     * Safely reads the system clipboard text contents and feeds them to the execution pipe.
     * @async
     * @param {string} [sel=selector] - Target input selector.
     * @param {number} [delay=charDelay] - Delay speed.
     */
    async function pasteClipboardAsKeys(sel = selector, delay = charDelay) {
        try {
            const text = await navigator.clipboard.readText();
            if (!text) throw new Error('Zwischenablage leer');
            return await pasteAsKeyEvents(text, sel, delay);
        } catch (e) {
            /* Silent Catch to match original behavior */
        }
    }


    return {
        paste: (x) => {
            if (!x) {
                pasteClipboardAsKeys();
            } else {
                pasteAsKeyEvents(x);
            }
        }
    };
})();

// Initialize system
mouseActions.init();

/**
 * Automates rapid continuous building mechanics via recorded grid offsets.
 */
let buildRepeat = {
    lastBuildClick: null,
    click: () => {
        if (!Settings.GetSetting('RepeatSelectBuilding')) return;
        mouseActions.randomClick(buildRepeat.lastBuildClick);
    }
};

// Bind Build Actions Tracking
mouseActions.addAction([[210, -487, 'BottomLeft'], [0, 0, "BottomLeft"]], (X, Y) => {
    buildRepeat.lastBuildClick = mouseActions.calcCoords([X, Y], "BottomLeft");
});

FoEproxy.addRequestHandler("CityMapService", "placeBuilding", (data) => {
    if (MainParser.CityEntities[data.requestData[0].cityentity_id].type !== "street") {
        buildRepeat.click();
    }
});