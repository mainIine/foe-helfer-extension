'use strict';

window.PlannerApp = window.PlannerApp || {};

(function (app) {
    const state = app.state;

    // BASE_KEY stores the large, rarely-changing FoE data (CityEntities etc.).
    // It is written only when a fresh clipboard paste arrives via init().
    // LAYOUT_KEY stores only building positions — tiny, written on every mutation.
    const BASE_KEY   = 'foe_planner_base';
    const LAYOUT_KEY = 'foe_planner_layout';

    /**
     * Strips a raw CityEntities meta object down to only the fields the app
     * actually reads, dramatically reducing localStorage usage.
     *
     * Fields kept:
     *   id, name, type, width, length           — identity + dimensions
     *   components.AllAge.placement.size         — fallback dimensions
     *   components.AllAge.streetConnectionRequirement — street req (new format)
     *   requirements.street_connection_level     — street req (old format)
     *   abilities[*].__class__                   — street req (ability format)
     */
    function slimMeta(meta) {
        const slim = {
            id:   meta.id,
            name: meta.name,
            type: meta.type,
        };

        // Explicit top-level dimensions (may be absent — that's fine).
        if (meta.width  !== undefined) slim.width  = meta.width;
        if (meta.length !== undefined) slim.length = meta.length;

        // Street requirement — old format.
        if (meta.requirements?.street_connection_level !== undefined) {
            slim.requirements = { street_connection_level: meta.requirements.street_connection_level };
        }

        // Street requirement / dimensions — components format.
        const allAge = meta.components?.AllAge;
        if (allAge) {
            const slimAllAge = {};

            const placementSize = allAge.placement?.size;
            if (placementSize) {
                slimAllAge.placement = { size: { x: placementSize.x, y: placementSize.y } };
            }

            if (allAge.streetConnectionRequirement !== undefined) {
                slimAllAge.streetConnectionRequirement = allAge.streetConnectionRequirement;
            }

            if (Object.keys(slimAllAge).length) {
                slim.components = { AllAge: slimAllAge };
            }
        }

        // Street requirement — abilities array format (keep only __class__).
        if (Array.isArray(meta.abilities)) {
            const relevant = meta.abilities
                .filter(a => a?.__class__ === 'StreetConnectionRequirementComponent')
                .map(a => ({ __class__: a.__class__ }));
            if (relevant.length) slim.abilities = relevant;
        }

        return slim;
    }

    /** Convert metaData into a slim version for persistence. */
    function slimMetaData(metaData) {
        const slim = {};
        for (const [key, value] of Object.entries(metaData)) {
            slim[key] = slimMeta(value);
        }
        return slim;
    }

    function init(data) {
        state.metaData = data.CityEntities;
        state.cityData = data.CityMapData;
        state.mapData  = data.UnlockedAreas;

        state.metaById = new Map(Object.values(state.metaData).map(m => [m.id, m]));
        try {
            localStorage.setItem(BASE_KEY, JSON.stringify({
                metaData: slimMetaData(state.metaData),
                cityData: state.cityData,
                mapData:  state.mapData
            }));
        } catch (e) {
            console.warn('Could not cache base data in localStorage:', e);
        }

        app.resizeCanvasToCSSSize();
        app.rebuildGridLayer();
        app.drawMap();
        app.rebuildOccupiedTiles();
        app.updateStats();
        app.showStoredBuildings();
    }

    // --- Serialization ---

    // Layout-only: just positions + metaIds. Very small.
    function serializeLayout() {
        return {
            version: 2,
            mapBuildings: state.mapBuildings.map(b => ({
                metaId: b.meta.id,
                x: b.data.x,
                y: b.data.y
            })),
            storedBuildings: state.storedBuildings.map(b => ({
                metaId: b.meta.id,
                x: b.data.x,
                y: b.data.y
            })),
            camX:      state.camX,
            camY:      state.camY,
            zoomScale: state.zoomScale
        };
    }

    // Full export: self-contained file with everything.
    function serializeState() {
        return {
            version: 2,
            metaData: state.metaData,
            cityData: state.cityData,
            mapData:  state.mapData,
            mapBuildings: state.mapBuildings.map(b => ({
                metaId: b.meta.id,
                x: b.data.x,
                y: b.data.y
            })),
            storedBuildings: state.storedBuildings.map(b => ({
                metaId: b.meta.id,
                x: b.data.x,
                y: b.data.y
            })),
            camX:      state.camX,
            camY:      state.camY,
            zoomScale: state.zoomScale
        };
    }

    function buildingsFromEntries(entries) {
        return (entries || []).map(entry => {
            const meta = state.metaById.get(entry.metaId);
            if (!meta) return null;
            const data = {
                cityentity_id: entry.metaId,
                x: entry.x ?? (entry.data ? entry.data.x : 0) ?? 0,
                y: entry.y ?? (entry.data ? entry.data.y : 0) ?? 0,
            };
            const effectiveMeta = meta.type === 'street'
                ? { ...meta, width: 1, length: 1 }
                : meta;
            return new app.MapBuilding(data, effectiveMeta);
        }).filter(Boolean);
    }

    function applyLayout(layout) {
        state.camX      = layout.camX      ?? 0;
        state.camY      = layout.camY      ?? 0;
        state.zoomScale = layout.zoomScale ?? 0.75;
        state.mapBuildings    = buildingsFromEntries(layout.mapBuildings);
        state.storedBuildings = buildingsFromEntries(layout.storedBuildings);
    }

    function deserializeState(saved) {
        state.metaData = saved.metaData;
        state.cityData = saved.cityData;
        state.mapData  = saved.mapData;
        state.metaById = new Map(Object.values(state.metaData).map(m => [m.id, m]));

        applyLayout(saved);

        app.resizeCanvasToCSSSize();
        app.rebuildGridLayer();
        app.rebuildOccupiedTiles();
        app.redrawMap();
        app.updateStats();
        app.showStoredBuildings();
    }

    // --- localStorage ---

    function saveState() {
        try {
            localStorage.setItem(LAYOUT_KEY, JSON.stringify(serializeLayout()));
            flashSaveBtn();
        } catch (e) {
            console.error('Failed to save layout:', e);
            alert('Could not save to localStorage (storage may be full).\nUse Export to save a file instead.');
        }
    }

    function loadFromLocalStorage() {
        try {
            const rawBase   = localStorage.getItem(BASE_KEY);
            const rawLayout = localStorage.getItem(LAYOUT_KEY);
            if (!rawBase) return false;

            const base = JSON.parse(rawBase);
            state.metaData = base.metaData;
            state.cityData = base.cityData;
            state.mapData  = base.mapData;
            state.metaById = new Map(Object.values(state.metaData).map(m => [m.id, m]));

            if (rawLayout) {
                applyLayout(JSON.parse(rawLayout));
            }

            app.resizeCanvasToCSSSize();
            app.rebuildGridLayer();
            app.rebuildOccupiedTiles();
            app.redrawMap();
            app.updateStats();
            app.showStoredBuildings();
            return true;
        } catch (e) {
            console.error('Failed to load saved state:', e);
            return false;
        }
    }

    // --- File export / import ---

    function exportStateToFile() {
        const json = JSON.stringify(serializeState());
        const blob = new Blob([json], { type: 'application/json' });
        const url  = URL.createObjectURL(blob);
        const a    = document.createElement('a');
        a.href     = url;
        a.download = 'foe_planner_save.json';
        a.click();
        URL.revokeObjectURL(url);
    }

    function importStateFromFile(file) {
        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const saved = JSON.parse(e.target.result);
                deserializeState(saved);
                try {
                    localStorage.setItem(BASE_KEY, JSON.stringify({
                        metaData: slimMetaData(state.metaData),
                        cityData: state.cityData,
                        mapData:  state.mapData
                    }));
                    localStorage.setItem(LAYOUT_KEY, JSON.stringify(serializeLayout()));
                } catch (storageErr) {
                    console.warn('Could not update localStorage after import:', storageErr);
                }
                app.dom.submitWindow.classList.add('hidden');
            } catch (err) {
                console.error('Import failed:', err);
                alert('Could not read the save file. Make sure it is a valid FoE Planner export.');
            }
        };
        reader.readAsText(file);
    }

    function flashSaveBtn() {
        const btn = app.dom.saveBtn;
        if (!btn) return;
        btn.textContent = '✓ Saved';
        setTimeout(() => { btn.textContent = 'Save'; }, 1500);
    }

    // --- Auto-save hook (called after mutations) ---
    function autoSave() {
        if (state.metaData && Object.keys(state.metaData).length) {
            saveState();
        }
    }

    app.init = init;
    app.saveState = saveState;
    app.autoSave = autoSave;
    app.exportStateToFile = exportStateToFile;
    app.importStateFromFile = importStateFromFile;

    // Try loading from localStorage before showing the overlay.
    const hasSave = loadFromLocalStorage();
    if (hasSave) {
        app.dom.submitWindow.classList.add('hidden');
    }

    app.bindEvents(init);
})(window.PlannerApp);