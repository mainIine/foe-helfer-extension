'use strict';

window.PlannerApp = window.PlannerApp || {};

(function (app) {
    const state = app.state;

    function init(data) {
        state.metaData = data.CityEntities;
        state.cityData = data.CityMapData;
        state.mapData = data.UnlockedAreas;

        state.metaById = new Map(Object.values(state.metaData).map(m => [m.id, m]));

        app.resizeCanvasToCSSSize();
        app.rebuildGridLayer();
        app.drawMap();
        app.rebuildOccupiedTiles();
        app.updateStats();
        app.showStoredBuildings();
    }

    app.init = init;
    app.bindEvents(init);
})(window.PlannerApp);