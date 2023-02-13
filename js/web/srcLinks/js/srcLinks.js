/*
 * **************************************************************************************
 * Copyright (C) 2022 FoE-Helper team - All Rights Reserved
 * You may use, distribute and modify this code under the
 * terms of the AGPL license.
 *
 * See file LICENSE.md or go to
 * https://github.com/mainIine/foe-helfer-extension/blob/master/LICENSE.md
 * for full license details.
 *
 * **************************************************************************************
 */

let srcLinks= {
    FileList: JSON.parse(localStorage.getItem("PortraitsFileList")),
    init: () => {
        let x = document.querySelectorAll("script[src]");
        for (let i in x) {
            if (x[i] && x[i].src && x[i].src.indexOf("ForgeHX")>0) {
                srcLinks.getScriptContent(x[i]);
            }
        }
    },
    getScriptContent: (script) => {
        var xhr = new XMLHttpRequest();
        xhr.open("GET",script.src)
        xhr.onreadystatechange = function () {
        if(xhr.readyState === XMLHttpRequest.DONE && xhr.status === 200) {
            srcLinks.readHX(xhr.responseText);
        }
        };
        xhr.send();
    },
    readHX: (HXscript) => {
        let startString = "baseUrl,";
        let start = HXscript.indexOf(startString) + startString.length;
        HXscript = HXscript.substring(start)
        let end = HXscript.indexOf("}")+1;
        HXscript = HXscript.substring(0,end);
        try {
            srcLinks.FileList = JSON.parse(HXscript);
            let portraits={};
            for (let x in srcLinks.FileList) {
                if (x.indexOf("avatars/portrait")>-1) {
                    portraits[x] = srcLinks.FileList[x];
                }
            }
            if (Object.keys(portraits).length >0) localStorage.setItem("PortraitsFileList",JSON.stringify(portraits));
        } 
        catch {
            console.log("parsing of ForgeHX failed");
        }
    },
    get: (filename, full=false, noerror=false) => {
        if (!srcLinks.FileList) {
            if (!noerror) console.log ("Source file list not loaded!");
            return filename;
        }
        let CS = srcLinks.FileList[filename];
        if (!CS) {
            if (!noerror) console.log("file " + filename + " not in list!");
            return filename;
        }
        let CSfilename = filename.substring(0,filename.length-4) + "-" + CS + filename.substring(filename.length-4);
        if (full) return srcLinks.getFullPath(CSfilename);
        return CSfilename;
    },
    GetPortrait: (id)=> {
        let file=MainParser.PlayerPortraits[id] || 'portrait_433';
        return srcLinks.get('/shared/avatars/' + file + '.jpg', true);
    },
    getFullPath: (file) => {
        return MainParser.InnoCDN + 'assets' + file;
    },
    getReward:(icon) => {
        let url1 = srcLinks.get(`/shared/icons/reward_icons/reward_icon_${icon}.png`,true, true);
        let url2 = srcLinks.get(`/shared/icons/goods_large/${icon}.png`,true, true);
        if (url1.length > url2.length + 13) {
            return url1;
        }
        return url2;
    }

}

srcLinks.init()