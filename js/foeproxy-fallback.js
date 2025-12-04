(function(){
    try {
        const markerAttr = 'data-foeproxy-injected';
        const proxySrc = chrome.runtime.getURL('js/foeproxy.js');

        // Wenn das Marker-Attribute gesetzt ist, abbrechen
        if (document.documentElement.hasAttribute(markerAttr)) {
            return;
        }

        // Inject the real script into page context
        const s = document.createElement('script');
        s.src = proxySrc;
        s.id = 'foeproxy-injected-script';
        s.setAttribute('data-injected-by', 'foe-helper-fallback');

        s.addEventListener('load', function () {
            // Sichtbaren Marker setzen, damit weitere Fallbacks nichts mehr injizieren
            try { document.documentElement.setAttribute(markerAttr, '1'); } catch (e) {}
            // Option: entfernen um DOM sauber zu halten
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