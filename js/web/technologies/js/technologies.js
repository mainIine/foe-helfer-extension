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

FoEproxy.addHandler('ResearchService', 'payTechnology', (data, postData) => {
	let era = data.responseData.technology.era;

    if (Technologies.Eras[era] > CurrentEraID) {
        CurrentEraID = Technologies.EraNames[era];
        CurrentEra = era;
    }
});

FoEproxy.addHandler('ResearchService', 'spendForgePoints', (data, postData) => {
    let CurrentTech = data.responseData['technology'];
    if (CurrentTech === undefined) return;

    let ID = CurrentTech['id']
    if (ID === undefined) return;

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
});

FoEproxy.addHandler('ResearchService', 'payTechnology', (data, postData) => {
    let CurrentTech = data.responseData['technology'];
    if (CurrentTech === undefined) return;

    let ID = CurrentTech['id']
    if (ID === undefined) return;

    // Inno verwaltet die erforschten Technologien jetzt in 'unlockedNodes' (vorher 'unlockedTechnologies').
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

    Eras: {
        AllAge: 0,
        NoAge: 0,
        StoneAge: 1,
        BronzeAge: 2,
        IronAge: 3,
        EarlyMiddleAge: 4,
        HighMiddleAge: 5,
        LateMiddleAge: 6,
        ColonialAge: 7,
        IndustrialAge: 8,
        ProgressiveEra: 9,
        ModernEra: 10,
        PostModernEra: 11,
        ContemporaryEra: 12,
        TomorrowEra: 13,
        FutureEra: 14,
        ArcticFuture: 15,
        OceanicFuture: 16,
        VirtualFuture: 17,
        SpaceAgeMars: 18,
        SpaceAgeAsteroidBelt: 19,
        SpaceAgeVenus: 20,
        SpaceAgeJupiterMoon: 21,
        SpaceAgeTitan: 22,
        SpaceAgeSpaceHub: 23,
        NextEra: 24,
    },

    // need this for identities
    InnoEras: {
        StoneAge: 0,
        BronzeAge: 1,
        IronAge: 2,
        EarlyMiddleAge: 3,
        HighMiddleAge: 4,
        LateMiddleAge: 5,
        ColonialAge: 6,
        IndustrialAge: 7,
        ProgressiveEra: 8,
        ModernEra: 9,
        PostModernEra: 10,
        ContemporaryEra: 11,
        TomorrowEra: 12,
        FutureEra: 13,
        ArcticFuture: 14,
        OceanicFuture: 15,
        VirtualFuture: 16,
        SpaceAgeMars: 17,
        SpaceAgeAsteroidBelt: 18,
        SpaceAgeVenus: 19,
        SpaceAgeJupiterMoon: 20,
        SpaceAgeTitan: 21,
        SpaceAgeSpaceHub: 22,
        NextEra: 23,
    },


    EraNames: {
        0: 'NoAge',
        1: 'StoneAge',
        2: 'BronzeAge',
        3: 'IronAge',
        4: 'EarlyMiddleAge',
        5: 'HighMiddleAge',
        6: 'LateMiddleAge',
        7: 'ColonialAge',
        8: 'IndustrialAge',
        9: 'ProgressiveEra',
        10: 'ModernEra',
        11: 'PostModernEra',
        12: 'ContemporaryEra',
        13: 'TomorrowEra',
        14: 'FutureEra',
        15: 'ArcticFuture',
        16: 'OceanicFuture',
        17: 'VirtualFuture',
        18: 'SpaceAgeMars',
        19: 'SpaceAgeAsteroidBelt',
        20: 'SpaceAgeVenus',
        21: 'SpaceAgeJupiterMoon',
        22: 'SpaceAgeTitan',
        23: 'SpaceAgeSpaceHub'
    },

    // need this for cityentities
    InnoEraNames: {
        0: 'StoneAge',
        1: 'BronzeAge',
        2: 'IronAge',
        3: 'EarlyMiddleAge',
        4: 'HighMiddleAge',
        5: 'LateMiddleAge',
        6: 'ColonialAge',
        7: 'IndustrialAge',
        8: 'ProgressiveEra',
        9: 'ModernEra',
        10: 'PostModernEra',
        11: 'ContemporaryEra',
        12: 'TomorrowEra',
        13: 'FutureEra',
        14: 'ArcticFuture',
        15: 'OceanicFuture',
        16: 'VirtualFuture',
        17: 'SpaceAgeMars',
        18: 'SpaceAgeAsteroidBelt',
        19: 'SpaceAgeVenus',
        20: 'SpaceAgeJupiterMoon',
        21: 'SpaceAgeTitan',
        22: 'SpaceAgeSpaceHub'
    },
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
                settings: 'Technologies.ShowSettingsButton()'
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
        Technologies.IgnorePrevEra = (localStorage.getItem('TechnologiesIgnorePrevEra') !== 'false' ? 'true' : 'false')
        Technologies.IgnoreCurrentEraOptional = (localStorage.getItem('TechnologiesIgnoreCurrentEraOptional') !== 'false' ? 'true' : 'false')

        Technologies.CalcBody();
    },


    /**
     * Returns the total forge point (strategy_points) cost of a technology.
     * Inno moved this value from the former `max_progress` field into
     * `researchCost.resources.strategy_points`. The old field is kept as a
     * fallback for backward compatibility.
     *
     * @param {Object} Tech - A technology entry from Technologies.AllTechnologies.
     * @returns {number} The forge point cost, or 0 if none is defined.
     */
    GetTechFP: (Tech) => {
        if (!Tech) return 0;
        if (Tech['max_progress'] !== undefined) return Tech['max_progress'] || 0;
        if (Tech['researchCost'] && Tech['researchCost']['resources'] && typeof Tech['researchCost']['resources'] === 'object')
            return Tech['researchCost']['resources']['strategy_points'] || 0;
        return 0;
    },


    /**
     * Calculates and renders the body content for the technologies module.
     * This includes processing researched and in-progress technologies,
     * calculating required resources for unlocking further technologies,
     * and dynamically generating HTML content to display relevant data.
     *
     * The function performs the following steps:
     * 1. Builds an index mapping technology IDs to array indices for quick access.
     * 2. Marks technologies as researched or partially researched based on the current state.
     * 3. Computes the total resources required to unlock remaining technologies, taking into
     *    account various user-defined filters such as ignoring previous or optional technologies.
     * 4. Assembles a list of resources and their statuses (required, in stock, missing).
     * 5. Generates HTML content, including era navigation, settings, and a table displaying resource requirements.
     *
     * Data sources:
     * - `Technologies.AllTechnologies`: Array of all available technologies with their details.
     * - `Technologies.UnlockedTechnologies`: Object containing arrays for unlocked and in-progress technologies.
     * - `Technologies.Eras`: Mapping of era names to era IDs.
     * - `GoodsList`: Array of all possible resources for the technologies.
     * - `ResourceStock`: Object containing current user stock of resources.
     * - `StrategyPoints.AvailableFP`: Number of available strategy points.
     * - `GoodsData`: Object containing metadata for each resource (ID and name).
     *
     * Rendering:
     * - Builds and populates the `#technologiesBody` DOM element with dynamically
     *   generated HTML content, including tables, buttons, and options.
     *
     * Filters applied:
     * - Technologies from previous eras are ignored if `Technologies.IgnorePrevEra` is true.
     * - Optional technologies from the current or future eras are ignored if
     *   `Technologies.IgnoreCurrentEraOptional` is true.
     */
    CalcBody: ()=> {
        let h = [],
            TechDict = [];

        // Index aufbauen (Namen => Index)
        for (let i = 1; i < Technologies.AllTechnologies.length; i++) {
            TechDict[Technologies.AllTechnologies[i]['id']] = i;
        }

        // Suche erforschte Technologien
        let ResearchedTechs = (Technologies.UnlockedTechnologies['unlockedNodes'] && Technologies.UnlockedTechnologies['unlockedNodes'].length)
            ? Technologies.UnlockedTechnologies['unlockedNodes']
            : (Technologies.UnlockedTechnologies['unlockedTechnologies'] || []);
        for (let i = 0; i < ResearchedTechs.length; i++) {
            let TechName = ResearchedTechs[i];
            let Index = TechDict[TechName];
            if (Index === undefined) continue;
            Technologies.AllTechnologies[Index]['isResearched'] = true;
            Technologies.AllTechnologies[Index]['currentSP'] = Technologies.GetTechFP(Technologies.AllTechnologies[Index]);
        }

        // Teilweise erforscht
        for (let i = 0; i < Technologies.UnlockedTechnologies['inProgressTechnologies'].length; i++) {
            let InProgTech = Technologies.UnlockedTechnologies['inProgressTechnologies'][i];
            let Index = TechDict[InProgTech['tech_id']];
            Technologies.AllTechnologies[Index]['currentSP'] = InProgTech['currentSP'];
        }

        // Güter zählen
        let RequiredResources = [],            // Bedarf NUR des gewählten Zeitalters
            CumulativeResources = [],          // Bedarf kumulativ: aktuelles ZA bis gewähltes ZA
            RelevantResources = { strategy_points: true, money: true, supplies: true },
            TechCount = 0;

        let SelEraID = Technologies.SelectedEraID;
        // Untere Grenze des kumulativen Bereichs: das jeweils niedrigere von aktuellem
        // und gewähltem Zeitalter (beim Vorausblättern also das aktuelle Zeitalter).
        let CumLowerEraID = Math.min(CurrentEraID, SelEraID);

        for (let i = 1; i < Technologies.AllTechnologies.length; i++) {
            let Tech = Technologies.AllTechnologies[i];
            if (Tech['currentSP'] === undefined)
            	Tech['currentSP'] = 0;

            if (Tech['isTeaser']) continue;

            let EraID = Technologies.Eras[Tech['era']];

            // Zeitalter unterhalb des kumulativen Bereichs ausblenden
            if (EraID < CumLowerEraID && Technologies.IgnorePrevEra) {
                continue;
            }

            // Aktuelles/zukünftiges ZA und optionale Technologie ausblenden
            if (EraID >= CurrentEraID && Tech['children'].length === 0 && Technologies.IgnoreCurrentEraOptional) {
                continue;
            }

            // Außerhalb des kumulativen Bereichs irrelevant
            if (EraID < CumLowerEraID || EraID > SelEraID) {
                continue;
            }

            let TechFP = Technologies.GetTechFP(Tech);

            // Kumulativ: gesamter Bereich [CumLowerEraID .. SelEraID]
            if (!Tech['isResearched']) {
                if (CumulativeResources['strategy_points'] === undefined)
                	CumulativeResources['strategy_points'] = 0;

                CumulativeResources['strategy_points'] += TechFP - Tech['currentSP'];

                for (let ResourceName in Tech['requirements']['resources']) {
                    if (CumulativeResources[ResourceName] === undefined)
                    	CumulativeResources[ResourceName] = 0;

                    CumulativeResources[ResourceName] += Tech['requirements']['resources'][ResourceName];
                }
            }

            // Pro gewähltem Zeitalter: nur Technologien genau dieses Zeitalters
            if (EraID === SelEraID) {
                // Alle vorkommenden Güter merken, damit sie immer gelistet werden
                for (let ResourceName in Tech['requirements']['resources']) {
                    RelevantResources[ResourceName] = true;
                }

                // Nur noch nicht erforschte Technologien tragen zum Bedarf bei
                if (!Tech['isResearched']) {
                    if (RequiredResources['strategy_points'] === undefined)
                    	RequiredResources['strategy_points'] = 0;

                    RequiredResources['strategy_points'] += TechFP - Tech['currentSP'];

                    for (let ResourceName in Tech['requirements']['resources']) {
                        if (RequiredResources[ResourceName] === undefined)
                        	RequiredResources[ResourceName] = 0;

                        RequiredResources[ResourceName] += Tech['requirements']['resources'][ResourceName];
                    }

                    TechCount++;
                }
            }
        }

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
        	h.push('</div>');
        h.push('</div>');

        // Hinweis, wenn im sichtbaren ZA-Bereich nichts mehr benötigt wird
        if (TechCount === 0) {
            h.push('<div class="technologies-hint">' + i18n('Boxes.Technologies.NoTechs') + '</div>');
        }

        h.push('<table class="foe-table exportable">');

        // Kumulative Spalte nur einblenden, wenn ein zukünftiges Zeitalter gewählt ist
        // (sonst wäre sie identisch zur Spalte "Benötigt").
        let ShowCumulative = SelEraID > CurrentEraID;

        h.push('<thead class="sticky">' +
            '<tr>' +
            '<th colspan="2" data-export2="resource">' + i18n('Boxes.Technologies.Resource') + '</th>' +
            '<th data-export="required">' + i18n('Boxes.Technologies.DescRequired') + '</th>' +
            (ShowCumulative ? '<th data-export="cumulative">' + i18n('Boxes.Technologies.DescCumulative') + '</th>' : '') +
            '<th data-export="instock">' + i18n('Boxes.Technologies.DescInStock') + '</th>' +
            '<th data-export="remaining" class="text-right">' + i18n('Boxes.Technologies.DescStillMissing') + '</th>' +
            '</tr>' +
            '</thead>');

        // Tabelleninhalt – immer alle relevanten Ressourcen ausgeben
        {
            // Reihenfolge der Ausgabe generieren
            let OutputList = ['strategy_points', 'money', 'supplies'];
            for (let i = 0; i < 70; i++) {
                OutputList[OutputList.length] = GoodsList[i]['id'];
            }
            OutputList[OutputList.length] = 'promethium';
            for (let i = 70; i < 75; i++) {
                OutputList[OutputList.length] = GoodsList[i]['id'];
            }
            OutputList[OutputList.length] = 'orichalcum';
            for (let i = 75; i < 80; i++) {
                OutputList[OutputList.length] = GoodsList[i]['id'];
            }
            OutputList[OutputList.length] = 'mars_ore';
            for (let i = 80; i < 85; i++) {
                OutputList[OutputList.length] = GoodsList[i]['id'];
            }
            OutputList[OutputList.length] = 'asteroid_ice';
            for (let i = 85; i < 90; i++) {
                OutputList[OutputList.length] = GoodsList[i]['id'];
            }
            OutputList[OutputList.length] = 'venus_carbon';
            for (let i = 90; i < 95; i++) {
                OutputList[OutputList.length] = GoodsList[i]['id'];
            }
            OutputList[OutputList.length] = 'unknown_dna';
            for (let i = 95; i < 100; i++) {
                OutputList[OutputList.length] = GoodsList[i]['id'];
            }
            OutputList[OutputList.length] = 'crystallized_hydrocarbons';
            for (let i = 100; i < 105; i++) {
                OutputList[OutputList.length] = GoodsList[i]['id'];
            }
            OutputList[OutputList.length] = 'dark_matter';
            for (let i = 105; i < GoodsList.length; i++) {
                OutputList[OutputList.length] = GoodsList[i]['id'];
            }

            for (let i = 0; i < OutputList.length; i++) {
                let ResourceName = OutputList[i];
                if (RelevantResources[ResourceName]) {
                    let Required = RequiredResources[ResourceName] || 0;
                    let Cumulative = CumulativeResources[ResourceName] || 0;
                    let Stock = (ResourceName === 'strategy_points' ? StrategyPoints.AvailableFP : ResourceStock[ResourceName]);
                    if (Stock === undefined) Stock = 0;
                    let Diff = Stock - Required;

                    // Fertige Ressourcen (weder im gewählten ZA noch kumulativ benötigt) werden abgedimmt
                    let IsDone = Required <= 0 && (!ShowCumulative || Cumulative <= 0);
                    h.push('<tr' + (IsDone ? ' class="technologies-done"' : '') + '>');
                    h.push('<td class="goods-image" style="width:25px"><span class="goods-sprite sprite-35 '+ GoodsData[ResourceName]['id'] +'"></span></td>');
                    h.push('<td>' + GoodsData[ResourceName]['name'] + '</td>');
                    h.push('<td>' + HTML.Format(Required) + '</td>');
                    if (ShowCumulative) {
                        h.push('<td>' + HTML.Format(Cumulative) + '</td>');
                    }
                    h.push('<td>' + HTML.Format(Stock) + '</td>');
                    h.push('<td class="text-right text-' + (Diff < 0 ? 'danger' : 'success') + '">' + HTML.Format(Diff) + '</td>');
                    h.push('</tr>');
                }
            }
        }
        h.push('</table');

        $('#technologiesBody').html(h.join(''));
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
};
