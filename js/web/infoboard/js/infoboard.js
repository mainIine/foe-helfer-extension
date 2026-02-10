/*
 *
 *  * **************************************************************************************
 *  * Copyright (C) 2026 FoE-Helper team - All Rights Reserved
 *  * You may use, distribute and modify this code under the
 *  * terms of the AGPL license.
 *  *
 *  * See file LICENSE.md or go to
 *  * https://github.com/mainIine/foe-helfer-extension/blob/master/LICENSE.md
 *  * for full license details.
 *  *
 *  * **************************************************************************************
 *
 */

// neues Postfach
FoEproxy.addHandler('ConversationService', 'getOverviewForCategory', (data, postData) => {
    MainParser.setConversations(data.responseData.category, true);
});

FoEproxy.addHandler('ConversationService', 'getCategory', (data, postData) => {
    MainParser.setConversations(data.responseData);
});

/**
 * @type {{MaxEntries: number, GbgProvShortNameFl: boolean, DebugWebSocket: boolean, OriginalDocumentTitle: string, TitleBlinkEvent: null, ResetBox: Infoboard.ResetBox, SavedFilter: string[], SavedTextFilter: string, HandleMessage: Infoboard.HandleMessage, Box: ((function(): (boolean|undefined))|*), History: *[], StartTitleBlinking: Infoboard.StartTitleBlinking, Init: Infoboard.Init, InjectionLoaded: boolean, StopTitleBlinking: Infoboard.StopTitleBlinking, FilterInput: Infoboard.FilterInput, Show: Infoboard.Show, PostMessage: Infoboard.PostMessage, PlayInfoSound: boolean}}
 */
let Infoboard = {

    InjectionLoaded: false,
    PlayInfoSound: true,
    SavedFilter: ["auction", "gex", "gbg", "trade", "level", "msg", "text"],
    SavedTextFilter: "",
    DebugWebSocket: false,
    History: [],
    MaxEntries: 0,
    GbgProvShortNameFl: JSON.parse(localStorage.getItem("InfoBox.Settings.GbgProvShortNameFl") || "false"),
    OriginalDocumentTitle: document.title,
    TitleBlinkEvent: null,

    /**
     * Setzt einen ByPass auf den WebSocket und "hört" mit
     * */
    Init: () => {
        FoEproxy.addRawWsHandler(data => {
            Infoboard.HandleMessage('in', data);
        });

        // Der Spieler ist wieder im FoE Tab
        window.onfocus = function() {
            // Infoboard.StopTitleBlinking();
        };
    },


    /**
     * Zeigt die InfoBox an
     */
    Show: () => {

        let StorageHeader = localStorage.getItem('ConversationsHeaders');

        // wenn noch nichts drin , aber im LocalStorage vorhanden, laden
        if (MainParser.Conversations.length === 0 && StorageHeader !== null) {
            MainParser.Conversations = JSON.parse(StorageHeader);
        }

        Infoboard.Box();
    },


    /**
     * Erzeugt die Box wenn noch nicht im DOM
     *
     */
    Box: () => {

        // Wenn die Box noch nicht da ist, neu erzeugen und in den DOM packen
        if ($('#BackgroundInfo').length === 0) {

            let spk = localStorage.getItem('infoboxTone');

            if (spk === null) {
                localStorage.setItem('infoboxTone', 'deactivated');
                Infoboard.PlayInfoSound = false;

            } else {
                Infoboard.PlayInfoSound = (spk !== 'deactivated');
            }

            if (localStorage.getItem("infoboxSavedFilter") === null)
                localStorage.setItem("infoboxSavedFilter", JSON.stringify(Infoboard.SavedFilter));
            else
                Infoboard.SavedFilter = JSON.parse(localStorage.getItem("infoboxSavedFilter"));

            if (localStorage.getItem("infoboxTextFilter") === null)
                localStorage.setItem("infoboxTextFilter", Infoboard.SavedTextFilter);
            else
                Infoboard.SavedTextFilter = localStorage.getItem("infoboxTextFilter");


            HTML.Box({
                id: 'BackgroundInfo',
                title: i18n('Boxes.Infobox.Title'),
                auto_close: true,
                dragdrop: true,
                resize: true,
                minimize: true,
                speaker: 'infoboxTone',
                settings: 'Infoboard.ShowSettings()'
            });

            // CSS in den DOM prügeln
            HTML.AddCssFile('infoboard');

        } else {
            return HTML.CloseOpenBox('BackgroundInfo');
        }

        let div = $('#BackgroundInfo'),
            h = [];

        // Filter
        h.push('<div class="filter-row sticky">');

        h.push('<div class="dropdown">');
        h.push('<input type="checkbox" class="dropdown-checkbox" id="infobox-checkbox-toggle"><label class="dropdown-label game-cursor" for="infobox-checkbox-toggle">' + i18n('Boxes.Infobox.Filter') + '</label><span class="arrow"></span>');

        h.push('<ul>');
        h.push('<li><label class="game-cursor"><input type="checkbox" data-type="auction" class="filter-msg game-cursor" ' + (Infoboard.SavedFilter.includes("auction") ? "checked" : "") + '> ' + i18n('Boxes.Infobox.FilterAuction') + '</label></li>');
        h.push('<li><label class="game-cursor"><input type="checkbox" data-type="gex" class="filter-msg game-cursor" ' + (Infoboard.SavedFilter.includes("gex") ? "checked" : "") + '> ' + i18n('Boxes.General.Guild_Expedition.short') + '</label></li>');
        h.push('<li><label class="game-cursor"><input type="checkbox" data-type="gbg" class="filter-msg game-cursor" ' + (Infoboard.SavedFilter.includes("gbg") ? "checked" : "") + '> ' + i18n('Boxes.General.Guild_Battlegrounds.short') + '</label></li>');
        h.push('<li><label class="game-cursor"><input type="checkbox" data-type="trade" class="filter-msg game-cursor" ' + (Infoboard.SavedFilter.includes("trade") ? "checked" : "") + '> ' + i18n('Boxes.Infobox.FilterTrade') + '</label></li>');
        h.push('<li><label class="game-cursor"><input type="checkbox" data-type="level" class="filter-msg game-cursor" ' + (Infoboard.SavedFilter.includes("level") ? "checked" : "") + '> ' + i18n('Boxes.Infobox.FilterLevel') + '</label></li>');
        h.push('<li><label class="game-cursor"><input type="checkbox" data-type="msg" class="filter-msg game-cursor" ' + (Infoboard.SavedFilter.includes("msg") ? "checked" : "") + '> ' + i18n('Boxes.Infobox.FilterMessage') + '</label></li>');
        h.push('<li><label class="game-cursor"><input type="text" data-type="text" placeholder="1.9|A1: M" class="textfilter filter-msg game-cursor" value=' + (Infoboard.SavedFilter.includes("text") ? Infoboard.SavedTextFilter : "") + '></label></li>');
        h.push('</ul>');
        h.push('</div>');

        h.push('<button class="btn btn-reset-box">' + i18n('Boxes.Infobox.ResetBox') + '</button>');

        h.push('</div>');


        // Tabelle
        h.push('<table id="BackgroundInfoTable" class="info-table">');

        h.push('<tbody></tbody>');

        h.push('</table>');

        div.find('#BackgroundInfoBody').html(h.join(''));

        div.show();

        Infoboard.FilterInput();
        Infoboard.ResetBox();

        Infoboard.PostMessage({
            class: 'welcome',
            type: i18n('Menu.Info.Title'),
            msg: i18n('Boxes.Infobox.Messages.Welcome'),
        });

        Infoboard.MaxEntries = localStorage.getItem("EntryCount") || 0;

        for (let i = 0; i < Infoboard.History.length; i++) {
            const element = Infoboard.History[i];
            Infoboard.PostMessage(element,false);
        }

        div.on('click', '#infoboxTone', function () {

            let disabled = $(this).hasClass('deactivated');

            localStorage.setItem('infoboxTone', (disabled ? '' : 'deactivated'));
            Infoboard.PlayInfoSound = !!disabled;

            if (disabled === true) {
                $('#infoboxTone').removeClass('deactivated');
            } else {
                $('#infoboxTone').addClass('deactivated');
            }
        });
    },


    /**
     * Setzt eine neue Zeile für die Box zusammen
     *
     * @param dir
     * @param data
     */
    HandleMessage: async (dir, data) => {

        let Msg = data[0];

        if (!Msg || !Msg['requestClass']) {
            return;
        }

        let c = Msg['requestClass'],
            m = Msg['requestMethod'],
            t = Msg['responseData']?.['type'] || '',
            s = c + '_' + m + t;

        if (Infoboard.DebugWebSocket) {
            console.log(JSON.stringify(data))
        }

        // Gibt es eine Funktion dafür?
        if (!Info[s]) {
            return;
        }

        let bd = await Info[s](Msg['responseData']);

        if (!bd) {
            return;
        }

        // Der Spieler hat den FoE Tab verlassen
        window.onblur = function() {
            // Infoboard.StartTitleBlinking()
        };

        Infoboard.PostMessage(bd);
    },


    PostMessage: (bd, add = true) => {
        if (!bd['date']) bd['date'] = new Date();

        if ($('#BackgroundInfo').length > 0)
        {
            if(bd['class'] !== 'welcome' && add)
            {
                if(Infoboard.MaxEntries > 0 && Infoboard.History.length >= Infoboard.MaxEntries){
                    Infoboard.History.shift();
                }
                Infoboard.History.push(bd);
            }
            if(bd['class'] === 'welcome' && Infoboard.History.length > 0) return;

            let status = $('input[data-type="' + bd['class'] + '"]').prop('checked'),
                textfilter = $('input[data-type="text"]').val().split("|"),
                msg = bd['msg'], img = bd['img'], type = bd['type'], tr = $('<tr />'),
				filterStatus = textfilter.some(e => msg.toLowerCase().includes(e.toLowerCase()));

            // wenn nicht angezeigt werden soll, direkt verstecken
            if ((!status || !filterStatus) && bd.class !== 'welcome')
            {
                tr.hide();
            }
            else
            {
                if(Infoboard.MaxEntries > 0 && $('#BackgroundInfoTable tbody tr').length >= Infoboard.MaxEntries)
                {
                    while(Infoboard.MaxEntries > 0 && $('#BackgroundInfoTable tbody tr').length >= Infoboard.MaxEntries)
					{
                        let trLast = $('#BackgroundInfoTable tbody tr:last-child')[0];
                        trLast.parentNode.removeChild(trLast);
                    }
                }
            }

            if (img) {
                tr.addClass(bd['img']);
            } else {
                tr.addClass(bd['class']);
            }

            tr.append(
                '<td></td>' +
                '<td>' + type + '<br><small><em>' + moment(bd['date']).format('HH:mm:ss') + '</em></small></td>' +
                '<td>' + msg + '</td>'
            );

            $('#BackgroundInfoTable tbody').prepend(tr);

            if (Infoboard.PlayInfoSound && status && filterStatus)
            {
                helper.sounds.play("ping");
            }
        }
    },


    /**
     * Filter für Message Type
     *
     */
    FilterInput: () => {
        $('#BackgroundInfo').on('change', '.filter-msg', function () {
            let active = [];

            $('.filter-msg').each(function () {
                if ($(this).is(':checked') || ($(this).data("type") === "text" && $(this).val() !== "")) {
                    active.push($(this).data('type'));
                    if (!Infoboard.SavedFilter.includes($(this).data('type')))
                        Infoboard.SavedFilter.push($(this).data('type'));
                }
                else {
                    if (Infoboard.SavedFilter.includes($(this).data('type')))
                        Infoboard.SavedFilter.splice(Infoboard.SavedFilter.indexOf($(this).data('type')), 1);
                }
            });

            localStorage.setItem("infoboxSavedFilter", JSON.stringify(Infoboard.SavedFilter));
            localStorage.setItem("infoboxTextFilter", $('input[data-type="text"]').val());

            $('#BackgroundInfoTable tbody tr').each(function () {
                let tr = $(this),
                    textfilter = $('input[data-type="text"]').val().split("|"),
                    type = tr.attr('class');

                if ((active.some(e => type.startsWith(e)) && textfilter.some(e => $(tr.children()[2]).html().toLowerCase().includes(e.toLowerCase()))) || tr.hasClass('welcome')) {
                    tr.show();
                } else {
                    tr.hide();
                }
            });
        });
    },


    /**
     * Leert die Infobox, auf Wunsch
     *
     */
    ResetBox: () => {
        $('#BackgroundInfo').on('click', '.btn-reset-box', function () {
            $('#BackgroundInfoTable tbody').html('');
            Infoboard.History = [];
        });
    },


    StopTitleBlinking: ()=> {

        clearInterval(Infoboard.TitleBlinkEvent);
        document.title = Infoboard.OriginalDocumentTitle;

        Infoboard.TitleBlinkEvent = null;
    },


    StartTitleBlinking: (txt)=> {
        if(Infoboard.TitleBlinkEvent !== null){
            return;
        }

        Infoboard.TitleBlinkEvent = setInterval(()=> {
            document.title = (document.title === Infoboard.OriginalDocumentTitle ? txt : Infoboard.OriginalDocumentTitle);
        }, 750);
    },
    

    /**
    *
    */
	ShowSettings: () => {
		let autoOpen = Settings.GetSetting('AutoOpenInfoBox');
		let messagesAmount = localStorage.getItem('EntryCount');

        let EntryCountTitle = i18n('Settings.InfoboxEntryCount.Title'); //Dummy usage. Dont mark i18n key for disposal yet. Might be useful later

        let h = [];
        h.push(`<p><input id="autoStartInfoboard" name="autoStartInfoboard" value="1" type="checkbox" ${(autoOpen === true) ? ' checked="checked"' : ''} />` 
            + ` <label for="autoStartInfoboard">${i18n('Boxes.Settings.Autostart')}</label>`);
        h.push(`<p><input id="gbgProvShortNameFl" name="gbgProvShortNameFl" value="1" type="checkbox" ${(Infoboard.GbgProvShortNameFl === true) ? ' checked="checked"' : ''} />` 
            + ` <label for="gbgProvShortNameFl">${i18n('Boxes.Infobox.Settings.GbgProvShortName')}</label>`);
        h.push(`<p><label for="infoboxentry-length">${i18n('Settings.InfoboxEntryCount.Desc')}</label><input class="setting-input" type="number" id="infoboxentry-length" step="1" min="1" max="2000" value="${(messagesAmount)}"></p>`);
        h.push(`<p><button onclick="Infoboard.SaveSettings()" id="saveInfoboardSettings" class="btn" style="width:100%">${i18n('Boxes.Settings.Save')}</button></p>`);

        $('#BackgroundInfoSettingsBox').html(h.join(''));
    },


    /**
    *
    */
    SaveSettings: () => {
        Infoboard.GbgProvShortNameFl = $("#gbgProvShortNameFl").is(':checked');
        
        localStorage.setItem('AutoOpenInfoBox', $("#autoStartInfoboard").is(':checked'));
        localStorage.setItem('InfoBox.Settings.GbgProvShortNameFl', Infoboard.GbgProvShortNameFl);
        localStorage.setItem('EntryCount', $("#infoboxentry-length").val());

		$(`#BackgroundInfoSettingsBox`).remove();
    },
};


let Info = {

    /**
     * Cache zum "merken" der kämpfenden Gilden
     */
    GildPoints: {},


    /**
     * Jmd hat in einer Auktion mehr geboten
     *
     * @param d
     * @returns {{class: 'auction', msg: string, type: string}}
     */
    ItemAuctionService_updateBid: (d) => {
        let PlayerLink = MainParser.GetPlayerLink(d['player']['player_id'], d['player']['name']);

        return {
            class: 'auction',
            type: 'Auktion',
            msg: HTML.i18nReplacer(
                i18n('Boxes.Infobox.Messages.Auction'), {
                    player: PlayerLink,
                    amount: HTML.Format(d['amount']),
                }
            )
        };
    },


    /**
     * Nachricht in einem bekannten Chat
     *
     * @param d
     * @returns {class: 'message', msg: string, type: string, img: string | undefined}
     */
    ConversationService_getNewMessage: (d) => {
        let chat = MainParser.Conversations.find(obj => obj.id === d['conversationId']),
            header, message, image;

        if (chat && chat['hidden']){
            return undefined;
        }

        if (d['text'] !== '') {
            // normale Nachricht
            message = d['text'].replace(/(\r\n|\n|\r)/gm, '<br>');
        }
        else if (d['attachment'])
        {
            if (d['attachment']['type'] === 'great_building')
            {
                // legendäres Bauwerk
                message = HTML.i18nReplacer(
                    i18n('Boxes.Infobox.Messages.MsgBuilding'), {
                    building: MainParser.CityEntities[d['attachment']['cityEntityId']]['name'],
                    level: d['attachment']['level']
                });
            }
            else if (d['attachment']['type'] === 'trade_offer') {
                // Handelsangebot
                message = `<div class="offer"><span title="${GoodsData[d['attachment']['offeredResource']]['name']}" class="goods-sprite sprite-50 ${d['attachment']['offeredResource']}"></span> <span>x<strong>${d['attachment']['offeredAmount']}</strong></span> <span class="sign">&#187</span> <span title="${GoodsData[d['attachment']['neededResource']]['name']}" class="goods-sprite sprite-50 ${d['attachment']['neededResource']}"></span> <span>x<strong>${d['attachment']['neededAmount']}</strong></span></div>`;
            }
        }

        if (chat) {
            // passendes Bildchen wählen
            if (chat['important'])
            {
                image = 'msg-important';
            }
            else if (chat['favorite']) {
                image = 'msg-favorite';
            }

            if (d['sender'] && d['sender']['name'])
            {
                // normale Chatnachricht (bekannte ID)
                if (d['sender']['name'] === chat['title'])
                {
                    header = '<div><strong class="bright">' + MainParser.GetPlayerLink(d['sender']['player_id'], d['sender']['name']) + '</strong></div>';
                }
                else {
                    header = '<div><strong class="bright">' + HTML.escapeHtml(chat['title']) + '</strong> - <em>' + MainParser.GetPlayerLink(d['sender']['player_id'], d['sender']['name']) + '</em></div>';
                }
            }
            else {
                // Chatnachricht vom System (Betreten/Verlassen)
                header = '<div><strong class="bright">' + HTML.escapeHtml(chat['title']) + '</strong></div>';
            }
        }
        else {
            return undefined;
        }

        return {
            class: 'msg',
            type: i18n('Boxes.Infobox.FilterMessage'),
            msg: header + message,
            img: image
        };
    },


    /**
     * Nachricht in einem unbekannten Chat
     *
     * @param d
     * @returns {class: 'message', msg: string, type: string}
     */
    ConversationService_getConversationUpdate: (d) => {
        let chat = MainParser.Conversations.find(obj => obj.id === d['conversationId']);
        if (chat) return undefined;

        let message = '<div><strong class="bright">' + i18n('Boxes.Infobox.UnknownConversation') + '</strong></div>';
        return {
            class: 'message',
            type: i18n('Boxes.Infobox.FilterMessage'),
            msg: message
        };
    },


    /**
     * Auf der GG-Map kämpft jemand
     *
     * @param d
     * @returns {{msg: string, type: string, class: string}}
     */
    GuildBattlegroundService_getProvinces: async (d) => {

        await ExistenceConfirmed('GuildFights.SortedColors')

        let data = d[0];

        let bP = GuildFights.MapData['battlegroundParticipants'],
            prov;

        if (!data['id'] || data['id'] === 0) {
            prov = ProvinceMap.ProvinceData()[0];
        } else {
            prov = ProvinceMap.ProvinceData().find(o => (o['id'] === data['id']));
        }

		// Hook for Discord events
		Discord.CheckForEvent('gbg', data['id']);

        if (data['lockedUntil'] !== undefined) {

            // keine Übernahme
            if (data['lockedUntil'] < Math.floor(MainParser.getCurrentDateTime() / 1000) + 14390) return undefined;

            let p = bP.find(o => (o['participantId'] === data['ownerId'])),
                colors = GuildFights.SortedColors.find(c => (c['id'] === data['ownerId']));

            let tc = colors['highlight'],
                ts = colors['shadow'];

            return {
                class: 'gbg',
                type: i18n('Boxes.General.Guild_Battlegrounds.short'),
                msg: HTML.i18nReplacer(
                    i18n('Boxes.Infobox.Messages.GildFightOccupied'), {
                    provinceName: prov['name'],
                    attackerColor: tc,
                    attackerShadow: ts,
                    attackerName: p['clan']['name'],
                    untilOccupied: moment.unix(data['lockedUntil']).format('HH:mm:ss')
                }),
                img: 'gbg-lock'
            };
        }

        // kein aktiver Kampf
        if (!data['conquestProgress'][0]) return undefined;

        // Es wird gerade gekämpft
        let color = GuildFights.SortedColors.find(c => (c['id'] === data['ownerId'])), t = '', image;

        for (let i in data['conquestProgress']) {
            if (!data['conquestProgress'].hasOwnProperty(i)) {
                break;
            }

            let d = data['conquestProgress'][i],
                p = bP.find(o => (o['participantId'] === d['participantId'])),
                colors = GuildFights.SortedColors.find(c => (c['id'] === d['participantId']));

            // es gibt mehrere Gilden in einer Provinz, aber eine kämpft gar nicht, überspringen
            if (Info.GildPoints[data['id']] !== undefined &&
                Info.GildPoints[data['id']][d['participantId']] !== undefined &&
                Info.GildPoints[data['id']][d['participantId']] === d['progress']) {

                continue;
            }

            let provLabel = Infoboard.GbgProvShortNameFl ? prov['short'] : prov['name'];

            if (color) {
                let tc = colors['highlight'], sc = color['highlight'],
                    ts = colors['shadow'], ss = color['shadow'];

                t += '<span style="color:' + tc + ';text-shadow: 0 1px 1px ' + ts + '">' + p['clan']['name'] + '</span>'
                  + ' ⚔ <span style="color:' + sc + ';text-shadow: 0 1px 1px ' + ss + '">' + provLabel + '</span>'
                  + ' (<strong>' + d['progress'] + '</strong>/<strong>' + d['maxProgress'] + '</strong>)<br>';
            }
            else {
                let tc = colors['highlight'],
                    ts = colors['shadow'];

                t += '<span style="color:' + tc + ';text-shadow: 0 1px 1px ' + ts + '">' + p['clan']['name'] + '</span>'
                  + ' ⚔ ' + provLabel + ' (<strong>' + d['progress'] + '</strong>/<strong>' + d['maxProgress'] + '</strong>)<br>';

            }

            if (image) {
                image = 'gbg-undefined';
            }
            else {
                image = 'gbg-' + colors['cid'];
            }

            if (Info.GildPoints[data['id']] === undefined) {
                Info.GildPoints[data['id']] = {};
            }

            // mitschreiben um keine Punkte doppelt auszugeben
            Info.GildPoints[data['id']][d['participantId']] = d['progress'];
        }

        return {
            class: 'gbg',
            type: i18n('Boxes.General.Guild_Battlegrounds.short'),
            msg: t,
            img: image
        };
    },


    /**
     * LG wurde gelevelt
     *
     * @param d
     * @returns {{class: 'level', msg: string, type: string}}
     */
    OtherPlayerService_newEventgreat_building_contribution: (d) => {

        let newFP=-1;
        if (d['rank'] >= 6) {
            newFP = 0
        }
        else {
            let Entity = Object.values(MainParser.CityEntities).find(obj => (obj['name'] === d['great_building_name']));
                EntityID = Entity['id'],
                EraName = EraName = GreatBuildings.GetEraName(EntityID),
                Era = Technologies.Eras[EraName],
                P1 = GreatBuildings.Rewards[Era][d['level']-1],
                FPRewards = GreatBuildings.GetMaezen(P1, MainParser.ArkBonus);

                newFP = FPRewards[d['rank'] - 1];
        }

        let PlayerLink = MainParser.GetPlayerLink(d['other_player']['player_id'], d['other_player']['name']);

        return {
            class: 'level',
            type: 'Level-Up',
            msg: HTML.i18nReplacer(
                i18n('Boxes.Infobox.Messages.LevelUp'), {
                    player: PlayerLink,
                    building: d['great_building_name'],
                    level: d['level'],
                    rank: d['rank'],
                    fps: newFP !== -1 ? newFP : '???'
                }
            )
        };
    },


    /**
     * Handel wurde angenommen
     *
     * @param d
     * @returns {{class: 'trade', msg: string, type: string}}
     */
    OtherPlayerService_newEventtrade_accepted: (d) => {
        let PlayerLink = MainParser.GetPlayerLink(d['other_player']['player_id'], d['other_player']['name']);

        return {
            class: 'trade',
            type: i18n('Boxes.Infobox.FilterTrade'),
            msg: HTML.i18nReplacer(
                i18n('Boxes.Infobox.Messages.Trade'), {
                'player': PlayerLink,
                'offer': GoodsData[d['offer']['good_id']]['name'],
                'offerValue': d['offer']['value'],
                'need': GoodsData[d['need']['good_id']]['name'],
                'needValue': d['need']['value']
            }
            )
        }
    },


    /**
     * Ein Gildenmitglied hat in der GEX gekämpft
     *
     * @param d
     * @returns {boolean|{msg: *, type: string, class: string}}
     */
    GuildExpeditionService_receiveContributionNotification: (d) => {

        // "mich" nicht anzeigen
        if (d['player']['player_id'] === ExtPlayerID) {
            return false;
        }

        let PlayerLink = MainParser.GetPlayerLink(d['player']['player_id'], d['player']['name']);

        return {
            class: 'gex',
            type: 'GEX',
            msg: HTML.i18nReplacer(
                i18n('Boxes.Infobox.Messages.GEX'), {
                'player': PlayerLink,
                'points': HTML.Format(d['expeditionPoints'])
            }
            )
        };
    },
};
