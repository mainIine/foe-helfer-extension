/*
 * **************************************************************************************
 * Copyright (C) 2026 FoE-Helper team - All Rights Reserved
 * You may use, distribute and modify this code under the
 * terms of the AGPL license.
 *
 * See file LICENSE.md or go to
 * https://github.com/mainIine/foe-helfer-extension/blob/master/LICENSE.md
 * for full license details.
 *
 * **************************************************************************************
 */

/**
 * Pointer interaction for the City Builder canvas: hover tooltips with a
 * highlight, and - with the remove mode enabled - click-to-remove for
 * planned buildings. All handlers are bound directly on the canvas element,
 * so they keep working after the box is adopted by the pop-out window.
 */
CityBuilder.Interaction = {

    /** Currently hovered layout entry or null. */
    Hover: null,

    /** Sequence guard: only the latest async tooltip request may render. */
    _tooltipSeq: 0,

    /** Pointer-down position and travel to tell a click from a pan drag. */
    _downX: 0,
    _downY: 0,
    _dragDist: 0,


    /**
     * Binds all pointer handlers on the map canvas. Called after every
     * render; the fresh canvas element carries no old listeners.
     *
     * @param {HTMLCanvasElement} canvas - The map canvas.
     */
    bind: (canvas) => {
        if (!canvas || canvas.dataset.interactionBound) return;
        canvas.dataset.interactionBound = '1';

        canvas.addEventListener('pointerdown', (e) => {
            CityBuilder.Interaction._downX = e.clientX;
            CityBuilder.Interaction._downY = e.clientY;
            CityBuilder.Interaction._dragDist = 0;
        });
        canvas.addEventListener('pointermove', CityBuilder.Interaction.onMove);
        canvas.addEventListener('pointerleave', CityBuilder.Interaction.onLeave);
        canvas.addEventListener('click', CityBuilder.Interaction.onClick);
    },


    /**
     * Finds the planned building that covers a canvas point. Roads and other
     * generated entries carry no instance id and do not count as hits.
     *
     * @param {number} ox - X in untransformed canvas pixels (event offsetX).
     * @param {number} oy - Y in untransformed canvas pixels (event offsetY).
     * @returns {Object|null} The layout entry or null.
     */
    hitTest: (ox, oy) => {
        if (!CityBuilder.Data) return null;
        const tx = ox / CityBuilder.MapScale;
        const ty = oy / CityBuilder.MapScale;
        for (const b of CityBuilder.Data) {
            if (b.id === undefined || b.id === null) continue;
            if (tx >= b.x && tx < b.x + b.width && ty >= b.y && ty < b.y + b.height) return b;
        }
        return null;
    },


    /**
     * Hover tracking: updates the highlight layer and the tooltip whenever
     * the pointer crosses a building border. Also accumulates the drag
     * distance while a button is held, so onClick can ignore pan drags.
     *
     * @param {PointerEvent} e - Pointer move event on the canvas.
     */
    onMove: (e) => {
        const my = CityBuilder.Interaction;

        // while a button is held the user is panning the pop-out map -
        // only measure the drag, no hover flicker under the moving map
        if (e.buttons) {
            my._dragDist += Math.abs(e.clientX - my._downX) + Math.abs(e.clientY - my._downY);
            my._downX = e.clientX;
            my._downY = e.clientY;
            return;
        }

        const hit = my.hitTest(e.offsetX, e.offsetY);
        if (hit === my.Hover) return;

        my.Hover = hit;
        my.setHighlight(hit);
        my.showTooltip(hit, e.target);
    },


    /**
     * Clears highlight and tooltip when the pointer leaves the canvas.
     */
    onLeave: () => {
        const my = CityBuilder.Interaction;
        if (!my.Hover && !CityBuilder.Renderer.Highlight) return;
        my.Hover = null;
        my.setHighlight(null);
        my.showTooltip(null);
    },


    /**
     * Updates the renderer's highlight layer for the given building: red in
     * remove mode (except for the town hall, which cannot be removed),
     * white for a plain hover.
     *
     * @param {Object|null} b - Hovered layout entry.
     */
    setHighlight: (b) => {
        const removable = b && CityBuilder.EditMode && b.type !== 'main_building';
        CityBuilder.Renderer.Highlight = b ? { building: b, mode: removable ? 'remove' : 'hover' } : null;
        CityBuilder.Renderer.render();
    },


    /**
     * Shows the building tooltip through the shared tooltip system. The
     * tooltip context of the canvas' own window is used, so tooltips also
     * follow the mouse inside the pop-out window.
     *
     * @param {Object|null} b - Hovered layout entry, null hides the tooltip.
     * @param {HTMLElement} [canvas] - The canvas, source of the window context.
     */
    showTooltip: async (b, canvas) => {
        const my = CityBuilder.Interaction;
        const seq = ++my._tooltipSeq;

        if (typeof Tooltips === 'undefined') return;

        if (!b || !b.asset_id || !CityBuilder.ShowTooltips) {
            Tooltips.deactivate();
            return;
        }

        const win = canvas ? canvas.ownerDocument.defaultView : window;
        const ctx = Tooltips.contexts.get(win);
        if (!ctx) return;

        Tooltips.activate(ctx);

        const dataset = { meta_id: b.asset_id };
        if (b.id !== undefined && b.id !== null && !String(b.id).startsWith('chain-')) {
            dataset.id = String(b.id);
        }

        let content = null;
        try {
            content = await Tooltips.buildingTT({ currentTarget: { dataset } });
        } catch (err) {
            console.error('CityBuilder: building tooltip failed', err);
        }

        // pointer moved on while the tooltip content was computed
        if (seq !== my._tooltipSeq || my.Hover !== b) return;

        if (content) Tooltips.set(content);
        else Tooltips.deactivate();
    },


    /**
     * Click handling for the remove mode: takes the clicked building off the
     * map and moves it into the unplaced-buildings box. Clicks that ended a
     * pan drag and clicks without the remove mode are ignored.
     *
     * @param {PointerEvent} e - Click event on the canvas.
     */
    onClick: (e) => {
        const my = CityBuilder.Interaction;

        if (my._dragDist > 4) return;
        if (!CityBuilder.EditMode) return;

        const b = my.hitTest(e.offsetX, e.offsetY);
        if (!b || b.type === 'main_building') return;

        my.removeBuilding(b);
    },


    /**
     * Removes a planned building from the current layout: it disappears from
     * the map, is listed in the unplaced-buildings box and stays excluded
     * from every following recalculation until the user restores it.
     *
     * @param {Object} b - Layout entry to remove.
     */
    removeBuilding: (b) => {
        const my = CityBuilder.Interaction;

        CityBuilder.Data = CityBuilder.Data.filter(entry => entry !== b);
        CityBuilder.Excluded.add(b.id);
        CityBuilder.Removed.push({
            id: b.id,
            asset_id: b.asset_id,
            name: b.name,
            type: b.type,
            width: b.width,
            height: b.height
        });

        my.Hover = null;
        CityBuilder.Renderer.Highlight = null;
        if (typeof Tooltips !== 'undefined') Tooltips.deactivate();

        CityBuilder.Renderer.render();
        CityBuilder.showUnplaced();
    }
};
