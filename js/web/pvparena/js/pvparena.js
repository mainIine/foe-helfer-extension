const PvPArena = {
    Fights: [],
    AttackFights: [],
    DefenseFights: [],
    LostFights: [],
    LostAttackFights: [],
    AllLostAttackFights: [],
    StartPvPArenaBackupData: undefined,

    activeTable: 'LostAttackFights',

    /**
     * Box in den DOM legen
     */
    Show: () => {
        if ($('#PvPArena').length === 0) {
            // Box in den DOM
            HTML.Box({
                id: 'PvPArena',
                title: i18n('Boxes.PvPArena.Title'),
                auto_close: true,
                minimize: true,
                dragdrop: true,
                resize: true,
                settings: () => PvPArena.ShowSettings(),
			    active_maps:"main"
            });

            // CSS in den DOM
            HTML.AddCssFile('pvparena');
        } else {
            HTML.CloseOpenBox('PvPArena');
        }

        PvPArena.BuildBox();
    },

    /**
     * Body der Box parsen
     */
    BuildBox: () => {
        PvPArena.CalcBody();
    },

    /**
    * Body der Box aktualisieren falls bereits ge�ffnet
    */
    RefreshBox: () => {
        if ($('#PvPArena').length > 0) {
            PvPArena.CalcBody();
        }
    },

    /**
     * Main function for all the data
     */
    CalcBody: () => {
        let h = [];
        h.push('<div class="tabs">');
        h.push('<ul class="horizontal">');
        h.push(`<li class="${PvPArena.activeTable === "Fights" ? "active" : ""}"><a class="toggle-fights" data-value="Fights">${i18n('Boxes.PvPArena.Tabs.AllFights')}</a></li>`);
        h.push(`<li class="${PvPArena.activeTable === "AttackFights" ? "active" : ""}"><a class="toggle-fights" data-value="AttackFights">${i18n('Boxes.PvPArena.Tabs.AttackFights')}</a></li>`);
        h.push(`<li class="${PvPArena.activeTable === "DefenseFights" ? "active" : ""}"><a class="toggle-fights" data-value="DefenseFights">${i18n('Boxes.PvPArena.Tabs.DefenseFights')}</a></li>`);
        h.push(`<li class="${PvPArena.activeTable === "LostAttackFights" ? "active" : ""}"><a class="toggle-fights" data-value="LostAttackFights">${i18n('Boxes.PvPArena.Tabs.LostAttackFights')}</a></li>`);
        h.push('</ul>');
        h.push('</div>');
        h.push('<div id="PvPArenaTable">');
        h.push(PvPArena.CalcTable());
        h.push('</div>');

        $('#PvPArenaBody').html(h.join(''));
        $('#PvPArenaBody .sortable-table').tableSorter();
        $('#PvPArenaBody').off('click', '.toggle-fights').on('click', '.toggle-fights', function () {
            PvPArena.activeTable = $(this).data('value');
            $(this).parent().siblings().removeClass('active');
            $(this).parent().addClass('active');
            PvPArena.RefreshTable();
        });
        $('#PvPArenaBody').off('click', '.delete-lost-fight').on('click', '.delete-lost-fight', function () {
            PvPArena.HideLostAttackFight($(this).data('index'));
        });
        $('#PvPArenaBody').off('click', '.reset-lost-fights').on('click', '.reset-lost-fights', () => {
            PvPArena.ResetLostAttackFights();
        });
    },

    /**
     * Re-render the currently active table
     */
    RefreshTable: () => {
        $('#PvPArenaTable').html(PvPArena.CalcTable());
        $('#PvPArenaTable .sortable-table').tableSorter();
    },

    CalcTable: () => {
        const deletable = PvPArena.activeTable === 'LostAttackFights';

        let h = [];

        if (deletable && PvPArena.LostAttackFights.length > 0) {
            h.push(`<p class="text-right"><button class="btn btn-default reset-lost-fights">${i18n('Boxes.PvPArena.ResetLostAttackFights')}</button></p>`);
        }

        h.push('<table class="foe-table sortable-table">');
        h.push('<thead>');
        h.push('<tr class="sorter-header">');
        h.push(`<th class="game-cursor no-sort" data-type="fights">${i18n('Boxes.PvPArena.Type')}</th>`);
        h.push(`<th class="game-cursor ascending" data-type="fights">${i18n('Boxes.PvPArena.PlayerName')}</th>`);
        h.push(`<th class="is-number game-cursor text-right" data-type="fights">${i18n('Boxes.PvPArena.Points')}</th>`);

        if (deletable) {
            h.push('<th class="no-sort" data-type="fights">&nbsp;</th>');
        }

        h.push('</tr>');
        h.push('</thead>');

        h.push('<tbody class="fights">');

        for (let i = 0; i < PvPArena[PvPArena.activeTable].length; i++) {
            h.push(`<tr>`);
            h.push(`<td><div class="${PvPArena[PvPArena.activeTable][i].type}"></div></td>`);
            h.push(`<td class="" data-text="${helper.str.cleanup(PvPArena[PvPArena.activeTable][i].playerName)}">${PvPArena[PvPArena.activeTable][i].playerName}</td>`);
            h.push(`<td class="is-number text-right text-${PvPArena[PvPArena.activeTable][i].rankingPointsChange < 0 ? 'danger' : 'success'}" data-number="${PvPArena[PvPArena.activeTable][i].rankingPointsChange}">${PvPArena[PvPArena.activeTable][i].rankingPointsChange}</td>`);

            if (deletable) {
                h.push(`<td class="text-center"><button class="btn btn-slim btn-delete icon delete-lost-fight" data-index="${i}" title="${i18n('Boxes.PvPArena.DeleteLostAttackFight')}"></button></td>`);
            }

            h.push(`</tr>`)
        }

        h.push('</tbody>');
        h.push('</table>');

        return h.join('');
    },

    /**
       * handle response data
       *
       * @param {FoE_Class_PvPArena|{__class__: "Error"}} responseData
       */
    StartPvPArena: responseData => {
        PvPArena.StartPvPArenaBackupData = responseData;

        if (responseData.__class__ === "Error") return;

        PvPArena.Fights = responseData.actions.map(action => ({
            type: action.type,
            playerName: action.otherPlayer.player.name,
            rankingPointsChange: action.rankingPointsChange
        }));
        PvPArena.AttackFights = PvPArena.Fights.filter(fight => fight.type === "attack");
        PvPArena.DefenseFights = PvPArena.Fights.filter(fight => fight.type === "defense");
        PvPArena.LostFights = PvPArena.Fights.filter(fight => fight.rankingPointsChange < 0);

        const playersSet = new Set();
        PvPArena.AllLostAttackFights = PvPArena.LostFights.filter(fight => fight.type === "attack" && !playersSet.has(fight.playerName) && playersSet.add(fight.playerName));

        // drop hidden players whose losses no longer appear in the server history
        const hidden = PvPArena.GetHiddenPlayers().filter(name => playersSet.has(name));
        PvPArena.SetHiddenPlayers(hidden);

        PvPArena.LostAttackFights = PvPArena.AllLostAttackFights.filter(fight => !hidden.includes(fight.playerName));

        PvPArena.Show();
    },

    /**
     * Read the list of manually removed players from localStorage
     *
     * @returns {string[]}
     */
    GetHiddenPlayers: () => JSON.parse(localStorage.getItem(`PvPArenaHiddenLostAttacks-${ExtWorld}`) || '[]'),

    /**
     * Persist the list of manually removed players
     *
     * @param {string[]} names
     */
    SetHiddenPlayers: names => {
        if (names.length > 0) {
            localStorage.setItem(`PvPArenaHiddenLostAttacks-${ExtWorld}`, JSON.stringify(names));
        } else {
            localStorage.removeItem(`PvPArenaHiddenLostAttacks-${ExtWorld}`);
        }
    },

    /**
     * Remove a single entry from the lost attacks tab
     *
     * @param {number} index Row index in LostAttackFights
     */
    HideLostAttackFight: index => {
        const fight = PvPArena.LostAttackFights[index];
        if (!fight) return;

        PvPArena.SetHiddenPlayers([...PvPArena.GetHiddenPlayers(), fight.playerName]);
        PvPArena.LostAttackFights.splice(index, 1);
        PvPArena.RefreshTable();
    },

    /**
     * Remove all entries from the lost attacks tab
     */
    ResetLostAttackFights: () => {
        PvPArena.SetHiddenPlayers(PvPArena.AllLostAttackFights.map(fight => fight.playerName));
        PvPArena.LostAttackFights = [];
        PvPArena.RefreshTable();
    },

    /**
    *
    */
    ShowSettings: () => {
        const autoOpen = Settings.GetSetting('ShowPvPArena');

        let h = [];
        h.push(`<p><input id="autoStartPvPArena" name="autoStartPvPArena" value="1" type="checkbox" ${autoOpen === true ? ' checked="checked"' : ''} />`
            + ` <label for="autoStartPvPArena">${i18n('Boxes.Settings.Autostart')}</label>`);
        h.push(`<p><button onclick="PvPArena.SaveSettings()" id="savePvPArenaSettings" class="btn" style="width:100%">${i18n('Boxes.Settings.Save')}</button></p>`);

        $('#PvPArenaSettingsBox').html(h.join(''));
    },

    /**
    *
    */
    SaveSettings: () => {
        localStorage.setItem('ShowPvPArena', $("#autoStartPvPArena").is(':checked'));
        $(`#PvPArenaSettingsBox`).remove();
    },
}

FoEproxy.addHandler('PVPArenaService', 'getOverview', ({ responseData }) => {
    if (Settings.GetSetting('ShowPvPArena') || $('#PvPArena').length > 0) {
        PvPArena.StartPvPArena((responseData));
    }
});