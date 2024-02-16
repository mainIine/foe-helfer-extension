/*
 * *************************************************************************************
 *
 * Copyright (C) 2023 FoE-Helper team - All Rights Reserved
 * You may use, distribute and modify this code under the
 * terms of the AGPL license.
 *
 * See file LICENSE.md or go to
 * https://github.com/mainIine/foe-helfer-extension/blob/master/LICENSE.md
 * for full license details.
 *
 * *************************************************************************************
 */

let srcLinks = {
    FileList: null,
    raw:null,

    init: async () => {
        //clear storage - can be removed down the line
        localStorage.removeItem('PortraitsFileList')

        // wait for ForgeHX is loaded, then read the full script url
        const isElementLoaded = async name => {
            while ( document.querySelector('script[src*="' + name + '"]') === null) {
                await new Promise( resolve => requestAnimationFrame(resolve))
            }
            return document.querySelector('script[src*="' + name + '"]');
        };

        const script = await isElementLoaded('ForgeHX')
        
        let xhr = new XMLHttpRequest();
        xhr.open("GET", script.src)
        xhr.onreadystatechange = function () {
            if(xhr.readyState === XMLHttpRequest.DONE && xhr.status === 200) {
                srcLinks.raw = xhr.responseText;
                srcLinks.readHX();
            }
        };
        xhr.send();
    },

    readHX: () => {
        let HXscript = srcLinks.raw+"";
        let startString = "baseUrl,";
        let start = HXscript.indexOf(startString) + startString.length;
        HXscript = HXscript.substring(start);

        let end = HXscript.indexOf("}")+1;
        HXscript = HXscript.substring(0, end);

        try {
            srcLinks.FileList = JSON.parse(HXscript);

            // ExtPlayerId is not available on this point
            let c = localStorage.getItem('current_player_id');

            // if mainline self
            if(c !== null && parseInt(c) === 103416) {

                if(sessionStorage.getItem('sendListToday') === null) {
                    MainParser.sendExtMessage({
                        type: 'send2Api',
                        url: `${ApiURL}BuildingList/?world=${ExtWorld}&v=${extVersion}`,
                        data: JSON.stringify(srcLinks.FileList)
                    });

                    sessionStorage.setItem('sendListToday', 'true');
                }
            }
        } 
        catch {
            console.log("parsing of ForgeHX failed");
        }
    },

    get: (filename, full = false, noerror = false) => {
        let CS = undefined;
        let filenameP = filename.split(".");
        let CSfilename = filenameP[0]
        
        if (!srcLinks.FileList) {
            if (!noerror) console.log ("Source file list not loaded!");
        }
        else {
            CS = srcLinks.FileList[filename];
            if (!CS) {
                if (!noerror) console.log (`file "${filename}" not in List`);
            }
        }
        
        CSfilename += "-" + CS + "." + filenameP[1];
        
        if (full){
            return MainParser.InnoCDN + 'assets' + CSfilename;
        }
        return CSfilename;
    },


    GetPortrait: (id)=> {
        let file = MainParser.PlayerPortraits[id] || 'portrait_433';

        return srcLinks.get('/shared/avatars/' + file + '.jpg', true);
    },


    getReward:(icon) => {
        let url1 = srcLinks.get(`/shared/icons/reward_icons/reward_icon_${icon}.png`,true, true);
        let url2 = srcLinks.get(`/shared/icons/goods_large/${icon}.png`,true, true);
        
        if (url2.indexOf("undefined") > -1) {
            return url1;
        }

        return url2;
    },


    getQuest:(icon) => {
        let url1 = srcLinks.get(`/shared/icons/quest_icons/${icon}.png`,true, true);
        let url2 = srcLinks.get(`/shared/icons/${icon}.png`,true, true);
        
        if (url1.indexOf("undefined") > -1) {
            return url2;
        }

        return url1;
    }
}

srcLinks.init()