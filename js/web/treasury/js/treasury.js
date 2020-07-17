/*
 * **************************************************************************************
 *
 * Dateiname:                 treasury.js
 * Projekt:                   foe-chrome
 *
 * erstellt von:              Daniel Siekiera <daniel.siekiera@gmail.com>
 * erstellt am:	              17.07.20, 18:30 Uhr
 * zuletzt bearbeitet:       17.07.20, 18:30 Uhr
 *
 * Copyright © 2020
 *
 * **************************************************************************************
 */

// LG Investitionen
FoEproxy.addHandler('ClanService', 'getTreasuryLogs', (data) => {
    Treasury.HandleNewLogs(data);
});


let Treasury = {
    Logs: [],
    LastNewLogs: undefined,

    HandleNewLogs: (Logs) => {
        Treasury.LastNewLogs = Logs;

        if ($('#treasury').length === 0) {
            HTML.Box({
                'id': 'treasury',
                'title': i18n('Boxes.Treasury.Title'),
                'auto_close': true,
                'dragdrop': true,
            });

            // CSS in den DOM prügeln
            HTML.AddCssFile('treasury');

            $('#treasury').on('click', '.button-reset', function () {
                Treasury.Logs = [];

                Treasury.HandleNewLogs(Treasury.LastNewLogs); //Logs der aktuellen Seite erneut verabeiten
            });

            $('#treasury').on('click', '.button-export', function () {
                Treasury.Export();
            });
        }

        let LogArray = Logs['responseData']['logs'];
        for (let i = 0; i < LogArray.length; i++) {
            Treasury.Logs[Treasury.Logs.length] = LogArray[i];           
        }
        
        Treasury.CalcBody();
    },


    CalcBody: () => {
        let h = [];

        h.push('<strong>' + i18n('Boxes.Treasury.Message') + '</strong><br>');
        h.push(i18n('Boxes.Treasury.RowNumber') + ': ' + HTML.Format(Treasury.Logs.length) + '<br>');
        h.push('<span class="btn-default button-reset">' + i18n('Boxes.Treasury.Reset') + '</span>');
        h.push('<span class="btn-default button-export">' + i18n('Boxes.Treasury.Export') + '</span>');

        $('#treasuryBody').html(h.join(''));
    },


    Export: () => {
        let h = [],
            CurrentLine = [];

        CurrentLine.push(i18n('Boxes.Treasury.PlayerID'));
        CurrentLine.push(i18n('Boxes.Treasury.PlayerName'));
        CurrentLine.push(i18n('Boxes.Treasury.Era'));
        CurrentLine.push(i18n('Boxes.Treasury.Resource'));
        CurrentLine.push(i18n('Boxes.Treasury.Amount'));
        CurrentLine.push(i18n('Boxes.Treasury.Action'));
        CurrentLine.push(i18n('Boxes.Treasury.DateTime'));

        h.push(CurrentLine.join(';'));

        for (let i = 0; i < Treasury.Logs.length; i++) {
            let CurrentLog = Treasury.Logs[i];

            CurrentLine = [];
            CurrentLine.push(CurrentLog['player']['player_id']);
            CurrentLine.push(CurrentLog['player']['name'].replace(/;/g, ''));
            let GoodID = CurrentLog['resource'];
            let EraName = GoodsData[GoodID]['era'];
            let EraID = Technologies.Eras[EraName];
            CurrentLine.push((EraID + '').padStart(2, '0') + ' - ' + i18n('Eras.' + EraID).replace(/;/g, ''));
            CurrentLine.push(GoodsData[GoodID]['name'].replace(/;/g, ''));
            CurrentLine.push(CurrentLog['amount']);
            CurrentLine.push(CurrentLog['action'].replace(/;/g, ''));
            CurrentLine.push(CurrentLog['createdAt'].replace(/;/g, ''));

            h.push(CurrentLine.join(';'));
        }

        let ExportString = h.join('\n');
        let BOM = "\uFEFF";
        let Blob1 = new Blob([BOM + ExportString], { type: "application/octet-binary;charset=ANSI" });
        MainParser.ExportFile(Blob1, 'GBG-export.csv');
    }
};
