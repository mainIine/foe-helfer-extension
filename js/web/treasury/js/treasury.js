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
    LogDict: {},

    HandleNewLogs: (Logs) => {
        if ($('#treasury').length === 0) {
            HTML.Box({
                'id': 'treasury',
                'title': i18n('Boxes.Treasury.Title'),
                'auto_close': true,
                'dragdrop': true,
            });

            // CSS in den DOM prügeln
            HTML.AddCssFile('treasury');

            $('#treasury').on('click', '.button-export', function () {
                Treasury.Export();
            });
        }

        let LogArray = Logs['responseData']['logs'];
        for (let i = 0; i < LogArray.length; i++) {
            let Log = LogArray[i];
            let LogKey = JSON.stringify(Log);

            if (!Treasury.LogDict[LogKey]) {
                Treasury.LogDict[LogKey] = Log;
                Treasury.Logs[Treasury.Logs.length] = Log;
            }            
        }
        
        Treasury.CalcBody();
    },


    CalcBody: () => {
        let h = [];

        h.push('<strong>' + i18n('Boxes.Treasury.Message') + '</strong><br>');
        h.push(i18n('Boxes.Treasury.RowNumber') + ': ' + HTML.Format(Treasury.Logs.length) + '<br>');
        h.push('<span class="btn-default button-export">' + i18n('Boxes.Treasury.Export') + '</span>');

        $('#treasuryBody').html(h.join(''));
    },


    Export: () => {
        let h = [],
            CurrentLine = [];

        CurrentLine.push('Boxes.Treasury.PlayerID');
        CurrentLine.push('Boxes.Treasury.PlayerName');
        CurrentLine.push('Boxes.Treasury.Resource');
        CurrentLine.push('Boxes.Treasury.Amount');
        CurrentLine.push('Boxes.Treasury.Message');
        CurrentLine.push('Boxes.Treasury.DateTime');

        h.push(CurrentLine.join(';'));

        for (let i = 0; i < Treasury.Logs.length; i++) {
            let CurrentLog = Treasury.Logs[i];

            CurrentLine = [];
            CurrentLine.push(CurrentLog['player']['player_id']);
            CurrentLine.push(CurrentLog['player']['name'].replace(/;/g, ''));
            let GoodID = CurrentLog['resource'];
            CurrentLine.push(GoodsData[GoodID]['name'].replace(/;/g, ''));
            CurrentLine.push(CurrentLog['amount']);
            CurrentLine.push(CurrentLog['action'].replace(/;/g, ''));
            CurrentLine.push(CurrentLog['createdAt'].replace(/;/g, ''));

            h.push(CurrentLine.join(';'));
        }

        let ExportString = h.join('\n');
        let Blob1 = new Blob([ExportString], { type: "application/octet-binary" });
        MainParser.ExportFile(Blob1, 'GBG-export.csv');
    }
};
