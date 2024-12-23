
/*
 * **************************************************************************************
 * Copyright (C) 2024 FoE-Helper team - All Rights Reserved
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
        let id = MainParser.CityMapData[b.entityId].cityentity_id + "#" + (MainParser.CityMapData[b.entityId].level||0)
        if (!reconstruction.count[id]) reconstruction.count[id] = {placed:0,stored:0}
        if (b.position) 
            reconstruction.count[id].placed++
        else {
            reconstruction.count[id].stored++   
            if (reconstruction.count[id].stored == 1) reconstruction.pageUpdate(id)   
        }
    }

    reconstruction.showTable()

});

FoEproxy.addHandler('AutoAidService', 'getStates', (data, postData) => {
    $('#ReconstructionList').remove()
});
FoEproxy.addHandler('InventoryService', 'getGreatBuildings', (data, postData) => {
    $('#ReconstructionList').remove()
});

FoEproxy.addRequestHandler('CityReconstructionService', 'saveDraft', (data) => {
    for (let x of data.requestData[0]) {
        let id = MainParser.CityMapData[x.entityId].cityentity_id + "#" + (MainParser.CityMapData[x.entityId].level||0)
        let pagesUpdated=false
        if (x.position && !reconstruction.draft[x.entityId].position) {
            reconstruction.count[id].placed++
            reconstruction.count[id].stored--
            if (reconstruction.count[id].stored==0) {
                reconstruction.pageUpdate(id)
                pagesUpdated=true
            }
            FoEproxy.triggerFoeHelperHandler('ReconstructionBuildingPlaced',{id:x.entityId,last:(reconstruction.count[id].stored==0)})
        } else if (!x.position) {
            reconstruction.count[id].placed--
            reconstruction.count[id].stored++    
            if (reconstruction.count[id].stored==1) {
                reconstruction.pageUpdate(id)
                pagesUpdated=true
            }
        }
        reconstruction.draft[x.entityId] = x
        $('.reconstructionLine[data-page_id="'+id+'"] td:nth-child(2)').html("x"+reconstruction.count[id].stored)
        if (reconstruction.count[id].stored > 0) 
            $('.reconstructionLine[data-page_id="'+id+'"]').show()
        else
            $('.reconstructionLine[data-page_id="'+id+'"]').hide()
        if (pagesUpdated) reconstruction.updateTable()
    }
});

let reconstruction = {
    draft:null,
    count:null,
    pageMapper:{
        "culture":"happ",
        "cultural_goods_production":"prod",
        "decoration":"happ",
        "diplomacy":"happ",
        "static_provider":"happ",
        "random_production":"prod",
        "military":"prod",
        "goods":"prod",
        "production":"prod",
        "residential":"prod",
        "tower":"prod",
        "clan_power_production":"prod"
    },
    pages: null,
    rcIcons:null,
    roadIcons:null,        
    pageUpdate:(id)=>{
        let meta = MainParser.CityEntities[id.split("#")[0]]
        if (["friends_tavern",
            "main_building",
            "impediment",
            "hub_part",
            "off_grid",
            "outpost_ship",
            "hub_main"].includes(meta.type)) return
        let page = id[0]=="W"? "prod" : reconstruction.pageMapper[meta.type]||meta.type
        if (reconstruction.count[id].stored==0) { //remove from pages
            reconstruction.pages[page].splice(reconstruction.pages[page].indexOf(id),1)
        } else { //add to pages
            reconstruction.pages[page].unshift(id)
        }
    },
    updateTable:()=>{
        for (let [page,list] of Object.entries(reconstruction.pages)) {
            for (let i = 0;i<list.length;i++) {
                $('.reconstructionLine[data-page_id="'+list[i]+'"] td:nth-child(3)').html(`<img src="${reconstruction.rcIcons[page]}">`+(Math.floor(i/4)+1))
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
				resize: true
			});
        }           
        
        h =`<table class="sortable-table foe-table">
                <thead class="sticky">
                    <tr class="sorter-header">
                        <th data-type="reconstructionSizes">${i18n('Boxes.CityMap.Building')}</th>
                        <th class="no-sort">#</th>
                        <th class="no-sort text-center">${srcLinks.icons("icon_copy")}</th>
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
            h+=`<tr class="reconstructionLine helperTT" data-callback_tt="Tooltips.buildingTT" data-page_id="${id}" data-meta_id="${id.split("#")[0]}" ${b.stored==0 ? ' style="display:none"' : ""}>
                    <td data-text="${helper.str.cleanup(meta.name)}">${meta.name}</td>
                    <td>x${b.stored}</td>
                    <td></td>
                    <td data-number="${road}">${reconstruction.roadIcons[road]}</td>
                    <td data-number="${length*100+width}">${length} x</td>
                    <td data-number="${width*100+length}">${width}</td>
                </tr>`
        }
        h +=`</tbody></table>`


        $('#ReconstructionListBody').html(h)
        $('#ReconstructionListBody .sortable-table').tableSorter()
        setTimeout(reconstruction.updateTable,200)

    },
}

