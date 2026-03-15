'use strict';

window.PlannerApp = window.PlannerApp || {};

window.PlannerApp.dom = {
    submitWindow: document.querySelector('.overlay'),
    submitBtn: document.querySelector('.overlay button'),
    submitError: document.querySelector('.overlay .error'),

    storeBuildingsBtn: document.querySelector('#storeAll'),
    storeSelectionBtn: document.querySelector('#storeSelection'),
    storeSelectionCount: document.querySelector('#storeSelection span'),

    buildingsListEl: document.querySelector('#buildings ul'),

    zoomInBtn: document.querySelector('#zoomIn'),
    zoomOutBtn: document.querySelector('#zoomOut'),

    canvas: document.getElementById('planner'),

    removeStreetsBtn: document.getElementById('removeStreets'),
    resetBtn: document.getElementById('reset'),

    buildingSort: document.querySelector('#buildingSort'),
    buildingFilterText: document.querySelector('#buildingFilterText'),
    buildingTypeFilter: document.querySelector('#buildingTypeFilter'),
    buildingStreetFilter: document.querySelector('#buildingStreetFilter'),

    oldStreetsEl: document.querySelector('.old .streets'),
    newStreetsEl: document.querySelector('.new .streets'),
    placeStreetBtn: document.querySelector('#placeStreet'),
};

window.PlannerApp.state = {
    metaData: {},
    cityData: {},
    mapData: {},

    occupiedTiles: new Map(),
    mapBuildings: [],
    storedBuildings: [],
    selectedBuildings: [],

    activeBuilding: null,
    placingBuilding: null,
    dragCopy: null,

    zoomScale: 0.75,
    camX: 0,
    camY: 0,

    metaById: new Map(),

    gridCanvas: null,
    gridCtx: null,
    lastMouseElem: null,

    sidebarState: {
        sortBy: 'area-desc',
        filterText: '',
        filterType: 'all',
        filterStreetReq: 'all'
    },
    streetPlacement: {
        active: false,
        startTile: null,
        previewTiles: []
    }
};