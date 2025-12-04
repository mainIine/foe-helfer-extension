(function(){
    try {
        const markerAttr = 'data-foeproxy-injected';
        const proxySrc = chrome.runtime.getURL('js/foeproxy.js');

        function pageHasProxy() {
            // 1) Firefox: prüfen, ob die page-window-Objekte den Marker oder FoEproxy setzen
            if (window.wrappedJSObject) {
                try {
                    if (window.wrappedJSObject.__foeproxy_injected__ || window.wrappedJSObject.FoEproxy) {
                        return true;
                    }
                } catch (e) {
                    // Zugriff evtl. verweigert - weiter prüfen
                }
            }
            // 2) Fallback: existierende page-injected <script src="..."> oder identifizierbares Script-Element prüfen
            if (document.querySelector('script#foeproxy-injected-script') || document.querySelector('script[src="' + proxySrc + '"]')) {
                return true;
            }
            // 3) Letzte Absicherung: DOM-Attribute (kann auch von Content-Script gesetzt worden sein)
            if (document.documentElement.hasAttribute(markerAttr)) {
                return true;
            }
            return false;
        }

        // Wenn bereits (page-)injiziert, abbrechen
        if (pageHasProxy()) {
            return;
        }

        // Inject the real script into page context
        const s = document.createElement('script');
        s.src = proxySrc;
        s.id = 'foeproxy-injected-script';
        s.setAttribute('data-injected-by', 'foe-helper-fallback');

        s.addEventListener('load', function () {
            // Sichtbaren Marker setzen, damit weitere Fallbacks nichts mehr injizieren
            try {
                // setzen eines DOM-Attributes zusätzlich (nicht zuverlässig für Herkunftserkennung, aber nützlich)
                document.documentElement.setAttribute(markerAttr, '1');
                // Versuche, auch page-window marker zu setzen (funktioniert nur in page context)
                if (window.wrappedJSObject) {
                    try { window.wrappedJSObject.__foeproxy_injected__ = true; } catch(e) {}
                }
            } catch (e) {}
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