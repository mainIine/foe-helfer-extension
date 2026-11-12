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

FoEproxy.addMetaHandler('research', (xhr, postData) => {
	Technologies.AllTechnologies = JSON.parse(xhr.responseText);
	//$('#technologies-Btn').removeClass('hud-btn-red');
	//$('#technologies-Btn-closed').remove();

	//if ($('#PlayerProfileButton')) {
    //    $('#PlayerProfileButton span').attr('class','technologies');
    //}
});

FoEproxy.addHandler('ResearchService', 'getProgress', (data, postData) => {
	Technologies.UnlockedTechnologies = data.responseData;
});

// era list of the game (id, index, localized name, short code): picks up eras the extension does not know yet
FoEproxy.addMetaHandler('research_eras', (xhr, postData) => {
	Technologies.ApplyResearchEras(JSON.parse(xhr.responseText));
});

FoEproxy.addHandler('ResearchService', 'payTechnology', (data, postData) => {
	let era = data.responseData.technology.era;

    if (Technologies.Eras[era] > CurrentEraID) {
        CurrentEraID = Technologies.Eras[era];
        CurrentEra = era;
    }
});

// spendResearchResources is the Stellar Age variant of spendForgePoints (stellar points instead of forge points)
const OnResearchProgress = (data, postData) => {
    let CurrentTech = data.responseData['technology'];
    if (CurrentTech === undefined) return;

    let ID = CurrentTech['id']
    if (ID === undefined) return;

    if (!Technologies.UnlockedTechnologies) Technologies.UnlockedTechnologies = {};
    if (!Array.isArray(Technologies.UnlockedTechnologies.inProgressTechnologies)) Technologies.UnlockedTechnologies.inProgressTechnologies = [];

    let TechFound = false;
    for (let i in Technologies.UnlockedTechnologies.inProgressTechnologies) {
        if (!Technologies.UnlockedTechnologies.inProgressTechnologies.hasOwnProperty(i)) continue;

        if (Technologies.UnlockedTechnologies.inProgressTechnologies[i]['tech_id'] === ID) {
            TechFound = true;
            Technologies.UnlockedTechnologies.inProgressTechnologies[i]['currentSP'] = CurrentTech['progress']['currentSP'];

            break;
        }
    }

    if (!TechFound) {
        let TechCount = Technologies.UnlockedTechnologies.inProgressTechnologies.length;
        Technologies.UnlockedTechnologies.inProgressTechnologies[TechCount] = CurrentTech['progress'];
    }

    if ($('#technologies').length !== 0) {
        Technologies.CalcBody();
    }
};
FoEproxy.addHandler('ResearchService', 'spendForgePoints', OnResearchProgress);
FoEproxy.addHandler('ResearchService', 'spendResearchResources', OnResearchProgress);

// branch choice of a Stellar Age decision point: the game only returns a success flag,
// the chosen branch id is taken from the request
FoEproxy.addHandler('ResearchService', 'chooseBranch', (data, postData) => {
    let Request = (postData || []).find(post => post.requestClass === 'ResearchService' && post.requestMethod === 'chooseBranch'),
        BranchID = Request?.requestData?.[0];
    if (typeof BranchID !== 'string') return;

    if (!Technologies.UnlockedTechnologies) Technologies.UnlockedTechnologies = {};
    if (!Array.isArray(Technologies.UnlockedTechnologies.chosenBranches)) Technologies.UnlockedTechnologies.chosenBranches = [];
    if (!Technologies.UnlockedTechnologies.chosenBranches.includes(BranchID)) Technologies.UnlockedTechnologies.chosenBranches.push(BranchID);

    if ($('#technologies').length !== 0) {
        Technologies.CalcBody();
    }
});

FoEproxy.addHandler('ResearchService', 'payTechnology', (data, postData) => {
    let CurrentTech = data.responseData['technology'];
    if (CurrentTech === undefined) return;

    let ID = CurrentTech['id']
    if (ID === undefined) return;

    // Inno verwaltet die erforschten Technologien jetzt in 'unlockedNodes' (vorher 'unlockedTechnologies').
    if (!Technologies.UnlockedTechnologies) Technologies.UnlockedTechnologies = {};
    if (!Array.isArray(Technologies.UnlockedTechnologies.unlockedNodes)) Technologies.UnlockedTechnologies.unlockedNodes = [];
    Technologies.UnlockedTechnologies.unlockedNodes.push(ID);

    if ($('#technologies').length !== 0) {
        Technologies.CalcBody();
    }
});

let Technologies = {
    AllTechnologies: null,
    UnlockedTechnologies: false,
    SelectedEraID: undefined,

    IgnorePrevEra: null,
    IgnoreCurrentEraOptional: null,

    /** @type {boolean} group the resource table by era with sorting inside each group */
    GroupByEra: false,

    /** @type {?number} sorted column index in grouped mode, null = default order */
    SortColumn: null,

    /** @type {number} sort direction in grouped mode: 1 ascending, -1 descending */
    SortDirection: 1,

    /**
     * Ordered list of playable era ids, oldest first. Mirrors the game
     * game's research_eras metadata and acts as the single source for all
     * era lookup maps. ApplyResearchEras() extends it at runtime with eras the
     * game knows but this list does not yet.
     * @type {string[]}
     */
    EraList: [
        'StoneAge', 'BronzeAge', 'IronAge', 'EarlyMiddleAge', 'HighMiddleAge',
        'LateMiddleAge', 'ColonialAge', 'IndustrialAge', 'ProgressiveEra',
        'ModernEra', 'PostModernEra', 'ContemporaryEra', 'TomorrowEra',
        'FutureEra', 'ArcticFuture', 'OceanicFuture', 'VirtualFuture',
        'SpaceAgeMars', 'SpaceAgeAsteroidBelt', 'SpaceAgeVenus',
        'SpaceAgeJupiterMoon', 'SpaceAgeTitan', 'SpaceAgeSpaceHub',
        'StellarAgeDiscovery'
    ],

    /** @type {Object<string,number>} Era name -> era id (NoAge/AllAge = 0), built from EraList */
    Eras: null,

    /** @type {Object<string,number>} Era name -> Inno era id (StoneAge = 0), need this for identities */
    InnoEras: null,

    /** @type {Object<number,string>} Era id -> era name */
    EraNames: null,

    /** @type {Object<number,string>} Inno era id -> era name, need this for cityentities */
    InnoEraNames: null,

    maxEra:null,


    /**
     * Retrieves the maximum era based on the requirements of all great buildings in the city entities.
     * If the maximum era has not been previously calculated, it computes the value by iterating
     * through the city entities, filtering for great buildings, and mapping their minimum era requirements
     * to a numerical value. The result is stored in `Technologies.maxEra` for caching and returned.
     *
     * @returns {number} The numerical value representing the maximum era.
     */
    getMaxEra:()=>{ // 1 more than "InnoEra"
        if (!Technologies.maxEra) {
            Technologies.maxEra = Math.max(...Object.values(MainParser.CityEntities).filter(x => x.type === "greatbuilding").map(x => Technologies.Eras[x.requirements.min_era]));
        }
        return Technologies.maxEra;
    },


    /**
     * (Re)builds the four era lookup maps (Eras, InnoEras, EraNames,
     * InnoEraNames) from the ordered EraList.
     */
    BuildEraMaps: () => {
        const eras = { AllAge: 0, NoAge: 0 },
            innoEras = {},
            eraNames = { 0: 'NoAge' },
            innoEraNames = {};

        Technologies.EraList.forEach((name, i) => {
            eras[name] = i + 1;
            innoEras[name] = i;
            eraNames[i + 1] = name;
            innoEraNames[i] = name;
        });

        eras.NextEra = Technologies.EraList.length + 1;
        innoEras.NextEra = Technologies.EraList.length;

        Technologies.Eras = eras;
        Technologies.InnoEras = innoEras;
        Technologies.EraNames = eraNames;
        Technologies.InnoEraNames = innoEraNames;
    },


    /**
     * Applies the game's research_eras metadata, so new eras work without an
     * extension update: newly listed eras are appended to EraList, the lookup
     * maps are rebuilt and missing i18n entries (full and short era name) are
     * registered from the localized name and the era code of the metadata.
     * @param {{era:string, index:number, name:string, code:string, isTeaser?:boolean}[]} researchEras
     * @param {number} [retries=60] Attempts left while the extension translations are still loading
     */
    ApplyResearchEras: (researchEras, retries = 60) => {
        if (!Array.isArray(researchEras)) return;

        if (!i18n_loaded) { // translations must be loaded before missing era names can be detected
            if (retries > 0) setTimeout(() => Technologies.ApplyResearchEras(researchEras, retries - 1), 1000);
            return;
        }

        try {
            localStorage.removeItem('TechnologiesGameEras'); // cache of the former client script parser

            // teaser eras ("The Unknown") are not playable yet
            const eras = researchEras.filter(e => e.era && !e.isTeaser).sort((a, b) => a.index - b.index),
                gameList = eras.map(e => e.era);

            // accept the game's list only if it extends the known one
            if (Technologies.EraList.every((id, i) => gameList[i] === id) && gameList.length > Technologies.EraList.length) {
                Technologies.EraList = gameList;
                Technologies.BuildEraMaps();

                // StartUp may have resolved CurrentEraID before the maps knew this era
                if (typeof CurrentEra === 'string' && Technologies.Eras[CurrentEra] !== undefined) {
                    CurrentEraID = Technologies.Eras[CurrentEra];
                }
            }

            Technologies.AddEraTranslations(eras);
        }
        catch (err) {
            console.warn('ApplyResearchEras failed:', err);
        }
    },


    /**
     * Registers i18n fallbacks (full and short era name) for eras the
     * extension's language files do not cover yet. The full name comes
     * localized from the metadata, so it appears in the game language.
     * @param {{era:string, name:string, code:string}[]} eras Playable eras of the research_eras metadata
     */
    AddEraTranslations: (eras) => {
        const values = {};

        for (const { era, name, code } of eras) {
            const eraId = Technologies.Eras[era];
            if (eraId === undefined) continue;

            const key = 'Eras.' + eraId;
            if (name && i18n(key) === key) values[key] = name;
            if (code && i18n(key + '.short') === key + '.short') values[key + '.short'] = code.toUpperCase();
        }

        if (Object.keys(values).length > 0) {
            i18n.translator.add({ values: values });
        }
    },


    /**
     * Retrieves the era name associated with a given entityId and level.
     * If the era name within the entityId is 'MultiAge', the era name is determined
     * using the provided level and the Technologies.InnoEraNames mapping.
     *
     * @param {string} entityId - The identifier used to extract the era name. Typically formatted as parts separated by underscores with the era name in the second position.
     * @param {number} level - The level used to determine the era name if the era is 'MultiAge'.
     * @returns {string} The resolved era name based on the entityId and/or level.
     */
    getEraName: (entityId, level) => {
        let eraName = entityId.split('_')[1]

        if (eraName === 'MultiAge') {
            return Technologies.InnoEraNames[level]
        }

        return eraName
    },


    /**
     * Retrieves the ID of the previous era based on the name of the current era.
     *
     * @param {string} eraName - The name of the current era.
     * @returns {number} The ID of the previous era. If the era ID cannot be determined,
     * it defaults to 1.
     */
    getPreviousEraIdByCurrentEraName: (eraName) => {
        return parseInt(Technologies.InnoEras[eraName]-1 || 1)
    },


    /**
     * Retrieves the numeric ID associated with the provided era name.
     *
     * This function looks up the corresponding era ID for the given era name
     * from the `Technologies.InnoEras` collection. If the era name does not
     * exist in the collection, it defaults to returning 1.
     *
     * @param {string} eraName - The name of the current era to look up.
     * @returns {number} The numeric ID for the specified era, or 1 if the era name is not found.
     */
    getEraIdByCurrentEraName: (eraName) => {
        return parseInt(Technologies.InnoEras[eraName]||1)
    },


    /**
     * Determines the next era ID based on the current era name.
     * If the player is already in the highest era, the function returns the current era ID.
     *
     * @param {string} eraName - The name of the current era.
     * @returns {number} The ID of the next era, or the current era ID if the player is in the highest era.
     */
    getNextEraIdByCurrentEraName: (eraName) => {
        // if player is in the highest era, return current age number
        return (Technologies.InnoEras[eraName] === Technologies.getMaxEra()-1) ? parseInt(Technologies.InnoEras[eraName]) : parseInt(Technologies.InnoEras[eraName]+1)
    },


    /**
     * Displays or toggles the "technologies" box in the interface.
     * If the box does not exist, it creates the box, adds relevant styling,
     * and initializes event listeners. If the box already exists, it closes the
     * open box.
     *
     * Functionality includes:
     * - Adding a "technologies" box with various configuration options such as
     *   auto-close, draggable, minimizable, resizable, and configurable settings.
     * - Injecting the necessary CSS file for the technologies box.
     * - Setting the initially selected era for displaying technologies.
     * - Handling user interactions like toggling settings for ignoring previous
     *   or current era optional technologies, and saving states in localStorage.
     * - Switching between different eras based on user input, recalculating the
     *   content of the box accordingly, and updating button states.
     * - Building and rendering the UI for the "technologies" box.
     *
     * Event listeners:
     * - `.ignoreprevera`: Toggles the ignore previous era flag for technologies.
     * - `.ignorecurrenteraoptional`: Toggles the ignore current era optional flag for technologies.
     * - `.btn-switchage`: Switches the selected era to the specified value and updates the box content.
     */
    Show: ()=> {
		if ($('#technologies').length === 0) {

			HTML.Box({
				id: 'technologies',
				title: i18n('Boxes.Technologies.Title'),
				auto_close: true,
				dragdrop: true,
				minimize: true,
                resize: true,
                settings: () => Technologies.ShowSettingsButton()
			});

			// CSS in den DOM prügeln
			HTML.AddCssFile('technologies');

			Technologies.SelectedEraID = CurrentEraID;

            let $technologiesBox = $('#technologies');

            $technologiesBox.on('click', '.ignoreprevera', function () {
                let $this = $(this);

                Technologies.IgnorePrevEra = $this.prop('checked');

                localStorage.setItem('TechnologiesIgnorePrevEra', Technologies.IgnorePrevEra);

                Technologies.CalcBody();
            });

            $technologiesBox.on('click', '.ignorecurrenteraoptional', function () {
                let $this = $(this);

                Technologies.IgnoreCurrentEraOptional = $this.prop('checked');

                localStorage.setItem('TechnologiesIgnoreCurrentEraOptional', Technologies.IgnoreCurrentEraOptional);

                Technologies.CalcBody();
            });

            $technologiesBox.on('click', '.groupbyera', function () {
                Technologies.GroupByEra = $(this).prop('checked');

                localStorage.setItem('TechnologiesGroupByEra', Technologies.GroupByEra);

                Technologies.CalcBody();
            });

            $technologiesBox.on('click', '.showforecast', function () {
                Technologies.Forecast.Enabled = $(this).prop('checked');

                localStorage.setItem('TechnologiesShowForecast', Technologies.Forecast.Enabled);

                Technologies.CalcBody();
            });

            // forecast: a click on a daily value turns it into an input for an own value
            $technologiesBox.on('click', '.forecast-income', function () {
                let $cell = $(this),
                    id = $cell.data('resource');
                if ($cell.find('input').length !== 0) return;

                $cell.html('<input type="number" min="0" step="any" value="' + (Technologies.Forecast.Overrides[id] ?? '') + '">');
                $cell.find('input').trigger('focus').on('blur keydown', function (e) {
                    if (e.type === 'keydown' && e.key !== 'Enter' && e.key !== 'Escape') return;

                    // Escape leaves the value as it was; the cell is rebuilt either way
                    if (e.key !== 'Escape') Technologies.Forecast.SetOverride(id, this.value);
                    if ($.contains(document, this)) Technologies.CalcBody();
                });
            });

            // grouped mode: own sort handling, era blocks stay intact and are sorted internally
            $technologiesBox.on('click', '.technologies-grouped .sorter-header th', function () {
                let column = $(this).index();
                if ($(this).hasClass('no-sort')) return;

                Technologies.SortDirection = (Technologies.SortColumn === column ? -Technologies.SortDirection : 1);
                Technologies.SortColumn = column;

                Technologies.CalcBody();
            });

            // Zeitalter vor und zurück schalten
            $technologiesBox.on('click', '.btn-switchage', function () {

                $('.btn-switchage').removeClass('btn-active');

                Technologies.SelectedEraID = $(this).data('value');
                Technologies.CalcBody();

                $(this).addClass('btn-active');
            });

		} else {
			HTML.CloseOpenBox('technologies');
        }

		Technologies.BuildBox();
    },


    /**
     * Initializes and builds the technologies box configuration.
     * This method sets up certain configuration flags for ignoring
     * research of specific technologies based on the current era and
     * previous era preferences stored in localStorage.
     * After updating the configuration flags, it triggers the recalculation
     * of the technologies display body.
     *
     * Flags:
     * - `Technologies.IgnorePrevEra`: Determines whether to ignore technologies
     *   from the previous era. This is retrieved from localStorage.
     *   Defaults to 'true' if the value in localStorage is not 'false'.
     * - `Technologies.IgnoreCurrentEraOptional`: Determines whether to ignore
     *   optional technologies from the current era. This is retrieved from
     *   localStorage. Defaults to 'true' if the value in localStorage is not 'false'.
     *
     * Dependencies:
     * - `Technologies.CalcBody()`: Recalculates and updates the technologies display body.
     */
    BuildBox: () => {
        // real booleans — the string 'false' would be truthy in the checks below
        Technologies.IgnorePrevEra = localStorage.getItem('TechnologiesIgnorePrevEra') !== 'false'
        Technologies.IgnoreCurrentEraOptional = localStorage.getItem('TechnologiesIgnoreCurrentEraOptional') !== 'false'
        Technologies.GroupByEra = localStorage.getItem('TechnologiesGroupByEra') === 'true'
        Technologies.Forecast.Init();

        Technologies.CalcBody();
    },


    /**
     * Returns the research resource of a technology (forge points or, in the
     * Stellar Age, stellar points): the first entry of `researchCost.resources`,
     * resolved exactly like the game client does it. The former `max_progress`
     * field is kept as forge point fallback for older metadata.
     *
     * @param {Object} Tech - A technology entry of the research tree.
     * @returns {{id: string, amount: number}} Resource id and total amount (strategy_points / 0 if none).
     */
    GetResearchCost: (Tech) => {
        if (Tech['max_progress'] !== undefined) return { id: 'strategy_points', amount: Tech['max_progress'] || 0 };

        const Resources = Tech['researchCost']?.['resources'],
            ID = (Resources && typeof Resources === 'object') ? Object.keys(Resources)[0] : undefined;

        return ID ? { id: ID, amount: Resources[ID] || 0 } : { id: 'strategy_points', amount: 0 };
    },


    /**
     * Returns the open demand of a technology as resource id -> amount: the
     * goods requirements (`requirements.resources`, or `cost.resources` for the
     * branch decision points of the Stellar Age, which have no requirements)
     * plus the still unpaid part of the research resource.
     *
     * @param {Object} Tech - A technology entry of the research tree.
     * @returns {Object<string,number>}
     */
    GetTechDemand: (Tech) => {
        const Demand = Object.assign({}, (Tech['requirements'] || Tech['cost'] || {})['resources'] || {}),
            Research = Technologies.GetResearchCost(Tech);

        if (Research.amount > 0) Demand[Research.id] = (Demand[Research.id] || 0) + Research.amount - (Tech['currentSP'] || 0);

        return Demand;
    },


    /**
     * Optional technologies are dead ends of the tree (no children). The
     * technologies of a decision point branch are never optional, their last
     * node has no children by design.
     *
     * @param {Object} Tech - A technology entry of the research tree.
     * @returns {boolean}
     */
    IsOptionalTech: (Tech) => !Tech['branchOf'] && (Tech['children'] || []).length === 0,


    /**
     * Flattens the research tree into one list: all top level nodes (root
     * excluded) plus the technologies of the Stellar Age branch decision
     * points. Of each decision point only one branch is taken: the chosen one
     * if the player already decided, otherwise the first one (both branches
     * carry the same research costs, only the goods differ slightly). Branch
     * technologies are marked with `branchOf` (id of their decision point).
     *
     * @returns {Object[]} Technology entries
     */
    GetTechList: () => {
        const Chosen = new Set(Technologies.UnlockedTechnologies?.['chosenBranches'] || []),
            List = [];

        for (const Tech of Technologies.AllTechnologies.slice(1)) {
            List.push(Tech);

            const Branches = Tech['branches'];
            if (!Array.isArray(Branches) || Branches.length === 0) continue;

            const Branch = Branches.find(branch => Chosen.has(branch['id'])) || Branches[0];
            for (const Node of (Branch['nodes'] || [])) {
                Node['branchOf'] = Tech['id'];
                List.push(Node);
            }
        }

        return List;
    },


    /**
     * Marks the researched (`isResearched`, fully paid) and partially
     * researched (`currentSP`) technologies of a tech list from the game's
     * research progress.
     *
     * @param {Object[]} TechList - Output of GetTechList()
     */
    MarkResearchState: (TechList) => {
        const ByID = new Map(TechList.map(Tech => [Tech['id'], Tech])),
            Progress = Technologies.UnlockedTechnologies || {},
            Researched = Progress['unlockedNodes']?.length ? Progress['unlockedNodes'] : (Progress['unlockedTechnologies'] || []);

        for (const Tech of TechList) {
            if (Tech['currentSP'] === undefined) Tech['currentSP'] = 0;
        }

        for (const ID of Researched) {
            const Tech = ByID.get(ID);
            if (!Tech) continue;

            Tech['isResearched'] = true;
            Tech['currentSP'] = Technologies.GetResearchCost(Tech).amount;
        }

        for (const InProgress of (Progress['inProgressTechnologies'] || [])) {
            const Tech = ByID.get(InProgress['tech_id']);
            if (Tech) Tech['currentSP'] = InProgress['currentSP'];
        }
    },


    /**
     * Open research demand up to an era, by resource id. Honours the two ignore
     * options: technologies of earlier eras and optional technologies (dead
     * ends) of the current and later eras.
     *
     * @param {number} SelEraID - Era the demand is calculated up to.
     * @param {boolean} [IgnorePrevEra] - Leave out open technologies of earlier eras.
     * @param {boolean} [IgnoreOptional] - Leave out optional technologies from the current era on.
     * @returns {{required: Object<string,number>, cumulative: Object<string,number>, relevant: Object<string,boolean>, techCount: number, lowerEraID: number}}
     *     required: demand of the selected era only; cumulative: demand of the range lowerEraID..SelEraID;
     *     relevant: every resource of that range, even when nothing is open; techCount: open technologies of the selected era
     */
    GetDemand: (SelEraID, IgnorePrevEra = Technologies.IgnorePrevEra, IgnoreOptional = Technologies.IgnoreCurrentEraOptional) => {
        const TechList = Technologies.GetTechList(),
            Result = {
                required: {},
                cumulative: {},
                relevant: {},
                techCount: 0,
                // lower bound of the cumulative range: the lower of current and selected era
                // (the current era when browsing ahead), or the very first era
                lowerEraID: IgnorePrevEra ? Math.min(CurrentEraID, SelEraID) : 1,
            };

        Technologies.MarkResearchState(TechList);

        for (const Tech of TechList) {
            if (Tech['isTeaser']) continue;

            const EraID = Technologies.Eras[Tech['era']],
                IsSelected = (EraID === SelEraID),
                IsOpen = !Tech['isResearched'];

            if (EraID >= CurrentEraID && IgnoreOptional && Technologies.IsOptionalTech(Tech)) continue;
            if (EraID < Result.lowerEraID || EraID > SelEraID) continue;

            for (const [id, amount] of Object.entries(Technologies.GetTechDemand(Tech))) {
                // the resources of the selected era are always listed, others only while they are needed
                if (IsOpen || IsSelected) Result.relevant[id] = true;
                if (IsOpen) Result.cumulative[id] = (Result.cumulative[id] || 0) + amount;
                if (IsOpen && IsSelected) Result.required[id] = (Result.required[id] || 0) + amount;
            }

            if (IsOpen && IsSelected) Result.techCount++;
        }

        return Result;
    },


    /**
     * Stock of a resource as the research counts it: forge points include the
     * packages of the inventory.
     *
     * @param {string} id - Resource id.
     * @returns {number}
     */
    GetStock: (id) => (id === 'strategy_points' ? StrategyPoints.AvailableFP : ResourceStock[id]) || 0,


    /**
     * Renders the box: era navigation, options, the research forecast and the
     * table of all resources the open technologies up to the selected era need
     * (required, cumulative, in stock, missing and, with the forecast, the daily
     * income and the days until the missing amount is covered).
     */
    CalcBody: ()=> {
        let h = [];

        const SelEraID = Technologies.SelectedEraID,
            Demand = Technologies.GetDemand(SelEraID),
            RequiredResources = Demand.required,
            CumulativeResources = Demand.cumulative,
            RelevantResources = Object.assign({ strategy_points: true, money: true, supplies: true }, Demand.relevant),
            TechCount = Demand.techCount,
            CumLowerEraID = Demand.lowerEraID,
            // the cumulative column only differs from "required" when the range spans more than the selected era
            ShowCumulative = CumLowerEraID < SelEraID,
            ShowForecast = Technologies.Forecast.Enabled;

        // what is missing counts against the full cumulative demand, not just the selected era (#3544)
        const Missing = {};
        for (const id in RelevantResources) {
            if (GoodsData[id] === undefined) continue;
            Missing[id] = (ShowCumulative ? CumulativeResources[id] : RequiredResources[id]) || 0;
            Missing[id] -= Technologies.GetStock(id);
        }

        const Forecast = (ShowForecast ? Technologies.Forecast.Calc(Missing) : null);

        let PreviousEraID = Math.max(Technologies.SelectedEraID - 1, 1),
            NextEraID = Math.min(Technologies.SelectedEraID + 1, Technologies.getMaxEra());

        h.push('<div class="dark-bg" style="margin-bottom: 3px">');
	        h.push('<div class="techno-head">');
				h.push('<button class="btn btn-switchage" style="' + (Technologies.SelectedEraID === 1 ? 'visibility:hidden' : '') + '" data-value="' + PreviousEraID + '">' + i18n('Eras.'+PreviousEraID) + '</button>');
				h.push('<div class="text-center"><strong>' + i18n('Eras.'+Technologies.SelectedEraID) + '</strong></div>');
				h.push('<button class="btn btn-switchage" style="' + (Technologies.SelectedEraID === Technologies.getMaxEra() ? 'visibility:hidden' : '') + '" data-value="' + NextEraID + '">' + i18n('Eras.'+NextEraID) + '</button>');
	        h.push('</div>');
	        h.push('<div class="text-small">');
            h.push('<input id="IgnorePrevEra" class="ignoreprevera game-cursor" ' + (Technologies.IgnorePrevEra ? 'checked' : '') + ' type="checkbox">' + i18n('Boxes.Technologies.IgnorePrevEra') + '<br>');
            h.push('<input id="IgnoreCurrentEraOptional" class="ignorecurrenteraoptional game-cursor" ' + (Technologies.IgnoreCurrentEraOptional ? 'checked' : '') + ' type="checkbox">' + i18n('Boxes.Technologies.IgnoreCurrentEraOptional') + '<br>');
            h.push('<input id="GroupByEra" class="groupbyera game-cursor" ' + (Technologies.GroupByEra ? 'checked' : '') + ' type="checkbox">' + i18n('Boxes.Technologies.GroupByEra') + '<br>');
            h.push('<input id="ShowForecast" class="showforecast game-cursor" ' + (ShowForecast ? 'checked' : '') + ' type="checkbox">' + i18n('Boxes.Technologies.ShowForecast') + '<br>');
        	h.push('</div>');
        h.push('</div>');

        // nothing left to research in the selected era
        if (TechCount === 0) {
            h.push('<div class="technologies-hint">' + i18n('Boxes.Technologies.NoTechs') + '</div>');
        }

        if (Forecast) h.push(Technologies.Forecast.Summary(Forecast, SelEraID));

        // grouped mode uses its own sort handling (era blocks are sorted internally),
        // so the global tableSorter must not be attached to the table
        h.push('<table class="foe-table exportable ' + (Technologies.GroupByEra ? 'technologies-grouped' : 'sortable-table') + '">');

        // sort indicator of the grouped mode
        let SortClass = (column) => (Technologies.GroupByEra && Technologies.SortColumn === column ? (Technologies.SortDirection === 1 ? ' ascending' : ' descending') : '');

        h.push('<thead class="sticky">' +
            '<tr class="sorter-header">' +
            '<th class="no-sort"></th>' +
            '<th class="' + SortClass(1) + '" data-type="technologiesTBody" data-export="resource">' + i18n('Boxes.Technologies.Resource') + '</th>' +
            '<th class="is-number' + SortClass(2) + '" data-type="technologiesTBody" data-export="required">' + i18n('Boxes.Technologies.DescRequired') + '</th>' +
            (ShowCumulative ? '<th class="is-number' + SortClass(3) + '" data-type="technologiesTBody" data-export="cumulative">' + i18n('Boxes.Technologies.DescCumulative') + '</th>' : '') +
            '<th class="is-number' + SortClass(ShowCumulative ? 4 : 3) + '" data-type="technologiesTBody" data-export="instock">' + i18n('Boxes.Technologies.DescInStock') + '</th>' +
            '<th class="is-number text-right' + SortClass(ShowCumulative ? 5 : 4) + '" data-type="technologiesTBody" data-export="remaining">' + i18n('Boxes.Technologies.DescStillMissing') + '</th>' +
            (ShowForecast ? '<th class="is-number text-right' + SortClass(ShowCumulative ? 6 : 5) + '" data-type="technologiesTBody" data-export="perday" title="' + HTML.i18nTooltip(i18n('Boxes.Technologies.DescPerDayTT')) + '">' + i18n('Boxes.Technologies.DescPerDay') + '</th>' +
                '<th class="is-number text-right' + SortClass(ShowCumulative ? 7 : 6) + '" data-type="technologiesTBody" data-export="days" title="' + HTML.i18nTooltip(i18n('Boxes.Technologies.DescDaysTT')) + '">' + i18n('Boxes.Technologies.DescDays') + '</th>' : '') +
            '</tr>' +
            '</thead>');

        h.push('<tbody class="technologiesTBody">');

        // table body: every relevant resource is listed
        {
            // goods the player can produce
            let ProducibleGoods = Technologies.GetProducibleGoods();
            // goods that are being produced right now
            let ActiveProductionGoods = Technologies.GetActiveProductionGoods();

            // special era resources grouped by era, taken from the game's resource definitions
            let SpecialsByEra = {};
            for (let Resource of FHResourcesList) {
                if (Resource['abilities']?.['specialResource']?.['type'] === 'specialResource' && Resource['era']) {
                    (SpecialsByEra[Resource['era']] = SpecialsByEra[Resource['era']] || []).push(Resource['id']);
                }
            }

            // output order: era by era the special resource (research gate) first, then the era's goods;
            // strategy points, coins and supplies stay on top of the table in every mode (era null)
            let OutputList = [
                    { id: 'strategy_points', era: null },
                    { id: 'money', era: null },
                    { id: 'supplies', era: null }
                ],
                LastEra = null;
            for (let i = 0; i < GoodsList.length; i++) {
                let Era = GoodsList[i]['era'];

                if (Era !== LastEra) {
                    OutputList.push(...(SpecialsByEra[Era] || []).map(id => ({ id: id, era: Era })));
                    LastEra = Era;
                }

                OutputList.push({ id: GoodsList[i]['id'], era: Era });
            }

            // resources outside the goods list (e.g. the Stellar Age research and mission
            // resources) are appended to the block of their era so they are not lost
            let Listed = new Set(OutputList.map(Entry => Entry['id']));
            for (let ResourceName in RelevantResources) {
                if (Listed.has(ResourceName) || GoodsData[ResourceName] === undefined) continue;

                let Era = FHResourcesList.find(Resource => Resource['id'] === ResourceName)?.['era'] || null,
                    LastIndex = OutputList.map(Entry => Entry['era']).lastIndexOf(Era);

                // these resources are not part of the goods sprite atlas, their icon is a single image asset
                OutputList.splice(LastIndex === -1 ? OutputList.length : LastIndex + 1, 0, { id: ResourceName, era: Era, img: true });
            }

            let Rows = [];
            for (let i = 0; i < OutputList.length; i++) {
                let ResourceName = OutputList[i]['id'];
                // resources without goods metadata (e.g. brand-new era resources) would break the whole render
                if (GoodsData[ResourceName] === undefined) continue;
                if (RelevantResources[ResourceName]) {
                    let Required = RequiredResources[ResourceName] || 0;
                    let Cumulative = CumulativeResources[ResourceName] || 0;
                    let Stock = Technologies.GetStock(ResourceName);
                    let Diff = -Missing[ResourceName];

                    // resources nothing is needed of any more (selected era and cumulative) are dimmed
                    let IsDone = Required <= 0 && (!ShowCumulative || Cumulative <= 0);
                    // forge points, coins and supplies are never highlighted
                    let IsProducible = (ResourceName !== 'strategy_points' && ResourceName !== 'money' && ResourceName !== 'supplies') && ProducibleGoods.has(ResourceName);
                    let IsActive = IsProducible && ActiveProductionGoods.has(ResourceName);
                    let NameClass = IsProducible ? (IsActive ? 'producible-good actively-produced' : 'producible-good') : '';

                    let r = [];
                    r.push('<tr' + (IsDone ? ' class="technologies-done"' : '') + '>');
                    r.push('<td class="goods-image" style="width:25px">' + (OutputList[i]['img'] ? srcLinks.icons(ResourceName) : '<span class="goods-sprite sprite-35 ' + GoodsData[ResourceName]['id'] + '"></span>') + '</td>');
                    r.push('<td data-text="' + helper.str.cleanup(GoodsData[ResourceName]['name']) + '"' + (NameClass ? ' class="' + NameClass + '"' : '') + '>' + GoodsData[ResourceName]['name'] + '</td>');
                    r.push('<td data-number="' + Required + '">' + HTML.Format(Required) + '</td>');
                    if (ShowCumulative) {
                        r.push('<td data-number="' + Cumulative + '">' + HTML.Format(Cumulative) + '</td>');
                    }
                    r.push('<td data-number="' + Stock + '">' + HTML.Format(Stock) + '</td>');
                    r.push('<td data-number="' + Diff + '" class="text-right text-' + (Diff < 0 ? 'danger' : 'success') + '">' + HTML.Format(Diff) + '</td>');

                    let Income = Forecast?.rows[ResourceName]?.income,
                        Days = Forecast?.rows[ResourceName]?.days || 0;
                    if (Forecast) {
                        r.push('<td class="forecast-income text-right game-cursor' + (Income.manual !== null ? ' forecast-manual' : '') + '" data-resource="' + ResourceName + '" data-number="' + Income.used + '" title="' + Technologies.Forecast.IncomeTooltip(ResourceName, Income) + '">' + Technologies.Forecast.Num(Income.used) + '</td>');
                        r.push('<td data-number="' + (Days === Infinity ? Number.MAX_SAFE_INTEGER : Days) + '" class="text-right' + (Days === Infinity ? ' text-danger' : (ResourceName === Forecast.bottleneck ? ' forecast-bottleneck' : '')) + '">' + (Days === Infinity ? '∞' : HTML.Format(Days)) + '</td>');
                    }
                    r.push('</tr>');

                    // column values for the grouped mode sort, aligned with the column indexes
                    let SortValues = [null, GoodsData[ResourceName]['name'], Required];
                    if (ShowCumulative) SortValues.push(Cumulative);
                    SortValues.push(Stock, Diff);
                    if (Forecast) SortValues.push(Income.used, Days);

                    Rows.push({ era: OutputList[i]['era'], html: r.join(''), values: SortValues });
                }
            }

            if (Technologies.GroupByEra) {
                let ColumnCount = (ShowCumulative ? 6 : 5) + (Forecast ? 2 : 0);

                // sort each era block internally, the block order itself stays era by era
                if (Technologies.SortColumn !== null) {
                    let Column = Technologies.SortColumn,
                        Direction = Technologies.SortDirection,
                        Groups = [];
                    for (let Row of Rows) {
                        let LastGroup = Groups[Groups.length - 1];
                        if (!LastGroup || LastGroup.era !== Row.era) {
                            Groups.push({ era: Row.era, rows: [Row] });
                        } else {
                            LastGroup.rows.push(Row);
                        }
                    }
                    Rows = Groups.flatMap(group =>
                        group.rows.sort((a, b) => {
                            let A = a.values[Column], B = b.values[Column];
                            if (typeof A === 'string') return A.localeCompare(B) * Direction;
                            return (A - B) * Direction;
                        })
                    );
                }

                LastEra = null;
                for (let Row of Rows) {
                    if (Row.era !== null && Row.era !== LastEra) {
                        let EraID = Technologies.Eras[Row.era];
                        h.push('<tr class="technologies-era-row"><td colspan="' + ColumnCount + '">' + (EraID !== undefined ? i18n('Eras.' + EraID) : Row.era) + '</td></tr>');
                        LastEra = Row.era;
                    }
                    h.push(Row.html);
                }
            }
            else {
                for (let Row of Rows) {
                    h.push(Row.html);
                }
            }
        }
        h.push('</tbody></table>');

        $('#technologiesBody').html(h.join(''));
        $('#technologiesBody .sortable-table').tableSorter();
    },


    /**
     * Returns a Set of good IDs (excluding money/supplies/strategy_points)
     * that are still needed for unresearched technologies in the range
     * [CumLowerEraID .. SelectedEraID] and where the player's stock is
     * insufficient (stock - demand < 0).
     *
     * Respects the same ignore options (IgnorePrevEra,
     * IgnoreCurrentEraOptional) and SelectedEraID as the Technologies
     * view, so the result matches the red "missing" rows in the
     * "Forschungskosten für ..." window.
     *
     * Used by the Market filter "für Forschung benötigt".
     */
    GetNeededResearchGoods: () => {
        let neededGoods = new Set();

        if (Technologies.AllTechnologies === null || Technologies.UnlockedTechnologies === false) {
            return neededGoods;
        }

        // same ignore flags as the Technologies view; when the cumulative range spans
        // more than the selected era, the stock is compared against the cumulative demand
        let SelEraID = Technologies.SelectedEraID || CurrentEraID,
            Ranges = Technologies.GetDemand(SelEraID, localStorage.getItem('TechnologiesIgnorePrevEra') !== 'false', localStorage.getItem('TechnologiesIgnoreCurrentEraOptional') !== 'false'),
            Demand = (Ranges.lowerEraID < SelEraID ? Ranges.cumulative : Ranges.required);

        for (let ResourceName in Demand) {
            if (ResourceName === 'strategy_points' || ResourceName === 'money' || ResourceName === 'supplies') continue;

            if ((ResourceStock[ResourceName] || 0) - Demand[ResourceName] < 0) {
                neededGoods.add(ResourceName);
            }
        }

        return neededGoods;
    },


    /**
     * Displays the settings button in the technologies settings box.
     * Renders two buttons for exporting data in CSV and JSON formats.
     *
     * The function uses jQuery to dynamically populate the content of
     * the `#technologiesSettingsBox` element with the HTML for the buttons.
     * - The first button allows the user to export the table data in CSV format.
     * - The second button allows the user to export the table data in JSON format.
     *
     * Both export actions leverage the `HTML.ExportTable` method, ensuring
     * the appropriate table and export format are passed as arguments.
     */
    ShowSettingsButton: () => {
        let h = [];
        h.push(`<p class="text-center"><button class="btn" onclick="HTML.ExportTable($('#technologiesBody').find('.foe-table.exportable'), 'csv', 'technologies')">${i18n('Boxes.General.ExportCSV')}</button></p>`);
        h.push(`<p class="text-center"><button class="btn" onclick="HTML.ExportTable($('#technologiesBody').find('.foe-table.exportable'), 'json', 'technologies')">${i18n('Boxes.General.ExportJSON')}</button></p>`);

        $('#technologiesSettingsBox').html(h.join(''));
    },


    /**
     * Expands a (possibly generic) resource name like `random_good_of_age`,
     * `all_goods_of_age`, `random_good_of_previous_age`, `all_goods_of_next_age`
     * into the concrete good IDs of the corresponding era relative to `eraName`.
     * Returns an array of good IDs (may be empty).
     */
    _expandGenericGood: (resourceName, eraName) => {
        let ids = [];
        let goodEra;

        if (resourceName.includes('previous_age')) {
            goodEra = Technologies.getPreviousEraIdByCurrentEraName(eraName);
        } else if (resourceName.includes('next_age')) {
            goodEra = Technologies.getNextEraIdByCurrentEraName(eraName);
        } else {
            goodEra = Technologies.getEraIdByCurrentEraName(eraName);
        }

        for (let i = 0; i < 5; i++) {
            let goodIndex = goodEra * 5 - 5 + i;
            if (goodIndex >= 0 && goodIndex < GoodsList.length) {
                ids.push(GoodsList[goodIndex].id);
            }
        }
        return ids;
    },


    /**
     * Collects a good ID from a production resource entry if it is a real,
     * producible good (present in GoodsData with `goodsProduceable` ability).
     * Returns the good ID or undefined.
     */
    _collectProducibleGoodId: (resourceName) => {
        if (!resourceName) return undefined;
        if (resourceName === 'strategy_points' || resourceName === 'money' || resourceName === 'supplies') return undefined;
        let good = GoodsData[resourceName];
        if (good && good.abilities && good.abilities.goodsProduceable !== undefined) {
            return resourceName;
        }
        return undefined;
    },


    /**
     * Returns a Set of good IDs that the player can produce themselves.
     * Only considers goods buildings owned by the player and reads the
     * specific good each building produces from its (potential) production
     * data, available_products, current_product, or productionOption - not
     * all 5 goods of an era. This prevents false positives like marking
     * glass as producible when the player only has a brickworks.
     */
    GetProducibleGoods: () => {
        let producibleGoods = new Set();

        // Prefer the processed CityBuildingsData when available
        let buildings = MainParser.CityBuildingsData && Object.keys(MainParser.CityBuildingsData).length > 0
            ? MainParser.CityBuildingsData
            : null;

        if (buildings) {
            for (let buildingId in buildings) {
                if (!buildings.hasOwnProperty(buildingId)) continue;
                let building = buildings[buildingId];
                if (!building) continue;

                let eraName = building.eraName || CurrentEra;

                // Potential productions (from entity metadata / setAllProductions)
                if (building.production) {
                    for (let production of building.production) {
                        if (!production || !production.resources) continue;
                        if (production.type === 'resources' || production.type === 'special_goods') {
                            for (let resourceName of Object.keys(production.resources)) {
                                let id = Technologies._collectProducibleGoodId(resourceName);
                                if (id) producibleGoods.add(id);
                                if (resourceName.includes('random_good_of_') || resourceName.includes('all_goods_of_')) {
                                    for (let gid of Technologies._expandGenericGood(resourceName, eraName)) {
                                        if (Technologies._collectProducibleGoodId(gid)) producibleGoods.add(gid);
                                    }
                                }
                            }
                        }
                    }
                }

                // Currently running productions
                if (building.state && building.state.production) {
                    for (let production of building.state.production) {
                        if (!production || !production.resources) continue;
                        if (production.type === 'resources' || production.type === 'special_goods') {
                            for (let resourceName of Object.keys(production.resources)) {
                                let id = Technologies._collectProducibleGoodId(resourceName);
                                if (id) producibleGoods.add(id);
                            }
                        }
                    }
                }

                // Goods buildings: read the specific good from entity available_products
                if (building.type === 'goods') {
                    let entity = MainParser.CityEntities[building.entityId];
                    if (entity && entity.available_products && Array.isArray(entity.available_products)) {
                        for (let product of entity.available_products) {
                            if (product.product && product.product.resources) {
                                for (let resourceName of Object.keys(product.product.resources)) {
                                    let id = Technologies._collectProducibleGoodId(resourceName);
                                    if (id) producibleGoods.add(id);
                                }
                            }
                        }
                    }
                }
            }
        }

        // Fallback / supplement: raw CityMapData (only own buildings)
        for (let buildingId in MainParser.CityMapData) {
            if (!MainParser.CityMapData.hasOwnProperty(buildingId)) continue;
            let building = MainParser.CityMapData[buildingId];
            if (!building || !building.cityentity_id) continue;
            if (building.player_id !== undefined && building.player_id !== ExtPlayerID) continue;

            let entity = MainParser.CityEntities[building.cityentity_id];
            if (!entity) continue;
            if (entity.type !== 'goods') continue;

            if (entity.available_products && Array.isArray(entity.available_products)) {
                for (let product of entity.available_products) {
                    if (product.product && product.product.resources) {
                        for (let resourceName of Object.keys(product.product.resources)) {
                            let id = Technologies._collectProducibleGoodId(resourceName);
                            if (id) producibleGoods.add(id);
                        }
                    }
                }
            }
            if (building.state && building.state.current_product && building.state.current_product.product && building.state.current_product.product.resources) {
                for (let resourceName of Object.keys(building.state.current_product.product.resources)) {
                    let id = Technologies._collectProducibleGoodId(resourceName);
                    if (id) producibleGoods.add(id);
                }
            }
            if (building.state && building.state.productionOption && building.state.productionOption.products) {
                for (let product of building.state.productionOption.products) {
                    if (product.playerResources && product.playerResources.resources) {
                        for (let resourceName of Object.keys(product.playerResources.resources)) {
                            let id = Technologies._collectProducibleGoodId(resourceName);
                            if (id) producibleGoods.add(id);
                        }
                    }
                }
            }
        }

        return producibleGoods;
    },


    /**
     * Returns a Set of good IDs that the player is currently producing
     * (i.e. a production is actively running on the building right now).
     * Used for the italic "actively producing" highlight.
     */
    GetActiveProductionGoods: () => {
        let activeGoods = new Set();

        let buildings = MainParser.CityBuildingsData && Object.keys(MainParser.CityBuildingsData).length > 0
            ? MainParser.CityBuildingsData
            : null;

        let eraName = CurrentEra;

        if (buildings) {
            for (let buildingId in buildings) {
                if (!buildings.hasOwnProperty(buildingId)) continue;
                let building = buildings[buildingId];
                if (!building) continue;
                if (!building.state) continue;
                // only "producing" state counts as actively producing
                if (building.state.name && building.state.name !== 'producing') continue;

                let productions = building.state.production;
                if (!productions) continue;

                for (let production of productions) {
                    if (!production || !production.resources) continue;
                    if (production.type === 'resources' || production.type === 'special_goods') {
                        for (let resourceName of Object.keys(production.resources)) {
                            let id = Technologies._collectProducibleGoodId(resourceName);
                            if (id) activeGoods.add(id);
                            if (resourceName.includes('random_good_of_') || resourceName.includes('all_goods_of_')) {
                                for (let gid of Technologies._expandGenericGood(resourceName, building.eraName || eraName)) {
                                    if (Technologies._collectProducibleGoodId(gid)) activeGoods.add(gid);
                                }
                            }
                        }
                    }
                }
            }
        }

        // Fallback: raw CityMapData current_product
        for (let buildingId in MainParser.CityMapData) {
            if (!MainParser.CityMapData.hasOwnProperty(buildingId)) continue;
            let building = MainParser.CityMapData[buildingId];
            if (!building || !building.cityentity_id) continue;
            if (building.player_id !== undefined && building.player_id !== ExtPlayerID) continue;
            if (!building.state) continue;

            // only running productions
            let stateClass = building.state.__class__;
            if (stateClass !== 'ProducingState' && stateClass !== 'ProductionFinishedState') continue;

            if (building.state.current_product && building.state.current_product.product && building.state.current_product.product.resources) {
                for (let resourceName of Object.keys(building.state.current_product.product.resources)) {
                    let id = Technologies._collectProducibleGoodId(resourceName);
                    if (id) activeGoods.add(id);
                }
            }
            if (building.state.productionOption && building.state.productionOption.products) {
                for (let product of building.state.productionOption.products) {
                    if (product.playerResources && product.playerResources.resources) {
                        for (let resourceName of Object.keys(product.playerResources.resources)) {
                            let id = Technologies._collectProducibleGoodId(resourceName);
                            if (id) activeGoods.add(id);
                        }
                    }
                }
            }
        }

        return activeGoods;
    },
};

Technologies.BuildEraMaps();
