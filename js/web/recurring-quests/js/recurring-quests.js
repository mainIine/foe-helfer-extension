/*
 * **************************************************************************************
 * Copyright (C) 2021 FoE-Helper team - All Rights Reserved
 * You may use, distribute and modify this code under the
 * terms of the AGPL license.
 *
 * See file LICENSE.md or go to
 * https://github.com/mainIine/foe-helfer-extension/blob/master/LICENSE.md
 * for full license details.
 *
 * **************************************************************************************
 */

FoEproxy.addHandler('QuestService', 'getUpdates', (data, postData) => {
    
    if (Recurring.first) {
        Recurring.first = false;
        Recurring.data = JSON.parse(localStorage.getItem('Recurring')) || {"Questlist": {}, "currentEra": 0, "count":0, "showCounter": false};
    }
    if (Recurring.data.currentEra < CurrentEraID) {
        Recurring.Questlist = {};
        Recurring.data.currentEra = CurrentEraID;
    }
    if (!data.responseData) return;
    let changes = false;
    for (let q in data.responseData) {
        if (!data.responseData.hasOwnProperty(q)) continue;
        let quest = data.responseData[q];
        if (quest.id >= 900000 && quest.id < 1000000) {
            if (!Recurring.data.Questlist[quest.id] && quest.genericRewards.length > 0 && quest.genericRewards[0].flags.includes('random')) {
                Recurring.data.Questlist[quest.id] = {'title':quest.title, 'diamonds': false};
                Recurring.data.count++;
                changes=true;
            }
            if (quest.genericRewards.subtype == "medals" || quest.genericRewards.subtype == "premium") {
                Recurring.data.Questlist[quest.id].diamonds = true;
                Recurring.data.count--;
                changes=true;
            }
        }
    }
    if (changes) {
        Recurring.SaveSettings;
    }
    Recurring.RefreshGui();
});

let Recurring = {
    first: true,
    data: null,
    count:0,
   
	/**
	 * Box in den DOM
	 */
    init: () => {
        if ($('#RecurringQuestsBox').length < 1) {

            HTML.AddCssFile('recurring-quests');

            HTML.Box({
                'id': 'RecurringQuestsBox',
                'title': i18n('Boxes.RecurringQuests.Title'),
                //'ask': i18n('Boxes.RecurringQuests.HelpLink'),
                'auto_close': true,
                'dragdrop': true,
                'minimize': true,
                'settings': 'Recurring.ShowSettingsButton()'
            });

            Recurring.RefreshGui();

        } else {
            HTML.CloseOpenBox('RecurringQuestsBox');
        }
    },


	RefreshGui: (fromHandler = false) => {       
        Recurring.SetCounter();
        if ($('#RecurringQuestsBox').length < 1) return;
        
        if (Object.keys(Recurring.data.Questlist).length === 0) {
            $('#RecurringQuestsBox').fadeOut('500', function() {
                $(this).remove();
            });
        }
        else 
            Recurring.BuildBox();  
    },


	/**
	 * Inhalt der Box in den BoxBody legen
	 */
    BuildBox: () => {
        let h = [];
        h.push(`<div style="color:var(--text-bright)">${i18n('RecurringQuests.Warning')}</div>`);

        h.push('<table class="foe-table">');

        h.push('<thead>');
        h.push('<tr>');
        h.push('<th>' + i18n('RecurringQuests.Table.Quest') + '</th>');
        h.push('<th><img src="' + MainParser.InnoCDN + 'assets/shared/icons/premium.png" alt="" width="20px" height="20px">?</th>');
        h.push('</tr>');
        h.push('</thead>');

        h.push('<tbody>');

        for (let q in Recurring.data.Questlist) {
            if (!Recurring.data.Questlist[q]) continue;
            let quest=Recurring.data.Questlist[q]
            h.push(`<tr>`);
            h.push('<td >' + quest.title + '</td>');
            h.push('<td>' + (quest.diamonds ? '✓' :'?')+ '</td>');
            h.push('</tr>');
        }
        h.push('</tbody>');
        h.push('</table>');

        $('#RecurringQuestsBoxBody').html(h.join(''));
    },


	SetCounter: ()=> {
        $buttonNumber=$('#recurring-count')
        if ($buttonNumber.length==0) return;
        $buttonNumber.text(Recurring.data.count).show();
        if (Recurring.data.count === 0 || !Recurring.data.showCounter) $buttonNumber.hide();
	},

    ShowSettingsButton: () => {
        let h = [];
        h.push(`<label><input type="checkbox" oninput="Recurring.SaveSettings(this.checked)" ${Recurring.data.showCounter?'checked':''}/>${i18n("Boxes.RecurringQuests.showCounter")}<label>`);
        $('#RecurringQuestsBoxSettingsBox').html(h.join(''));
    },

    SaveSettings: (show=Recurring.data.showCounter) => {
        Recurring.data.showCounter = show;
        localStorage.setItem('Recurring', JSON.stringify(Recurring.data));
        Recurring.SetCounter()
    },


};
