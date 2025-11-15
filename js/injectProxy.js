{
    (function injectFoeProxy() {
        const script = document.createElement('script');
        script.src = chrome.runtime.getURL('js/foeproxy.js');
        script.onload = function() { this.remove(); };
        (document.head || document.documentElement).appendChild(script);
    })();
}