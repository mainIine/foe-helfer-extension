'use strict';

window.PlannerApp = window.PlannerApp || {};

(function (app) {
    const state = app.state;
    const dom = app.dom;

    function getStoredBuildingGroups() {
        const groups = new Map();

        for (const building of state.storedBuildings) {
            if (building.meta.type === 'street') continue;

            const id = String(building.meta.id);
            const dims = app.getMetaSize(building.meta);
            const width = dims.width;
            const height = dims.height;

            if (!groups.has(id)) {
                groups.set(id, {
                    id,
                    name: building.meta.name,
                    type: building.meta.type,
                    width,
                    height,
                    area: width * height,
                    noStreet: building.streetReq === 0,
                    amount: 1,
                    sample: building
                });
            } else {
                groups.get(id).amount += 1;
            }
        }

        return Array.from(groups.values());
    }

    function filterStoredBuildingGroups(groups) {
        return groups.filter(item => {
            if (state.sidebarState.filterType !== 'all' && item.type !== state.sidebarState.filterType) {
                return false;
            }

            if (state.sidebarState.filterStreetReq === 'street' && item.noStreet) {
                return false;
            }

            if (state.sidebarState.filterStreetReq === 'nostreet' && !item.noStreet) {
                return false;
            }

            if (state.sidebarState.filterText) {
                const text = state.sidebarState.filterText.toLowerCase();
                const haystack = `${item.name} ${item.width}x${item.height} ${item.type}`.toLowerCase();
                if (!haystack.includes(text)) return false;
            }

            return true;
        });
    }

    function sortStoredBuildingGroups(groups) {
        const arr = [...groups];

        arr.sort((a, b) => {
            switch (state.sidebarState.sortBy) {
                case 'name-asc':
                    return a.name.localeCompare(b.name) || a.id.localeCompare(b.id);

                case 'name-desc':
                    return b.name.localeCompare(a.name) || a.id.localeCompare(b.id);

                case 'width-asc':
                    return a.width - b.width || a.height - b.height || a.name.localeCompare(b.name);

                case 'width-desc':
                    return b.width - a.width || b.height - a.height || a.name.localeCompare(b.name);

                case 'height-asc':
                    return a.height - b.height || a.width - b.width || a.name.localeCompare(b.name);

                case 'height-desc':
                    return b.height - a.height || b.width - a.width || a.name.localeCompare(b.name);

                case 'area-asc':
                    return a.area - b.area || a.name.localeCompare(b.name);

                case 'area-desc':
                default:
                    return b.area - a.area || a.name.localeCompare(b.name);
            }
        });

        return arr;
    }

    function showStoredBuildings() {
        let groups = getStoredBuildingGroups();
        groups = filterStoredBuildingGroups(groups);
        groups = sortStoredBuildingGroups(groups);

        const html = groups.map(item => {
            const noStreet = item.noStreet ? ' nostreet' : '';

            return (
                '<li data-id="' + item.id + '" class="' + item.type + noStreet + '">' +
                    '<span class="name">' + item.name + ' (' + item.height + 'x' + item.width + ')</span>' +
                    '<span class="amount">' + (item.amount > 1 ? item.amount : '') + '</span>' +
                '</li>'
            );
        });

        dom.buildingsListEl.innerHTML = html.join('');
    }

    app.getStoredBuildingGroups = getStoredBuildingGroups;
    app.filterStoredBuildingGroups = filterStoredBuildingGroups;
    app.sortStoredBuildingGroups = sortStoredBuildingGroups;
    app.showStoredBuildings = showStoredBuildings;
})(window.PlannerApp);