
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

FoEproxy.addHandler('AnnouncementsService', 'fetchAllAnnouncements', (data, postData) => {
    //on startUp
    let first = false;
    if ($('#betterMusic1').length === 0) {
        
        let newSound = document.createElement("audio");
        newSound.id = "betterMusic1";
        newSound.volume = 0;
        newSound.loop = true;
        newSound.onloadedmetadata = function () {betterMusic.setEvent(id="betterMusic1")}
        $('#game_body').append(newSound);
        betterMusic.Ids.push(newSound.id);
        
        let newSound2 = document.createElement("audio");
        newSound2.id = "betterMusic2";
        newSound2.volume = 0;
        newSound2.loop = true;
        newSound2.onloadedmetadata = function () {betterMusic.setEvent(id="betterMusic2")}
        $('#game_body').append(newSound2);
        betterMusic.Ids.push(newSound2.id);
        
        let newSound3 = document.createElement("audio");
        newSound3.id = "betterMusic3";
        newSound3.volume = 0;
        newSound3.loop = true;
        newSound3.onloadedmetadata = function () {betterMusic.setEvent(id="betterMusic3")}
        $('#game_body').append(newSound3);
        betterMusic.Ids.push(newSound3.id);
        
        betterMusic.loadSettings();
        
        betterMusic.playStatus = betterMusic.Settings.PlayOnStart;
        if (!betterMusic.playStatus) betterMusic.pause();
        
        betterMusic.buildlists();
        first = true;

        
    }
    
    if (!first) betterMusic.setScene("main");

});

FoEproxy.addHandler('CampaignService', 'start', (data, postData) => {
       
    betterMusic.setScene("map");
    
});

FoEproxy.addHandler('CityMapService', 'getCityMap', (data, postData) => {
    
    if (!data.responseData?.gridId) return;
    
    switch (data.responseData.gridId) {
        case "cultural_outpost":
            betterMusic.setScene("settlement");
            break;
        case "era_outpost":
            betterMusic.setScene("colony");
            break;
    }
   
});

FoEproxy.addHandler('CityMapService', 'getEntities', (data, postData) => {

    betterMusic.setScene("main");   

});

FoEproxy.addHandler('GuildBattlegroundService', 'getBattleground', (data, postData) => {
       
    betterMusic.setScene("gbg");
    
});

FoEproxy.addHandler('GuildExpeditionService', 'getOverview', (data, postData) => {
       
    betterMusic.setScene("ge");
    
});
FoEproxy.addHandler('BattlefieldService', 'startByBattleType', (data, postData) => {
    if (!data.responseData.map) return;
    betterMusic.setScene("battle");
    
});

FoEproxy.addHandler('PVPArenaService', 'getOverview', (data, postData) => {
       
    if (betterMusic.Settings.Pvp) betterMusic.setScene("foe_music_pvp_arena");
    
});

FoEproxy.addHandler('GrandPrizeService', 'getGrandPrizes', (data, postData) => {

    Eventname = data.responseData[0].context;
    
    if (!betterMusic.Settings.Events) return;
    
    for (t in betterMusic.PossibleTracks) {
        if (betterMusic.PossibleTracks[t].Event != Eventname) continue;
        return betterMusic.setScene(t);
    };
    
});
FoEproxy.addHandler('EventPassService', 'getPreview', (data, postData) => {

    Eventname = data.responseData?.teaserPrizes?.context;
    
    if (!betterMusic.Settings.Events) return;
    
    for (t in betterMusic.PossibleTracks) {
        if (betterMusic.PossibleTracks[t].Event != Eventname) continue;
        return betterMusic.setScene(t);
    };
    
});

FoEproxy.addHandler('FriendsTavernService', 'getConfig', (data, postData) => {
       
    if (betterMusic.Settings.Tavern) betterMusic.setScene("foe_music_tavern");
    
});

$('#game_body').click(function () {
    if (!betterMusic.first || $('#betterMusic1').length === 0) return;
    betterMusic.first = false;
    betterMusic.TrackSelector();
})
$('#game_body').contextmenu(function () {
    if (!betterMusic.first || $('#betterMusic1').length === 0) return;
    betterMusic.first = false;
    betterMusic.TrackSelector();
})
$('#game_body').keydown(function () {
    if (!betterMusic.first || $('#betterMusic1').length === 0) return;
    betterMusic.first = false;
    betterMusic.TrackSelector();
})


let betterMusic = {

    first: true,
    NextEvent: null,
    Ids: [],
    currentId: "",
    nextId: "",
    currentTitle: "",
    currentScene:"main",
    Settings: {
        Volume: 1,
        TransitionTime: 5000,
        Finish: false,
        Tavern: true,
        Events: true,
        Pvp: true,
        PlayOnStart: false,
        MainCity: 2,
        Colony: 2,
        IgnoreSettlement: false,
        Scenes: {
            "main": {
                "FoE_CityTrack_Vs2": true,
                "foe_music_hma_to_col_1_vs2": true,
                "foe_music_ind_to_pro_1_vs1": true,
                "foe_music_tmr_to_fut": true,
                "foe_music_asteroid_belt_city": true,
                "foe_music_jupiter_moon_city": true,
                "foe_music_tavern": true,
                "foe_music_stpatricks_v2": true,
                "foe_music_anniversary": true,
                "foe_music_history":true
            },
            "settlement": {
                "foe_music_expedition": true,
                "foe_music_archeology": true,
                "foe_music_summer": true,
                "foe_music_vikings": true,
                "foe_music_japanese": true,
                "foe_music_egyptians": true,
                "foe_music_aztecs": true,
                "foe_music_mughals": true,
                "foe_music_polynesia":true
            },
            "colony": {
                "foe_music_mars": true,
                "foe_music_asteroid_belt": true,
                "foe_music_venus": true,
                "foe_music_jupiter_moon": true
            },
            "ge": {
                "foe_music_expedition": true,
                "foe_music_wildlife": true,
                "foe_music_archeology": true,
                "foe_music_aztecs": true,
                "foe_music_mughals": true,
                "foe_music_polynesia":true
            },
            "gbg": {
                "foe_music_expedition": true,
                "foe_music_battlegrounds": true,
                "foe_music_pvp_arena": true,
                "FoE_BattleTheme_Vs1": true,
                "foe_music_polynesia":true
            },
            "battle": {
                "foe_music_battlegrounds": true,
                "foe_music_pvp_arena": true,
                "FoE_BattleTheme_Vs1": true,
                "foe_music_egyptians": true
            },
            "map": {
                "FoE_CityTrack_Vs2": true,
                "foe_music_hma_to_col_1_vs2": true,
                "foe_music_ind_to_pro_1_vs1": true,
                "foe_music_tmr_to_fut": true,
                "foe_music_mars": true,
                "foe_music_asteroid_belt_city": true,
                "foe_music_asteroid_belt": true,
                "foe_music_venus": true,
                "foe_music_jupiter_moon_city": true,
                "foe_music_jupiter_moon": true,
                "foe_music_tavern": true,
                "foe_music_archeology": true,
                "foe_music_summer": true
            }
        }
    },
    playStatus: false,
    Scenes: {
        "main": {Name: i18n('Boxes.BetterMusic.Main'), TitleList: []},
        "settlement":{Name: i18n('Boxes.BetterMusic.Settlement'), TitleList: []},
        "colony":{Name: i18n('Boxes.BetterMusic.Colony'), TitleList: []},
        "ge":{Name: i18n('Boxes.BetterMusic.GE'), TitleList: []},
        "gbg":{Name: i18n('Boxes.BetterMusic.GBG'), TitleList: []},
        "battle":{Name: i18n('Boxes.BetterMusic.Battle'), TitleList: []},
        "map":{Name: i18n('Boxes.BetterMusic.Map'), TitleList: []},
    },
    PossibleTracks: {
        "FoE_CityTrack_Vs2": {Volume:1, Name:"Stone Age - Early Middle Ages", Age:1, Agelimit: 4},
        "foe_music_hma_to_col_1_vs2": {Volume:1, Name:"High middle Ages - Colonial Age", Age:5, Agelimit: 7},
        "foe_music_ind_to_pro_1_vs1": {Volume:1, Name:"Industrial Age - Contemporary Era", Age:8, Agelimit: 12},
        "foe_music_tmr_to_fut": {Volume:1, Name:"Tomorrow Era - Space Age Mars", Age:13, Agelimit: 18},
        "foe_music_future_2_vs1": {Volume:1, Name:"Future 2", Age:14, Agelimit: 14},
        "foe_music_mars": {Volume:1, Name:"Space Age Mars (Colony)", Age:18, Agelimit: 18, Outpost: true},
        "foe_music_asteroid_belt_city": {Volume:1, Name:"Space Age Asteroid Belt - Space Age Venus", Age:19, Agelimit: 20},
        "foe_music_asteroid_belt": {Volume:1, Name:"Space Age Asteroid Belt (Colony)", Age:19, Agelimit: 19, Outpost: true},
        "foe_music_venus": {Volume:1, Name:"Space Age Venus (Colony)", Age:20, Agelimit: 20, Outpost: true},
        "foe_music_jupiter_moon_city": {Volume:1, Name:"Space Age Jupiter Moon", Age:21, Agelimit: 21},
        "foe_music_jupiter_moon": {Volume:1, Name:"Space Age Jupiter Moon (Colony)", Age:21, Agelimit: 22, Outpost: true},
        "foe_music_titan": {Volume:1, Name:"Space Age Titan", Age:22, Agelimit: 22},
        "foe_music_space_hub": {Volume:1, Name:"Space Age Space Hub", Age:23, Agelimit: 23},
        "foe_music_tavern": {Volume:.7, Name:"Tavern"},
        "foe_music_expedition": {Volume:.7, Name:"Guild Expedition"},
        "foe_music_battlegrounds": {Volume:.7, Name:"Guild Battlegrounds"},
        "foe_music_pvp_arena": {Volume:.6, Name:"PvP Arena"},
        "FoE_BattleTheme_Vs1": {Volume:.7, Name:"Battle Theme"},
        "foe_music_stpatricks_v2": {Volume:.6, Name:"St Patricks Day Event", Event:"st_patricks_event"},
        "age23_background_music": {Volume:.6, Name:"Anniversary Event", Event:"anniversary_event"},
        "foe_music_anniversary": {Volume:.5, Name:"Ages Event", Event:"forge_ages_event"},
        "foe_music_wildlife": {Volume:.6, Name:"Wildlife Event", Event:"wildlife_event"},
        "foe_music_archeology": {Volume:.6, Name:"Archaeology  Event", Event:"archeology_event"},
        "foe_music_hero": {Volume:.6, Name:"Fellowship Event 22", Event:"hero_event"},
        "cup23_background_music": {Volume:.6, Name:"Soccer Event", Event:"soccer_event"},
        "foe_music_fellowship": {Volume:.6, Name:"Fellowship Event 23", Event:"fellowship_event"},
        "foe_music_history": {Volume:.6, Name:"History Event", Event:"history_event"},
        "foe_music_care": {Volume:.6, Name:"Care Event", Event:"care_event"},
        "foe_music_summer": {Volume:.7, Name:"Summer Event", Event:"summer_event"},
        "foe_music_fall": {Volume:.7, Name:"Fall Event", Event:"fall_event"},
        "foe_music_halloween": {Volume:.6, Name:"Halloween Event", Event:"halloween_event"},
        "foe_music_winter": {Volume:.6, Name:"Winter Event", Event:"winter_event"},
        "foe_music_vikings": {Volume:1, Name:"Viking Settlement", Settlement:"vikings"},
        "foe_music_japanese": {Volume:1, Name:"Japanese Settlement", Settlement:"japanese"},
        "foe_music_egyptians": {Volume:1, Name:"Egypt Settlement", Settlement:"egyptians"},
        "foe_music_aztecs": {Volume:1, Name:"Aztec Settlement", Settlement:"aztecs"},
        "foe_music_mughals": {Volume:1, Name:"Mughal Settlement", Settlement:"mughals"},
        "foe_music_polynesia": {Volume:1, Name:"Polynesia Settlement", Settlement:"polynesia"},
    },

    
    /**
     * Shows a box for testing sound playback
     *
     * @constructor
     */
    ShowDialog: () => {

                
        let htmltext = `<div class="flex">`;
        htmltext += `<div id="musicSettingsGeneral" class="musicSettings"><h1>${i18n('Boxes.BetterMusic.GeneralSettings')}</h1>`;
        htmltext += `<label for="musicSettingsVolume">${i18n('Boxes.BetterMusic.Volume')} <input id="musicSettingsVolume" type="range" min="0" max="1" step ="0.05" value="${betterMusic.Settings.Volume}" oninput="betterMusic.newVolume(Number(this.value))"></label> <br>`;
        htmltext += `<input id="musicSettingsPlayOnClose" type="checkbox" ${betterMusic.Settings.PlayOnStart ? 'checked="checked"' : ''}" oninput="betterMusic.Settings.PlayOnStart = this.checked"><label for="musicSettingsPlayOnClose">${i18n('Boxes.BetterMusic.Auto')}</label></div>`;
        
        htmltext += `<div id="musicSettingsTitle" class="musicSettings"><h1>${i18n('Boxes.BetterMusic.TitleSettings')}</h1>`;
        htmltext += `<label for="musicSettingsTransitionTime">${i18n('Boxes.BetterMusic.Transition')} <input id="musicSettingsTransitionTime" type="range" min="0" max="5000" step ="500" value="${betterMusic.Settings.TransitionTime}" oninput="betterMusic.Settings.TransitionTime = Number(this.value)"></label><br>`;
        htmltext += `<input id="musicSettingsFinish" type="checkbox" ${betterMusic.Settings.Finish ? 'checked="checked"' : ''}" oninput="betterMusic.Settings.Finish = this.checked"><label for="musicSettingsFinish">${i18n('Boxes.BetterMusic.Finish')}</label></div>`;
        htmltext += `</div>`;

        htmltext += `<div id="musicSettingsScenes" class="musicSettings"><h1 class="text-center">${i18n('Boxes.BetterMusic.SceneSettings')}</h1>`
        htmltext += `<div class="flex">`;
        htmltext += `<div class="text-right">`;
        htmltext += `<label for="musicSettingsMainCity">${i18n('Boxes.BetterMusic.InCity')} </label><select id="musicSettingsMainCity" type="select" oninput="betterMusic.Settings.MainCity = this.selectedIndex"><option value="0" ${betterMusic.Settings.MainCity === 0 ? 'selected="selected"': ''}>${i18n('Boxes.BetterMusic.IgnoreEra')} </option><option value="1" ${betterMusic.Settings.MainCity === 1 ? 'selected="selected"': ''}>${i18n('Boxes.BetterMusic.ToEra')} </option><option value="2" ${betterMusic.Settings.MainCity === 2 ? 'selected="selected"': ''}>${i18n('Boxes.BetterMusic.CurrentEra')} </option></select><br>`;
        htmltext += `<label for="musicSettingsColony">${i18n('Boxes.BetterMusic.InColony')} </label>`;
        htmltext += `<select id="musicSettingsColony" type="select" oninput="betterMusic.Settings.Colony = this.selectedIndex"><option value="0" ${betterMusic.Settings.Colony === 0 ? 'selected="selected"': ''}>${i18n('Boxes.BetterMusic.IgnoreEra')}</option><option value="1" ${betterMusic.Settings.Colony === 1 ? 'selected="selected"': ''}>${i18n('Boxes.BetterMusic.ToEra')}</option><option value="2" ${betterMusic.Settings.Colony === 2 ? 'selected="selected"': ''}>${i18n('Boxes.BetterMusic.CurrentEra')}</option></select>`;
        htmltext += `</div>`;
        htmltext += `<div>`;
        htmltext += `<input id="musicSettingsTavern" type="checkbox" ${betterMusic.Settings.Tavern ? 'checked="checked"' : ''}" oninput="betterMusic.Settings.Tavern = this.checked"><label for="musicSettingsTavern">${i18n('Boxes.BetterMusic.TavernT')}</label>`;
        htmltext += `<input id="musicSettingsPvp" type="checkbox" ${betterMusic.Settings.Pvp ? 'checked="checked"' : ''}" oninput="betterMusic.Settings.Pvp = this.checked"><label for="musicSettingsPvp">${i18n('Boxes.BetterMusic.PvPT')}</label>`;
        htmltext += `<input id="musicSettingsIgnoreSettlement" type="checkbox" ${betterMusic.Settings.IgnoreSettlement ? 'checked="checked"' : ''}" oninput="betterMusic.Settings.IgnoreSettlement = this.checked"><label for="musicSettingsIgnoreSettlement">${i18n('Boxes.BetterMusic.IgnoreSettlement')}</label>`;
        htmltext += `<input id="musicSettingsEvents" type="checkbox" ${betterMusic.Settings.Events ? 'checked="checked"' : ''}" oninput="betterMusic.Settings.Events = this.checked"><label for="musicSettingsEvents">${i18n('Boxes.BetterMusic.EventT')}</label>`;
        htmltext += `</div>`;
        htmltext += `</div>`;

        htmltext += `<table id="musicSettingsScenesX" class="foe-table"><caption style="font-weight: bold; font-size: initial; padding-top: 10px;">${i18n('Boxes.BetterMusic.Scenes')}</caption><thead class="sticky">><tr><th>${i18n('Boxes.BetterMusic.TitleName')}</th>`;
        
        for (let scene in betterMusic.Scenes) {
            htmltext += `<th><span>${betterMusic.Scenes[scene].Name}</span></th>`;
        }
        htmltext += `</tr></thead>`;
        
        for (let title in betterMusic.PossibleTracks) {
            htmltext += `<tr><td class="betterMusicTitle" onclick="betterMusic.switchTrack('${title}', 0)" onmouseout="betterMusic.pause(event)">${betterMusic.PossibleTracks[title].Name}</td>`;
            for (let scene in betterMusic.Scenes) {
                htmltext += `<td class="betterMusicEntry ${betterMusic.testSettings(scene, title) ? 'betterMusicSelected' :'betterMusicNotSelected'}" data-scene="${scene}" data-title="${title}" onclick="betterMusic.setSceneTitle(event)"></td>`;
            }
            htmltext += `</tr>`;
                
        }
        
        htmltext += `</table>`;
        
        if ($('#betterMusicDialog').length === 0) {
            HTML.AddCssFile('bettermusic');
    
            HTML.Box({
                id: 'betterMusicDialog',
                title: i18n('Boxes.BetterMusic.Title'),
                auto_close: true,
                dragdrop: true,
                minimize: true,
                resize: true,                
            });

            $('#betterMusicDialogclose').on('click', function() {
                betterMusic.close();
                });

            betterMusic.pause();
        }
    
        $('#betterMusicDialogBody').html(htmltext);
    },

    
    playRandom: (titles = Object.keys(betterMusic.PossibleTracks)) => {
        
        if ((titles?.length|0) == 0 ) return;
        
        let title = titles[Math.floor(titles.length * Math.random())];
        
        betterMusic.switchTrack(title);
        
        
    },


    switchTrack: (newTrack, transition = betterMusic.Settings.TransitionTime) => {
        let $SoundC = $(`#${betterMusic.Ids.shift()}`);
        let $SoundN = $(`#${betterMusic.Ids[0]}`);
        let path = srcLinks.get(betterMusic.PossibleTracks[newTrack].Path || '/sounds/shared/theme/'+ newTrack +'.ogg', true)
        if ($SoundC[0].src == path) {
        
            betterMusic.Ids.unshift($SoundC[0].id);
            betterMusic.setEvent($SoundC[0].id, 0);
        
        } else {
            
            let elem = $(`#${betterMusic.Ids[1]}`)[0];
            if (!(!elem)) elem.pause();
            
            betterMusic.Ids.push($SoundC[0].id);
            $SoundC.animate({volume: 0}, transition);
            
            $SoundN[0].volume = 0;
            $SoundN[0].src = path;
            
            clearTimeout(betterMusic.nextEvent);
            var playPromise = $SoundN[0].play();

            if (playPromise !== undefined) {
                playPromise.then(_ => {
                    betterMusic.playStatus = true;
                    betterMusic.currentTitle = newTrack;
                    $SoundN.animate({volume: 1*betterMusic.PossibleTracks[newTrack].Volume*betterMusic.Settings.Volume}, transition);
                })
                .catch(error => {
                    if (error.toString() == "NotSupportedError: Failed to load because no supported source was found.") {
                        console.log(`↑ ↑ ↑ ↑ ${newTrack} banned from playlist ↑ ↑ ↑ ↑ ↑`);
                        if (betterMusic.PossibleTracks[newTrack]) {
                            betterMusic.PossibleTracks[newTrack].banned = true;
                            betterMusic.buildlist(betterMusic.currentScene);
                        }
                    }
                    betterMusic.TrackSelector();
                });
            }

        }
        return;
    },

    pause: (e) => {
        clearTimeout(betterMusic.nextEvent);
        betterMusic.playStatus = false;
        $('#musicControl-Btn').addClass('musicmuted');
        
        if (!(e?.relatedTarget?.classList.contains('betterMusicTitle'))) {
            let elem= $(`#${betterMusic.Ids[0]}`)[0];
            if (!elem) return;
            elem.pause();
            elem.src = "";
        }
    },

    TrackSelector: () => {
        if (!betterMusic.playStatus) return;
        $('#musicControl-Btn').removeClass('musicmuted');
        
        betterMusic.playRandom(betterMusic.Scenes[betterMusic.currentScene].TitleList);    
    },

    setEvent: (id, transition = betterMusic.Settings.TransitionTime) => {
        if (!betterMusic.playStatus) return;
        let $SoundC = $(`#${id}`);
        let timeout = Math.floor($SoundC[0].duration * 1000 - transition);
        if (timeout != 'NaN') {
            clearTimeout(betterMusic.nextEvent);
            betterMusic.nextEvent = setTimeout(function() {betterMusic.TrackSelector()}, timeout);
        }
    },

    setScene: (scene) => {
        
        if (betterMusic.currentTitle == scene) return
        
        if (!betterMusic.Scenes[scene]) {
            if (betterMusic.Settings.Finish) return;
            if (!betterMusic.playStatus) return;
            betterMusic.switchTrack(scene);
            return
        }

        betterMusic.buildlist(scene);
        if (betterMusic.currentScene === scene) return;

        betterMusic.currentScene = scene;
        if (betterMusic.Scenes[scene].TitleList.includes(betterMusic.currentTitle)) return;
        
        if (betterMusic.Settings.Finish) return;
        betterMusic.TrackSelector();
    },

    close: () => {
        betterMusic.saveSettings();
        betterMusic.playStatus = betterMusic.Settings.PlayOnStart;
        betterMusic.TrackSelector()
    },

    CloseBox: () => {
        HTML.CloseOpenBox('betterMusicDialog');
        betterMusic.close();
    },

    newVolume: (value) => {
        betterMusic.Settings.Volume = value;
        $(`#${betterMusic.Ids[0]}`)[0].volume = value;
        
    },
    
    loadSettings: ()=> {

		tempSettings = JSON.parse(localStorage.getItem('betterMusicSettings') || '{}');
        if (tempSettings.Scenes) {
            for (let i of Object.keys(tempSettings.Scenes)) {
                if (!betterMusic.Settings.Scenes[i]) delete tempSettings.Scenes[i];
            }
        }
        betterMusic.Settings = betterMusic.update(betterMusic.Settings,tempSettings);
    },
    
    saveSettings: ()=> {
        localStorage.setItem('betterMusicSettings', JSON.stringify(betterMusic.Settings));
        betterMusic.buildlists();
    },
    
    update (obj/*, …*/) {
        for (var i=1; i<arguments.length; i++) {
            for (var prop in arguments[i]) {
                var val = arguments[i][prop];
                if (typeof val == "object") // this also applies to arrays or null!
                    betterMusic.update(obj[prop], val);
                else
                    obj[prop] = val;
            }
        }
        return obj;
    },

    setSceneTitle: (e) => {
        e.target.classList.toggle('betterMusicSelected');
        e.target.classList.toggle('betterMusicNotSelected');
        betterMusic.Settings.Scenes[e.target.dataset.scene][e.target.dataset.title] = e.target.classList.contains('betterMusicSelected');
    },

    testSettings: (scene, title) => {
        if (!betterMusic.Settings.Scenes) return false;
        if (!betterMusic.Settings.Scenes[scene]) return false;
        return betterMusic.Settings.Scenes[scene][title] | false;
    },

    buildlists: () => {
        for (scene in betterMusic.Scenes) {
            betterMusic.buildlist(scene);
        }
    },

    buildlist: (scene) => {
        if (!betterMusic.Scenes[scene]) return;
        betterMusic.Scenes[scene].TitleList = [];
        for (title in betterMusic.Settings.Scenes[scene]) {
            if (betterMusic.PossibleTracks[title]?.banned) continue;
            if (scene==="settlement" && (betterMusic.PossibleTracks[title].Settlement != Outposts?.OutpostData?.content) && (betterMusic.PossibleTracks[title].Settlement != undefined) && (!betterMusic.IgnoreSettlement)) continue;
            if (scene==="colony" && (
                ((betterMusic.PossibleTracks[title].Agelimit < CurrentEraID || betterMusic.PossibleTracks[title].Age > CurrentEraID ) && betterMusic.Settings.Colony == 2) ||
                (betterMusic.PossibleTracks[title].Age > CurrentEraID && betterMusic.Settings.Colony == 1)
                )) continue;
            if (scene==="main" && (
                (betterMusic.Settings.MainCity == 2 && (betterMusic.PossibleTracks[title].Agelimit < CurrentEraID || betterMusic.PossibleTracks[title].Age > CurrentEraID )) ||
                (betterMusic.Settings.MainCity == 1 && betterMusic.PossibleTracks[title].Age > CurrentEraID)
                )) continue;
            if (betterMusic.Settings.Scenes[scene][title]) betterMusic.Scenes[scene].TitleList.push(title);
        }
    }

};


