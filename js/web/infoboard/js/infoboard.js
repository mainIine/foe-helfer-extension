/*
 * **************************************************************************************
 *
 * Dateiname:                 infoboard.js
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

// neues Postfach
FoEproxy.addHandler('ConversationService', 'getOverviewForCategory', (data, postData) => {
    MainParser.setConversations(data.responseData);
});

FoEproxy.addHandler('ConversationService', 'getCategory', (data, postData) => {
    MainParser.setConversations(data.responseData);
});

// altes Postfach
FoEproxy.addHandler('ConversationService', 'getEntities', (data, postData) => {
    MainParser.setConversations(data.responseData);
});

FoEproxy.addHandler('ConversationService', 'getTeasers', (data, postData) => {
    MainParser.setConversations(data.responseData);
});

FoEproxy.addHandler('ConversationService', 'getOverview', (data, postData) => {
    MainParser.setConversations(data.responseData);
});

// when a great building where the player has invested has been levelled
FoEproxy.addHandler('BlueprintService','newReward', (data, postData) => {

    if ( data && data['responseData'] && data['responseData'] ) {
        // save the number of returned FPs to show in the infoboard message
        Info.ReturnFPPoints = ( data['responseData']['strategy_point_amount'] ) ? data.responseData.strategy_point_amount : 0;

        // If the Info.OtherPlayerService_newEventgreat_building_contribution ran earlier than this
        // the ReturnFPPoints was 0 so no message was posted. Therefore recreate the message using
        // the stored data (and the correct value of Info.ReturnFPPoints) and post it
        if ( Info.ReturnFPMessageData ){
            let bd = Info.OtherPlayerService_newEventgreat_building_contribution( Info.ReturnFPMessageData );
            Info.ReturnFPMessageData = null;
            Infoboard.PostMessage(bd);
        }
    }

});

/**
 *
 * @type {{init: Infoboard.init, Show: InfoBoard.Show, InjectionLoaded: boolean, ResetBox: Infoboard.ResetBox, BoxContent: Infoboard.BoxContent, FilterInput: Infoboard.FilterInput, SoundFile: HTMLAudioElement, Box: Infoboard.Box, PlayInfoSound: null}}
 */
let Infoboard = {

    InjectionLoaded: false,
    PlayInfoSound: true,
    SoundFile: new Audio(extUrl + 'vendor/sounds/ping.mp3'),
    SavedFilter: ["auction", "gex", "gbg", "trade", "level", "msg"],
    DebugWebSocket: false,


    /**
     * Setzt einen ByPass auf den WebSocket und "hört" mit
     * */
    Init: () => {
        FoEproxy.addRawWsHandler(data => {
            Infoboard.HandleMessage('in', data);
        });
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

            HTML.Box({
                'id': 'BackgroundInfo',
                'title': i18n('Boxes.Infobox.Title'),
                'auto_close': true,
                'dragdrop': true,
                'resize': true,
                'minimize': true,
                'speaker': 'infoboxTone'
            });

            // CSS in den DOM prügeln
            HTML.AddCssFile('infoboard');

        } else {
            return HTML.CloseOpenBox('BackgroundInfo');
		}

        let div = $('#BackgroundInfo'),
            h = [];

        // Filter
        h.push('<div class="filter-row">');

        h.push('<div class="dropdown">');
        h.push('<input type="checkbox" class="dropdown-checkbox" id="checkbox-toggle"><label class="dropdown-label game-cursor" for="checkbox-toggle">' + i18n('Boxes.Infobox.Filter') + '</label><span class="arrow"></span>');

        h.push('<ul>');
        h.push('<li><label class="game-cursor"><input type="checkbox" data-type="auction" class="filter-msg game-cursor" ' + (Infoboard.SavedFilter.includes("auction") ? "checked" : "") + '> ' + i18n('Boxes.Infobox.FilterAuction') + '</label></li>');
        h.push('<li><label class="game-cursor"><input type="checkbox" data-type="gex" class="filter-msg game-cursor" ' + (Infoboard.SavedFilter.includes("gex") ? "checked" : "") + '> ' + i18n('Boxes.Infobox.FilterGex') + '</label></li>');
        h.push('<li><label class="game-cursor"><input type="checkbox" data-type="gbg" class="filter-msg game-cursor" ' + (Infoboard.SavedFilter.includes("gbg") ? "checked" : "") + '> ' + i18n('Boxes.Infobox.FilterGildFights') + '</label></li>');
        h.push('<li><label class="game-cursor"><input type="checkbox" data-type="trade" class="filter-msg game-cursor" ' + (Infoboard.SavedFilter.includes("trade") ? "checked" : "") + '> ' + i18n('Boxes.Infobox.FilterTrade') + '</label></li>');
        h.push('<li><label class="game-cursor"><input type="checkbox" data-type="level" class="filter-msg game-cursor" ' + (Infoboard.SavedFilter.includes("level") ? "checked" : "") + '> ' + i18n('Boxes.Infobox.FilterLevel') + '</label></li>');
        h.push('<li><label class="game-cursor"><input type="checkbox" data-type="msg" class="filter-msg game-cursor" ' + (Infoboard.SavedFilter.includes("msg") ? "checked" : "") + '> ' + i18n('Boxes.Infobox.FilterMessage') + '</label></li>');
        h.push('</ul>');
        h.push('</div>');

        h.push('<button class="btn btn-default btn-reset-box">' + i18n('Boxes.Infobox.ResetBox') + '</button>');

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

        $('#BackgroundInfo').on('click', '#infoboxTone', function() {

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
    HandleMessage: (dir, data) => {

        let Msg = data[0];

        if (!Msg || !Msg['requestClass']) {
            return;
        }

        let c = Msg['requestClass'],
            m = Msg['requestMethod'],
            t = Msg['responseData']['type'] || '',
            s = c + '_' + m + t;

        if (Infoboard.DebugWebSocket) {
            console.log(JSON.stringify(data))
        }

        // Gibt es eine Funktion dafür?
        if (!Info[s]) {
            return;
        }

        let bd = Info[s](Msg['responseData']);

        if (!bd) {
            return;
        }

        Infoboard.PostMessage(bd);
    },


    PostMessage: (bd) => {

        if ($('#BackgroundInfo').length > 0) {
            let status = $('input[data-type="' + bd['class'] + '"]').prop('checked'),
                msg = bd['msg'], img = bd['img'], type = bd['type'], tr = $('<tr />');

            // wenn nicht angezeigt werden soll, direkt verstecken
            if (!status && bd.class !== 'welcome') {
                tr.hide();
            }

            if (img) {
                tr.addClass(bd['img']);
            } else {
                tr.addClass(bd['class']);
            }

            tr.append(
                '<td></td>' +
                '<td>' + type + '<br><small><em>' + moment().format('HH:mm:ss') + '</em></small></td>' +
                '<td>' + msg + '</td>'
            );

            $('#BackgroundInfoTable tbody').prepend(tr);

            if (Infoboard.PlayInfoSound && status) {
                Infoboard.SoundFile.play();
            }
        }
    },


    /**
     * Filter für Message Type
     *
     */
    FilterInput: () => {
        $('#BackgroundInfo').on('change', '.filter-msg', function() {
            let active = [];

            $('.filter-msg').each(function() {
                if ($(this).is(':checked')) {
                    active.push($(this).data('type'));
                    if (!Infoboard.SavedFilter.includes($(this).data('type')))
                        Infoboard.SavedFilter.push($(this).data('type'));
                } else {
                    if (Infoboard.SavedFilter.includes($(this).data('type')))
                        Infoboard.SavedFilter.splice(Infoboard.SavedFilter.indexOf($(this).data('type')), 1);
                }
            });

            localStorage.setItem("infoboxSavedFilter", JSON.stringify(Infoboard.SavedFilter));

            $('#BackgroundInfoTable tbody tr').each(function() {
                let tr = $(this), type = tr.attr('class');

                if (active.some(e => type.startsWith(e)) || tr.hasClass('welcome')) {
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
        $('#BackgroundInfo').on('click', '.btn-reset-box', function() {
            $('#BackgroundInfoTable tbody').html('');
        });
    }
};


let Info = {

    /**
     * Cache zum "merken" der kampfenden Gilden
     */
    GildPoints: {},


    /**
     * Wenn ein LG gelevelt wurde, kommen die FPs einzeln zurück
     * und müssen gesammelt werden
     */
    ReturnFPPoints: -1,
    ReturnFPMessageData: null,

    /**
     * Jmd hat in einer Auktion mehr geboten
     *
     * @param d
     * @returns {{class: 'auction', msg: string, type: string}}
     */
    ItemAuctionService_updateBid: (d) => {
        return {
            class: 'auction',
            type: 'Auktion',
            msg: HTML.i18nReplacer(
                i18n('Boxes.Infobox.Messages.Auction'), {
                'player': d['player']['name'],
                'amount': HTML.Format(d['amount']),
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
        let header, message, image, chat = MainParser.Conversations.find(obj => obj.id === d['conversationId']);
        if (chat && chat['hidden']) return undefined;

        if (d['text'] !== '') {
            // normale Nachricht
            message = d['text'].replace(/(\r\n|\n|\r)/gm, '<br>');

        } else if (d['attachment']) {
            if (d['attachment']['type'] === 'great_building') {
                // legendäres Bauwerk
                message = HTML.i18nReplacer(
                    i18n('Boxes.Infobox.Messages.MsgBuilding'), {
                    'building': MainParser.CityEntities[d['attachment']['cityEntityId']]['name'],
                    'level': d['attachment']['level']
                });
            }
            else if (d['attachment']['type'] === 'trade_offer') {
                // Handelsangebot
                message = `<div class="offer"><span title="${GoodsData[d['attachment']['offeredResource']]['name']}" class="goods-sprite-50 ${d['attachment']['offeredResource']}"></span> <span>x<strong>${d['attachment']['offeredAmount']}</strong></span> <span class="sign">&#187</span> <span title="${GoodsData[d['attachment']['neededResource']]['name']}" class="goods-sprite-50 ${d['attachment']['neededResource']}"></span> <span>x<strong>${d['attachment']['neededAmount']}</strong></span></div>`;
            }
        }

        if (chat) {
            // passendes Bildchen wählen
            if (chat['important']) {
                image = 'msg-important';
            } else if (chat['favorite']) {
                image = 'msg-favorite';
            }

            if (d['sender'] && d['sender']['name']) {
                // normale Chatnachricht (bekannte ID)
                if (d['sender']['name'] === chat['title']) {
                    header = '<div><strong class="bright">' + chat['title'] + '</strong></div>';
                } else {
                    header = '<div><strong class="bright">' + chat['title'] + '</strong> - <em>' + d['sender']['name'] + '</em></div>';
                }
            } else {
                // Chatnachricht vom System (Betreten/Verlassen)
                header = '<div><strong class="bright">' + chat['title'] + '</strong></div>';
            }
        } else {
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
    GuildBattlegroundService_getProvinces: (d) => {

    	GildFights.PrepareColors();
        
        let data = d[0];

        let bP = GildFights.MapData['battlegroundParticipants'],
            prov;

        if (data['id'] === 0) {
            prov = GildFights.ProvinceNames[0]['provinces'][0];
        } else {
            prov = GildFights.ProvinceNames[0]['provinces'].find(o => (o['id'] === data['id']));
        }

        if (data['lockedUntil'] !== undefined) {

            // keine Übernahme
            if (data['lockedUntil'] < Math.floor(MainParser.getCurrentDateTime() / 1000) + 14390) return undefined;

            let p = bP.find(o => (o['participantId'] === data['ownerId'])),
                colors = GildFights.SortedColors.find(c => (c['id'] === data['ownerId']));

            let tc = colors['highlight'],
                ts = colors['shadow'];

            return {
                class: 'gbg',
                type: i18n('Boxes.Infobox.FilterGildFights'),
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
        let color = GildFights.SortedColors.find(c => (c['id'] === data['ownerId'])), t = '', image;
        for (let i in data['conquestProgress']) {
            if (!data['conquestProgress'].hasOwnProperty(i)) {
                break;
            }

            let d = data['conquestProgress'][i],
                p = bP.find(o => (o['participantId'] === d['participantId'])),
                colors = GildFights.SortedColors.find(c => (c['id'] === d['participantId']));

            // es gibt mehrere Gilden in einer Provinz, aber eine kämpft gar nicht, überspringen
            if (Info.GildPoints[data['id']] !== undefined &&
                Info.GildPoints[data['id']][d['participantId']] !== undefined &&
                Info.GildPoints[data['id']][d['participantId']] === d['progress']) {

                continue;
            }

            if (color) {
                let tc = colors['highlight'], sc = color['highlight'],
                    ts = colors['shadow'], ss = color['shadow'];
    
                t += '<span style="color:' + tc + ';text-shadow: 0 1px 1px ' + ts + '">' + p['clan']['name'] + '</span> ⚔️ <span style="color:' + sc + ';text-shadow: 0 1px 1px ' + ss + '">' + prov['name'] + '</span> (<strong>' + d['progress'] + '</strong>/<strong>' + d['maxProgress'] + '</strong>)<br>';    
            } else {
                let tc = colors['highlight'],
                    ts = colors['shadow'];

                t += '<span style="color:' + tc + ';text-shadow: 0 1px 1px ' + ts + '">' + p['clan']['name'] + '</span> ⚔️ ' + prov['name'] + ' (<strong>' + d['progress'] + '</strong>/<strong>' + d['maxProgress'] + '</strong>)<br>';    
            
            }
            if (image) {
                image = 'gbg-undefined';
            } else {
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
            type: i18n('Boxes.Infobox.FilterGildFights'),
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

        let newFP = Info.ReturnFPPoints;
        if ( d['rank'] >= 6 ){ newFP = 0; }

        let data = {
            class: 'level',
            type: 'Level-Up',
            msg: HTML.i18nReplacer(
                i18n('Boxes.Infobox.Messages.LevelUp'), {
                    player: d['other_player']['name'],
                    building: d['great_building_name'],
                    level: d['level'],
                    rank: d['rank'],
                    fps: newFP
                }
            )
        };

        // If the ReturnFPPoints is -1 the BlueprintService.newReward handler has not run yet
        // so store the data and post the message from that handler (using the stored data)
        // ... but only if the rank is 5 and higher (1-5), otherwise, there is no reward
        // (and BlueprintService.newReward is not triggered)
        if ( d['rank'] < 6 && Info.ReturnFPPoints == -1 ){
            Info.ReturnFPMessageData = d;
            return undefined;
        }

        // zurück setzen
        Info.ReturnFPPoints = -1;
        Info.ReturnFPMessageData = null;

        return data;
    },


    /**
     * Handel wurde angenommen
     *
     * @param d
     * @returns {{class: 'trade', msg: string, type: string}}
     */
    OtherPlayerService_newEventtrade_accepted: (d) => {
        return {
            class: 'trade',
            type: i18n('Boxes.Infobox.FilterTrade'),
            msg: HTML.i18nReplacer(
                i18n('Boxes.Infobox.Messages.Trade'), {
                    'player': d['other_player']['name'],
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

        return {
            class: 'gex',
            type: 'GEX',
            msg: HTML.i18nReplacer(
                i18n('Boxes.Infobox.Messages.GEX'), {
                    'player': d['player']['name'],
                    'points': HTML.Format(d['expeditionPoints'])
                }
            )
        };
    }
};
