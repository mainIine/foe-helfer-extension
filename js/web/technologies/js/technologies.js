/*
 * **************************************************************************************
 *
 * Dateiname:                 technologies.js
 * Projekt:                   foe-chrome
 *
 * erstellt von:              Daniel Siekiera <daniel.siekiera@gmail.com>
 * erstellt am:	              22.12.19, 14:31 Uhr
 * zuletzt bearbeitet:       22.12.19, 14:31 Uhr
 *
 * Copyright © 2019
 *
 * **************************************************************************************
 */

FoEproxy.addMetaHandler('research', (xhr, postData) => {
	Technologies.AllTechnologies = JSON.parse(xhr.responseText);
	$('#technologies-Btn').removeClass('hud-btn-red');
	$('#technologies-Btn-closed').remove();
});

FoEproxy.addHandler('ResearchService', 'getProgress', (data, postData) => {
	Technologies.UnlockedTechologies = data.responseData;
});

FoEproxy.addHandler('ResearchService', 'spendForgePoints', (data, postData) => {
    let CurrentTech = data.responseData['technology'];
    if (CurrentTech === undefined) return;

    let ID = CurrentTech['id']
    if (ID === undefined) return;

    let TechFound = false;
    for (let i in Technologies.UnlockedTechologies.inProgressTechnologies) {
        if (!Technologies.UnlockedTechologies.inProgressTechnologies.hasOwnProperty(i)) continue;

        if (Technologies.UnlockedTechologies.inProgressTechnologies[i]['tech_id'] === ID) {
            TechFound = true;
            Technologies.UnlockedTechologies.inProgressTechnologies[i]['currentSP'] = CurrentTech['progress']['currentSP'];

            break;
        }
    }

    if (!TechFound) {
        let TechCount = Technologies.UnlockedTechologies.inProgressTechnologies.length;
        Technologies.UnlockedTechologies.inProgressTechnologies[TechCount] = CurrentTech['progress'];
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

    let TechCount = Technologies.UnlockedTechologies.unlockedTechnologies.length
    Technologies.UnlockedTechologies.unlockedTechnologies[TechCount] = ID;

    if ($('#technologies').length !== 0) {
        Technologies.CalcBody();
    }
});

let Technologies = {
    AllTechnologies: null,
    UnlockedTechologies: false,
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
    },


	/**
	 * Zeigt
	 */
    Show: ()=> {
		if ($('#technologies').length === 0) {

			HTML.Box({
				'id': 'technologies',
				'title': i18n('Boxes.Technologies.Title'),
				'auto_close': true,
				'dragdrop': true,
				'minimize': true,
				'resize': true
			});

			// CSS in den DOM prügeln
			HTML.AddCssFile('technologies');

			Technologies.SelectedEraID = CurrentEraID;

		} else {
			HTML.CloseOpenBox('technologies');
        }

        $('#technologies').on('click', '.ignoreprevera', function () {
            let $this = $(this),
                v = $this.prop('checked');

            Technologies.IgnorePrevEra = v;

            localStorage.setItem('TechnologiesIgnorePrevEra', Technologies.IgnorePrevEra);

            Technologies.CalcBody();
        });

        $('#technologies').on('click', '.ignorecurrenteraoptional', function () {
            let $this = $(this),
                v = $this.prop('checked');

            Technologies.IgnoreCurrentEraOptional = v;

            localStorage.setItem('TechnologiesIgnoreCurrentEraOptional', Technologies.IgnoreCurrentEraOptional);

            Technologies.CalcBody();
        });

        // Zeitalter vor und zurück schalten
        $('#technologies').on('click', '.btn-switchage', function () {

            $('.btn-switchage').removeClass('btn-default-active');

            Technologies.SelectedEraID = $(this).data('value');
            Technologies.CalcBody();

            $(this).addClass('btn-default-active');
        });

		Technologies.BuildBox();
    },


	/**
	 *
	 */
    BuildBox: () => {
        Technologies.IgnorePrevEra = (localStorage.getItem('TechnologiesIgnorePrevEra') !== 'false' ? 'true' : 'false')
        Technologies.IgnoreCurrentEraOptional = (localStorage.getItem('TechnologiesIgnoreCurrentEraOptional') !== 'false' ? 'true' : 'false')

        Technologies.CalcBody();
    },


	/**
	 *
	 */
    CalcBody: ()=> {
        let h = [],
            TechDict = [];

        // Index aufbauen (Namen => Index)
        for (let i = 1; i < Technologies.AllTechnologies.length; i++) {
            TechDict[Technologies.AllTechnologies[i]['id']] = i;
        }

        // Suche erforschte Technologien
        for (let i = 0; i < Technologies.UnlockedTechologies['unlockedTechnologies'].length; i++) {
            let TechName = Technologies.UnlockedTechologies['unlockedTechnologies'][i];
            let Index = TechDict[TechName];
            Technologies.AllTechnologies[Index]['isResearched'] = true;
            Technologies.AllTechnologies[Index]['currentSP'] = Technologies.AllTechnologies[Index]['maxSP'];
        }

        // Teilweise erforscht
        for (let i = 0; i < Technologies.UnlockedTechologies['inProgressTechnologies'].length; i++) {
            let InProgTech = Technologies.UnlockedTechologies['inProgressTechnologies'][i];
            let Index = TechDict[InProgTech['tech_id']];
            Technologies.AllTechnologies[Index]['currentSP'] = InProgTech['currentSP'];
        }

        // Güter zaehlen
        let RequiredResources = [],
            TechCount = 0;
        for (let i = 1; i < Technologies.AllTechnologies.length; i++) {
            let Tech = Technologies.AllTechnologies[i];
            if (Tech['currentSP'] === undefined)
            	Tech['currentSP'] = 0;

            if (!Tech['isResearched'] && !Tech['isTeaser']) {
                let EraID = Technologies.Eras[Tech['era']];

                if (EraID < CurrentEraID && Technologies.IgnorePrevEra) continue; // Vorherige ZA ausblenden
                if (EraID >= CurrentEraID && Tech['childTechnologies'].length === 0 && Technologies.IgnoreCurrentEraOptional) continue; // Aktuelles/zukünfiges ZA und optionale Technologie ausblenden

                if (EraID >= CurrentEraID && EraID <= Technologies.SelectedEraID) { // && ) { //Alle Technologien voriger ZA und optionale Technologien ausblenden
                    if (RequiredResources['strategy_points'] === undefined)
                    	RequiredResources['strategy_points'] = 0;

                    RequiredResources['strategy_points'] += Tech['maxSP'] - Tech['currentSP'];

                    for (let ResourceName in Tech['requirements']['resources']) {
                        if (RequiredResources[ResourceName] === undefined)
                        	RequiredResources[ResourceName] = 0;

                        RequiredResources[ResourceName] += Tech['requirements']['resources'][ResourceName];
                    }

                    TechCount++;
                }
            }
        }

        let PreviousEraID = Math.max(Technologies.SelectedEraID - 1, CurrentEraID),
            NextEraID = Math.min(Technologies.SelectedEraID + 1, Technologies.Eras['SpaceAgeVenus']);

        h.push('<div class="dark-bg" style="margin-bottom: 3px">');
	        h.push('<div class="techno-head">');
				h.push('<button class="btn btn-default btn-switchage" data-value="' + PreviousEraID + '">' + i18n('Eras.'+PreviousEraID) + '</button>');
				h.push('<div class="text-center"><strong>' + i18n('Eras.'+Technologies.SelectedEraID) + '</strong></div>');
				h.push('<button class="btn btn-default btn-switchage" data-value="' + NextEraID + '">' + i18n('Eras.'+NextEraID) + '</button>');
	        h.push('</div>');
	        h.push('<div class="text-small">');
            h.push('<input id="IgnorePrevEra" class="ignoreprevera game-cursor" ' + (Technologies.IgnorePrevEra ? 'checked' : '') + ' type="checkbox">' + i18n('Boxes.Technologies.IgnorePrevEra') + '<br>');
            h.push('<input id="IgnoreCurrentEraOptional" class="ignorecurrenteraoptional game-cursor" ' + (Technologies.IgnoreCurrentEraOptional ? 'checked' : '') + ' type="checkbox">' + i18n('Boxes.Technologies.IgnoreCurrentEraOptional') + '<br>');
        	h.push('</div>');
        h.push('</div>');

        h.push('<table class="foe-table">');

        h.push('<thead>' +
            '<tr>' +
            '<th colspan="2">' + i18n('Boxes.Technologies.Resource') + '</th>' +
            '<th>' + i18n('Boxes.Technologies.DescRequired') + '</th>' +
            '<th>' + i18n('Boxes.Technologies.DescInStock') + '</th>' +
            '<th class="text-right">' + i18n('Boxes.Technologies.DescStillMissing') + '</th>' +
            '</tr>' +
            '</thead>');

        if (TechCount > 0) {
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
            for (let i = 90; i < GoodsList.length; i++) {
                OutputList[OutputList.length] = GoodsList[i]['id'];
            }

            for (let i = 0; i < OutputList.length; i++) {
                let ResourceName = OutputList[i];
                if (RequiredResources[ResourceName] !== undefined) {
                    let Required = RequiredResources[ResourceName];
                    let Stock = (ResourceName === 'strategy_points' ? StrategyPoints.AvailableFP : ResourceStock[ResourceName]);
                    if (Stock === undefined) Stock = 0;
                    let Diff = Stock - Required;

                    h.push('<tr>');
                    h.push('<td class="goods-image"><span class="goods-sprite-50 sm '+ GoodsData[ResourceName]['id'] +'"></span></td>'); 
                    h.push('<td>' + GoodsData[ResourceName]['name'] + '</td>');
                    h.push('<td>' + HTML.Format(Required) + '</td>');
                    h.push('<td>' + HTML.Format(Stock) + '</td>');
                    h.push('<td class="text-right text-' + (Diff < 0 ? 'danger' : 'success') + '">' + HTML.Format(Diff) + '</td>');
                    h.push('</tr>');
                }
            }
        }
        else {
            h.push('<tr>');
            	h.push('<td colspan="5" class="text-center">' + i18n('Boxes.Technologies.NoTechs') + '</td>');
            h.push('</tr>');
        }
        h.push('</table');

        $('#technologiesBody').html(h.join(''));
    }
};
