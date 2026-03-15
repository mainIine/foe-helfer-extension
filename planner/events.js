'use strict';

window.PlannerApp = window.PlannerApp || {};

(function (app) {
    const state = app.state;
    const dom = app.dom;
    const SIZE = app.SIZE;

    function clearSelection() {
        for (const b of state.selectedBuildings) b.isSelected = false;
        state.selectedBuildings = [];
        dom.storeSelectionCount.textContent = '';
        dom.storeSelectionBtn.classList.remove('show');
    }

    function refreshSelectionUi() {
        dom.storeSelectionCount.textContent = state.selectedBuildings.length || '';
        if (state.selectedBuildings.length) {
            dom.storeSelectionBtn.classList.add('show');
        } else {
            dom.storeSelectionBtn.classList.remove('show');
        }
    }

    function storeBuilding(building) {
        app.removeBuildingFromOccupiedTiles(building);

        const idx = state.mapBuildings.indexOf(building);
        if (idx !== -1) state.mapBuildings.splice(idx, 1);

        building.x = 0;
        building.y = 0;
        state.storedBuildings.push(building);
    }

    function sortStoredBuildingsByAreaDesc() {
        state.storedBuildings.sort((a, b) => {
            const aSize = app.getMetaSize(a.meta);
            const bSize = app.getMetaSize(b.meta);
            return (bSize.width * bSize.height) - (aSize.width * aSize.height);
        });
    }

    function startPlacingStoredBuilding(metaId) {
        const stored = state.storedBuildings.find(b => String(b.meta.id) === String(metaId));
        if (!stored) return;

        if (state.activeBuilding) {
            state.activeBuilding.isActive = false;
            state.activeBuilding = null;
        }

        state.placingBuilding = new app.MapBuilding(
            {
                ...stored.data,
                x: 0,
                y: 0
            },
            stored.meta
        );

        state.placingBuilding.isActive = true;
        updatePlacingBuildingPreview();
    }

    function continuePlacingStoredBuilding(metaId) {
        const nextStored = state.storedBuildings.find(b => String(b.meta.id) === String(metaId));

        if (!nextStored) {
            state.placingBuilding = null;
            state.dragCopy = null;
            app.redrawMap();
            return;
        }

        state.placingBuilding = new app.MapBuilding(
            {
                ...nextStored.data,
                x: 0,
                y: 0
            },
            nextStored.meta
        );

        state.placingBuilding.isActive = true;
        updatePlacingBuildingPreview();
    }

    function updatePlacingBuildingPreview() {
        if (!state.placingBuilding || !state.lastMouseElem) {
            state.dragCopy = null;
            app.redrawMap();
            return;
        }

        const snappedX = app.snapToGrid(state.lastMouseElem.x - state.placingBuilding.width / 2);
        const snappedY = app.snapToGrid(state.lastMouseElem.y - state.placingBuilding.height / 2);

        state.dragCopy = {
            building: state.placingBuilding,
            x: snappedX,
            y: snappedY,
            valid: app.canPlaceAt(state.placingBuilding, snappedX, snappedY)
        };

        app.redrawMap();
    }

    function storeSelectedBuildings() {
        for (const building of state.selectedBuildings) {
            storeBuilding(building);
        }

        clearSelection();
        app.showStoredBuildings();
        app.redrawMap();
        app.updateStats();
    }

    function resetCity() {
        state.mapBuildings = [];
        state.storedBuildings = [];
        state.selectedBuildings = [];
        state.activeBuilding = null;
        state.placingBuilding = null;
        state.dragCopy = null;
        state.camX = 0;
        state.camY = 0;
        state.zoomScale = 0.75;

        app.drawMap();
        app.rebuildOccupiedTiles();
        app.updateStats();
        app.showStoredBuildings();
    }

    function handleCanvasClick(e) {
        if (state.placingBuilding) return;
        if (e.altKey || e.ctrlKey) return;

        if (state.streetPlacement.active) {
            const point = app.getCanvasPointElem(e);
            const tile = app.worldToTile(point.x, point.y);

            if (!state.streetPlacement.startTile) {
                state.streetPlacement.startTile = tile;
                state.streetPlacement.previewTiles = [tile];
            } else {
                state.streetPlacement.previewTiles = app.getStraightLineTiles(
                    state.streetPlacement.startTile,
                    tile
                );
                commitStreetPreview();
            }

            app.redrawMap();
            return;
        }

        const point = app.getCanvasPointElem(e);
        const building = app.hitTestBuilding(point.x, point.y);
        if (!building) return;

        const currentActiveBuilding = state.mapBuildings.find(x => x.isActive);

        if (currentActiveBuilding && currentActiveBuilding !== building) {
            currentActiveBuilding.isActive = false;
            state.activeBuilding = building;
            building.isActive = true;
        } else if (currentActiveBuilding === building) {
            building.isActive = false;
            state.activeBuilding = null;
        } else {
            state.activeBuilding = building;
            building.isActive = true;
        }

        app.redrawMap();
    }

    function handleCanvasMouseMove(e) {
        state.lastMouseElem = app.getCanvasPointElem(e);

        if (state.streetPlacement.active) {
            const currentTile = app.worldToTile(state.lastMouseElem.x, state.lastMouseElem.y);

            if (state.streetPlacement.startTile) {
                state.streetPlacement.previewTiles = app.getStraightLineTiles(
                    state.streetPlacement.startTile,
                    currentTile
                );
            } else {
                state.streetPlacement.previewTiles = [currentTile];
            }

            app.redrawMap();
            return;
        }

        if (!state.placingBuilding) return;

        const snappedX = app.snapToGrid(state.lastMouseElem.x - state.placingBuilding.width / 2);
        const snappedY = app.snapToGrid(state.lastMouseElem.y - state.placingBuilding.height / 2);

        const valid = app.canPlaceAt(state.placingBuilding, snappedX, snappedY);

        state.dragCopy = {
            building: state.placingBuilding,
            x: snappedX,
            y: snappedY,
            valid
        };

        app.redrawMap();
    }

    function handleCanvasMouseDownPlace(e) {
        if (e.button !== 0) return;
        if (!state.placingBuilding || !state.dragCopy) return;
        if (e.altKey || e.ctrlKey) return;
        if (!state.dragCopy.valid) return;

        const placedMetaId = state.placingBuilding.meta.id;

        state.placingBuilding.x = state.dragCopy.x;
        state.placingBuilding.y = state.dragCopy.y;
        state.placingBuilding.data.x = state.dragCopy.x / SIZE;
        state.placingBuilding.data.y = state.dragCopy.y / SIZE;
        state.placingBuilding.isActive = false;

        state.mapBuildings.push(state.placingBuilding);
        app.addBuildingToOccupiedTiles(state.placingBuilding);

        const idx = state.storedBuildings.findIndex(b => String(b.meta.id) === String(placedMetaId));
        if (idx !== -1) state.storedBuildings.splice(idx, 1);

        app.showStoredBuildings();
        app.updateStats();

        continuePlacingStoredBuilding(placedMetaId);
    }

    function getStreetMeta() {
        return Object.values(state.metaData).find(x => x.type === 'street') || null;
    }

    function startStreetPlacement() {
        if (state.streetPlacement.active) {
            cancelStreetPlacement();
            return;
        }
        state.placingBuilding = null;
        state.dragCopy = null;
        state.streetPlacement.active = true;
        state.streetPlacement.startTile = null;
        state.streetPlacement.previewTiles = [];
        dom.placeStreetBtn.classList.add('active');
        app.redrawMap();
    }

    function cancelStreetPlacement() {
        state.streetPlacement.active = false;
        state.streetPlacement.startTile = null;
        state.streetPlacement.previewTiles = [];
        dom.placeStreetBtn.classList.remove('active');
        app.redrawMap();
    }

    function createStreetBuildingAtTile(tx, ty, streetMeta) {
        const forcedMeta = { ...streetMeta, width: 1, length: 1 };
        return new app.MapBuilding(
            {
                cityentity_id: streetMeta.id,
                type: 'street',
                x: tx,
                y: ty
            },
            forcedMeta
        );
    }

    function commitStreetPreview() {
        const streetMeta = getStreetMeta();
        if (!streetMeta) return;

        for (const tile of state.streetPlacement.previewTiles) {
            if (app.isTileOccupiedByNonStreet(tile.x, tile.y)) continue;

            const existing = state.occupiedTiles.get(app.tileKey(tile.x, tile.y));
            if (existing && existing.meta.type === 'street') continue;

            const street = createStreetBuildingAtTile(tile.x, tile.y, streetMeta);
            state.mapBuildings.push(street);
            app.addBuildingToOccupiedTiles(street);
        }

        app.updateStats();
        state.streetPlacement.startTile = null;
        state.streetPlacement.previewTiles = [];
        app.redrawMap();
    }

    function bindMapDrag() {
        let drag = null;

        const mouseDownHandler = (e) => {
            if (e.button !== 0) return;
            if (state.placingBuilding) return;
            if (state.streetPlacement.active && !e.altKey) return;

            let mode = null;

            if (e.altKey) mode = 'pan';
            else if (e.ctrlKey) mode = 'select';
            else {
                if (state.activeBuilding) {
                    const p = app.getCanvasPointElem(e);
                    if (
                        p.x >= state.activeBuilding.x && p.x <= state.activeBuilding.x + state.activeBuilding.width &&
                        p.y >= state.activeBuilding.y && p.y <= state.activeBuilding.y + state.activeBuilding.height
                    ) {
                        mode = 'move';
                    }
                }
            }

            if (!mode) return;
            e.preventDefault();

            const startElem = app.getCanvasPointElem(e);

            drag = {
                mode,
                startClientX: e.clientX,
                startClientY: e.clientY,
                startCamX: state.camX,
                startCamY: state.camY,
                startElem,
                endElem: startElem
            };

            if (mode === 'move') {
                drag.building = state.activeBuilding;
                app.removeBuildingFromOccupiedTiles(drag.building);

                state.dragCopy = {
                    building: drag.building,
                    x: drag.building.x,
                    y: drag.building.y,
                    valid: true
                };

                drag.grabOffsetX = startElem.x - drag.building.x;
                drag.grabOffsetY = startElem.y - drag.building.y;
                drag.startBuildingX = drag.building.x;
                drag.startBuildingY = drag.building.y;
            }

            document.addEventListener('mousemove', mouseMoveHandler, { passive: false });
            document.addEventListener('mouseup', mouseUpHandler, { passive: false });
        };

        const mouseMoveHandler = (e) => {
            if (!drag) return;
            e.preventDefault();

            if (drag.mode === 'pan') {
                const dx = (e.clientX - drag.startClientX) / state.zoomScale;
                const dy = (e.clientY - drag.startClientY) / state.zoomScale;
                state.camX = drag.startCamX - dx;
                state.camY = drag.startCamY - dy;
                app.redrawMap();
                return;
            }

            if (drag.mode === 'select') {
                drag.endElem = app.getCanvasPointElem(e);
                return;
            }

            if (drag.mode === 'move') {
                const p = app.getCanvasPointElem(e);

                const desiredX = p.x - drag.grabOffsetX;
                const desiredY = p.y - drag.grabOffsetY;

                const snappedX = app.snapToGrid(desiredX);
                const snappedY = app.snapToGrid(desiredY);

                const valid = app.canPlaceAt(drag.building, snappedX, snappedY);

                state.dragCopy = {
                    building: drag.building,
                    x: snappedX,
                    y: snappedY,
                    valid
                };

                if (valid) {
                    drag.building.x = snappedX;
                    drag.building.y = snappedY;
                    drag.building.data.x = snappedX / SIZE;
                    drag.building.data.y = snappedY / SIZE;
                }

                app.redrawMap();
                return;
            }
        };

        const mouseUpHandler = (e) => {
            if (!drag) return;
            e.preventDefault();

            if (drag.mode === 'select') {
                const endElem = app.getCanvasPointElem(e);

                const min = {
                    x: Math.min(drag.startElem.x, endElem.x),
                    y: Math.min(drag.startElem.y, endElem.y)
                };
                const max = {
                    x: Math.max(drag.startElem.x, endElem.x),
                    y: Math.max(drag.startElem.y, endElem.y)
                };

                let changed = false;

                for (const building of state.mapBuildings) {
                    if (building.meta.type === 'street') continue;

                    const intersects =
                        building.x <= max.x &&
                        building.y <= max.y &&
                        (building.x + building.width) >= min.x &&
                        (building.y + building.height) >= min.y;

                    if (intersects) {
                        if (!building.isSelected) {
                            building.isSelected = true;
                            state.selectedBuildings.push(building);
                            changed = true;
                        } else {
                            building.isSelected = false;
                            state.selectedBuildings = state.selectedBuildings.filter(b => b !== building);
                            changed = true;
                        }
                    }
                }

                if (changed) {
                    refreshSelectionUi();
                    app.redrawMap();
                }
            }

            if (drag.mode === 'move') {
                app.addBuildingToOccupiedTiles(drag.building);
                state.dragCopy = null;
                app.redrawMap();
            }

            document.removeEventListener('mousemove', mouseMoveHandler);
            document.removeEventListener('mouseup', mouseUpHandler);
            drag = null;
            state.dragCopy = null;
        };

        dom.canvas.addEventListener('mousedown', mouseDownHandler);
    }

    function bindEvents(init) {
        dom.submitBtn.addEventListener('click', async () => {
            try {
                const clipboardContents = await navigator.clipboard.readText();
                const data = JSON.parse(clipboardContents);
                dom.submitWindow.classList.add('hidden');
                init(data);
            } catch (error) {
                console.error(error);
                dom.submitError.textContent = 'The data is corrupted.';
            }
        });

        dom.zoomInBtn.addEventListener('click', app.zoomIn);
        dom.zoomOutBtn.addEventListener('click', app.zoomOut);
        dom.placeStreetBtn.addEventListener('click', startStreetPlacement);

        dom.storeBuildingsBtn.addEventListener('click', () => {
            state.storedBuildings = state.storedBuildings.concat(state.mapBuildings);

            sortStoredBuildingsByAreaDesc();

            state.mapBuildings = [];
            app.rebuildOccupiedTiles();
            state.activeBuilding = null;

            app.showStoredBuildings();
            app.updateStats();
            app.drawEmptyMap();
        });

        dom.storeSelectionBtn.addEventListener('click', storeSelectedBuildings);

        dom.buildingsListEl.addEventListener('click', (e) => {
            const li = e.target.closest('li[data-id]');
            if (!li) return;

            const metaId = li.dataset.id;
            startPlacingStoredBuilding(metaId);
        });

        dom.canvas.addEventListener('click', handleCanvasClick);
        dom.canvas.addEventListener('mousemove', handleCanvasMouseMove);
        dom.canvas.addEventListener('mousedown', handleCanvasMouseDownPlace);

        dom.removeStreetsBtn.addEventListener('click', () => {
            state.mapBuildings = state.mapBuildings.filter(x => x.data.type !== 'street');
            app.rebuildOccupiedTiles();
            app.redrawMap();
            app.updateStats();
        });

        dom.resetBtn.addEventListener('click', () => {
            const reset = confirm('Do you want to restart from scratch? Your changes will not be saved');
            if (reset) resetCity();
        });

        document.addEventListener('contextmenu', (e) => {
            e.preventDefault();

            if (state.streetPlacement.active) {
                cancelStreetPlacement();
                return;
            }

            if (state.placingBuilding) {
                state.placingBuilding = null;
                state.dragCopy = null;
                app.redrawMap();
                return;
            }

            clearSelection();
            app.redrawMap();
        });

        window.addEventListener('resize', () => {
            app.resizeCanvasToCSSSize();
            app.rebuildGridLayer();
            app.redrawMap();
        });

        dom.buildingSort.addEventListener('change', (e) => {
            state.sidebarState.sortBy = e.target.value;
            app.showStoredBuildings();
        });

        dom.buildingFilterText.addEventListener('input', (e) => {
            state.sidebarState.filterText = e.target.value.trim();
            app.showStoredBuildings();
        });

        dom.buildingTypeFilter.addEventListener('change', (e) => {
            state.sidebarState.filterType = e.target.value;
            app.showStoredBuildings();
        });

        dom.buildingStreetFilter.addEventListener('change', (e) => {
            state.sidebarState.filterStreetReq = e.target.value;
            app.showStoredBuildings();
        });

        bindMapDrag();
    }

    app.bindEvents = bindEvents;
})(window.PlannerApp);