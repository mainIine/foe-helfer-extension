/*
 * *************************************************************************************
 *
 * Copyright (C) 2024 FoE-Helper team - All Rights Reserved
 * You may use, distribute and modify this code under the
 * terms of the AGPL license.
 *
 * See file LICENSE.md or go to
 * https://github.com/mainIine/foe-helfer-extension/blob/master/LICENSE.md
 * for full license details.
 *
 * *************************************************************************************
 */


/*
How-to set tooltip for Element x:
- give Element x class "helperTT"
- set data-attribute "data-callback_tt" to set the tooltip content
    - if the data-attribute evaluates to be a function, the event paramenter of the triggering "pointerenter" event will be passed through

e.g.:
 `<td class="helperTT" data-callback_tt="Tooltips.buildingTT">Ipsum Lorem</td>`;
*/

let Tooltips = {

    Container:null,
    containerActive:false,
    targetElement:null,
    
    init: () => {
		HTML.AddCssFile('customTooltip');
        let container = document.createElement("div");
        container.id = "TooltipContainer"
        container.className = "window-box"
        container.style = "z-index:1000; position: absolute; display: none; pointer-events: none;"
        $('#game_body').append(container);
        Tooltips.Container = container;

        window.addEventListener("pointermove", Tooltips.followMouse);
        
        
        $('body').on("pointerenter",".helperTT", async (e)=>{
            if (e.currentTarget.dataset.callback_tt) {
                Tooltips.activate()
                let f=eval(e.currentTarget.dataset.callback_tt)
                if (typeof(f) == "function") {
                    let content = await(f(e));
                    Tooltips.set(content)
                } else
                    Tooltips.set(f);
            }
        })

        $('body').on("pointerleave",".helperTT",(e)=>{
            Tooltips.deactivate()
        })        
    },

    set: (content) => {
        if (!content) return
        Tooltips.Container.innerHTML=content;
        Tooltips.checkposition()
    },
    checkposition: () => {
        try {
            if(Tooltips.containerActive) {
                if (Tooltips.Container.firstChild.clientHeight+7+Number(Tooltips.Container.style.top.replace("px","")) > Tooltips.Container.parentElement.clientHeight) Tooltips.Container.style.top=(Tooltips.Container.parentElement.clientHeight-Tooltips.Container.firstChild.clientHeight-7)+"px"
                if (Tooltips.Container.firstChild.clientWidth+7+Number(Tooltips.Container.style.left.replace("px","")) > Tooltips.Container.parentElement.clientWidth) Tooltips.Container.style.left=(Tooltips.Container.parentElement.clientWidth-Tooltips.Container.firstChild.clientWidth-7)+"px"
            }
        } catch (e) {

        }
    },
    activate:() => {
        Tooltips.containerActive = true;
        Tooltips.Container.style.display = "block";
    },
                
    deactivate:() => {
        Tooltips.containerActive = false;
        Tooltips.Container.style.display = "none";
    },
    followMouse:(event)=>{
        Tooltips.Container.style.left = (event.x+10) + "px";
        Tooltips.Container.style.top = (event.y+10) + "px";
        Tooltips.checkposition()
    },
    buildingTT: (e)=>{
        let id=e?.currentTarget?.dataset?.meta_id||MainParser?.CityMapData[e?.currentTarget?.dataset?.id]?.cityentity_id
        let era = Technologies.InnoEraNames[MainParser?.CityMapData[e?.currentTarget?.dataset?.id]?.level]
        if (!id) return
        
        let meta=MainParser.CityEntities[id]

        let h = `<div style="width:min-content"><table class="foe-table"><tr><td style="min-width:200px; max-width:200px; vertical-align:top">`+
                `<div style="color:var(--text-bright);font-weight:600;text-decoration: underline;">${meta.name}</div>`+
                `<img src="${srcLinks.get("/city/buildings/"+meta.asset_id.replace(/^(\D_)(.*?)/,"$1SS_$2")+".png",true)}" style="max-width:200px"></td>`+
                `<td style="width:100%; vertical-align:top"">`;
        h += Tooltips.BuildingData(meta,era);
        h += "</td></tr></table></div>"
        setTimeout(()=>{
            $(".handleOverflow").each((index,e)=>{
                let w= ((e.scrollWidth - e.parentNode.clientWidth) || 0)
                if (w<0)
                    e.style["animation-name"]="unset"
                else 
                    e.style.width = w + "px";
            })
        },100)
        return h
    },
    BuildingData:(meta,onlyEra=null)=>{
        let numberWithCommas = (x) => {
			if (!x) return ""
			return x.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
		};
        let minEra = onlyEra||"BronzeAge"
        let maxEra = onlyEra||Technologies.EraNames[Technologies.getMaxEra()]
        let goodsList = ["era_goods","random_good_of_age","all_goods_of_age", "random_good_of_age","random_good_of_age_1","random_good_of_age_2","random_good_of_age_3"]
    
        let span = (x,withHighlight=false) => `<span ${withHighlight ? `class="${x>0 ? "positive" : "negative"}"`:''}>${numberWithCommas(x)}</span>`;
        let longSpan = (x) => `<div class="overflowBox"><span class="handleOverflow">${x}</span></div>`
        let range = (x,y,withHighlight=false) => span(x,withHighlight) + (x!=y ?` - `+ span(y,withHighlight):``);
        let formatTime = (x) => {
            let min=Math.floor(x/60)
            let sec = x-min*60
            let hour=Math.floor(min/60)
            min -= hour*60
            let day=Math.floor(hour/24)
            hour -= day*24
            let time = sec + "s"
            if (min>0) time= min+(sec>0?":"+(sec>9?sec:"0"+sec):"")+"m"
            if (hour>0) time = hour+(sec+min>0 ? ":"+(min>9?min:"0"+min)+(sec>0?":"+(sec>9?sec:"0"+sec):""):"")+"h"
            if (day>0) time = day + (hour+sec+min>0 ? (hour>9?hour:"0"+hour) + (sec+min>0 ? ":"+(min>9?min:"0"+min)+(sec>0?":"+(sec>9?sec:"0"+sec):""):""):"")+"d"
            return time
        }
        let src=(x)=>{
            if (!x) return ""
            x=x.replace(/(.*?)_[0-9]+/gm,"$1");
            let link = srcLinks.get(`/shared/icons/${x}.png`,true,true);
            if (link.includes("antiquedealer_flag")) link = srcLinks.get(`/shared/icons/reward_icons/reward_icon_${x}.png`,true,true);
            if (link.includes("antiquedealer_flag")) link = srcLinks.get(`/city/buildings/${x.replace(/(\D*?)_(.*)/,"$1_SS_$2")}.png`,true);
            return link
        }
        
        let icons = (x) => `<img src=${src(x)}>`;// ${y ? `style="background: url(${src(y)}); background-size: contain; background-repeat: no-repeat;"`:""}>`;
        
        let genericEval = (rew) => {
            let [x1,amount,name] = rew.name.match(/^([+\-]?\d*)x? (.*)$/)||["",1,rew.name]
            amount = Number(amount)
            let icon = ""
            let fragment = ""
            if (rew.iconAssetName=="icon_fragment") {
                icon = icons(rew.assembledReward?.iconAssetName||rew.assembledReward?.subType)
                name = name.replace(/Fragments? of/,"").replace(/.*?'(.*?)'.*/,"$1")
                fragment = icons("icon_tooltip_fragment")
            } else if (rew.type=="unit") {

                name = /nextera/i.test(rew.id)? "of next era" : ""
                
                icon = icons(rew.subType=="rogue"?"rogue":(
                    rew.subType.includes("champion")?"chivalry":
                    Unit.Types.filter(x=>x.unitTypeId==rew.subType)[0].unitClass
                    ))
            } else
                icon = icons(rew.iconAssetName)
            
            return {icon:icon,amount:amount,name:name,fragment:fragment}
        }    
        

        
        let capFirsts = (s) => {
            return s.replace("_"," ").replace(/(\b[a-z](?!\s))/g, function(x){return x.toUpperCase();});
        }

        let feature = {
            "all":"",
            "battleground":"_gbg",
            "guild_expedition":"_gex",
            "guild_raids":"_gr"
        }
        let percent = (x) => {
            return [
                "diplomacy",
                "guild_raids_action_points_collection",
                "guild_raids_goods_start",
                "guild_raids_units_start",
                "guild_raids_supplies_start",
                "guild_raids_coins_start",
            ].includes(x) ? "" : "%"
        }
        let out='<table class="HXBuilding">';        

        if (meta.components) {
            
            let levels=meta.components
            if (levels?.[minEra]) {
                maxEra = Technologies.EraNames[Math.max(...Object.keys(levels).map(x=>Technologies.Eras[x]))]
            }
            let era="",
                ally="",
                traits = "",
                motMod = "",
                polMod = "",
                ifMot = `<span class="ifMot">${icons("when_motivated")}</span>`

            if (levels?.AllAge?.socialInteraction?.interactionType) {
                if (levels?.AllAge?.socialInteraction?.interactionType == "motivate") {
                    motMod = `<span class="ifMot">${icons("reward_x2")+i18n("Boxes.Tooltip.Building.when")+icons("when_motivated")}</span>`
                    traits+=`<tr><td><span>${icons("when_motivated")}</span>${i18n("Boxes.Tooltip.Building.canPolish")}</td></tr>`
                }
                else if (levels?.AllAge?.socialInteraction?.interactionType == "polish") {
                    polMod = `<span class="ifMot">${icons("reward_x2")+"when"+icons("when_motivated")}</span>`
                    traits+=`<tr><td><span>${icons("when_motivated")}</span>${i18n("Boxes.Tooltip.Building.canMotivate")}</td></tr>`
                }
            }
            for (let a of meta.abilities||[]) {
                if (a.__class__=="BuildingPlacementAbility") {
                    if (a.gridId == "cultural_outpost") {
                        era=`<img src=${srcLinks.get(`/outpost/gui/${a.content}/shared/reward_chest_badge_${a.content}.png`,true)}> ${capFirsts(a.content)}`
                    }
                    if (a.gridId == "era_outpost") {
                        era=`<img src=${srcLinks.get(`/shared/icons/achievements/achievement_icons_space_age_${a.content}.png`,true)}> ${capFirsts(a.content)}`
                    }
                }
                if (a.__class__=="AffectsEnvironmentAbility" && a.action?.type=="add_unique_inhabitant") 
                    traits += `<tr><td><img class="inhabitant" src="${srcLinks.get(`/city/inhabitants/${a.action.animationId}/${a.action.animationId}_south_00.png`,true)}">◄ ${i18n("Boxes.Tooltip.Building.addInhabitant")} (${capFirsts(a.action.animationId)})</td></tr>`
            }

            for (r of levels.AllAge?.ally?.rooms || []) {
                ally += '<tr><td>'+icons("historical_allies_slot_tooltip_icon_empty") + capFirsts(r.allyType) + (r.rarity?.value ? (" ("+capFirsts(r.rarity?.value)+")"):"")+`</td></tr>`
            }

            if (levels.AllAge.eraRequirement?.era && era =="") {
                era = icons("era") + " " + i18n("Eras."+(Technologies.Eras[levels.AllAge.eraRequirement?.era]))
            }

            if (era != "") out += "<tr><td>" + era + "</td></tr>"

            if (levels?.AllAge?.limited?.config?.expireTime) {
                out += `<tr><td class="limited">${icons("limited_building_downgrade") + MainParser.CityEntities[levels.AllAge.limited.config.targetCityEntityId].name} (${i18n("Boxes.Tooltip.Building.after")} ${formatTime(levels.AllAge.limited.config.expireTime)})</td></tr>`
            }

            let provides=""

            for ([resource,amount] of Object.entries(levels.AllAge?.staticResources?.resources?.resources||{})) {
                provides+=`<tr><td>${icons(resource)+" "+ span(amount,true)}</td></tr>`
            }
            for ([resource,amount] of Object.entries(levels?.[minEra]?.staticResources?.resources?.resources||{})) {
                provides+=`<tr><td>${icons(resource)+" "+ range(amount,levels[maxEra]?.staticResources?.resources?.resources?.[resource],true)}</td></tr>`
            }
            if (levels.AllAge?.happiness?.provided) {
                provides+=`<tr><td>${icons("happiness")+" "+ span(levels.AllAge?.happiness?.provided,true) + polMod}</td></tr>`
            } 
            if (levels?.[minEra]?.happiness?.provided && levels[maxEra]?.happiness?.provided) {
                provides+=`<tr><td>${icons("happiness") + " " + range(levels?.[minEra]?.happiness?.provided,levels[maxEra]?.happiness?.provided,true) + polMod}</td></tr>`
            }
            for (let [i,b] of Object.entries(levels.AllAge?.boosts?.boosts||[])){
                provides+=`<tr><td>${icons(b.type+feature[b.targetedFeature]) + " " + span(b.value) + percent(b.type)}</td></tr>`
            }
            
            for (let [i,b] of Object.entries(levels?.[minEra]?.boosts?.boosts||[])){
                provides+=`<tr><td>${icons(b.type+feature[b.targetedFeature]) + " " + range(b.value,levels[maxEra]?.boosts?.boosts[i].value) + percent(b.type)}</td></tr>`
            }
            
            let prods=""
            let pCount = levels.AllAge?.production?.options?.length || levels?.[minEra]?.production?.options?.length || 0
            
            for (let [oIndex,option] of Object.entries(levels.AllAge.production?.options||[])) {
                let t = pCount>1 ? " in " + formatTime(option.time): ""
                for (let [pIndex,product] of Object.entries(option.products)) {
                    if (product.type == "resources") {
                        for (let [res,amount] of Object.entries(product.playerResources?.resources||{})) {
                            if (amount !=0) 
                                prods+=`<tr><td>${icons(goodsList.includes(res)?"goods":res) + span(amount)+t  + ((["supplies","coins","money"].includes(res) && !product.onlyWhenMotivated) ? motMod : "") + (product.onlyWhenMotivated?ifMot:"")}</td></tr>`
                        }
                    }
                    if (product.type == "guildResources") {
                        for (let [res,amount] of Object.entries(product.guildResources?.resources||{})) {
                            if (amount !=0) 
                                prods+=`<tr><td>${icons(goodsList.includes(res)?"treasury_goods":res) + span(amount)+t + (product.onlyWhenMotivated?ifMot:"")}</td></tr>`
                        }
                    }
                    if (product.type == "unit") {
                        if (product.amount !=0) {
                            let iconId= (product.unitTypeId=="rogue"?"rogue":(
                                         product.unitTypeId.includes("champion")?"chivalry":
                                         Unit.Types.filter(x=>x.unitTypeId==product.unitTypeId)[0].unitClass
                                         ))
                            prods+=`<tr><td>${icons(iconId) + span(product.amount)+t + (product.onlyWhenMotivated?ifMot:"")}</td></tr>`
                        }
                    }
                    if (product.type == "genericReward") {
                        let rew = genericEval(levels.AllAge.lookup.rewards[product.reward.id])
                        prods+=`<tr><td class="isGeneric">${rew.icon + span(rew.amount) + rew.fragment + longSpan(rew.name) + t + (product.onlyWhenMotivated ? ifMot : "")}</td></tr>`
                    }
                    if (product.type=="random") {
                        prods+=`<tr><td><table class="randomProductions">`
                        for (let [rIndex,random] of Object.entries(product.products)){
                            prods+=`<tr><td>`
                            if (random.product.type == "resources") {
                                for (let [res,amount] of Object.entries(random.product.playerResources?.resources||{})) {
                                    if (amount !=0) 
                                        prods+=icons(goodsList.includes(res)?"goods":res) + span(amount)
                                }
                            }
                            if (random.product.type == "guildResources") {
                                for (let [res,amount] of Object.entries(random.product.guildResources?.resources||{})) {
                                    if (amount !=0) 
                                        prods+=icons(goodsList.includes(res)?"treasury_goods":res) + span(amount)
                                }
                            }
                            if (random.product.type == "unit") {
                                if (random.product.amount !=0) {
                                    let iconId= (random.product.unitTypeId=="rogue"?"rogue":(
                                                random.product.unitTypeId.includes("champion")?"chivalry":
                                                Unit.Types.filter(x=>x.unitTypeId==random.product.unitTypeId)[0].unitClass
                                                ))
                                    prods+=icons(iconId) + span(random.product.amount)
                                }
                            }
                            if (random.product.type == "genericReward") {
                                let rew=genericEval(levels.AllAge.lookup.rewards[random.product.reward.id])
                                prods += rew.icon + span(rew.amount) + rew.fragment + longSpan(rew.name)
                            }
                            prods+=`<span class="dropChance">${Math.floor(random.dropChance*100)}%</span></td></tr>`
                        }
                        prods+=`</table>${(product.onlyWhenMotivated ? ifMot : "")}</td></tr>`
                    }                    
                }
            }
            for (let [oIndex,option] of Object.entries(levels?.[minEra]?.production?.options||[])) {
                let t = pCount>1 ? " in " + formatTime(option.time): ""
                for (let [pIndex,product] of Object.entries(option.products)) {
                    if (product.type == "resources") {
                        for (let [res,amount] of Object.entries(product.playerResources?.resources||{})) {
                            if (amount !=0) 
                                prods+=`<tr><td>${icons(goodsList.includes(res)?"goods":res) + range(amount,levels?.[maxEra]?.production?.options?.[oIndex]?.products?.[pIndex]?.playerResources?.resources?.[res])+t  + ((["supplies","coins","money"].includes(res) && !product.onlyWhenMotivated) ? motMod : "") + (product.onlyWhenMotivated?ifMot:"")}</td></tr>`
                        }
                    }
                    if (product.type == "guildResources") {
                        for (let [res,amount] of Object.entries(product.guildResources?.resources||{})) {
                            if (amount !=0) 
                                prods+=`<tr><td>${icons(goodsList.includes(res)?"treasury_goods":res) + range(amount,levels?.[maxEra]?.production?.options?.[oIndex]?.products?.[pIndex]?.guildResources?.resources?.[res])+t + (product.onlyWhenMotivated?ifMot:"")}</td></tr>`
                        }
                    }
                    if (product.type == "unit") {
                        if (product.amount !=0) {
                            let iconId= (product.unitTypeId=="rogue"?"rogue":(
                                         product.unitTypeId.includes("champion")?"chivalry":
                                         Unit.Types.filter(x=>x.unitTypeId==product.unitTypeId)[0].unitClass
                                         ))
                            prods+=`<tr><td>${icons(iconId) + range(product.amount,levels?.[maxEra]?.production?.options?.[oIndex]?.products?.[pIndex].amount)+t + (product.onlyWhenMotivated?ifMot:"")}</td></tr>`
                        }
                    }
                    if (product.type == "genericReward") {
                        let rewBA=genericEval(levels?.[minEra].lookup.rewards[product.reward.id])
                        let rewMax=genericEval(levels[maxEra].lookup.rewards[levels[maxEra]?.production?.options?.[oIndex]?.products?.[pIndex]?.reward?.id])
                        
                        if (rewBA.icon+rewBA.name==rewMax.icon+rewMax.name) {
                            prods+=`<tr><td class="isGeneric">${rewBA.icon + range(rewBA.amount,rewMax.amount) + rewBA.fragment + longSpan(rewBA.name) + t + (product.onlyWhenMotivated ? ifMot : "")}</td></tr>`
                        } else {
                            prods+=`<tr><td class="isGeneric">${rewBA.icon + span(rewBA.amount) + rewBA.fragment + longSpan(rewBA.name) + " - " + rewMax.icon + span(rewMax.amount) + rewMax.fragment + longSpan(rewMax.name) + t + (product.onlyWhenMotivated ? ifMot : "")}</td></tr>`
                        }
                    }
                    if (product.type=="random") {
                        prods+=`<tr><td><table class="randomProductions">`
                        for (let [rIndex,random] of Object.entries(product.products)){
                            prods+=`<tr><td>`
                            if (random.product.type == "resources") {
                                for (let [res,amount] of Object.entries(random.product.playerResources?.resources||{})) {
                                    if (amount !=0) 
                                        prods+=icons(goodsList.includes(res)?"goods":res) + range(amount,levels?.[maxEra]?.production?.options?.[oIndex]?.products?.[pIndex]?.products?.[rIndex]?.product?.playerResources?.resources?.[res])
                                }
                            }
                            if (random.product.type == "guildResources") {
                                for (let [res,amount] of Object.entries(random.product.guildResources?.resources||{})) {
                                    if (amount !=0) 
                                        prods+=icons(goodsList.includes(res)?"treasury_goods":res) + range(amount,levels?.[maxEra]?.production?.options?.[oIndex]?.products?.[pIndex]?.products?.[rIndex]?.product?.guildResources?.resources?.[res])
                                }
                            }
                            if (random.product.type == "unit") {
                                if (random.product.amount !=0) {
                                    let iconId= (random.product.unitTypeId=="rogue"?"rogue":(
                                                random.product.unitTypeId.includes("champion")?"chivalry":
                                                Unit.Types.filter(x=>x.unitTypeId==random.product.unitTypeId)[0].unitClass
                                                ))
                                    prods+=icons(iconId) + range(random.product.amount,levels?.[maxEra]?.production?.options?.[oIndex]?.products?.[pIndex?.products?.[rIndex]?.product].amount)
                                }
                            }
                            if (random.product.type == "genericReward") {
                                let rewBA=genericEval(levels?.[minEra].lookup.rewards[random.product.reward.id])
                                let rewMax=genericEval(levels[maxEra].lookup.rewards[levels[maxEra]?.production?.options?.[oIndex]?.products?.[pIndex]?.products?.[rIndex]?.product?.reward?.id])
                                
                                if (rewBA.icon+rewBA.name==rewMax.icon+rewBA.name) {
                                    prods+=rewBA.icon + range(rewBA.amount,rewMax.amount) + rewBA.fragment + longSpan(rewBA.name)
                                } else {
                                    prods+=rewBA.icon + span(rewBA.amount) + rewBA.fragment + longSpan(rewBA.name) + " - " + rewMax.icon + span(rewMax.amount) + rewMax.fragment + longSpan(rewMax.name)
                                }
                            }
                            prods+=`<span class="dropChance">${Math.floor(random.dropChance*100)}%</td></tr>`
                        }
                        prods+=`</table>${(product.onlyWhenMotivated ? ifMot : "")}</td></tr>`
                    }
                }
            }
            
            let costs = ""
            for ([resource,amount] of Object.entries(levels.AllAge?.buildResourcesRequirement?.cost?.resources||{})) {
                if (amount>0) costs += `<div>${icons(resource) + " " + span(amount)}</div>`
            }
            
            if (ally!="") out+=`<tr><th>${i18n("Boxes.Tooltip.Building.allyRooms")}</th></tr>`+ally
            if (provides!="") out+=`<tr><th>${i18n("Boxes.Tooltip.Building.provides")}</th></tr>`+provides
            if (prods!="") out+=`<tr><th>${i18n("Boxes.Tooltip.Building.produces")} ${pCount==1 ? "("+formatTime(levels.AllAge.production?.options?.[0].time || levels?.[minEra].production?.options?.[0].time)+")":""}</th></tr>`+prods
            if (costs !="") out+=`<tr><th>${i18n("Boxes.Tooltip.Building.costs")}</th></tr><tr><td class="multiCol">`+costs+`</td></tr>`
            
            out+=`<tr><th>${i18n("Boxes.Tooltip.Building.size+time")}</th></tr>`
            out+=`<tr><td class="multiCol"><div>${icons("size")} ${levels.AllAge.placement.size.y+"x"+levels.AllAge.placement.size.x}</div><div>${icons("icon_time")}${formatTime(levels.AllAge.constructionTime.time)}</div>`
            if (levels.AllAge.streetConnectionRequirement?.requiredLevel) {
                if (levels.AllAge.streetConnectionRequirement?.requiredLevel == 2)
                    out+=`<div>${icons("street_required")} ${i18n("Boxes.Tooltip.Building.road2")}</div>`
                else if (levels.AllAge.streetConnectionRequirement?.requiredLevel == 1)
                    out+=`<div>${icons("road_required")} ${i18n("Boxes.Tooltip.Building.road")}</div>`
                    
            }
            out+=`</td></tr>`
            
            if (traits != "") out+=`<tr><th>${i18n("Boxes.Tooltip.Building.traits")}</th></tr>`+traits
 
        } else {
            
            
            let levels = Object.assign({},...(meta?.entity_levels?.map(x=>({[x.era]:x}))||[]))
            
            if (levels?.[minEra]) {
                maxEra = Technologies.EraNames[Math.max(...Object.keys(levels).map(x=>Technologies.Eras[x]))]
            }
            let era="",
                set="",
                traits = "",
                motMod = "",
                polMod = "",
                info = "",
                boosts="",
                abilityList={},
                ifMot = `<span class="ifMot">${icons("when_motivated")}</span>`
                 
            for (let a of meta.abilities||[]) {
                if (a.__class__=="BuildingPlacementAbility") {
                    if (a.gridId == "cultural_outpost") {
                        era=`<img src=${srcLinks.get(`/outpost/gui/${a.content}/shared/reward_chest_badge_${a.content}.png`,true)}> ${capFirsts(a.content)}`
                    }
                    if (a.gridId == "era_outpost") {
                        era=`<img src=${srcLinks.get(`/shared/icons/achievements/achievement_icons_space_age_${a.content}.png`,true)}> ${capFirsts(a.content)}`
                    }
                }
                if (a.__class__=="ChainStartAbility") {
                    set =icons(a.chainId) + MainParser.BuildingChains[a.chainId].name + '</td></tr><tr><td style="text-wrap-mode:wrap;">' + a.description
                }
                if (a.__class__=="ChainLinkAbility") {
                    set =icons(a.chainId) + MainParser.BuildingChains[a.chainId].name
                }
                if (a.__class__=="BuildingSetAbility") {
                    set =icons(a.setId) + MainParser.BuildingSets[a.setId].name
                }
                if (a.__class__=="PolishableAbility") {
                    traits+=`<tr><td><span>${icons("when_motivated")}</span>can be polished</td></tr>`
                    polMod = `<span class="ifMot">${icons("reward_x2")+i18n("Boxes.Tooltip.Building.when")+icons("when_motivated")}</span>`
                }
                if (a.__class__ == "MotivatableAbility") {
                    traits+=`<tr><td><span>${icons("when_motivated")}</span>can be motivated</td></tr>`
                    motMod = `<span class="ifMot">${icons("reward_x2")+i18n("Boxes.Tooltip.Building.when")+icons("when_motivated")}</span>`
                }
                if (a.__class__ == "AddCoinsToSupplyProductionWhenMotivatedAbility") {
                    motMod = `<span class="ifMot">${"+"+icons("money")+i18n("Boxes.Tooltip.Building.when")+icons("when_motivated")}</span>`
                }
                if (a.__class__=="NotPlunderableAbility") {
                    traits+=`<tr><td>`+icons("eventwindow_plunder_repel") + i18n("Boxes.Tooltip.Building.noPlunder")+`</td></tr>`                   
                }
                if (a.__class__=="AffectedByLifeSupportAbility") {
                    traits+=`<tr><td>`+icons("life_support") + i18n("Boxes.Tooltip.Building.lifeSupport")+`</td></tr>`                   
                }
                if (a.__class__=="DisplayInfoTextAbility") {
                    info += a.text
                }
                if (a.__class__=="AffectsEnvironmentAbility" && a.action?.type=="add_unique_inhabitant") 
                    traits += `<tr><td><img class="inhabitant" src="${srcLinks.get(`/city/inhabitants/${a.action.animationId}/${a.action.animationId}_south_00.png`,true)}">◄ ${i18n("Boxes.Tooltip.Building.addInhabitant")} (${capFirsts(a.action.animationId)})</td></tr>`
                if (a.boostHints){
                    for (let b of a.boostHints||[]){
                        if (b.boostHintEraMap?.AllAge) {
                            boosts+=`<tr><td>${icons(b.boostHintEraMap.AllAge.type+feature[b.boostHintEraMap.AllAge.targetedFeature]) + " " + span(b.boostHintEraMap.AllAge.value) + percent(b.boostHintEraMap.AllAge.type)}</td></tr>`
                        }
                        if (b.boostHintEraMap?.[minEra] && b.boostHintEraMap?.[maxEra]) {
                            boosts+=`<tr><td>${icons(b.boostHintEraMap?.[minEra].type+feature[b.boostHintEraMap?.[minEra].targetedFeature]) + " " + range(b.boostHintEraMap?.[minEra].value,b.boostHintEraMap[maxEra].value) + percent(b.boostHintEraMap?.[minEra].type)}</td></tr>`
                        }
                    }
                }
                if (!abilityList[a.__class__]) abilityList[a.__class__]=[]
                abilityList[a.__class__].push(a)                
            }

            if (meta?.requirements?.min_era && meta?.requirements?.min_era != "MultiAge" && era =="") {
                era = `${icons("era") + " " + i18n("Eras."+(Technologies.Eras[meta.requirements.min_era]))}`
            }
            
            if (era != "") out += "<tr><td>" + era + "</td></tr>"
            if (set != "") out += "<tr><td>" + set + "</td></tr>"
            if (info != "") out += '<tr><td style="text-wrap-mode:wrap;">' + info + "</td></tr>"
            
            let provides=""
            if (meta.provided_population || meta.required_population) {
                provides+=`<tr><td>${icons("population")+" "+ span((meta.provided_population||0) - (meta.required_population||0),true)}</td></tr>`
            } else if ((levels?.[minEra]?.provided_population && levels?.[maxEra]?.provided_population)||(levels?.[minEra]?.required_population && levels?.[maxEra]?.required_population)) {
                provides+=`<tr><td>${icons("population") + " " + range((levels?.[minEra].provided_population||0)-(levels?.[minEra].required_population||0),(levels?.[maxEra].provided_population||0)-(levels?.[maxEra].required_population||0),true)}</td></tr>`
            }
            if (meta.provided_happiness) {
                provides+=`<tr><td>${icons("happiness")+" "+ span((meta.provided_happiness||0),true)}</td></tr>`
            } else if ((levels?.[minEra]?.provided_happiness && levels?.[maxEra]?.provided_happiness)) {
                provides+=`<tr><td>${icons("happiness") + " " + range(levels?.[minEra].provided_happiness||0,levels?.[maxEra].provided_happiness||0,true) + polMod}</td></tr>`
            }

            if (levels?.[minEra]?.ranking_points && levels?.[maxEra]?.ranking_points) {
                provides+=`<tr><td>${icons("rank") + " " + range(levels?.[minEra].ranking_points,levels?.[maxEra].ranking_points)}</td></tr>`
            }

            for ([resource,amount] of Object.entries(meta?.static_resources?.resources||{})) {
                if (amount>0) provides+=`<tr><td>${icons(resource)+" "+ span(amount)}</td></tr>`
            }
            
            let prods=""
            if (meta.available_products) {
                if (levels?.[minEra]?.produced_money && levels?.[maxEra]?.produced_money) {
                    prods+=`<tr><td>${icons("money") + range(levels?.[minEra].produced_money,levels?.[maxEra].produced_money) + motMod}</td></tr>`
                }
                if (levels?.[minEra]?.clan_power && levels?.[maxEra]?.clan_power) {
                    prods+=`<tr><td>${icons("clan_power") + range(levels?.[minEra].clan_power,levels?.[maxEra].clan_power) + motMod}</td></tr>`
                }

                for (let p of meta.available_products) {
                    for (let [res,amount] of Object.entries(p.product?.resources||{})) {
                        if (res=="money" && levels?.[minEra]?.produced_money) continue
                        let t=(meta?.available_products?.length!=1) ? " in "+formatTime(p.production_time): ""
                        
                        if (goodsList.includes(res)) res="goods"
                        if (amount !=0) 
                            prods+=`<tr><td>${icons(res) + span(amount)+t + motMod}</td></tr>`
                        else
                            prods+=`<tr><td>${icons(res) + range(levels?.[minEra].production_values[p.production_option-1].value,levels?.[maxEra].production_values[p.production_option-1].value)+t + motMod}</td></tr>`
                    }
                    if (p.unit_class) {
                        prods+=`<tr><td>${icons(p.unit_class) + p.name}</td></tr>`
                    }
                }
                for (let a of abilityList.AddResourcesAbility||[]) {
                    for (let [res,amount] of Object.entries(a.additionalResources?.[minEra]?.resources||{})) {
                        if (amount !=0) 
                            prods+=`<tr><td>${icons(goodsList.includes(res)?"goods":res) + range(a.additionalResources?.[minEra].resources[res],a.additionalResources[maxEra].resources[res])}</td></tr>`
                    }
                    for (let [res,amount] of Object.entries(a.additionalResources?.AllAge?.resources||{})) {
                        if (amount !=0) 
                            prods+=`<tr><td>${icons(goodsList.includes(res)?"goods":res) + span(amount)}</td></tr>`
                        }
                }
                for (let a of abilityList.AddResourcesToGuildTreasuryAbility||[]) {
                    for (let [res,amount] of Object.entries(a.additionalResources?.[minEra]?.resources||{})) {
                        if (amount !=0) 
                            prods+=`<tr><td>${icons(goodsList.includes(res)?"treasury_goods":res) + range(a.additionalResources?.[minEra].resources[res],a.additionalResources[maxEra].resources[res])}</td></tr>`
                    }
                    for (let [res,amount] of Object.entries(a.additionalResources?.AllAge?.resources||{})) {
                        if (amount !=0) 
                            prods+=`<tr><td>${icons(goodsList.includes(res)?"treasury_goods":res) + span(amount)}</td></tr>`
                        }
                }
                for (let a of abilityList.AddResourcesWhenMotivatedAbility||[]) {
                    for (let [res,amount] of Object.entries(a.additionalResources?.[minEra]?.resources||{})) {
                        if (amount !=0) 
                            prods+=`<tr><td>${icons(goodsList.includes(res)?"goods":res) + range(a.additionalResources?.[minEra].resources[res],a.additionalResources[maxEra].resources[res])+ifMot}</td></tr>`
                    }
                    for (let [res,amount] of Object.entries(a.additionalResources?.AllAge?.resources||{})) {
                        if (amount !=0) 
                            prods+=`<tr><td>${icons(goodsList.includes(res)?"goods":res) + span(amount)+ifMot}</td></tr>`
                        }
                }
                for (let a of abilityList.RandomUnitOfAgeWhenMotivatedAbility||[]) {
                        prods+=`<tr><td>${icons("military")+(a.amount||1)+ifMot}</td></tr>`
                }
                for (let a of abilityList.RandomBlueprintWhenMotivatedAbility||[]) {
                        prods+=`<tr><td>${icons("blueprint")+(a.amount||1)+ifMot}</td></tr>`
                }
                for (let a of abilityList.RandomChestRewardAbility||[]) {
                    prods+=`<tr><td><table class="randomProductions">`
                    for (let [id,rew] of Object.entries(a.rewards?.[minEra]?.possible_rewards)) {
                        prods+=`<tr><td>`
                        let asset = rew?.reward?.type=="resource" ? rew.reward.subType : rew.reward.iconAssetName
                        amountBA=rew.reward?.totalAmount||rew.reward?.amount
                        amountMax=a.rewards?.[maxEra]?.possible_rewards?.[id]?.reward?.totalAmount||a.rewards?.[maxEra]?.possible_rewards?.[id]?.reward.amount
                        if (rew.reward.type=="chest" && rew.reward?.possible_rewards?.[0]?.reward?.type=="good") {
                            asset = "goods"
                            amountBA = rew.reward?.possible_rewards?.[0]?.reward?.amount||amountBA
                            amountMax = a.rewards?.[maxEra]?.possible_rewards?.[id]?.reward?.possible_rewards?.[0]?.reward?.amount||amountMax
                        }
                        prods+=icons(asset) + range(amountBA,amountMax)                    
                        prods+=`<span class="dropChance">${rew.drop_chance}%</span></td></tr>`

                    }
                    prods+=`</table></td></tr>`
                }
                
            }
            for (let a of abilityList.BonusOnSetAdjacencyAbility||[]) {
                for (let b of a.bonuses) {
                    if (Object.values(b.boost).length>0) {
                        boosts+=`<tr><td>${b.level + "x" + icons(a.setId)} ► `
                        if (b.boost.AllAge) {
                            boosts+=icons(b.boost.AllAge.type+feature[b.boost.AllAge.targetedFeature]) + " " + span(b.boost.AllAge.value) + percent(b.boost.AllAge.type)
                        }
                        if (b.boost?.[minEra] && b.boost[maxEra]) {
                            boosts+=icons(b.boost?.[minEra].type+feature[b.boost?.[minEra].targetedFeature]) + " " + range(b.boost?.[minEra].value,b.boost[maxEra].value) + percent(b.boost?.[minEra].type)
                        }
                        boosts+=`</td></tr>`
                    } else {
                        prods+=`<tr><td>${b.level + "x" + icons(a.setId)} ► `
                        if (b.revenue?.AllAge) {
                            let [res,amount] = Object.entries(b.revenue?.AllAge?.resources)[0]
                            prods+=icons(goodsList.includes(res)?"goods":res) + span(amount)
                        }
                        if (b.revenue?.[minEra] && b.revenue?.[maxEra]) {
                            let [res,amount] = Object.entries(b.revenue?.[minEra]?.resources)[0]
                            prods+=icons(goodsList.includes(res)?"goods":res) + range(amount,b.revenue?.[maxEra].resources[res])
                        }
                        prods+=`</td></tr>`
                    }
                }
            }
            first=true
            for (let a of abilityList.ChainLinkAbility||[]) {
                for (let b of a.bonuses) {
                    if (Object.values(b.boost).length>0) {
                        if (first) {
                            boosts+='<tr><td style="text-wrap-mode:wrap;">' + a.description+"</td></tr>"
                            first=false
                        }
                        boosts+=`<tr><td>${b.level + "x" + icons(a.chainId)} ► `
                        if (b.boost.AllAge) {
                            boosts+=icons(b.boost.AllAge.type+feature[b.boost.AllAge.targetedFeature]) + " " + span(b.boost.AllAge.value) + percent(b.boost.AllAge.type)
                        }
                        if (b.boost?.[minEra] && b.boost[maxEra]) {
                            boosts+=icons(b.boost?.[minEra].type+feature[b.boost?.[minEra].targetedFeature]) + " " + range(b.boost?.[minEra].value,b.boost[maxEra].value) + percent(b.boost?.[minEra].type)
                        }
                        boosts+=`</td></tr>`

                    } else {
                        if (first) {
                            prods+='<tr><td style="text-wrap-mode:wrap;">' + a.description+"</td></tr>"
                            first=false
                        }
                        prods+=`<tr><td>${b.level + "x" + icons(a.chainId)} ► `
                        if (b.revenue?.AllAge) {
                            let [res,amount] = Object.entries(b.revenue?.AllAge?.resources)[0]
                            prods+=icons(goodsList.includes(res)?"goods":res) + span(amount)
                        }
                        if (b.revenue?.[minEra] && b.revenue?.[maxEra]) {
                            let [res,amount] = Object.entries(b.revenue?.[minEra]?.resources)[0]
                            prods+=icons(goodsList.includes(res)?"goods":res) + range(amount,b.revenue?.[maxEra].resources[res])
                        }
                        prods+=`</td></tr>`
                    }
                }
            }
        
            
            let costs = ""
            for ([resource,amount] of Object.entries(meta?.requirements?.cost?.resources||{})) {
                if (amount>0) costs += `<div>${icons(resource) + " " + span(amount)}</div>`
            }
            provides=provides+boosts
            if (provides!="") out+=`<tr><th>${i18n("Boxes.Tooltip.Building.provides")}</th></tr>`+provides
            if (prods!="") out+=`<tr><th>${i18n("Boxes.Tooltip.Building.produces")} ${meta?.available_products?.length==1 ? "("+formatTime(meta.available_products[0].production_time)+")":""}</th></tr>`+prods
            if (costs !="") out+=`<tr><th>${i18n("Boxes.Tooltip.Building.costs")}</th></tr><tr><td class="multiCol">`+costs+`</td></tr>`
            
            out+=`<tr><th>${i18n("Boxes.Tooltip.Building.size+time")}</th></tr>`
            out+=`<tr><td class="multiCol"><div>${icons("size")} ${meta.width+"x"+meta.length}</div><div>${icons("icon_time")}${formatTime(meta.construction_time)}</div>`
            if (meta.requirements?.street_connection_level == 2)
                out+=`<div>${icons("street_required")} ${i18n("Boxes.Tooltip.Building.road2")}</div>`
            else if (meta.requirements?.street_connection_level == 1)
                out+=`<div>${icons("road_required")} ${i18n("Boxes.Tooltip.Building.road")}</div>`
        
            out+=`</td></tr>`
            
            if (traits != "") out+=`<tr><th>${i18n("Boxes.Tooltip.Building.traits")}</th></tr>`+traits
            
        }
        out+=`</table>`
        return out;
    },
}

Tooltips.init()
