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

// Erweitern Sie FoEproxy mit Utility-Funktionen
Object.assign(FoEproxy, (function () {
    const proxyMap = {};
    const proxyRequestsMap = {};
    const proxyMetaMap = {};
    let proxyRaw = [];
    const wsHandlerMap = {};
    let wsRawHandler = [];
    let JSONhistory = [];
    let wsQueue = [];
    let proxyEnabled = true;

    const observedWebsockets = new WeakSet();
    const oldWSSend = WebSocket.prototype.send;

    // ###########################################
    // ############## Websocket-Proxy ############
    // ###########################################

    function _proxyWsAction(service, method, data) {
        const map = wsHandlerMap[service];
        if (!map) return;
        const list = map[method];
        if (!list) return;
        for (let callback of list) {
            try {
                callback(data);
            } catch (e) {
                console.error(e);
            }
        }
    }

    function proxyWsAction(service, method, data) {
        _proxyWsAction(service, method, data);
        _proxyWsAction('all', method, data);
        _proxyWsAction(service, 'all', data);
        _proxyWsAction('all', 'all', data);
    }

    function wsMessageHandler(evt) {
        if (wsQueue) {
            wsQueue.push(evt);
            return;
        }
        wsMessageHandlerExec(evt);
    }

    function wsMessageHandlerExec(evt) {
        try {
            if (evt.data === 'PONG') return;
            /** @type {FoE_NETWORK_TYPE[]|FoE_NETWORK_TYPE} */
            const data = JSON.parse(evt.data);

            for (let callback of wsRawHandler) {
                try {
                    callback(data);
                } catch (e) {
                    console.error(e);
                }
            }

            if (data instanceof Array) {
                for (let entry of data) {
                    proxyWsAction(entry.requestClass, entry.requestMethod, entry);
                }
            } else if (data.__class__ === "ServerResponse") {
                proxyWsAction(data.requestClass, data.requestMethod, data);
            }
        } catch (e) {
            console.error(e);
        }
    }

    WebSocket.prototype.send = function (data) {
        oldWSSend.call(this, data);
        if (proxyEnabled && !observedWebsockets.has(this)) {
            observedWebsockets.add(this);
            this.addEventListener('message', wsMessageHandler, { capture: false, passive: true });
        }
    };

    // ###########################################
    // ############### XHR-Utility ###############
    // ###########################################

    function _proxyAction(service, method, data, postData) {
        const map = proxyMap[service];
        if (!map) return;
        const list = map[method];
        if (!list) return;
        for (let callback of list) {
            try {
                callback(data, postData);
            } catch (e) {
                console.error(e);
            }
        }
    }

    function proxyAction(service, method, data, postData) {
        let filteredPostData = postData.filter(r => r && r.requestId && data && data.requestId && r.requestId === data.requestId);
        _proxyAction(service, method, data, filteredPostData);
        _proxyAction('all', method, data, filteredPostData);
        _proxyAction(service, 'all', data, filteredPostData);
        _proxyAction('all', 'all', data, filteredPostData);
    }

    function _proxyRequestAction(service, method, postData) {
        const map = proxyRequestsMap[service];
        if (!map) return;
        const list = map[method];
        if (!list) return;
        for (let callback of list) {
            try {
                callback(postData);
            } catch (e) {
                console.error(e);
            }
        }
    }

    function proxyRequestAction(service, method, postData) {
        _proxyRequestAction(service, method, postData);
        _proxyRequestAction('all', method, postData);
        _proxyRequestAction(service, 'all', postData);
        _proxyRequestAction('all', 'all', postData);
    }

    window.addEventListener('foe-helper#loaded', () => {
        while (FoEproxy._getXhrQueue() && FoEproxy._getXhrQueue().length > 0) {
            let xhrRequest = FoEproxy._getXhrQueue().shift();
            FoEproxy._xhrOnLoadHandlerExec.call(xhrRequest);
        }
        FoEproxy._setXhrQueue(null);

        while (wsQueue.length > 0) {
            let wsMessage = wsQueue.shift();
            wsMessageHandlerExec(wsMessage);
        }
        wsQueue = null;
    }, { capture: false, once: true, passive: true });

    window.addEventListener('foe-helper#error-loading', () => {
        FoEproxy._setXhrQueue(null);
        wsQueue = null;
        proxyEnabled = false;
        FoEproxy._setProxyEnabled(false);
    }, { capture: false, once: true, passive: true });

    return {
        getHistory: function () {
            return JSONhistory;
        },

        addHandler: function (service, method, callback) {
            if (method === undefined) {
                callback = service;
                service = method = 'all';
            } else if (callback === undefined) {
                callback = method;
                method = 'all';
            }

            let map = proxyMap[service];
            if (!map) {
                proxyMap[service] = map = {};
            }
            let list = map[method];
            if (!list) {
                map[method] = list = [];
            }
            if (list.indexOf(callback) !== -1) {
                return;
            }
            list.push(callback);
        },

        removeHandler: function (service, method, callback) {
            if (method === undefined) {
                callback = service;
                service = method = 'all';
            } else if (callback === undefined) {
                callback = method;
                method = 'all';
            }

            let map = proxyMap[service];
            if (!map) return;
            let list = map[method];
            if (!list) return;
            map[method] = list.filter(c => c !== callback);
        },

        addMetaHandler: function (meta, callback) {
            let list = proxyMetaMap[meta];
            if (!list) {
                proxyMetaMap[meta] = list = [];
            }
            if (list.indexOf(callback) !== -1) {
                return;
            }
            list.push(callback);
        },

        removeMetaHandler: function (meta, callback) {
            let list = proxyMetaMap[meta];
            if (!list) return;
            proxyMetaMap[meta] = list.filter(c => c !== callback);
        },

        addRawHandler: function (callback) {
            if (proxyRaw.indexOf(callback) !== -1) {
                return;
            }
            proxyRaw.push(callback);
        },

        removeRawHandler: function (callback) {
            proxyRaw = proxyRaw.filter(c => c !== callback);
        },

        addWsHandler: function (service, method, callback) {
            if (method === undefined) {
                callback = service;
                service = method = 'all';
            } else if (callback === undefined) {
                callback = method;
                method = 'all';
            }

            let map = wsHandlerMap[service];
            if (!map) {
                wsHandlerMap[service] = map = {};
            }
            let list = map[method];
            if (!list) {
                map[method] = list = [];
            }
            if (list.indexOf(callback) !== -1) {
                return;
            }
            list.push(callback);
        },

        removeWsHandler: function (service, method, callback) {
            if (method === undefined) {
                callback = service;
                service = method = 'all';
            } else if (callback === undefined) {
                callback = method;
                method = 'all';
            }

            let map = wsHandlerMap[service];
            if (!map) return;
            let list = map[method];
            if (!list) return;
            map[method] = list.filter(c => c !== callback);
        },

        addFoeHelperHandler: function (method, callback) {
            this.addWsHandler('FoeHelperService', method, callback);
        },

        removeFoeHelperHandler: function (method, callback) {
            this.removeWsHandler('FoeHelperService', method, callback);
        },

        addRawWsHandler: function (callback) {
            if (wsRawHandler.indexOf(callback) !== -1) {
                return;
            }
            wsRawHandler.push(callback);
        },

        removeRawWsHandler: function (callback) {
            wsRawHandler = wsRawHandler.filter(c => c !== callback);
        },

        triggerFoeHelperHandler: function (method, data = null) {
            _proxyWsAction('FoeHelperService', method, data);
        },

        addRequestHandler: function (service, method, callback) {
            if (method === undefined) {
                callback = service;
                service = method = 'all';
            } else if (callback === undefined) {
                callback = method;
                method = 'all';
            }

            let map = proxyRequestsMap[service];
            if (!map) {
                proxyRequestsMap[service] = map = {};
            }
            let list = map[method];
            if (!list) {
                map[method] = list = [];
            }
            if (list.indexOf(callback) !== -1) {
                return;
            }
            list.push(callback);
        },

        removeRequestHandler: function (service, method, callback) {
            if (method === undefined) {
                callback = service;
                service = method = 'all';
            } else if (callback === undefined) {
                callback = method;
                method = 'all';
            }

            let map = proxyRequestsMap[service];
            if (!map) return;
            let list = map[method];
            if (!list) return;
            map[method] = list.filter(c => c !== callback);
        },

        // Interne Methoden
        _getProxyMap: () => proxyMap,
        _getMetaMap: () => proxyMetaMap,
        _getProxyRaw: () => proxyRaw,
        _getProxyRequestsMap: () => proxyRequestsMap,
        _proxyAction: proxyAction,
        _proxyRequestAction: proxyRequestAction,
        _addToHistory: (entry) => { JSONhistory.push(entry); }
    };
})());
window.___FOE_PROXY_LOADED__ = true;
window.dispatchEvent(new CustomEvent('foe-helper#proxyloaded'));
