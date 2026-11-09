
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

FoEproxy.addHandler('CityReconstructionService', 'getDraft', (data, postData) => {
    if(!Settings.GetSetting('ShowReconstructionList')) return;
    if (data?.responseData?.length==0) {
        data.responseData = Object.values(MainParser.CityMapData).map(x=>({
            "entityId": x.id,
            "position": {
                "x": x.x,
                "y": x.y,
                "__class__": "Position"
            },
            "__class__": "ReconstructionDraftEntity"
        }))
    }
    reconstruction.draft = Object.assign({},...data.responseData.map(b=>({[b.entityId]:b})))
    reconstruction.count = {}
    reconstruction.pages = {
                            prod: [],
                            happ: [],
                            street: [],
                            greatbuilding: [],
                        }
    for (let b of data.responseData) {
        const entity = MainParser.CityMapData[b.entityId]
        if (!entity) continue
        let id = reconstruction.cardKey(entity)
        if (!reconstruction.count[id]) reconstruction.count[id] = {placed:0,stored:0}
        if (b.position)
            reconstruction.count[id].placed++
        else {
            reconstruction.count[id].stored++
            if (reconstruction.count[id].stored == 1) reconstruction.pageUpdate(id)
        }
    }

    reconstruction.showTable();
});

FoEproxy.addHandler('AutoAidService', 'getStates', (data, postData) => {
    $('#ReconstructionList').remove();
    $('#ReconstructionMap').remove();
});


FoEproxy.addHandler('InventoryService', 'getGreatBuildings', (data, postData) => {
    $('#ReconstructionList').remove();
    $('#ReconstructionMap').remove();
});

FoEproxy.addRequestHandler('CityReconstructionService', 'saveDraft', (data) => {
    if (!reconstruction.draft) return;

    let pagesUpdated = false;
    let newCard = false;

    for (let x of data.requestData[0]) {
        const entity = MainParser.CityMapData[x.entityId];
        if (!entity) continue;

        const id = reconstruction.cardKey(entity);
        // buildings untouched in this draft are missing from it: they stand in the city
        const before = reconstruction.draft[x.entityId];
        const wasPlaced = before ? !!before.position : true;
        if (!reconstruction.count[id]) reconstruction.count[id] = {placed: 0, stored: 0};
        const count = reconstruction.count[id];

        if (x.position && !wasPlaced) {
            count.placed++;
            count.stored--;
            if (count.stored == 0) {
                reconstruction.pageUpdate(id);
                pagesUpdated = true;
            } else if (count.stored == 1) {
                // the game takes the last copy into the hand right away; put back
                // (cancel, sends no request) it returns as a new card in front
                reconstruction.moveToFront(id);
                pagesUpdated = true;
            }
            FoEproxy.triggerFoeHelperHandler('ReconstructionBuildingPlaced', {id: x.entityId, last: (count.stored == 0)});
            $('#ReconstructionMapBody .map-grid').append(reconstruction.placeBuildingOnMap(x));
        } else if (!x.position && wasPlaced) {
            count.placed--;
            count.stored++;
            if (count.stored == 1) {
                reconstruction.pageUpdate(id);
                pagesUpdated = true;
            }
            $(`#ReconstructionMapBody [data-id=${x.entityId}]`).remove();
        } else if (x.position) {
            $(`#ReconstructionMapBody [data-id=${x.entityId}]`).remove();
            $('#ReconstructionMapBody .map-grid').append(reconstruction.placeBuildingOnMap(x));
        }

        reconstruction.draft[x.entityId] = x;
        const row = $('.reconstructionLine[data-page_id="' + id + '"]');
        row.find('td:nth-child(2)').html('x' + count.stored);
        row.toggle(count.stored > 0);
        if (count.stored > 0 && row.length === 0) newCard = true;
    }

    // a card stored for the first time has no row yet: rebuild the table
    if (newCard && $('#ReconstructionList').length > 0) reconstruction.showTable();
    else if (pagesUpdated) reconstruction.updateTable();
});

let reconstruction = {
    draft:null,
    count:null,
    /** menu tab per entity type like the game client, all other types are production */
    pageMapper:{
        "culture":"happ",
        "decoration":"happ",
        "greatbuilding":"greatbuilding",
        "street":"street"
    },
    pages: null,
    rcIcons:null,
    roadIcons:null,
    mapScale: 20,
    /** @type {string} name filter of the list, kept while the box is rebuilt */
    search: '',
    /**
     * Key of the menu card of a placed entity. The game shows one card per
     * building type; only buildings that follow the city's era (no fixed era
     * component) get one card per level.
     *
     * @param {Object} entity entry of MainParser.CityMapData
     * @returns {string} cityentity_id#level, level -1 for fixed-era buildings
     */
    cardKey:(entity)=>{
        const meta = MainParser.CityEntities[entity.cityentity_id] || {};
        const perLevel = meta.components ? !meta.components.AllAge?.era : !!meta.is_multi_age;
        return entity.cityentity_id + "#" + (perLevel ? (entity.level || 0) : -1);
    },


    /**
     * Moves a card to the front of its tab, like the game does when the last
     * copy of a card comes back to the storage.
     *
     * @param {string} id card key from cardKey()
     */
    moveToFront:(id)=>{
        for (const list of Object.values(reconstruction.pages)) {
            const idx = list.indexOf(id);
            if (idx < 0) continue;
            list.splice(idx, 1);
            list.unshift(id);
            return;
        }
    },


    /**
     * Adds a card to its menu tab when the first copy is stored and removes it
     * when the last one is placed. The game shows the latest stored card
     * first, so new cards go to the front and the cards behind a removed one
     * move up.
     *
     * @param {string} id card key from cardKey()
     */
    pageUpdate:(id)=>{
        let meta = MainParser.CityEntities[id.split("#")[0]]
        if (["friends_tavern",
            "main_building",
            "impediment",
            "hub_part",
            "off_grid",
            "outpost_ship",
            "hub_main"].includes(meta.type)) return
        let page = reconstruction.pageMapper[meta.type] || "prod"
        let list = reconstruction.pages[page]
        if (reconstruction.count[id].stored==0) {
            if (list.includes(id)) list.splice(list.indexOf(id),1)
        } else if (!list.includes(id)) {
            list.unshift(id)
        }
    },
    /**
     * Writes tab, page and slot of every stored building into the list. The
     * game menu shows 4 cards per page in a 2x2 grid, read left to right and
     * top to bottom; the slot is drawn as a small grid with the card marked.
     */
    updateTable:()=>{
        for (let [page,list] of Object.entries(reconstruction.pages)) {
            for (let i = 0;i<list.length;i++) {
                const pageNo = Math.floor(i / 4) + 1;
                const slot = i % 4;
                const grid = [0, 1, 2, 3].map(s => `<i${s === slot ? ' class="on"' : ''}></i>`).join('');
                $('.reconstructionLine[data-page_id="'+list[i]+'"] td:nth-child(3)')
                    .html(`<img src="${reconstruction.rcIcons[page]}">${pageNo}<span class="rc-slot">${grid}</span>`);
            }
        }
    },
    showTable:()=>{
        if (!reconstruction.rcIcons) {
            reconstruction.rcIcons = {
                happ:srcLinks.get("/shared/gui/reconstructionmenu/rc_icon_happynessbuildings.png",true),
                prod:srcLinks.get("/shared/gui/reconstructionmenu/rc_icon_productionbuildings.png",true),
                greatbuilding:srcLinks.get("/shared/gui/constructionmenu/icon_greatbuilding.png",true),
                street:srcLinks.get("/shared/gui/constructionmenu/icon_street.png",true),
            }
            reconstruction.roadIcons = {
                0:"",
                1:srcLinks.icons("road_required"),
                2:srcLinks.icons("street_required")
            }
        }

        if ( $('#ReconstructionList').length === 0 ) {

			HTML.AddCssFile('reconstruction');

			HTML.Box({
				id: 'ReconstructionList',
				title: i18n('Boxes.ReconstructionList.Title'),
				auto_close: true,
				dragdrop: true,
				minimize: true,
				resize: true,
                map: () => reconstruction.showMap(),
                mapId: 'ReconstructionMap',
			    active_maps:"main"
			});
        }

        h =`<div class="rc-search"><input type="text" id="ReconstructionSearch" placeholder="${i18n('Boxes.CitySearch.Placeholder')}" /></div>
            <div class="rc-table"><table class="sortable-table foe-table">
                <thead class="sticky">
                    <tr class="sorter-header">
                        <th data-type="reconstructionSizes">${i18n('Boxes.CityMap.Building')}</th>
                        <th class="no-sort">#</th>
                        <th class="no-sort text-center fh-tooltip" title="${HTML.i18nTooltip(i18n('Boxes.ReconstructionList.PageTT'))}">${srcLinks.icons("icon_copy")}</th>
                        <th class="is-number" data-type="reconstructionSizes">${srcLinks.icons("road_required")}</th>
                        <th class="is-number" data-type="reconstructionSizes"></th>
                        <th class="is-number" data-type="reconstructionSizes"></th>
                    </tr>
                </thead><tbody class="reconstructionSizes">`
        for (let [id,b] of Object.entries(reconstruction.count)) {
            let meta=MainParser.CityEntities[id.split("#")[0]]
            let width = meta.width||meta.components.AllAge.placement.size.x
            let length = meta.length||meta.components.AllAge.placement.size.y
            let road = meta?.components?.AllAge.streetConnectionRequirement?.requiredLevel || meta?.requirements?.street_connection_level || 0
            h+=`<tr class="reconstructionLine fh-tooltip" data-callback_tt="Tooltips.buildingTT" data-page_id="${id}" data-meta_id="${id.split("#")[0]}" ${b.stored==0 ? ' style="display:none"' : ""}>
                    <td data-text="${helper.str.cleanup(meta.name)}">${meta.name}</td>
                    <td>x${b.stored}</td>
                    <td></td>
                    <td data-number="${road}">${reconstruction.roadIcons[road]}</td>
                    <td data-number="${length*100+width}">${length} x</td>
                    <td data-number="${width*100+length}">${width}</td>
                </tr>`
        }
        h +=`</tbody></table></div>`


        $('#ReconstructionListBody').html(h)
        $('#ReconstructionListBody .sortable-table').tableSorter()
        $('#ReconstructionSearch').val(reconstruction.search)
            .on('input', (e) => {
                reconstruction.search = e.currentTarget.value;
                reconstruction.applySearch();
            })
            .on('keydown', (e) => {
                if (e.key !== 'Escape') return;
                reconstruction.search = '';
                $(e.currentTarget).val('');
                reconstruction.applySearch();
            });
        reconstruction.applySearch();
        setTimeout(reconstruction.updateTable,200)

    },


    /**
     * Hides the rows whose building name does not contain the search term.
     * Uses its own class, so the stored-count toggle of the rows stays intact.
     */
    applySearch: () => {
        const term = reconstruction.search.trim().toLowerCase();
        $('#ReconstructionListBody .reconstructionLine').each((i, row) => {
            const name = row.cells[0].textContent.toLowerCase();
            row.classList.toggle('rc-filtered', term !== '' && !name.includes(term));
        });
    },

    showMap:()=>{
        if ( $('#ReconstructionMap').length === 0 ) {
            HTML.Box({
                id: 'ReconstructionMap',
                title: '💭',
                auto_close: true,
                dragdrop: true,
                minimize: true,
                resize: true,
                active_maps:"main",
                settings: () => reconstruction.mapSettings()
            });
        }
        let storedUnit = parseInt(localStorage.getItem('ReconstructionMapScale') || 80);

        let c = `<div class="map-grid-wrapper" style="--scale:${storedUnit}">`;
        c += `<div class="map-grid">`;

        for(let area of CityMap.Main.unlockedAreas) {
            let startArea = area.width === 16 ? ' startarea' : '';
            c += `<span class="map-bg${startArea}" style="left:${area.x*reconstruction.mapScale||0}px;top:${area.y*reconstruction.mapScale||0}px;"></span>`
		}

        for (let item of Object.values(reconstruction.draft)) {
            c += reconstruction.placeBuildingOnMap(item);
        }

        c += `</div>`;
        c += `</div>`;
        $('#ReconstructionMapBody').html(c);
    },
    placeBuildingOnMap:(data)=>{
        let meta = MainParser.CityEntities[MainParser.CityMapData[data.entityId].cityentity_id];
        if (meta.type.includes("hub") || meta.type === "off_grid" || meta.type === "outpost_ship" || meta.type === "friends_tavern") return '';

        let width = meta.width||meta.components.AllAge.placement.size.x;
        let height = meta.length||meta.components.AllAge.placement.size.y;
        let needsStreet = meta?.components?.AllAge.streetConnectionRequirement?.requiredLevel || meta?.requirements?.street_connection_level || 0;
        let street = needsStreet === 0 ? ' roadless' : '';
        let c = '';
        if (data.position !== undefined) {
            c += `<span data-id="${data.entityId}" class="map-building ${meta.type}${street}"
                    style="left:${data.position?.x*reconstruction.mapScale||0}px;top:${data.position?.y*reconstruction.mapScale||0}px;
                        width:${width*reconstruction.mapScale}px;height:${height*reconstruction.mapScale}px;">
                </span>`;
        }
        return c;
    },
    mapSettings:()=>{
        let storedUnit = parseFloat(localStorage.getItem('ReconstructionMapScale') || 80);
        let c = `<select class="scale-view" name="reconstructionscale">
			<option data-scale="50" ${storedUnit === 50 ? 'selected' : ''}>S</option>
			<option data-scale="80" ${storedUnit === 80 ? 'selected' : ''}>M</option>
			<option data-scale="100" ${storedUnit === 100 ? 'selected' : ''}>L</option>
			<option data-scale="156.1" ${storedUnit === 156.1 ? 'selected' : ''}>XL</option>
            </select>`;
            c += `<br><input type="range" class="opacity" name="opacity" min="0.01" max="1" step="0.01" value="0.9" />`
		$('#ReconstructionMapSettingsBox').html(c).promise().done(function(){
            $('#ReconstructionMapSettingsBox .scale-view').on('change', function(){
                let unit = parseFloat($('.scale-view option:selected').data('scale'));
                localStorage.setItem('ReconstructionMapScale', unit);
                $('#ReconstructionMapBody .map-grid-wrapper').css('--scale', unit);
            });
            $('#ReconstructionMapSettingsBox .opacity').on('change', function(){
                let val = parseFloat($('#ReconstructionMapSettingsBox .opacity').val());
                $('#ReconstructionMapBody .map-grid-wrapper').css('opacity', val);
            });
        });
    }
}

