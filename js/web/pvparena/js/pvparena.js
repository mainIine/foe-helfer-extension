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
        $('#PvPArenaBody').off('change', '.player-note').on('change', '.player-note', function () {
            PvPArena.SaveNote($(this).data('id'), $(this).val());
        });
        $('#PvPArenaBody').off('keydown', '.player-note').on('keydown', '.player-note', function (e) {
            if (e.key === 'Enter') $(this).blur();
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
        h.push(`<th class="no-sort" data-type="fights">${i18n('Boxes.PvPArena.Notes')}</th>`);

        if (deletable) {
            h.push('<th class="no-sort" data-type="fights">&nbsp;</th>');
        }

        h.push('</tr>');
        h.push('</thead>');

        h.push('<tbody class="fights">');

        const notes = PvPArena.GetNotes();

        for (let i = 0; i < PvPArena[PvPArena.activeTable].length; i++) {
            const fight = PvPArena[PvPArena.activeTable][i];
            const note = notes[fight.playerId] || '';

            h.push(`<tr>`);
            h.push(`<td><div class="${fight.type}"></div></td>`);
            h.push(`<td class="" data-text="${helper.str.cleanup(fight.playerName)}">${fight.playerName}</td>`);
            h.push(`<td class="is-number text-right text-${fight.rankingPointsChange < 0 ? 'danger' : 'success'}" data-number="${fight.rankingPointsChange}">${fight.rankingPointsChange}</td>`);
            h.push(`<td><input type="text" class="player-note" data-id="${fight.playerId}" value="${HTML.escapeHtml(note)}" placeholder="${i18n('Boxes.PvPArena.NotesPlaceholder')}" title="${HTML.escapeHtml(note)}"></td>`);

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
            playerId: action.otherPlayer.player.player_id,
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
     * Read the per-player notes of the current world from localStorage
     *
     * @returns {Object<string, string>} note text keyed by player id
     */
    GetNotes: () => JSON.parse(localStorage.getItem(`PvPArenaNotes-${ExtWorld}`) || '{}'),

    /**
     * Store a note for a player and mirror it into every row of that player
     *
     * @param {number} playerId
     * @param {string} text
     */
    SaveNote: (playerId, text) => {
        const notes = PvPArena.GetNotes();
        text = text.trim();

        if (text) {
            notes[playerId] = text;
        } else {
            delete notes[playerId];
        }

        if (Object.keys(notes).length > 0) {
            localStorage.setItem(`PvPArenaNotes-${ExtWorld}`, JSON.stringify(notes));
        } else {
            localStorage.removeItem(`PvPArenaNotes-${ExtWorld}`);
        }

        $(`#PvPArenaBody .player-note[data-id="${playerId}"]`).val(text).attr('title', text);
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