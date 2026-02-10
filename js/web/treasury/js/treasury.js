/*
 * **************************************************************************************
 * Copyright (C) 2026 FoE-Helper team - All Rights Reserved
 * You may use, distribute and modify this code under the
 * terms of the AGPL license.
 *
 * See file LICENSE.md or go to
 * https://github.com/mainIine/foe-helfer-extension/blob/master/LICENSE.md
 * for full license details.
 *
 * **************************************************************************************
 */

// LG Investitionen
FoEproxy.addHandler('ClanService', 'getTreasuryLogs', (data) => {
    if (Settings.GetSetting('ShowGuildTreasuryLogExport')) {
        Treasury.HandleNewLogs(data);
    }
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
                settings: 'Treasury.ShowSettings()'
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

        let LogArray = Logs['responseData']['logs'].map(x=>{
            let date = EventHandler.ParseDate(x.createdAt)
            x.createdAt = date||x.createdAt
            return x
        });
        Treasury.Logs = Treasury.Logs.concat(LogArray);           
                
        Treasury.CalcBody();
    },


    CalcBody: () => {
        let h = [];

        h.push('<strong>' + i18n('Boxes.Treasury.Message') + '</strong><br>');
        h.push(i18n('Boxes.Treasury.RowNumber') + ': ' + HTML.Format(Treasury.Logs.length) + '<br>');
        h.push('<span class="btn button-reset">' + i18n('Boxes.Treasury.Reset') + '</span>');
        h.push('<span class="btn button-export">' + i18n('Boxes.Treasury.Export') + '</span>');

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
            CurrentLine.push(typeof CurrentLog['createdAt'] == "object" ? CurrentLog['createdAt'].toLocaleString().replace(/,/g,"") : CurrentLog['createdAt'].replace(/;/g, ''));

            h.push(CurrentLine.join(';'));
        }

        let ExportString = h.join('\r\n');
        let BOM = "\uFEFF";
        let Blob1 = new Blob([BOM + ExportString], { type: "application/octet-binary;charset=ANSI" });
        MainParser.ExportFile(Blob1, 'GuildTreasury-'+moment().format('YYYY-MM-DD')+'.csv');
    },

    /**
    *
    */
     ShowSettings: () => {
		let autoOpen = Settings.GetSetting('ShowGuildTreasuryLogExport');

        let h = [];
        h.push(`<p><input id="autoStartTreasuryExport" name="autoStartTreasuryExport" value="1" type="checkbox" ${(autoOpen === true) ? ' checked="checked"' : ''} /> <label for="autoStartMarket">${i18n('Boxes.Settings.Autostart')}</label></p>`);
        h.push(`<p><button onclick="Treasury.SaveSettings()" id="save-treasury-settings" class="btn" style="width:100%">${i18n('Boxes.Settings.Save')}</button></p>`);

        $('#treasurySettingsBox').html(h.join(''));
    },

    /**
    *
    */
    SaveSettings: () => {
        let value = false;
		if ($("#autoStartMarket").is(':checked'))
			value = true;

		localStorage.setItem('ShowGuildTreasuryLogExport', value);
		$(`#treasurySettingsBox`).remove();
    },
};
