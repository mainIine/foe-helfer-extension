/*
 * *************************************************************************************
 *
 * Copyright (C) 2026 FoE-Helper team - All Rights Reserved
 * You may use, distribute and modify this code under the
 * terms of the AGPL license.
 *
 * See file LICENSE.md or go to
 * https://github.com/mainIine/foe-helfer-extension/blob/master/LICENSE.md
 * for full license details.
 *
 * *************************************************************************************
 */

const FALLBACK_ICON = '/city/gui/citymap_icons/antiquedealer_flag';

let srcLinks = {
    FileList: null,
    raw: null,
    GoodsSpriteFile: '/shared/icons/goods_large/fine_goods_large_0',


    /**
     * Waits for the ForgeHX script tag, downloads its source and triggers the file list parsing
     * @returns {Promise<void>}
     */
    init: async () => {
        const isElementLoaded = async (name) => {
            while (document.querySelector(`script[src*="${name}"]`) === null) {
                await new Promise(resolve => requestAnimationFrame(resolve));
            }
            return document.querySelector(`script[src*="${name}"]`);
        };

        const script = await isElementLoaded('ForgeHX');

        // the client script is served from the world's own CDN — adopt its origin before
        // building any asset URL (the InnoCDN default is the live DE host, wrong on e.g. beta)
        try {
            MainParser.InnoCDN = `${new URL(script.src, document.baseURI).origin}/`;
        } catch {
            // keep the default host
        }

        try {
            const response = await fetch(script.src);
            if (!response.ok) return;

            srcLinks.raw = await response.text();
            srcLinks.readHX();
        } catch {
            console.log('loading of ForgeHX failed');
        }
    },


    /**
     * Extracts the asset file list (path → content hash) from the ForgeHX source
     * and occasionally reports it to the FoE-Helper API
     */
    readHX: () => {
        const startString = 'baseUrl,';
        let HXscript = `${srcLinks.raw}`;

        HXscript = HXscript.substring(HXscript.indexOf(startString) + startString.length);
        HXscript = HXscript.substring(0, HXscript.indexOf('}') + 1);

        try {
            srcLinks.FileList = JSON.parse(HXscript);

            srcLinks.injectGoodsCSS();

            const lastSent = localStorage.getItem('sendListLastDate');
            const now = Date.now();
            const SEVEN_DAYS = 7 * 24 * 60 * 60 * 1000;

            // report the list at most every 7 days per player, with a 0.5% random roll
            if ((!lastSent || (now - parseInt(lastSent, 10)) > SEVEN_DAYS) && Math.random() < 0.005) {
                MainParser.sendExtMessage({
                    type: 'send2Api',
                    url: `${ApiURL}BuildingList/?world=${ExtWorld}&v=${extVersion}`,
                    data: JSON.stringify(srcLinks.FileList)
                });

                localStorage.setItem('sendListLastDate', now.toString());
            }
        } catch {
            console.log('parsing of ForgeHX failed');
        }
    },


    /**
     * Builds the per-good CSS rules from the game's sprite atlas JSON
     * @param {object} sprite atlas JSON ({size:{w,h}, frames:[[name,x,y,w,h,...,rotated?],...]})
     * @returns {string} generated CSS rules
     */
    buildGoodsCSS: (sprite) => {
        const pngUrl = srcLinks.get(`${srcLinks.GoodsSpriteFile}.png`, true);
        const out = [
            `.goods-sprite::before {\n\tbackground-image: url('${pngUrl}');\n\tbackground-size: ${sprite.size.w}px ${sprite.size.h}px;\n}`
        ];

        for (const f of sprite.frames) {
            out.push(`.goods-sprite.${f[0]}::before {\n\tbackground-position: ${1 - f[1]}px ${1 - f[2]}px;\n\twidth: ${f[3]}px;\n\theight: ${f[4]}px;${f[f.length - 1] === true ? '\n\ttransform: rotate(-90deg);' : ''}\n}`);
        }

        return out.join('\n');
    },


    /**
     * Loads the goods sprite atlas (cached per asset hash) and injects the generated CSS into the page
     * @returns {Promise<void>}
     */
    injectGoodsCSS: async () => {
        const hash = srcLinks.FileList?.[`${srcLinks.GoodsSpriteFile}.json`];
        let css = null;

        // reuse the cached CSS as long as the atlas hash is unchanged
        if (hash && hash === localStorage.getItem('GoodsSpriteHash')) {
            css = localStorage.getItem('GoodsSpriteCSS');
        }

        if (!css && hash) {
            try {
                const sprite = await fetch(srcLinks.get(`${srcLinks.GoodsSpriteFile}.json`, true)).then(r => r.json());
                css = srcLinks.buildGoodsCSS(sprite);
                localStorage.setItem('GoodsSpriteHash', hash);
                localStorage.setItem('GoodsSpriteCSS', css);
            } catch {
                console.log('goods sprite atlas could not be loaded');
            }
        }

        // fall back to the CSS of the previous session if the fetch failed
        css = css || localStorage.getItem('GoodsSpriteCSS');
        if (!css) return;

        const style = document.createElement('style');
        style.id = 'goods-sprite-css';
        style.textContent = css;
        document.head.appendChild(style);
    },


    /**
     * Resolves an asset path to its hashed filename, falling back to the antique dealer flag icon
     * @param {string} filename asset path including extension, e.g. '/shared/avatars/portrait_433.jpg'
     * @param {boolean} [full=false] prepend the InnoGames CDN base URL
     * @param {boolean} [noerror=false] suppress console output for missing files
     * @returns {string} hashed filename or full URL
     */
    get: (filename, full = false, noerror = false) => {
        const filenameP = filename.split('.');
        let CSfilename = filenameP[0];
        let CS;

        if (!srcLinks.FileList) {
            if (!noerror) console.log('Source file list not loaded!');
        } else {
            CS = srcLinks.FileList[filename];

            if (!CS) {
                if (!noerror) console.log(`file "${filename}" not in List`);

                CSfilename = FALLBACK_ICON;
                filenameP[1] = 'png';
                CS = srcLinks.FileList[`${FALLBACK_ICON}.png`];
            }
        }

        CSfilename += `-${CS}.${filenameP[1]}`;

        return full ? `${MainParser.InnoCDN}assets${CSfilename}` : CSfilename;
    },


    /**
     * Resolves a player portrait id to its avatar image URL
     * @param {string|number} id portrait id from the player list
     * @returns {string} full avatar URL
     */
    GetPortrait: (id) => {
        const file = MainParser.PlayerPortraits[id] || 'portrait_433';

        return srcLinks.get(`/shared/avatars/${file}.jpg`, true);
    },


    /**
     * Resolves a reward icon (building, unit or good) to an image URL by trying several asset locations
     * @returns {string} full image URL
     * @param icon
     */
    getReward: (icon) => {
        let url = '';

        if (icon.substring(1, 2) === '_') {
            url = srcLinks.get(`/city/buildings/${MainParser.CityEntities?.[icon]?.asset_id?.replace(/(\D*?)_(.*)/, '$1_SS_$2')}.png`, true);
        } else {
            url = srcLinks.get(`/shared/unit_portraits/armyuniticons_90x90/armyuniticons_90x90_${icon}.jpg`, true, true); // does not work :(
        }

        if (url.includes(FALLBACK_ICON)) url = srcLinks.get(`/shared/icons/goods_large/${icon}.png`, true, true);
        if (url.includes(FALLBACK_ICON)) url = srcLinks.get(`/shared/icons/reward_icons/reward_icon_${icon}.png`, true, true);
        if (url.includes(FALLBACK_ICON)) url = srcLinks.get(`/city/buildings/${icon?.replace(/(\D*?)_(.*)/, '$1_SS_$2')}.png`, true);

        return url;
    },


    /**
     * Resolves a quest icon to an image URL
     * @returns {string} full image URL
     * @param icon
     */
    getQuest: (icon) => {
        const url = srcLinks.get(`/shared/icons/quest_icons/${icon}.png`, true, true);

        return url.includes(FALLBACK_ICON) ? srcLinks.get(`/shared/icons/${icon}.png`, true, true) : url;
    },


    /**
     * Resolves a generic icon name to an <img> tag by trying several asset locations
     * @param {string} x icon name, e.g. a resource id or entity id
     * @returns {string} <img> tag with the resolved URL, or '' for empty input
     */
    icons: (x) => {
        if (!x) return '';

        const candidates = [
            `/shared/icons/${x}.png`,
            `/shared/gui/upgrade/upgrade_icon_${x}.png`,
            `/shared/icons/${x.replace(/(.*?)_[0-9]+/gm, '$1')}.png`,
            `/shared/icons/goods/icon_fine_${x}.png`,
            `/shared/icons/reward_icons/reward_icon_${x}.png`,
            `/shared/icons/reward_icons/reward_icon_${x.replace(/(.*?)_[0-9]+/gm, '$1')}.png`,
            `/city/buildings/${x.replace(/(\D*?)_(.*)/, '$1_SS_$2')}.png`,
            `/city/buildings/${x.replace(/(.*?)_[0-9]+/gm, '$1').replace(/(\D*?)_(.*)/, '$1_SS_$2')}.png`
        ];

        let link = '';
        for (const candidate of candidates) {
            link = srcLinks.get(candidate, true, true);
            if (!link.includes(FALLBACK_ICON)) break;
        }
        if (link.includes(FALLBACK_ICON)) link = srcLinks.get(`/city/buildings/${MainParser.CityEntities?.[x]?.asset_id?.replace(/(\D*?)_(.*)/, '$1_SS_$2')}.png`, true);

        return `<img src=${link} alt="">`;
    },


    /**
     * Resolves the first asset path matching a regular expression to an <img> tag
     * @param {RegExp} regEx pattern to test against all asset paths
     * @returns {string} <img> tag with the resolved URL
     */
    regEx: (regEx) => {
        const file = Object.keys(srcLinks.FileList).find(x => regEx.test(x));
        const link = srcLinks.get(file, true, true);

        return `<img src=${link} alt="">`;
    }
};

srcLinks.init();
