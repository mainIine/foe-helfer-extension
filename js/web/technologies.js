/*
 * **************************************************************************************
 *
 * Dateiname:                 technologies.js
 * Projekt:                   foe
 *
 * erstellt von:              Gindi4711
 * zu letzt bearbeitet:       18.11.19, 01:59 Uhr
 *
 * Copyright © 2019
 *
 * **************************************************************************************
 */

let Technologies = {
    AllTechnologies: null,
    UnlockedTechologies: false,

    Eras: {
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
        SpaceAgeMars: 18
    },

    Show: () => {
       if ($('#technologies').length === 0) {
            let args = {
                'id': 'technologies',
                'title': 'Title',
                'auto_close': true,
                'dragdrop': true,
                'minimize': true
            };

            HTML.Box(args);
        }

        Technologies.BuildBox();
    },

    BuildBox: () => {
        let Goods = [],
            h = [],
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

        // Gueter zaehlen
        let CurrentEraID = Technologies.Eras[CurrentEra];
        let RequiredResources = [];
        for (let i = 1; i < Technologies.AllTechnologies.length; i++) {
            let Tech = Technologies.AllTechnologies[i];
            if (Tech['currentSP'] === undefined) Tech['currentSP'] = 0;
            
            if (!Tech['isResearched']) {
                let EraID = Technologies.Eras[Tech['era']];

                // Nur aktuelles ZA und keine optionalen Technologien
                if (EraID === CurrentEraID && Tech['childTechnologies'].length > 0) {
                    if (RequiredResources['strategy_points'] === undefined) RequiredResources['strategy_points'] = 0;
                    RequiredResources['strategy_points'] += Tech['maxSP'] - Tech['currentSP'];
                    for (let ResourceName in Tech['requirements']['resources']) {
                        if (RequiredResources[ResourceName] === undefined) RequiredResources[ResourceName] = 0;
                        RequiredResources[ResourceName] += Tech['requirements']['resources'][ResourceName];
                    }
                }
            }
        }

        h.push('<table id="costTable" class="foe-table">');

        h.push('<thead>' +
            '<tr>' +
            '<th>Ressource</th>' +
            '<th>Benoetigt</th>' +
            '<th>Vorhanden</th>' +
            '<th>Ueberschuss/Fehlt</th>' +
            '</tr>' +
            '</thead>');

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
        for (let i = 75; i < GoodsList.length; i++) {
            OutputList[OutputList.length] = GoodsList[i]['id'];
        }
        
        for (let i = 0; i < OutputList.length; i++) {
            let ResourceName = OutputList[i];
            if (RequiredResources[ResourceName] !== undefined) {
                let Required = RequiredResources[ResourceName];
                let Stock = (ResourceName === 'strategy_points' ? StrategyPoints.AvailableFP : ResourceStock[ResourceName]);

                h.push('<tr>');
                h.push('<td>' + GoodsNames[ResourceName] + '</td>');
                h.push('<td>' + HTML.Format(Required) + '</td>');
                h.push('<td>' + HTML.Format(Stock) + '</td>');
                h.push('<td>' + HTML.Format(Stock - Required) + '</td>');
                h.push('</tr>');
            }
        }
        h.push('</table');
        
        $('#technologiesBody').html(h.join(''));
    }
};