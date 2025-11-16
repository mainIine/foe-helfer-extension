{
    (function injectFoeProxy() {
        const getUrlFn = (typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.getURL)
        ? chrome.runtime.getURL.bind(chrome.runtime)
        : (typeof browser !== 'undefined' && browser.runtime && browser.runtime.getURL)
            ? browser.runtime.getURL.bind(browser.runtime)
            : () => '';
        const script = document.createElement('script');
        script.src = getUrlFn('js/foeproxy.js');
        script.onload = function() {
            (function injectFoeProxyUtils() {
                const script = document.createElement('script');
                script.src = getUrlFn('js/foeproxy-utils.js');
                script.onload = function() { this.remove(); };
                (document.head || document.documentElement).appendChild(script);
            })();
            this.remove(); 
        };
        (document.head || document.documentElement).appendChild(script);
    })();
}