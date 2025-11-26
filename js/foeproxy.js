/*
 * **************************************************************************************
 * Copyright (C) 2024 FoE-Helper team - All Rights Reserved
 * You may use, distribute and modify this code under the
 * terms of the AGPL license.
 *
 * See file LICENSE.md or go to
 * https://github.com/mainIine/foe-helfer-extension/blob/master/LICENSE.md
 * for full license details.
 *
 * **************************************************************************************
 */

const FoEproxy = (function () {
    const requestInfoHolder = new WeakMap();
    function getRequestData(xhr) {
        let data = requestInfoHolder.get(xhr);
        if (data != null) return data;

        data = { url: null, method: null, postData: null };
        requestInfoHolder.set(xhr, data);
        return data;
    }

    let proxyEnabled = true;
    let xhrQueue = [];

    // ###########################################
    // ################# XHR-Proxy ###############
    // ###########################################

    const XHR = XMLHttpRequest.prototype,
        open = XHR.open,
        send = XHR.send;

    /**
     * @param {string} method
     * @param {string} url
     */
    XHR.open = function (method, url) {
        if (proxyEnabled) {
            const data = getRequestData(this);
            data.method = method;
            data.url = url;
        }
        // @ts-ignore
        return open.apply(this, arguments);
    };

    /**
     * @this {XHR}
     */
    function xhrOnLoadHandler() {
        if (!proxyEnabled) return;

        if (xhrQueue) {
            xhrQueue.push(this);
            return;
        }
        xhrOnLoadHandlerExec.call(this);
    }

    function xhrOnLoadHandlerExec() {
        const requestData = getRequestData(this);
        const url = requestData.url;
        const postData = requestData.postData;

        // handle raw request handlers
        for (let callback of FoEproxy._getProxyRaw()) {
            try {
                callback(this, requestData);
            } catch (e) {
                console.error(e);
            }
        }

        // handle metadata request handlers
        const metadataIndex = url.indexOf("metadata?id=");

        if (metadataIndex > -1) {
            const metaURLend = metadataIndex + "metadata?id=".length,
                metaArray = url.substring(metaURLend).split('-', 2),
                meta = metaArray[0];

            MainParser.MetaIds[meta] = metaArray[1];

            const metaHandler = FoEproxy._getMetaMap()[meta];

            if (metaHandler) {
                for (let callback of metaHandler) {
                    try {
                        callback(this, postData);
                    } catch (e) {
                        console.error(e);
                    }
                }
            }
        }

        // nur die jSON mit den Daten abfangen
        if (url.indexOf("game/json?h=") > -1) {
            let d = /** @type {FoE_NETWORK_TYPE[]} */(JSON.parse(this.responseText));

            let requestData = postData;

            try {
                requestData = JSON.parse(new TextDecoder().decode(postData));
                // StartUp Service als erstes behandeln
                for (let entry of d) {
                    if (entry['requestClass'] === 'StaticDataService' && entry['requestMethod'] === 'getMetadata') {
                        FoEproxy._addToHistory(entry.requestClass + '.' + entry.requestMethod);
                        FoEproxy._proxyAction(entry.requestClass, entry.requestMethod, entry, requestData);
                    }
                }
                // StartUp Service als zweites behandeln
                for (let entry of d) {
                    if (entry['requestClass'] === 'StartupService' && entry['requestMethod'] === 'getData') {
                        FoEproxy._addToHistory(entry.requestClass + '.' + entry.requestMethod);
                        FoEproxy._proxyAction(entry.requestClass, entry.requestMethod, entry, requestData);
                    }
                }

                for (let entry of d) {
                    if (!(entry['requestClass'] === 'StartupService' && entry['requestMethod'] === 'getData') &&
                        !(entry['requestClass'] === 'StaticDataService' && entry['requestMethod'] === 'getMetadata')) {
                        FoEproxy._addToHistory(entry.requestClass + '.' + entry.requestMethod);
                        FoEproxy._proxyAction(entry.requestClass, entry.requestMethod, entry, requestData);
                    }
                }

            } catch (e) {
                console.log('Can\'t parse postData: ', postData, e);
            }

        }
    }

    function xhrOnSend(data) {
        if (!proxyEnabled) return;
        if (!data) return;
        try {
            
            let posts = [];

            if (typeof data === 'object' && data instanceof ArrayBuffer) {
                if (data.bytes[0] === 31 && data.bytes[1] === 139 && data.bytes[2] === 8) {
                    // gzipped, ignore
                    return
                } else {
                    // try plaintext
                    posts = JSON.parse(new TextDecoder().decode(data));
                }
            } else if (typeof data === 'object' && data instanceof Uint8Array) {
                if (data[0] === 31 && data[1] === 139 && data[2] === 8) {
                    // gzipped, ignore
                    return
                } else {
                    // try plaintext
                    posts = JSON.parse(new TextDecoder().decode(data));
                }
            } else
                posts = JSON.parse(data);

            if (!(posts instanceof Array)) {
                // ignore (probably) game-unrelated request
                return;
            }

            for (let post of posts) {
                if (!post || !post.requestClass || !post.requestMethod || !post.requestData) return;
                FoEproxy._proxyRequestAction(post.requestClass, post.requestMethod, post);
            }
        } catch (e) {
            console.log('Can\'t parse postData: ', data, e);
        }
    }

    XHR.send = function (postData) {
        if (proxyEnabled) {
            const data = getRequestData(this);
            data.postData = postData;
            xhrOnSend(postData);
            this.addEventListener('load', xhrOnLoadHandler, { capture: false, passive: true });
        }

        // @ts-ignore
        return send.apply(this, arguments);
    };

    // Public API für Queue-Verarbeitung
    return {
        _setXhrQueue: (queue) => { xhrQueue = queue; },
        _getXhrQueue: () => xhrQueue,
        _setProxyEnabled: (enabled) => { proxyEnabled = enabled; },
        _getProxyEnabled: () => proxyEnabled,
        _xhrOnLoadHandlerExec: xhrOnLoadHandlerExec
    };
})();
