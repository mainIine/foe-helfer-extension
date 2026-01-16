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

FoEproxy.addHandler('QuestService', 'getUpdates', (data, postData) => {
    
    if (!data.responseData) return;
    for (let q in data.responseData) {
        if (!data.responseData.hasOwnProperty(q)) continue;
        let quest = data.responseData[q];
        if (quest.id >= 900000 && quest.id < 1000000) {
            if (quest.genericRewards?.length > 0) {
                if (!Recurring.data.Questlist[quest.id] && quest.genericRewards[0].flags.includes('random')) {
                    Recurring.data.Questlist[quest.id] = {'title':quest.title, 'diamonds': false};
                }
                if (quest.genericRewards[0].subType == "medals" || quest.genericRewards[0].subType == "premium") {
                    Recurring.data.Questlist[quest.id].diamonds = true;
                }
                if (!Recurring.data.Questlist[quest.id].era) Recurring.data.Questlist[quest.id].era = CurrentEraID;
                if (!Recurring.data.Questlist[quest.id].conditions) {
                    Recurring.data.Questlist[quest.id].conditions = quest.successConditions;
                    Recurring.data.Questlist[quest.id].groups = quest.successConditionGroups;
                }
            }
        }
    }
    Recurring.data.count=0;
    Recurring.filter()
    Recurring.SaveSettings();
    Recurring.RefreshGui();
});

let Recurring = {
    data: JSON.parse(localStorage.getItem('Recurring')) || {"Questlist": {}, "count":0, "showCounter": false,"hideTasks":true},
    
	/**
	 * Box in den DOM
	 */
    init: () => {
        if ($('#RecurringQuestsBox').length < 1) {

            HTML.AddCssFile('recurring-quests');

            HTML.Box({
                'id': 'RecurringQuestsBox',
                'title': i18n('Boxes.RecurringQuests.Title'),
                'auto_close': true,
                'dragdrop': true,
                'minimize': true,
                'resize': true,
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
    filter: () => {
        Recurring.data.filter = [];
        Recurring.data.filter2 = [];
        Recurring.data.count = 0;
        for (let q in Recurring.data.Questlist) {
            if (!Recurring.data.Questlist[q]) continue;
            if (Recurring.data.Questlist[q].era == CurrentEraID) {
                if (!Recurring.data.Questlist[q].diamonds){
                    Recurring.data.filter.push(q);
                    Recurring.data.count++;
                } else {
                    Recurring.data.filter2.push(q);
                }
            } else if (CurrentEraID - Recurring.data.Questlist[q].era > 1) {
                delete Recurring.data.Questlist[q];
            }
        }
    },

	/**
	 * Inhalt der Box in den BoxBody legen
	 */
    BuildBox: () => {
        let h = [];
        h.push(`<div>${i18n('Boxes.RecurringQuests.Warning')}</div>`);

        h.push(`<table id="recurringTable" class="foe-table${!!Recurring.data.hideTasks?' hideTasks':''}">`);

        h.push('<thead class="sticky">');
        h.push('<tr>');
        h.push(`<th onclick="Recurring.hideTasks()">${i18n('Boxes.RecurringQuests.Table.Quest')} ⇋</th>`);
        h.push(`<th onclick="Recurring.hideTasks()">${i18n('Boxes.RecurringQuests.Table.Tasks')} ⇋</th>`);
        h.push('<th><img src="' + srcLinks.get("/shared/icons/premium.png", true) + '" alt="" width="20px" height="20px">?</th>');
        h.push('</tr>');
        h.push('</thead>');

        h.push('<tbody>');

        for (let q of Recurring.data.filter) {
            if (!Recurring.data.Questlist[q]) continue;
            let quest=Recurring.data.Questlist[q]
            h.push(`<tr>`);
            h.push(`<td title="${Recurring.getTasksTitle(quest.groups,quest.conditions)}"><span>${quest.title}</span></td>`);
            h.push(`<td title="${Recurring.getTasksTitle(quest.groups,quest.conditions)}">${Recurring.getTasks(quest.groups,quest.conditions)}</td>`);
            h.push(`<td><span class="switchState" data-id="${q}">${quest.diamonds ? "✓" : "?"}</span></td>`);
            h.push('</tr>');
        }
        for (let q of Recurring.data.filter2) {
            if (!Recurring.data.Questlist[q]) continue;
            let quest=Recurring.data.Questlist[q]
            h.push(`<tr>`);
            h.push(`<td title="${Recurring.getTasksTitle(quest.groups,quest.conditions)}"><span>${quest.title}</span></td>`);
            h.push(`<td title="${Recurring.getTasksTitle(quest.groups,quest.conditions)}">${Recurring.getTasks(quest.groups,quest.conditions)}</td>`);
            h.push(`<td class="check"><span class="switchState" data-id="${q}">${quest.diamonds ? "✓" : "?"}</span></td>`);
            h.push('</tr>');
        }
        h.push('</tbody>');
        h.push('</table>');

        $('#RecurringQuestsBoxBody').html(h.join(''));
        $('#RecurringQuestsBoxBody .switchState').on('mousedown', function() {
            $(this).addClass('loading');
            Recurring.loadingTimer = setTimeout(() => {
                $(this).removeClass('loading');
                id=$(this).data('id');
                Recurring.data.Questlist[id].diamonds = !Recurring.data.Questlist[id].diamonds;
                Recurring.SaveSettings();
                Recurring.BuildBox();
                Recurring.loadingTimer = null;
            }, 5000)
        })
        $('#RecurringQuestsBoxBody .switchState').on('mouseup', function() {
            if (Recurring.loadingTimer) {
                clearTimeout(Recurring.loadingTimer);
                Recurring.loadingTimer = null;
                $(this).removeClass('loading');
            }
        });

    },
    loadingTimer: null,

	SetCounter: ()=> {
        $buttonNumber=$('#recurring-count')
        if ($buttonNumber.length==0) return;
        $buttonNumber.text(Recurring.data.count).show();
        if (Recurring.data.count === 0 || !Recurring.data.showCounter) $buttonNumber.hide();
	},

    ShowSettingsButton: () => {
        let h = [];
        h.push(`<label><input type="checkbox" oninput="Recurring.SaveSettings(this.checked)" ${Recurring.data.showCounter?'checked':''}/>${i18n('Boxes.RecurringQuests.showCounter')}<label>`);
        $('#RecurringQuestsBoxSettingsBox').html(h.join(''));
    },

    SaveSettings: (show=Recurring.data.showCounter) => {
        Recurring.filter()
        Recurring.data.showCounter = show;
        localStorage.setItem('Recurring', JSON.stringify(Recurring.data));
        Recurring.SetCounter();
    },
    getTasks: (groups,conditions) =>{
        let t = '';
        let tAdd = '';
        for (let x in groups) {
            if (!groups[x]) continue;
            for (let c of groups[x].conditionIds) {
                let d= conditions.find(item => item.id==c).description;
                let img= srcLinks.getQuest(conditions.find(item => item.id==c).iconType);
                t += `<span>${tAdd} <img src="${img}"> ${d}</span>`;
                tAdd = `<pre style="display:inline">&emsp;&emsp;</pre>${i18n('Boxes.RecurringQuests.OR')} `;
            }
            tAdd = `${i18n('Boxes.RecurringQuests.AND')}`;
        }
        return t;
    },
    getTasksTitle: (groups,conditions) =>{
        let t = '';
        let tAdd = '';
        for (let x in groups) {
            if (!groups[x]) continue;
            for (let c of groups[x].conditionIds) {
                t += tAdd + conditions.find(item => item.id==c).description;
                tAdd = `\n${i18n('Boxes.RecurringQuests.OR')} `;
            }
            tAdd = `\n-------\n${i18n('Boxes.RecurringQuests.AND')} `;
        }
        return t;
    },
    hideTasks: () => {
        $('#recurringTable').toggleClass('hideTasks'); 
        Recurring.data["hideTasks"]=!Recurring.data.hideTasks;
        Recurring.SaveSettings();
    }

};
