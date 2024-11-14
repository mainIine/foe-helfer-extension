
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
    reconstruction.draft = {}
    for (let b of data.responseData) {
        let id = MainParser.CityMapData[b.entityId].cityentity_id
        if (!reconstruction.draft[id]) reconstruction.draft[id] = {placed:0,stored:0}
        if (b.position) 
            reconstruction.draft[id].placed++
        else 
            reconstruction.draft[id].stored++   
    }

    reconstruction.showTable()

});

FoEproxy.addHandler('AutoAidService', 'getStates', (data, postData) => {
    $('#ReconstructionList').remove()
});

FoEproxy.addRequestHandler('CityReconstructionService', 'saveDraft', (data) => {
    for (let x of data.requestData[0]) {
        let id = MainParser.CityMapData[x.entityId].cityentity_id
        if (x.position) {
            reconstruction.draft[id].placed++
            reconstruction.draft[id].stored--
        } else {
            reconstruction.draft[id].placed--
            reconstruction.draft[id].stored++    
        }
        $('.reconstructionLine[data-meta_id="'+id+'"] td:nth-child(2)').html("x"+reconstruction.draft[id].stored)
        if (reconstruction.draft[id].stored > 0) 
            $('.reconstructionLine[data-meta_id="'+id+'"]').show()
        else
            $('.reconstructionLine[data-meta_id="'+id+'"]').hide()

    }
});

let reconstruction = {
    draft:null,

    showTable:()=>{
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
        
        let icons = (x) => `<img src=${srcLinks.get(`/shared/icons/${x}.png`,true,true)}>`;
        
        h =`<table class="sortable-table foe-table">
                <thead>
                    <tr class="sorter-header">
                        <th data-type="reconstructionSizes">${i18n('Boxes.CityMap.Building')}</th>
                        <th class="no-sort">#</th>
                        <th class="no-sort">${icons("road_required")}?</th>
                        <th class="is-number" data-type="reconstructionSizes"></th>
                        <th class="is-number" data-type="reconstructionSizes"></th>
                    </tr>
                </thead><tbody class="reconstructionSizes">`
        for (let [id,b] of Object.entries(reconstruction.draft)) {
            let meta=MainParser.CityEntities[id]
            let width = meta.width||meta.components.AllAge.placement.size.x
            let length = meta.length||meta.components.AllAge.placement.size.y
            let road=""
            if ((meta?.components?.AllAge?.streetConnectionRequirement?.requiredLevel || meta?.requirements?.street_connection_level) == 2)
                road = icons("street_required")
            else if ((meta?.components?.AllAge.streetConnectionRequirement?.requiredLevel || meta?.requirements?.street_connection_level) == 1)
                road = icons("road_required")

            h+=`<tr class="reconstructionLine helperTT" data-callback_tt="Tooltips.buildingTT" data-meta_id="${id}" ${b.stored==0 ? ' style="display:none"' : ""}>
                    <td data-text="${helper.str.cleanup(meta.name)}">${meta.name}</td>
                    <td>x${b.stored}</td>
                    <td>${road}</td>
                    <td data-number="${length*100+width}">${length} x</td>
                    <td data-number="${width*100+length}">${width}</td>
                </tr>`
        }
        h +=`</tbody></table>`


        $('#ReconstructionListBody').html(h)
        $('#ReconstructionListBody .sortable-table').tableSorter()		

    },
}

