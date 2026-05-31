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

FoEproxy.addHandler('BoostService', 'getAllBoosts', (data, postData) => {
    Boosts.Add(data.responseData);
    if (Boosts.first) {
        Boosts.first = false;
        Boosts.InitQIAP();
    } 
});
FoEproxy.addHandler('BoostService', 'addBoost', (data,postData)=> {
    if (postData[0].requestClass == "CityMapService") return;
    if (postData[0].requestData[0]?.additionalPayload?.cityMapEntity) return;
    if (postData[0].requestData[0]?.additionalPayload?.mapEntityId) return;
	Boosts.Add([data.responseData]);
});
FoEproxy.addHandler('BoostService', 'removeBoost', (data)=> {
	Boosts.Remove([{boostId:data.responseData}]);
});
FoEproxy.addHandler('StartupService', 'getData', (data, postData) => {
    Boosts.InitLB(data.responseData.city_map.entities.filter(x=>x.type=="greatbuilding"));
    Boosts.TimeIn.add(data.responseData.city_map.entities.filter(x=>x.state.decaysAt || x.state.__class__=="ConstructionState"));
}),
FoEproxy.addHandler('CityMapService', 'placeBuilding', (data, postData) => {
    Boosts.TimeIn.add(data.responseData);
});
FoEproxy.addHandler('CityMapService', 'moveEntities', (data, postData) => {
    Boosts.TimeIn.add(data.responseData);
});
FoEproxy.addHandler('CityMapService', 'updateEntity', (data, postData) => {
    let buildings=data.responseData.filter(x=>x.type!="greatbuilding")
    Boosts.TimeIn.add(buildings);
});
FoEproxy.addHandler('CityMapService', 'removeBuilding', (data, postData) => {
    Boosts.Remove(postData[0].requestData.map(b=>({entityId:b})));
});
FoEproxy.addHandler('CityMapService', 'reset', (data, postData) => {
    Boosts.InitLB(data.responseData.filter(x=>x.type=="greatbuilding"));
    Boosts.TimeIn.add(data.responseData.filter(x=>x.type!="greatbuilding"));
});
FoEproxy.addHandler('CityMapService', 'getCityMap', (data, postData) => {
    if (data.responseData.gridId!=="guild_raids") return
    Boosts.TimeIn.add(data.responseData.entities);
});


let Boosts = {
    first:true,
    ListByType:{},
    CastleSystem:[],
    Ark:0,
    percent: (x) => {
        return [
            "diplomacy",
            "guild_raids_action_points_collection",
            "guild_raids_goods_start",
            "guild_raids_units_start",
            "guild_raids_supplies_start",
            "guild_raids_coins_start",
            "guild_raids_action_points_capacity"
        ].includes(x) ? "" : "%"
    },
    Mapper: {
        'supplies_boost': ['supply_production'],
        'happiness': ['happiness_amount'],
        'military_boost': ['att_boost_attacker', 'def_boost_attacker'],
        'att_def_boost_attacker': ['att_boost_attacker', 'def_boost_attacker'],
        'fierce_resistance': ['att_boost_defender', 'def_boost_defender'],
        'att_def_boost_defender': ['att_boost_defender', 'def_boost_defender'],
        'att_def_boost_attacker_defender': ['att_boost_attacker', 'def_boost_attacker', 'att_boost_defender', 'def_boost_defender'],
        'advanced_tactics': ['att_boost_attacker', 'def_boost_attacker', 'att_boost_defender', 'def_boost_defender'],
        'money_boost': ['coin_production'],
    },
    Sums: {
        'att_boost_attacker': 0,
        'def_boost_attacker': 0,
        'att_boost_defender': 0,
        'def_boost_defender': 0,
        'goods_production': 0,
        'special_goods_production': 0,
        'guild_raids-att_boost_attacker': 0,
        'guild_raids-def_boost_attacker': 0,
        'guild_raids-att_boost_defender': 0,
        'guild_raids-def_boost_defender': 0,
        'guild_expedition-att_boost_attacker': 0,
        'guild_expedition-def_boost_attacker': 0,
        'guild_expedition-att_boost_defender': 0,
        'guild_expedition-def_boost_defender': 0,
        'battleground-att_boost_attacker': 0,
        'battleground-def_boost_attacker': 0,
        'battleground-att_boost_defender': 0,
        'battleground-def_boost_defender': 0,
        'battleground-def_boost_defender': 0,
        'critical_hit_chance': 0,
        'coin_production': 0,
        'supply_production': 0,
        'forge_points_production':0,
        'guild_goods_production':0,
        'guild_raids_action_points_collection': 0,
        'guild_raids_action_points_capacity': 0,
        'guild_raids_coins_production': 0,
        'guild_raids_coins_start': 0,
        'guild_raids_supplies_production': 0,
        'guild_raids_supplies_start': 0,
        'guild_raids_goods_start': 0,
        'guild_raids_units_start': 0,
    },
    noSettlement: {
        'guild_raids_action_points_collection': 0,
        'guild_raids_action_points_capacity': 0,
        'guild_raids-att_boost_attacker': 0,
        'guild_raids-def_boost_attacker': 0,
        'guild_raids-att_boost_defender': 0,
        'guild_raids-def_boost_defender': 0,
        'guild_raids_coins_production': 0,
        'guild_raids_supplies_production': 0
    },
    Init:()=>{
        for (let boost of Object.keys(Boosts.Sums)) {
            Boosts.ListByType[boost] = [];
        }
    },

    InitLB: async (LBs) => {
        
        let boosts=LBs.filter(x=>x.bonus?.type && x.player_id == ExtPlayerID).map(x=>
            ({
                entityId: x.entityId||x.id,
                origin: "greatBuilding",
                type: x.bonus.type,
                value: x.bonus.value || 0
            })
        )
        Boosts.Remove(boosts)
        Boosts.Add(boosts)
    },
    InitQIAP: async () => {
        await ExistenceConfirmed('GoodsData.guild_raids_action_points');
        QIActions.capacity  = (GoodsData.guild_raids_action_points?.abilities?.autoRefill?.maxAmount || 200000) - Boosts.Sums['guild_raids_action_points_capacity'];

    },
    getFeatureType: (bonus) => {
        let Type = bonus.type;
        if (Type.includes("attacker")||Type.includes("defender")) {
            feature = bonus.feature || bonus.targetedFeature || "all";
            return (feature != "all" ? feature + "-" : "") + Type;
        }
        return Type;
    },

    /**
         * Collects active boosts from the city
         *
         * @param d
         */
    Add: (AllBoosts) => {
        if (!AllBoosts || AllBoosts.length==0) return

        for (let b of AllBoosts||[]) {
            if (b.type == 'happiness') continue; // => handled in productions.js
            if (b.type == 'life_support') continue; // => handled in productions.js
            if (b.origin == "castle_system") {
                Boosts.CastleSystem.push(b)
            }
            
            if (b.origin === "inventory_item") {
                BoostPotions.activate(b.type,{expire:b.expireTime,target:b.targetedFeature||"all",value:b.value})    
                if (b.expireTime) {
                    BoostPotions.TimeOut?.add(b)
                }
            }

            let mapped = Boosts.Mapper[b.type]?.map(x=>{
                    let a = structuredClone(b)
                    a.type = x
                    return a
                }) || [structuredClone(b)]
            for (let m of mapped) {        
                m.type = Boosts.getFeatureType(m);
                Boosts.ListByType[m.type]?.push(m);
            }
        }
        Boosts.updateSums();
    },
    updateSums: () => {
        for (let boost of Object.keys(Boosts.Sums)) {
            Boosts.Sums[boost] = 0;
            Boosts.noSettlement[boost] = 0;
            for (let b of Boosts.ListByType[boost]) {
                Boosts.Sums[boost] += b.value;
                if ((!b.entityId || MainParser.CityMapData[b.entityId])) {
                    Boosts.noSettlement[boost] += b.value;
                }
            }
        }
        FoEproxy.triggerFoeHelperHandler("BoostsUpdated");
    },
    TimeIn: {
        list:[],
        next:null,
        id:null,
        add: async (buildings)=>{
            await StartUpDone
            let addToList = (boost)=>{
                if (!Array.isArray(boost.type)) boost.type=[boost.type]
                for (type of boost.type||[boost.type]) {
                    b=structuredClone(boost)
                    b.type = type
                    Boosts.TimeIn.list.push(b)
                }
                if (!Boosts.Timer.id || !Boosts.Timer.next || boost.startTime < Boosts.Timer.next) {
                    clearTimeout(Boosts.Timer.id)
                    Boosts.Timer.id = setTimeout(Boosts.Timer.execute, (boost.startTime - GameTime.get() + 2)*1000)
                    Boosts.Timer.next = boost.startTime
                }
                //localStorage.setItem("Boosts.TimeIn.list", JSON.stringify(Boosts.TimeIn.list.filter(x=>!MainParser.CityMapData[x.entityId])))
            }
            let boostsToAddDirectly=[]
            for (let building of buildings||[]) {
                if (!building.id) continue
                Boosts.Remove([{entityId:building.id}])
                let metaData = structuredClone(MainParser.CityEntities[building.cityentity_id])
                let era = Technologies.getEraName(building.cityentity_id, building.level)
                let NCE=CityBuildings.createBuilding(metaData, era, building)
                if (!NCE.boosts||NCE.boosts.length==0) continue
                for (let boost of NCE.boosts||[]) {
                    boost.startTime = building.state.next_state_transition_at
                    boost.entityId = building.id
                    boost.origin = "building"
                    if (metaData?.components?.AllAge?.limited) {   
                        boost.expireTime = building.state.decaysAt || building.state.next_state_transition_at + metaData.components.AllAge.limited.config.expireTime
                        Boosts.TimeOut.add(boost)
                    }
                    if (building.state.__class__=="ConstructionState" && (building.state.pausedAt||boost.type=="")) {
                        addToList(boost)
                    } else if (!building.state.pausedAt) {
                        if (!Array.isArray(boost.type)) boost.type=[boost.type]
                        for (type of boost.type) {
                            let b=structuredClone(boost)
                            b.type = type
                            boostsToAddDirectly.push(b)
                        }
                    }
                }
                 
                if (metaData?.components?.AllAge?.limited) {
                    let target = metaData.components.AllAge.limited.config.targetCityEntityId
                    let metaTarget = structuredClone(MainParser.CityEntities[target])
                    let era = Technologies.getEraName(building.cityentity_id, building.level)
                    let NCE=CityBuildings.createBuilding(metaTarget, era)
                    for (let boost of NCE.boosts||[]) {
                        boost.startTime = building.state.decaysAt || building.state.next_state_transition_at + metaData.components.AllAge.limited.config.expireTime
                        boost.entityId = building.id
                        boost.origin = "building"
                        addToList(boost)
                    } 
                }   
            }
            Boosts.Add(boostsToAddDirectly)    
        },
    },
    TimeOut:{
        list:[],
        add:(boost)=>{
            if (!Boosts.TimeOut.id || !Boosts.Timer.next || boost.expireTime < Boosts.TimeOut.next) {
                clearTimeout(Boosts.Timer.id)
                Boosts.Timer.id = setTimeout(Boosts.Timer.execute, (boost.expireTime - GameTime.get() + 2)*1000)
                Boosts.Timer.next = boost.expireTime
            }
            Boosts.TimeOut.list.push(boost)
        },  
    },
    Timer:{
        next:null,
        id:null,
        execute:()=>{

            let refTime=GameTime.get()
            let toRemove = Boosts.TimeOut.list.filter(x=>x.expireTime<=refTime)
            Boosts.TimeOut.list = Boosts.TimeOut.list.filter(x=>x.expireTime>refTime)
            Boosts.Remove(toRemove)

            let toAdd = Boosts.TimeIn.list.filter(x=>x.startTime<=refTime)
            Boosts.TimeIn.list = Boosts.TimeIn.list.filter(x=>x.startTime>refTime)
            Boosts.Add(toAdd)
            let list=[...Boosts.TimeOut.list,...Boosts.TimeIn.list].map(x=>x.startTime||x.expireTime)
            let next=Math.min(...list)
            clearTimeout(Boosts.Timer.id)
            Boosts.Timer.id=null
            if (list.length>0) Boosts.Timer.id = setTimeout(Boosts.Timer.execute, (next - GameTime.get() + 2)*1000)
        },
    },
    Remove: (boosts) => {
        if (!boosts || boosts.length==0) return
        for (b of boosts||[]) {
            for (let type of Object.keys(Boosts.ListByType)) {
                if (b.boostId) {
                    Boosts.ListByType[type] = Boosts.ListByType[type].filter(x=>x.id!=b.boostId);
                }
                if (b.entityId) {
                    Boosts.ListByType[type] = Boosts.ListByType[type].filter(x=>x.entityId!=b.entityId);
                }
            }
            if (b.entityId) {
                Boosts.TimeIn.list = Boosts.TimeIn.list.filter(x=>x.entityId!=b.entityId);
            }
        }
        Boosts.updateSums();
    },
        
}

Boosts.Init();