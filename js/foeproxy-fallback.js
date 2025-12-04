(function(){
    try {
        const proxySrc = chrome.runtime.getURL('js/foeproxy.js');

        // Inject the real script into page context
        const s = document.createElement('script');
        s.src = proxySrc;
        s.id = 'foeproxy-injected-script';
        s.setAttribute('data-injected-by', 'foe-helper-fallback');

        s.addEventListener('load', function () {
            this.remove();
        }, {once:true});

        s.addEventListener('error', function () {
            this.remove();
        }, {once:true});

        (document.head || document.documentElement).appendChild(s);
    } catch (e) {
        // still fail silently
    }
})();