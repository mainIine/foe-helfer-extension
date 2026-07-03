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

/**
 * A module responsible for handling tooltip functionality within the application.
 *
 * Elemente mit der CSS-Klasse "fh-tooltip" und einem data-callback_tt-Attribut
 * (Objektpfad zu einer Funktion, z.B. "Kits.InventoryTooltip") bekommen beim
 * Überfahren einen Tooltip. Das System ist Dokument-übergreifend: Über
 * Tooltips.attach(win) werden auch Popup-Fenster (Popup-Modul) bedient.
 * "helperTT" wird als veralteter Alias weiterhin unterstützt.
 */
let Tooltips = {

    /** Selektor für Tooltip-Elemente; helperTT ist der veraltete Alias */
    selector: '.fh-tooltip, .helperTT',

    /** angebundene Fenster: Window -> {win, doc, container} */
    contexts: new Map(),

    /** Kontext, in dem gerade ein Tooltip angezeigt wird */
    active: null,

    /** aufgelöste data-callback_tt-Funktionen */
    callbackCache: {},


    /**
     * Registriert eine Tooltip-Funktion explizit unter ihrem Pfadnamen.
     * Optional - resolveCallback findet globale Module auch ohne Registrierung.
     */
    register: (name, fn) => {
        Tooltips.callbackCache[name] = fn;
    },


    /**
     * Resolves a string path (e.g., "Kits.InventoryTooltip") to the actual function.
     *
     * Module werden global mit let/const deklariert und sind damit nicht als
     * window-Property sichtbar. Eine im globalen Scope erzeugte Function
     * erreicht diese Bindings trotzdem; das Regex stellt sicher, dass nur ein
     * reiner Objektpfad und kein sonstiger Code ausgewertet wird.
     */
    resolveCallback: (pathString) => {
        if (Tooltips.callbackCache[pathString]) {
            return Tooltips.callbackCache[pathString];
        }

        if (!/^[A-Za-z_$][\w$]*(\.[A-Za-z_$][\w$]*)*$/.test(pathString)) {
            return null;
        }

        let fn = null;
        try {
            fn = new Function(`try { return ${pathString} } catch (e) { return null }`)();
        } catch (e) {
            fn = null;
        }

        if (typeof fn !== "function") {
            return null;
        }

        Tooltips.callbackCache[pathString] = fn;
        return fn;
    },


    /**
     * Initializes the tooltips system and sets up the required DOM elements.
     */
    init: async () => {
        await StartUpDone;

        HTML.AddCssFile('customTooltip');

        Tooltips.attach(window);

        $(`<div id="QIActions" class="fh-tooltip" data-callback_tt="QIActions.TT">${srcLinks.icons("time")}</div>`).appendTo('body').hide();
        $(`<div id="RewardsList"></div>`).appendTo('body');
    },


    /**
     * Bindet das Tooltip-System an ein Fenster (Hauptseite oder Popup):
     * legt dort einen Tooltip-Container an und delegiert die Pointer-Events.
     */
    attach: (win = window) => {
        if (Tooltips.contexts.has(win)) return;

        const doc = win.document;

        const container = doc.createElement("div");
        container.id = "TooltipContainer";
        container.className = "window-box";
        container.style = "z-index:1000; position: absolute; display: none; pointer-events: none;";
        (doc.getElementById('game_body') || doc.body).append(container);

        const ctx = {win: win, doc: doc, container: container};
        Tooltips.contexts.set(win, ctx);

        $(doc.body).on("pointerenter.fhtooltip", Tooltips.selector, async (e) => {
            const callbackStr = e.currentTarget.dataset.callback_tt;
            if (!callbackStr) return;

            Tooltips.activate(ctx);
            const callbackFn = Tooltips.resolveCallback(callbackStr);

            if (callbackFn) {
                let content = await callbackFn(e);
                if (content) {
                    Tooltips.set(content);
                } else {
                    Tooltips.deactivate();
                }
            }
            else {
                Tooltips.set(callbackStr);
            }
        });

        $(doc.body).on("pointerleave.fhtooltip", Tooltips.selector, () => {
            Tooltips.deactivate();
        });
    },


    /**
     * Löst die Anbindung eines Fensters wieder (z.B. beim Schließen eines Popups)
     */
    detach: (win) => {
        const ctx = Tooltips.contexts.get(win);
        if (!ctx) return;

        if (Tooltips.active === ctx) {
            Tooltips.deactivate();
        }

        Tooltips.contexts.delete(win);

        try {
            $(ctx.doc.body).off(".fhtooltip");
            ctx.container.remove();
        } catch (e) {
            /* Dokument bereits zerstört */
        }
    },


    /**
     * Updates the tooltip content and adjusts its position.
     */
    set: (content) => {
        if (!content || !Tooltips.active) return;

        Tooltips.active.container.innerHTML = content;
        Tooltips.check_position();
    },


    /**
     * Ensures the tooltip container is positioned within the boundaries of its parent element.
     */
    check_position: () => {
        try {
            if (Tooltips.active) {
                const container = Tooltips.active.container;
                const containerStyle = container.style;
                const parentClientHeight = container.parentElement.clientHeight;
                const parentClientWidth = container.parentElement.clientWidth;
                const firstChildHeight = container.firstChild.clientHeight;
                const firstChildWidth = container.firstChild.clientWidth;

                if (firstChildHeight + 7 + Number(containerStyle.top.replace("px", "")) > parentClientHeight) {
                    let newTop = parentClientHeight - firstChildHeight - 7;
                    containerStyle.top = (newTop < 0 ? 0 : newTop) + "px";
                }

                if (firstChildWidth + 7 + Number(containerStyle.left.replace("px", "")) > parentClientWidth) {
                    let newLeft = parentClientWidth - firstChildWidth - 7;
                    containerStyle.left = (newLeft < 0 ? 0 : newLeft) + "px";
                }
            }
        } catch (e) {
            /* Silent exception */
        }
    },


    /**
     * Activates the tooltip container of the given context and binds the mouse tracker.
     */
    activate: (ctx) => {
        ctx = ctx || Tooltips.contexts.get(window);
        if (!ctx || Tooltips.active === ctx) return;

        if (Tooltips.active) {
            Tooltips.deactivate();
        }

        Tooltips.active = ctx;
        ctx.container.style.display = "block";

        ctx.win.addEventListener("pointermove", Tooltips.followMouse);
    },


    /**
     * Deactivates the tooltip container and unbinds the mouse tracker.
     */
    deactivate: () => {
        const ctx = Tooltips.active;
        if (!ctx) return;

        Tooltips.active = null;

        try {
            ctx.container.style.display = "none";
            ctx.win.removeEventListener("pointermove", Tooltips.followMouse);
        } catch (e) {
            /* Popup-Fenster bereits geschlossen */
        }
    },


    /**
     * Updates the position of the tooltip container to follow the mouse cursor.
     */
    followMouse: (event) => {
        if (!Tooltips.active) return;

        Tooltips.active.container.style.left = (event.x + 10) + "px";
        Tooltips.active.container.style.top = (event.y + 10) + "px";
        Tooltips.check_position();
    },


    /**
     * Generates and returns a tooltip HTML string for a building in the game.
     */
    buildingTT: async (e) => {
        let buildingId = e?.currentTarget?.dataset?.id;
        let id = e?.currentTarget?.dataset?.meta_id || MainParser?.CityMapData[buildingId]?.cityentity_id;
        if (!id) return;

        let era = e?.currentTarget?.dataset?.era || Technologies.InnoEraNames[MainParser?.CityMapData[buildingId]?.level];
        let meta = MainParser.CityEntities[id];
        let allies = JSON.parse(e?.currentTarget?.dataset?.allies || "null");
        let eff = Math.round(JSON.parse(e?.currentTarget?.dataset?.eff || "null"));

        if (!eff && era) {
            eff = Math.round(100 * Productions.rateBuildings([id], true, era)?.[0]?.rating.totalScore || 0);
        }

        let upgrades = "";
        let upgradeCount = Kits.allBuildingsUpgradeCounts[id] || {};

        if (Object.keys(upgradeCount).length > 0) {
            upgrades = '<span class="upgrades"><span class="base">1</span>';
            for (let i in upgradeCount) {
                if (upgradeCount[i]) {
                    upgrades += `<span class="${i}">${upgradeCount[i]}</span>`;
                }
            }
            upgrades += '</span>';
        }

        let h = `<div class="buildingTT">
                <h2><span>${meta.name} ${eff ? `(${i18n("Boxes.Kits.Efficiency")}: ${eff})` : ''}</span>${upgrades}</h2>
                <table class="foe-table">
                <tr><td class="imgContainer"><img alt src="${srcLinks.get("/city/buildings/" + meta.asset_id.replace(/^(\D_)(.*?)/, "$1SS_$2") + ".png", true)}"></td>` +
            `<td style="width:100%; vertical-align:top">`;

        h += await Tooltips.BuildingData(meta, era, allies, eff);
        h += "</td></tr></table></div>";

        setTimeout(() => {
            $(".handleOverflow").each((index, el) => {
                let w = ((el.scrollWidth - el.parentNode.clientWidth) || 0);
                if (w < 0) {
                    el.style["animation-name"] = "unset";
                } else {
                    el.style.width = w + "px";
                }
            });
        }, 100);

        return h;
    },


    /**
     * Processes a reward object to generate a structured evaluation.
     */
    genericEval: (rew) => {
        let [x1, amount, name] = rew.name.match(/^([+\-]?\d*)x? (.*)$/) || ["", 1, rew.name];
        amount = Number(amount);
        let icon = "";
        let fragment = "";

        if (rew.iconAssetName === "icon_fragment") {
            icon = srcLinks.icons(rew.assembledReward?.iconAssetName || rew.assembledReward?.subType);
            name = name.replace(/Fragments? of/, "").replace(/.*?'(.*?)'.*/, "$1") + ' (' + rew.requiredAmount + ')';
            fragment = srcLinks.icons("icon_tooltip_fragment");
        }
        else if (rew.type === "unit") {
            name = /nextera/i.test(rew.id) ? "of next era" : "";
            icon = srcLinks.icons(rew.subType === "rogue" ? "rogue" : (
                rew.subType.includes("champion") ? "chivalry" :
                    Unit.Types.filter(x => x.unitTypeId === rew.subType)[0].unitClass
            ));
        }
        else {
            icon = srcLinks.icons(rew.iconAssetName);
        }

        return { icon, amount, name, fragment };
    },


    /**
     * Asynchronously processes building metadata and generates a detailed HTML table representation.
     */
    BuildingData: async (meta, onlyEra = null, allies = null, efficiency = null) => {
        if (onlyEra && Array.isArray(onlyEra)) {
            allies = [].concat(onlyEra);
            onlyEra = null;
        }

        let numberWithCommas = (x) => {
            if (!x) return "";
            return x.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
        };

        let minEra = onlyEra || "BronzeAge";
        let maxEra = onlyEra || Technologies.EraNames[Technologies.getMaxEra()];

        let resMapper = (res, group = "other") => {
            let m = {
                goods: {
                    era_goods: "all_goods_of_age",
                    random_good_of_next_age: "next_age_random_goods",
                    random_good_of_previous_age: "random_goods_of_previous_age",
                    random_good_of_age: "random_goods_chest",
                    random_good_of_age_1: "random_goods_chest",
                    random_good_of_age_2: "random_goods_chest",
                    random_good_of_age_3: "random_goods_chest",
                    each_special_goods_up_to_age: "special_goods",
                },
                treasury_goods: {
                    era_goods: "treasury_goods",
                    all_goods_of_age: "treasury_goods",
                    all_goods_of_next_age: "treasury_goods_of_next_age",
                    all_goods_of_previous_age: "treasury_goods_of_previous_age",
                }
            };
            return m?.[group]?.[res] || res;
        };

        let span = (x, withHighlight = false) => `<span ${withHighlight ? `class="${x > 0 ? "positive" : "negative"}"` : ''}>${numberWithCommas(x)}</span>`;
        let longSpan = (x) => `<div class="overflowBox"><span class="handleOverflow">${x}</span></div>`;
        let range = (x, y, withHighlight = false) => span(x, withHighlight) + (x !== y ? `&nbsp;-&nbsp;` + span(y, withHighlight) : ``);

        let formatTime = (x) => {
            let min = Math.floor(x / 60);
            let sec = x - min * 60;
            let hour = Math.floor(min / 60);
            min -= hour * 60;
            let day = Math.floor(hour / 24);
            hour -= day * 24;
            let time = sec + "s";
            if (min > 0) time = min + (sec > 0 ? ":" + (sec > 9 ? sec : "0" + sec) : "") + "m";
            if (hour > 0) time = hour + (sec + min > 0 ? ":" + (min > 9 ? min : "0" + min) + (sec > 0 ? ":" + (sec > 9 ? sec : "0" + sec) : "") : "") + "h";
            if (day > 0) time = day + (hour + sec + min > 0 ? (hour > 9 ? hour : "0" + hour) + (sec + min > 0 ? ":" + (min > 9 ? min : "0" + min) + (sec > 0 ? ":" + (sec > 9 ? sec : "0" + sec) : "") : "") : "") + "d";
            return time;
        };

        let capFirsts = (s) => s.replace("_", " ").replace(/(\b[a-z](?!\s))/g, (x) => x.toUpperCase());

        let feature = {
            "all": "",
            "battleground": "_gbg",
            "guild_expedition": "_gex",
            "guild_raids": "_gr"
        };

        let out = '<table class="HXBuilding">';

        if (meta.components) {
            let levels = meta.components;
            let era = "", set = "", ally = "", traits = "", motMod = "", polMod = "",
                ifMot = `<span class="ifMot">${srcLinks.icons("when_motivated")}</span>`;

            if (levels?.AllAge?.socialInteraction?.interactionType) {
                if (levels.AllAge.socialInteraction.interactionType === "motivate") {
                    motMod = `<span class="ifMot">${srcLinks.icons("reward_x2") + i18n("Boxes.Tooltip.Building.when") + srcLinks.icons("when_motivated")}</span>`;
                    traits += `<tr><td><span style="width:24px; margin-right:3px; text-align:center">${srcLinks.icons("when_motivated")}</span>${i18n("Boxes.Tooltip.Building.canMotivate")}</td></tr>`;
                } else if (levels.AllAge.socialInteraction.interactionType === "polish") {
                    polMod = `<span class="ifMot">${srcLinks.icons("reward_x2") + "when" + srcLinks.icons("when_motivated")}</span>`;
                    traits += `<tr><td><span style="width:24px; margin-right:3px; text-align:center">${srcLinks.icons("when_motivated")}</span>${i18n("Boxes.Tooltip.Building.canPolish")}</td></tr>`;
                }
            }

            // Chains
            let chain = levels?.AllAge?.chain;
            let chainMin = levels?.[minEra]?.chain;
            let chainMax = levels?.[maxEra]?.chain;
            if (chain?.chainId) {
                let ChainMeta = (MainParser.BuildingChains?.[chain.chainId] || MainParser.BuildingChains?.[chain.chainId.toLowerCase()]);
                set = srcLinks.icons(chain.chainId) + ChainMeta.name;
                if (!ChainMeta.cityEntityIds.includes(meta.id)) set += '</td></tr><tr><td style="text-wrap-mode:wrap;">' + chain.description;
            }

            // Traits
            for (let a of meta.abilities || []) {
                if (a.__class__ === "BuildingPlacementAbility") {
                    if (a.gridId === "cultural_outpost") {
                        era = `<img alt src=${srcLinks.get(`/outpost/gui/${a.content}/shared/reward_chest_badge_${a.content}.png`, true)}> ${capFirsts(a.content)}`;
                    }
                    if (a.gridId === "era_outpost") {
                        era = `<img alt src=${srcLinks.get(`/shared/icons/achievements/achievement_icons_space_age_${a.content}.png`, true)}> ${capFirsts(a.content)}`;
                    }
                }
                if (a.__class__ === "AffectsEnvironmentAbility" && a.action?.type === "add_unique_inhabitant") {
                    traits += `<tr><td><img alt class="inhabitant" src="${srcLinks.get(`/city/inhabitants/${a.action.animationId}/${a.action.animationId}_south_00.png`, true)}">◄ ${i18n("Boxes.Tooltip.Building.addInhabitant")} (${capFirsts(a.action.animationId)})</td></tr>`;
                }
            }

            if (levels?.AllAge?.environmentEffect?.effects) {
                for (let e of levels.AllAge.environmentEffect.effects || []) {
                    if (e.type === "add_unique_inhabitant") {
                        traits += `<tr><td><img alt class="inhabitant" src="${srcLinks.get(`/city/inhabitants/${e.name}/${e.name}_south_00.png`, true)}">◄ ${i18n("Boxes.Tooltip.Building.addInhabitant")} (${capFirsts(e.name)})</td></tr>`;
                    }
                }
            }

            if (levels?.AllAge?.cityLimit) {
                traits += `<tr><td>${srcLinks.icons("icon_unique_building")}${i18n("Boxes.Tooltip.Building.isUnique")} (${Object.values(MainParser.CityMapData).filter(x => MainParser.CityEntities?.[x.cityentity_id]?.components?.AllAge?.cityLimit?.buildingFamily === levels?.AllAge?.cityLimit?.buildingFamily).length + "/" + (MainParser.BuildingFamilyLimits?.[levels.AllAge.cityLimit.buildingFamily] || 1)})</td></tr>`;
            }

            for (let r of levels.AllAge?.ally?.rooms || []) {
                let allydata = null;
                for (let a of allies || []) {
                    allydata = MainParser.Allies.getAllieData(a);
                    if (r.allyType === allydata.type && (!r.rarity?.value || r.rarity?.value === allydata.rarity)) break;
                    allydata = null;
                }
                ally += `<tr><td>${srcLinks.icons("historical_allies_slot_tooltip_icon_" + (allydata ? "full" : "empty"))}<div>${MainParser.Allies.types[r.allyType]?.name + (r.rarity?.value ? (" (" + i18n("Boxes.Productions.AllyRarity." + r.rarity?.value) + ")") : "")}`;
                if (allydata) {
                    ally += `<div class="allyName"><span>${MainParser.Allies.meta[allydata.allyId]?.name}</span><span>(${i18n("Boxes.Productions.AllyRarity." + allydata.rarity)} - ${i18n("General.Level")} ${allydata.level})</span></div>`;
                    for (let b of allydata.currentLevel?.boosts || allydata.boosts || []) {
                        ally += `${srcLinks.icons(b.type + feature[b.targetedFeature])} ${b.value + Boosts.percent(b.type)}`;
                    }
                }
                ally += `</div></td></tr>`;
            }

            if (levels.AllAge.eraRequirement?.era && era === "") {
                era = srcLinks.icons("era") + " " + i18n("Eras." + (Technologies.Eras[levels.AllAge.eraRequirement?.era]));
            }

            if (era !== "") out += "<tr><td>" + era + "</td></tr>";

            let efficiencyDifference = null;

            if (levels?.AllAge?.limited?.config?.expireTime) {
                if (efficiency) {
                    let ratings = Productions.rateBuildings([meta.id, levels.AllAge.limited.config.targetCityEntityId], true, era)?.map(x => Math.round(100 * x?.rating?.totalScore) || 0);
                    efficiencyDifference = ratings[0] - ratings[1];
                }
                out += `<tr><td class="limited">${srcLinks.icons("limited_building_downgrade") + MainParser.CityEntities[levels.AllAge.limited.config.targetCityEntityId].name} (${i18n("Boxes.Tooltip.Building.after")} ${formatTime(levels.AllAge.limited.config.expireTime)})${efficiencyDifference ? " → " + i18n("Boxes.Kits.Efficiency") + ": " + (efficiency - efficiencyDifference) : ""}</td></tr>`;
            }

            if (await CityBuildings.canAscend(meta.id)) {
                let ascendedId = (await CityMap.AscendingBuildings)[meta.id];
                if (efficiency) {
                    let ratings = Productions.rateBuildings([meta.id, ascendedId], true, era)?.map(x => Math.round(100 * x?.rating?.totalScore) || 0);
                    efficiencyDifference = ratings[0] - ratings[1];
                }
                out += `<tr><td class="limited">${srcLinks.icons("limited_building_upgrade") + MainParser.CityEntities[ascendedId].name}${efficiencyDifference ? " → " + i18n("Boxes.Kits.Efficiency") + ": " + (efficiency - efficiencyDifference) : ""}</td></tr>`;
            }

            let provides = "";

            for (let [resource, amount] of Object.entries(levels.AllAge?.staticResources?.resources?.resources || {})) {
                provides += `<tr><td>${srcLinks.icons(resource) + " " + span(amount, true)}</td></tr>`;
            }
            for (let [resource, amount] of Object.entries(levels?.[minEra]?.staticResources?.resources?.resources || {})) {
                provides += `<tr><td>${srcLinks.icons(resource) + " " + range(amount, levels[maxEra]?.staticResources?.resources?.resources?.[resource], true)}</td></tr>`;
            }
            if (levels.AllAge?.happiness?.provided) {
                provides += `<tr><td>${srcLinks.icons("happiness") + " " + span(levels.AllAge?.happiness?.provided, true) + polMod}</td></tr>`;
            }
            if (levels?.[minEra]?.happiness?.provided && levels[maxEra]?.happiness?.provided) {
                provides += `<tr><td>${srcLinks.icons("happiness") + " " + range(levels?.[minEra]?.happiness?.provided, levels[maxEra]?.happiness?.provided, true) + polMod}</td></tr>`;
            }

            if (levels.AllAge?.multiplyCollection) {
                let mc = levels.AllAge?.multiplyCollection;
                provides += `<tr><td>${srcLinks.icons("reward_x" + mc.factor) + " " + mc.charges + " (" + mc.chance + "%)"}</td></tr>`;
            }

            for (let [i, b] of Object.entries(levels.AllAge?.boosts?.boosts || [])) {
                provides += `<tr><td>${srcLinks.icons(b.type + feature[b.targetedFeature]) + " " + span(b.value) + Boosts.percent(b.type)}</td></tr>`;
            }
            for (let [i, b] of Object.entries(levels?.[minEra]?.boosts?.boosts || [])) {
                provides += `<tr><td>${srcLinks.icons(b.type + feature[b.targetedFeature]) + " " + range(b.value, levels[maxEra]?.boosts?.boosts[i].value) + Boosts.percent(b.type)}</td></tr>`;
            }

            let prods = "";
            let pCount = levels?.[minEra]?.production?.options?.length || levels.AllAge?.production?.options?.length || 0;

            let minLookup = Object.assign(structuredClone(levels?.[minEra]?.lookup?.rewards || {}), levels?.AllAge?.lookup?.rewards);
            let minProductions = levels?.[minEra]?.production?.options || levels.AllAge.production?.options || [];
            let maxLookup = Object.assign(structuredClone(levels?.[maxEra]?.lookup?.rewards || {}), levels?.AllAge?.lookup?.rewards);
            let maxProductions = levels?.[maxEra]?.production?.options || levels.AllAge.production?.options || [];

            for (let [oIndex, option] of Object.entries(minProductions)) {
                let t = pCount > 1 ? "&nbsp;in " + formatTime(option.time) : "";
                for (let [pIndex, product] of Object.entries(option.products)) {
                    if (product.type === "resources") {
                        for (let [res, amount] of Object.entries(product.playerResources?.resources || {})) {
                            if (amount !== 0) {
                                prods += `<tr><td>${srcLinks.icons(resMapper(res, "goods")) + range(amount, maxProductions?.[oIndex]?.products?.[pIndex]?.playerResources?.resources?.[res]) + (res === "each_special_goods_up_to_age" ? "&nbsp;" + i18n("Boxes.Tooltip.Building.perEra") : "") + t + ((["supplies", "coins", "money"].includes(res) && !product.onlyWhenMotivated) ? motMod : "") + (product.onlyWhenMotivated ? ifMot : "")}</td></tr>`;
                            }
                        }
                    }
                    if (product.type === "guildResources") {
                        for (let [res, amount] of Object.entries(product.guildResources?.resources || {})) {
                            if (amount !== 0)
                                prods += `<tr><td>${srcLinks.icons(resMapper(res, "treasury_goods")) + range(amount, maxProductions?.[oIndex]?.products?.[pIndex]?.guildResources?.resources?.[res]) + t + (product.onlyWhenMotivated ? ifMot : "")}</td></tr>`;
                        }
                    }
                    if (product.type === "unit") {
                        if (product.amount !== 0) {
                            let iconId = (product.unitTypeId === "rogue" ? "rogue" : (
                                product.unitTypeId.includes("champion") ? "chivalry" :
                                    Unit.Types.filter(x => x.unitTypeId === product.unitTypeId)[0].unitClass
                            ));
                            prods += `<tr><td>${srcLinks.icons(iconId) + range(product.amount, maxProductions?.[oIndex]?.products?.[pIndex].amount) + t + (product.onlyWhenMotivated ? ifMot : "")}</td></tr>`;
                        }
                    }
                    if (product.type === "genericReward") {
                        let rewBA = Tooltips.genericEval(minLookup[product.reward.id]);
                        let rewMax = Tooltips.genericEval(maxLookup[maxProductions?.[oIndex]?.products?.[pIndex]?.reward?.id]);

                        if (rewBA.icon + rewBA.name === rewMax.icon + rewMax.name) {
                            prods += `<tr><td class="isGeneric">${rewBA.icon + range(rewBA.amount, rewMax.amount) + rewBA.fragment + longSpan(rewBA.name) + t + (product.onlyWhenMotivated ? ifMot : "")}</td></tr>`;
                        } else {
                            prods += `<tr><td class="isGeneric">${rewBA.icon + span(rewBA.amount) + rewBA.fragment + longSpan(rewBA.name) + " - " + rewMax.icon + span(rewMax.amount) + rewMax.fragment + longSpan(rewMax.name) + t + (product.onlyWhenMotivated ? ifMot : "")}</td></tr>`;
                        }
                    }
                    if (product.type === "random") {
                        prods += `<tr><td><table class="randomProductions">`;
                        for (let [rIndex, random] of Object.entries(product.products)) {
                            prods += `<tr><td>`;
                            if (random.product.type === "resources") {
                                for (let [res, amount] of Object.entries(random.product.playerResources?.resources || {})) {
                                    if (amount !== 0)
                                        prods += srcLinks.icons(resMapper(res, "goods")) + range(amount, maxProductions?.[oIndex]?.products?.[pIndex]?.products?.[rIndex]?.product?.playerResources?.resources?.[res]) + (res === "each_special_goods_up_to_age" ? "&nbsp;" + i18n("Boxes.Tooltip.Building.perEra") : "");
                                }
                            }
                            if (random.product.type === "guildResources") {
                                for (let [res, amount] of Object.entries(random.product.guildResources?.resources || {})) {
                                    if (amount !== 0)
                                        prods += srcLinks.icons(resMapper(res, "treasury_goods")) + range(amount, maxProductions?.[oIndex]?.products?.[pIndex]?.products?.[rIndex]?.product?.guildResources?.resources?.[res]);
                                }
                            }
                            if (random.product.type === "unit") {
                                if (random.product.amount !== 0) {
                                    let iconId = (random.product.unitTypeId === "rogue" ? "rogue" : (
                                        random.product.unitTypeId.includes("champion") ? "chivalry" :
                                            Unit.Types.filter(x => x.unitTypeId === random.product.unitTypeId)[0].unitClass
                                    ));
                                    prods += srcLinks.icons(iconId) + range(random.product.amount, maxProductions?.[oIndex]?.products?.[pIndex?.products?.[rIndex]?.product].amount);
                                }
                            }
                            if (random.product.type === "genericReward") {
                                let rewBA = Tooltips.genericEval(minLookup[random.product.reward.id]);
                                let rewMax = Tooltips.genericEval(maxLookup[maxProductions?.[oIndex]?.products?.[pIndex]?.products?.[rIndex]?.product?.reward?.id]);

                                if (rewBA.icon + rewBA.name === rewMax.icon + rewMax.name) {
                                    prods += rewBA.icon + range(rewBA.amount, rewMax.amount) + rewBA.fragment + longSpan(rewBA.name);
                                } else {
                                    prods += rewBA.icon + span(rewBA.amount) + rewBA.fragment + longSpan(rewBA.name) + " - " + rewMax.icon + span(rewMax.amount) + rewMax.fragment + longSpan(rewMax.name);
                                }
                            }
                            prods += `<span class="dropChance">${Math.floor(random.dropChance * 100)}%</td></tr>`;
                        }
                        prods += `</table>${(product.onlyWhenMotivated ? ifMot : "")}</td></tr>`;
                    }
                }
            }

            let costs = "";
            for (let [resource, amount] of Object.entries(levels.AllAge?.buildResourcesRequirement?.cost?.resources || {})) {
                if (amount > 0) costs += `<div>${srcLinks.icons(resource) + " " + span(amount)}</div>`;
            }

            // Chain Productions
            let first = true;
            for (let b of chain?.config?.bonuses || []) {
                if (Object.values(b.boosts).length > 0) {
                    if (first) {
                        provides += '<tr><td style="text-wrap-mode:wrap;">' + chain.description + "</td></tr>";
                        first = false;
                    }
                    provides += `<tr><td>${b.level + "x" + srcLinks.icons(chain.chainId)} ► `;
                    provides += srcLinks.icons(b.boosts[0].type + feature[b.boosts[0].targetedFeature]) + " " + span(b.boosts[0].value) + Boosts.percent(b.boosts[0].type);
                    provides += `</td></tr>`;
                }
                if (Object.values(b.productions || []).length > 0) {
                    if (first) {
                        prods += '<tr><td style="text-wrap-mode:wrap;">' + chain.description + "</td></tr>";
                        first = false;
                    }
                    for (let [pIndex, product] of Object.entries(b.productions || [])) {
                        if (product.type === "resources") {
                            for (let [res, amount] of Object.entries(product.playerResources?.resources || {})) {
                                if (amount !== 0)
                                    prods += `<tr><td>${b.level + "x" + srcLinks.icons(chain.chainId)} ► ${srcLinks.icons(resMapper(res, "goods")) + span(amount) + (res === "each_special_goods_up_to_age" ? "&nbsp;" + i18n("Boxes.Tooltip.Building.perEra") : "")}</td></tr>`;
                            }
                        }
                        if (product.type === "guildResources") {
                            for (let [res, amount] of Object.entries(product.guildResources?.resources || {})) {
                                if (amount !== 0)
                                    prods += `<tr><td>${b.level + "x" + srcLinks.icons(chain.chainId)} ► ${srcLinks.icons(resMapper(res, "treasury_goods")) + span(amount)}</td></tr>`;
                            }
                        }
                        if (product.type === "unit") {
                            if (product.amount !== 0) {
                                let iconId = (product.unitTypeId === "rogue" ? "rogue" : (
                                    product.unitTypeId.includes("champion") ? "chivalry" :
                                        Unit.Types.filter(x => x.unitTypeId === product.unitTypeId)[0].unitClass
                                ));
                                prods += `<tr><td>${b.level + "x" + srcLinks.icons(chain.chainId)} ► ${srcLinks.icons(iconId) + span(product.amount)}</td></tr>`;
                            }
                        }
                        if (product.type === "genericReward") {
                            let rewBA = Tooltips.genericEval(minLookup[product.reward.id]);
                            prods += `<tr><td class="isGeneric">${b.level + "x" + srcLinks.icons(chain.chainId)} ► ${rewBA.icon + span(rewBA.amount) + rewBA.fragment + longSpan(rewBA.name)}</td></tr>`;
                        }
                    }
                }
            }
            for (let [i, b] of Object.entries(chainMin?.config?.bonuses || [])) {
                for (let j in Object.keys(b.boosts)) {
                    if (first) {
                        provides += '<tr><td style="text-wrap-mode:wrap;">' + chain.description + "</td></tr>";
                        first = false;
                    }
                    provides += `<tr><td>${b.level + "x" + srcLinks.icons(chain.chainId)} ► `;
                    provides += srcLinks.icons(b.boosts[j].type + feature[b.boosts[j].targetedFeature]) + " " + range(b.boosts[j].value, chainMax?.config?.bonuses[i].boosts[j].value) + Boosts.percent(b.boosts[0].type);
                    provides += `</td></tr>`;
                }
                for (let [pIndex, product] of Object.entries(b.productions || [])) {
                    if (first) {
                        prods += '<tr><td style="text-wrap-mode:wrap;">' + chain.description + "</td></tr>";
                        first = false;
                    }
                    if (product.type === "resources") {
                        for (let [res, amount] of Object.entries(product.playerResources?.resources || {})) {
                            if (amount !== 0)
                                prods += `<tr><td>${b.level + "x" + srcLinks.icons(chain.chainId)} ► ${srcLinks.icons(resMapper(res, "goods")) + range(amount, chainMax?.config?.bonuses[i].productions[pIndex].playerResources?.resources?.[res]) + (res === "each_special_goods_up_to_age" ? "&nbsp;" + i18n("Boxes.Tooltip.Building.perEra") : "")}</td></tr>`;
                        }
                    }
                    if (product.type === "guildResources") {
                        for (let [res, amount] of Object.entries(product.guildResources?.resources || {})) {
                            if (amount !== 0)
                                prods += `<tr><td>${b.level + "x" + srcLinks.icons(chain.chainId)} ► ${srcLinks.icons(resMapper(res, "treasury_goods")) + range(amount, chainMax?.config?.bonuses[i].productions[pIndex].guildResources?.resources?.[res])}</td></tr>`;
                        }
                    }
                    if (product.type === "unit") {
                        if (product.amount !== 0) {
                            let iconId = (product.unitTypeId === "rogue" ? "rogue" : (
                                product.unitTypeId.includes("champion") ? "chivalry" :
                                    Unit.Types.filter(x => x.unitTypeId === product.unitTypeId)[0].unitClass
                            ));
                            prods += `<tr><td>${b.level + "x" + srcLinks.icons(chain.chainId)} ► ${srcLinks.icons(iconId) + range(product.amount, chainMax?.config?.bonuses[i].productions[pIndex].amount)}</td></tr>`;
                        }
                    }
                    if (product.type === "genericReward") {
                        let rewBA = Tooltips.genericEval(minLookup[product.reward.id]);
                        prods += `<tr><td class="isGeneric">${b.level + "x" + srcLinks.icons(chain.chainId)} ► ${rewBA.icon + range(rewBA.amount, rewMax.amount) + rewBA.fragment + longSpan(rewBA.name)}</td></tr>`;
                    }
                }
            }

            if (set !== "") out += "<tr><td>" + set + "</td></tr>";
            if (ally !== "") out += `<tr><th>${i18n("Boxes.Tooltip.Building.allyRooms")}</th></tr>` + ally;
            if (provides !== "") out += `<tr><th>${i18n("Boxes.Tooltip.Building.provides")}</th></tr>` + provides;
            if (prods !== "") out += `<tr><th>${i18n("Boxes.Tooltip.Building.produces")} ${pCount === 1 ? "(" + formatTime(levels.AllAge.production?.options?.[0].time || levels?.[minEra].production?.options?.[0].time) + ")" : ""}</th></tr>` + prods;
            if (costs !== "") out += `<tr><th>${i18n("Boxes.Tooltip.Building.costs")}</th></tr><tr><td class="multiCol">` + costs + `</td></tr>`;

            out += `<tr><th>${i18n("Boxes.Tooltip.Building.size+time")}</th></tr>`;
            out += `<tr><td class="multiCol"><div>${srcLinks.icons("size")} ${levels.AllAge.placement.size.y + "x" + levels.AllAge.placement.size.x}</div>`;
            out += levels.AllAge?.constructionTime?.time ? `<div>${srcLinks.icons("icon_time")}${formatTime(levels.AllAge.constructionTime.time)}</div>` : ``;
            if (levels.AllAge.streetConnectionRequirement?.requiredLevel) {
                if (levels.AllAge.streetConnectionRequirement.requiredLevel === 2)
                    out += `<div>${srcLinks.icons("street_required")} ${i18n("Boxes.Tooltip.Building.road2")}</div>`;
                else if (levels.AllAge.streetConnectionRequirement.requiredLevel === 1)
                    out += `<div>${srcLinks.icons("road_required")} ${i18n("Boxes.Tooltip.Building.road")}</div>`;
            }
            out += `</td></tr>`;

            if (traits !== "") out += `<tr><th>${i18n("Boxes.Tooltip.Building.traits")}</th></tr>` + traits;

        }
        else {
            let first = false;
            let levels = Object.assign({}, ...(meta?.entity_levels?.map(x => ({[x.era]: x})) || []));

            if (levels?.[minEra]) {
                maxEra = Technologies.EraNames[Math.max(...Object.keys(levels).map(x => Technologies.Eras[x]))];
            }
            let era = "", set = "", traits = "", motMod = "", polMod = "", info = "", boosts = "", abilityList = {},
                ifMot = `<span class="ifMot">${srcLinks.icons("when_motivated")}</span>`;

            for (let a of meta.abilities || []) {
                if (a.__class__ === "BuildingPlacementAbility") {
                    if (a.gridId === "cultural_outpost") {
                        era = `<img alt src=${srcLinks.get(`/outpost/gui/${a.content}/shared/reward_chest_badge_${a.content}.png`, true)}> ${capFirsts(a.content)}`;
                    }
                    if (a.gridId === "era_outpost") {
                        era = `<img alt src=${srcLinks.get(`/shared/icons/achievements/achievement_icons_space_age_${a.content}.png`, true)}> ${capFirsts(a.content)}`;
                    }
                }
                if (a.__class__ === "ChainStartAbility") {
                    set = srcLinks.icons(a.chainId) + MainParser.BuildingChains[a.chainId].name + '</td></tr><tr><td style="text-wrap-mode:wrap;">' + a.description;
                }
                if (a.__class__ === "ChainLinkAbility") {
                    set = srcLinks.icons(a.chainId) + MainParser.BuildingChains[a.chainId].name;
                }
                if (a.__class__ === "BuildingSetAbility") {
                    set = srcLinks.icons(a.setId) + MainParser.BuildingSets[a.setId].name;
                }
                if (a.__class__ === "PolishableAbility") {
                    traits += `<tr><td><span style="width:24px; margin-right:3px; text-align:center">${srcLinks.icons("when_motivated")}</span>${i18n("Boxes.Tooltip.Building.canPolish")}</td></tr>`;
                    polMod = `<span class="ifMot">${srcLinks.icons("reward_x2") + i18n("Boxes.Tooltip.Building.when") + srcLinks.icons("when_motivated")}</span>`;
                }
                if (a.__class__ === "MotivatableAbility") {
                    traits += `<tr><td><span style="width:24px; margin-right:3px; text-align:center">${srcLinks.icons("when_motivated")}</span>${i18n("Boxes.Tooltip.Building.canMotivate")}</td></tr>`;
                    motMod = `<span class="ifMot">${srcLinks.icons("reward_x2") + i18n("Boxes.Tooltip.Building.when") + srcLinks.icons("when_motivated")}</span>`;
                }
                if (a.__class__ === "AddCoinsToSupplyProductionWhenMotivatedAbility") {
                    motMod = `<span class="ifMot">${"+" + srcLinks.icons("money") + i18n("Boxes.Tooltip.Building.when") + srcLinks.icons("when_motivated")}</span>`;
                }
                if (a.__class__ === "NotPlunderableAbility") {
                    traits += `<tr><td>` + srcLinks.icons("eventwindow_plunder_repel") + i18n("Boxes.Tooltip.Building.noPlunder") + `</td></tr>`;
                }
                if (a.__class__ === "AffectedByLifeSupportAbility") {
                    traits += `<tr><td>` + srcLinks.icons("life_support") + i18n("Boxes.Tooltip.Building.lifeSupport") + `</td></tr>`;
                }
                if (a.__class__ === "DisplayInfoTextAbility") {
                    info += a.text;
                }
                if (a.__class__ === "AffectsEnvironmentAbility" && a.action?.type === "add_unique_inhabitant") {
                    traits += `<tr><td><img alt class="inhabitant" src="${srcLinks.get(`/city/inhabitants/${a.action.animationId}/${a.action.animationId}_south_00.png`, true)}">◄ ${i18n("Boxes.Tooltip.Building.addInhabitant")} (${capFirsts(a.action.animationId)})</td></tr>`;
                }
                if (a.boostHints) {
                    for (let b of a.boostHints || []) {
                        if (b.boostHintEraMap?.AllAge) {
                            boosts += `<tr><td>${srcLinks.icons(b.boostHintEraMap.AllAge.type + feature[b.boostHintEraMap.AllAge.targetedFeature]) + " " + span(b.boostHintEraMap.AllAge.value) + Boosts.percent(b.boostHintEraMap.AllAge.type)}</td></tr>`;
                        }
                        if (b.boostHintEraMap?.[minEra] && b.boostHintEraMap?.[maxEra]) {
                            boosts += `<tr><td>${srcLinks.icons(b.boostHintEraMap?.[minEra].type + feature[b.boostHintEraMap?.[minEra].targetedFeature]) + " " + range(b.boostHintEraMap?.[minEra].value, b.boostHintEraMap[maxEra].value) + Boosts.percent(b.boostHintEraMap?.[minEra].type)}</td></tr>`;
                        }
                    }
                }
                if (!abilityList[a.__class__]) abilityList[a.__class__] = [];
                abilityList[a.__class__].push(a);
            }

            if (meta?.requirements?.min_era && meta?.requirements?.min_era !== "MultiAge" && era === "") {
                era = `${srcLinks.icons("era") + " " + i18n("Eras." + (Technologies.Eras[meta.requirements.min_era]))}`;
            }

            if (era !== "") out += "<tr><td>" + era + "</td></tr>";
            if (set !== "") out += "<tr><td>" + set + "</td></tr>";
            if (info !== "") out += '<tr><td style="text-wrap-mode:wrap;">' + info + "</td></tr>";

            let provides = "";
            if (meta.provided_population || meta.required_population) {
                provides += `<tr><td>${srcLinks.icons("population") + " " + span((meta.provided_population || 0) - (meta.required_population || 0), true)}</td></tr>`;
            } else if ((levels?.[minEra]?.provided_population && levels?.[maxEra]?.provided_population) || (levels?.[minEra]?.required_population && levels?.[maxEra]?.required_population)) {
                provides += `<tr><td>${srcLinks.icons("population") + " " + range((levels?.[minEra].provided_population || 0) - (levels?.[minEra].required_population || 0), (levels?.[maxEra].provided_population || 0) - (levels?.[maxEra].required_population || 0), true)}</td></tr>`;
            }
            if (meta.provided_happiness) {
                provides += `<tr><td>${srcLinks.icons("happiness") + " " + span((meta.provided_happiness || 0), true)}</td></tr>`;
            } else if ((levels?.[minEra]?.provided_happiness && levels?.[maxEra]?.provided_happiness)) {
                provides += `<tr><td>${srcLinks.icons("happiness") + " " + range(levels?.[minEra].provided_happiness || 0, levels?.[maxEra].provided_happiness || 0, true) + polMod}</td></tr>`;
            }

            if (levels?.[minEra]?.ranking_points && levels?.[maxEra]?.ranking_points) {
                provides += `<tr><td>${srcLinks.icons("rank") + " " + range(levels?.[minEra].ranking_points, levels?.[maxEra].ranking_points)}</td></tr>`;
            }

            for (let [resource, amount] of Object.entries(meta?.static_resources?.resources || {})) {
                if (amount > 0) provides += `<tr><td>${srcLinks.icons(resource) + " " + span(amount)}</td></tr>`;
            }

            let prods = "";
            if (meta.available_products) {
                if (levels?.[minEra]?.produced_money && levels?.[maxEra]?.produced_money) {
                    prods += `<tr><td>${srcLinks.icons("money") + range(levels?.[minEra].produced_money, levels?.[maxEra].produced_money) + motMod}</td></tr>`;
                }
                if (levels?.[minEra]?.clan_power && levels?.[maxEra]?.clan_power) {
                    prods += `<tr><td>${srcLinks.icons("clan_power") + range(levels?.[minEra].clan_power, levels?.[maxEra].clan_power) + motMod}</td></tr>`;
                }

                for (let p of meta.available_products) {
                    for (let [res, amount] of Object.entries(p.product?.resources || {})) {
                        if (res === "money" && levels?.[minEra]?.produced_money) continue;
                        let t = (meta?.available_products?.length !== 1) ? "&nbsp;in " + formatTime(p.production_time) : "";

                        if (amount !== 0)
                            prods += `<tr><td>${srcLinks.icons(resMapper(res, "goods")) + span(amount) + t + motMod}</td></tr>`;
                        else
                            prods += `<tr><td>${srcLinks.icons(resMapper(res, "goods")) + range(levels?.[minEra].production_values[p.production_option - 1].value, levels?.[maxEra].production_values[p.production_option - 1].value) + t + motMod}</td></tr>`;
                    }
                    if (p.unit_class) {
                        prods += `<tr><td>${srcLinks.icons(p.unit_class) + p.name}</td></tr>`;
                    }
                }
                for (let a of abilityList.AddResourcesAbility || []) {
                    for (let [res, amount] of Object.entries(a.additionalResources?.[minEra]?.resources || {})) {
                        if (amount !== 0)
                            prods += `<tr><td>${srcLinks.icons(resMapper(res, "goods")) + range(a.additionalResources?.[minEra].resources[res], a.additionalResources[maxEra].resources[res])}</td></tr>`;
                    }
                    for (let [res, amount] of Object.entries(a.additionalResources?.AllAge?.resources || {})) {
                        if (amount !== 0)
                            prods += `<tr><td>${srcLinks.icons(resMapper(res, "goods")) + span(amount)}</td></tr>`;
                    }
                }
                for (let a of abilityList.AddResourcesToGuildTreasuryAbility || []) {
                    for (let [res, amount] of Object.entries(a.additionalResources?.[minEra]?.resources || {})) {
                        if (amount !== 0)
                            prods += `<tr><td>${srcLinks.icons(resMapper(res, "treasury_goods")) + range(a.additionalResources?.[minEra].resources[res], a.additionalResources[maxEra].resources[res])}</td></tr>`;
                    }
                    for (let [res, amount] of Object.entries(a.additionalResources?.AllAge?.resources || {})) {
                        if (amount !== 0)
                            prods += `<tr><td>${srcLinks.icons(resMapper(res, "treasury_goods")) + span(amount)}</td></tr>`;
                    }
                }
                for (let a of abilityList.AddResourcesWhenMotivatedAbility || []) {
                    for (let [res, amount] of Object.entries(a.additionalResources?.[minEra]?.resources || {})) {
                        if (amount !== 0)
                            prods += `<tr><td>${srcLinks.icons(resMapper(res, "goods")) + range(a.additionalResources?.[minEra].resources[res], a.additionalResources[maxEra].resources[res]) + ifMot}</td></tr>`;
                    }
                    for (let [res, amount] of Object.entries(a.additionalResources?.AllAge?.resources || {})) {
                        if (amount !== 0)
                            prods += `<tr><td>${srcLinks.icons(resMapper(res, "goods")) + span(amount) + ifMot}</td></tr>`;
                    }
                }
                for (let a of abilityList.RandomUnitOfAgeWhenMotivatedAbility || []) {
                    prods += `<tr><td>${srcLinks.icons("military") + (a.amount || 1) + ifMot}</td></tr>`;
                }
                for (let a of abilityList.RandomBlueprintWhenMotivatedAbility || []) {
                    prods += `<tr><td>${srcLinks.icons("blueprint") + (a.amount || 1) + ifMot}</td></tr>`;
                }
                for (let a of abilityList.RandomChestRewardAbility || []) {
                    prods += `<tr><td><table class="randomProductions">`;
                    for (let [id, rew] of Object.entries(a.rewards?.[minEra]?.possible_rewards)) {
                        prods += `<tr><td>`;
                        let asset = rew?.reward?.type === "resource" ? rew.reward.subType : rew.reward.iconAssetName;
                        let amountBA = rew.reward?.totalAmount || rew.reward?.amount;
                        let amountMax = a.rewards?.[maxEra]?.possible_rewards?.[id]?.reward?.totalAmount || a.rewards?.[maxEra]?.possible_rewards?.[id]?.reward.amount;
                        if (rew.reward.type === "chest" && rew.reward?.possible_rewards?.[0]?.reward?.type === "good") {
                            asset = "goods";
                            amountBA = rew.reward?.possible_rewards?.[0]?.reward?.amount || amountBA;
                            amountMax = a.rewards?.[maxEra]?.possible_rewards?.[id]?.reward?.possible_rewards?.[0]?.reward?.amount || amountMax;
                        }
                        prods += srcLinks.icons(asset) + range(amountBA, amountMax);
                        prods += `<span class="dropChance">${rew.drop_chance}%</span></td></tr>`;
                    }
                    prods += `</table></td></tr>`;
                }
            }

            for (let a of abilityList.BonusOnSetAdjacencyAbility || []) {
                for (let b of a.bonuses) {
                    if (Object.values(b.boost).length > 0) {
                        boosts += `<tr><td>${b.level + "x" + srcLinks.icons(a.setId)} ► `;
                        if (b.boost.AllAge) {
                            boosts += srcLinks.icons(b.boost.AllAge.type + feature[b.boost.AllAge.targetedFeature]) + " " + span(b.boost.AllAge.value) + Boosts.percent(b.boost.AllAge.type);
                        }
                        if (b.boost?.[minEra] && b.boost[maxEra]) {
                            boosts += srcLinks.icons(b.boost?.[minEra].type + feature[b.boost?.[minEra].targetedFeature]) + " " + range(b.boost?.[minEra].value, b.boost[maxEra].value) + Boosts.percent(b.boost?.[minEra].type);
                        }
                        boosts += `</td></tr>`;
                    } else {
                        prods += `<tr><td>${b.level + "x" + srcLinks.icons(a.setId)} ► `;
                        if (b.revenue?.AllAge) {
                            let [res, amount] = Object.entries(b.revenue?.AllAge?.resources)[0];
                            prods += srcLinks.icons(resMapper(res, "goods")) + span(amount);
                        }
                        if (b.revenue?.[minEra] && b.revenue?.[maxEra]) {
                            let [res, amount] = Object.entries(b.revenue?.[minEra]?.resources)[0];
                            prods += srcLinks.icons(resMapper(res, "goods")) + range(amount, b.revenue?.[maxEra].resources[res]);
                        }
                        prods += `</td></tr>`;
                    }
                }
            }

            first = true;
            for (let a of abilityList.ChainLinkAbility || []) {
                for (let b of a.bonuses) {
                    if (Object.values(b.boost).length > 0) {
                        if (first) {
                            boosts += '<tr><td style="text-wrap-mode:wrap;">' + a.description + "</td></tr>";
                            first = false;
                        }
                        boosts += `<tr><td>${b.level + "x" + srcLinks.icons(a.chainId)} ► `;

                        if (b.boost.AllAge) {
                            boosts += srcLinks.icons(b.boost.AllAge.type + feature[b.boost.AllAge.targetedFeature]) + " " + span(b.boost.AllAge.value) + Boosts.percent(b.boost.AllAge.type);
                        }
                        if (b.boost?.[minEra] && b.boost[maxEra]) {
                            boosts += srcLinks.icons(b.boost?.[minEra].type + feature[b.boost?.[minEra].targetedFeature]) + " " + range(b.boost?.[minEra].value, b.boost[maxEra].value) + Boosts.percent(b.boost?.[minEra].type);
                        }
                        boosts += `</td></tr>`;
                    }
                    else {
                        if (first) {
                            prods += '<tr><td style="text-wrap-mode:wrap;">' + a.description + "</td></tr>";
                            first = false;
                        }

                        prods += `<tr><td>${b.level + "x" + srcLinks.icons(a.chainId)} ► `;

                        if (b.revenue?.AllAge) {
                            let [res, amount] = Object.entries(b.revenue?.AllAge?.resources)[0];
                            prods += srcLinks.icons(resMapper(res, "goods")) + span(amount);
                        }
                        if (b.revenue?.[minEra] && b.revenue?.[maxEra]) {
                            let [res, amount] = Object.entries(b.revenue?.[minEra]?.resources)[0];
                            prods += srcLinks.icons(resMapper(res, "goods")) + range(amount, b.revenue?.[maxEra].resources[res]);
                        }
                        prods += `</td></tr>`;
                    }
                }
            }

            let costs = "";
            for (let [resource, amount] of Object.entries(meta?.requirements?.cost?.resources || {})) {
                if (amount > 0) costs += `<div>${srcLinks.icons(resource) + " " + span(amount)}</div>`;
            }

            provides = provides + boosts;

            if (provides !== "") out += `<tr><th>${i18n("Boxes.Tooltip.Building.provides")}</th></tr>` + provides;
            if (prods !== "") out += `<tr><th>${i18n("Boxes.Tooltip.Building.produces")} ${meta?.available_products?.length === 1 ? "(" + formatTime(meta.available_products[0].production_time) + ")" : ""}</th></tr>` + prods;
            if (costs !== "") out += `<tr><th>${i18n("Boxes.Tooltip.Building.costs")}</th></tr><tr><td class="multiCol">` + costs + `</td></tr>`;

            out += `<tr><th>${i18n("Boxes.Tooltip.Building.size+time")}</th></tr>`;
            out += `<tr><td class="multiCol"><div>${srcLinks.icons("size")} ${meta.length + "x" + meta.width}</div>`;
            out += meta.construction_time ? `<div>${srcLinks.icons("icon_time")}${formatTime(meta.construction_time)}</div>` : ``;

            if (meta.requirements?.street_connection_level === 2) {
                out += `<div>${srcLinks.icons("street_required")} ${i18n("Boxes.Tooltip.Building.road2")}</div>`;
            } else if (meta.requirements?.street_connection_level === 1) {
                out += `<div>${srcLinks.icons("road_required")} ${i18n("Boxes.Tooltip.Building.road")}</div>`;
            }
            out += `</td></tr>`;

            if (traits !== "") out += `<tr><th>${i18n("Boxes.Tooltip.Building.traits")}</th></tr>` + traits;
        }
        out += `</table>`;
        return out;
    },
};

// QI Actions
FoEproxy.addFoeHelperHandler('ResourcesUpdated', () => {
    QIActions.count = ResourceStock.guild_raids_action_points || 0;
});

FoEproxy.addHandler('ResourceService', 'getPlayerAutoRefills', (data, postData) => {
    QIActions.setNext(data.responseData.resources.guild_raids_action_points);
});

FoEproxy.addFoeHelperHandler('ActiveMapUpdated', () => {
    if (ActiveMap === "guild_raids") {
        $('#QIActions').show();
    } else {
        $('#QIActions').hide();
    }
});

FoEproxy.addHandler('ResourceService', 'getResourceDefinitions', (data, postData) => {
    QIActions.hourlyBase = FHResourcesList.find(x => x.id === "guild_raids_action_points").abilities.autoRefill.refillAmount;
});

/**
 * Tracks QI Action points.
 */
let QIActions = {
    count: 0,
    next: null,
    last: null,
    hourlyBase: 5000,
    capacity: 200000,


    /**
     * Sets the next timer for an action and updates action-related parameters.
     *
     * This function calculates the amount of time until the next action should occur
     * and sets a timeout for invoking itself again when the time elapses. It also updates
     * the corresponding action counters based on elapsed time and predefined action rates.
     *
     * @param {number|null} time - A timestamp indicating when the next action should occur.
     * If not provided, the function calculates it based on current time and the last recorded action time.
     */
    setNext: (time) => {
        let timer = 3600000;
        let hourly = QIActions.hourlyBase + Boosts.Sums["guild_raids_action_points_collection"];

        if (time) {
            timer = (time - GameTime.get() + 3600) * 1000;
            QIActions.last = time;
        } else {
            let amount = Math.floor((moment().unix() - QIActions.last + 10) / 3600);
            QIActions.count = Math.min(QIActions.count + amount * hourly, QIActions.capacity);
            QIActions.last += 3600 * amount;
            timer = (QIActions.last - moment().unix() + 3600) * 1000;
        }

        if (QIActions.next) {
            clearTimeout(QIActions.next);
        }

        QIActions.next = setTimeout(QIActions.setNext, timer);
    },


    /**
     * Generates an HTML tooltip string containing information about action points in a guild raid context.
     *
     * This function calculates the hourly action point accumulation rate, estimates the time at which the
     * action point capacity will be full, and determines the next hourly accumulation timestamp. These values
     * are used to populate a tooltip with localized strings and formatted times for display.
     *
     * @returns {string} The formatted HTML string for the tooltip, including action point information,
     *                   time until the next update, and the estimated time when capacity will be full.
     */
    TT: () => {
        let hourly = QIActions.hourlyBase + Boosts.Sums["guild_raids_action_points_collection"];
        let fullAt = Math.ceil((QIActions.capacity + (Boosts.Sums["guild_raids_action_points_capacity"] || 0) - QIActions.count) / hourly) * 3600 + QIActions.last;
        let next = QIActions.last + 3600;
        while (next < moment().unix()) next += 3600;

        let tooltip = `<div style="text-align:center">`;
        tooltip += `<h1>${i18n("Global.BoxTitle")}</h1>`;
        tooltip += `<p style="margin: 3px">${srcLinks.icons("guild_raids_action_points")}&nbsp;${HTML.Format(hourly)} ${moment.unix(next).fromNow()}</p>`
        tooltip += `<h2>${i18n("Boxes.QIActions.FullAt")}</h2>`;
        tooltip += `<p>${moment.unix(fullAt).format('lll')}</p></div>`;

        return tooltip;
    }
};

// GBG Rewards Stream
FoEproxy.addHandler('RewardService', 'collectReward', async (data, postData) => {
    if (!Settings.GetSetting("ShowGBGRewards")) return;
    if (!Array.isArray(data.responseData)) return;

    let [rewards, rewardIncidentSource] = data.responseData;
    if (rewardIncidentSource !== "battlegrounds_conquest" && rewardIncidentSource !== "guild_expedition_reward_notification") return;

    for (let reward of rewards) {
        let rew = Tooltips.genericEval(reward);

        $(`<span>${reward.amount.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",")} ${rew.fragment}${rew.icon}</span>`)
            .appendTo("#RewardsList")
            .fadeOut(10000, function() { $(this).remove(); });
    }
});

// Start des Tooltip-Systems
Tooltips.init();