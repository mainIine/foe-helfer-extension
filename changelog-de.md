## Changelog - Extension

##### 2.5.10.1

**Update**
-Gildengefechte:
	- [#2230](https://github.com/mainIine/foe-helfer-extension/issues/2230) Neue Provinzen ergänzt

---

##### 2.5.10.0

**Neu**
- Burgsystem:
	- [#2190](https://github.com/mainIine/foe-helfer-extension/issues/2190) Burgsystem Assistent:
		- Übersicht über den Fortschritt der täglichen/ wöchentliche Ziele für den Erhalt von Burgpunkten
		- Log über alle erhaltenen Burgpunkte der letzten Tage 

**Update**
- versteckte Ereignisse:
    - [#2184](https://github.com/mainIine/foe-helfer-extension/issues/2184) Die Box schließt jetzt automatisch, wenn alle versteckten Ereignisse eingesammelt wurden

- Gildenmitglieder Übersicht:
    - [#2211](https://github.com/mainIine/foe-helfer-extension/issues/2211) Zeitstempel im Dateinamen beim Export der Daten
    - [#2212](https://github.com/mainIine/foe-helfer-extension/issues/2212) bei bestimmten Gebäuden (z.B. Ruhmeshalle) wurde die produzierte Gildenmacht falsch berechnet

- i18n:
	- [#2208](https://github.com/mainIine/foe-helfer-extension/issues/2208) Fehlende Übersetzungen ergänzt

- Alles Schließen Box:
  - Option zum automatischen Ausblenden aller FoE Helfer Fenster beim Betreten eines Kampfes in den Einstellungen der Box hinzugefügt. 

**BugFix**
- Gildenmitglieder Übersicht:
  - [#2180](https://github.com/mainIine/foe-helfer-extension/issues/2180) Goldene Felder in die Übersicht der Gildengüter produzierenden Gebäude hinzugefügt
  - [#2204](https://github.com/mainIine/foe-helfer-extension/issues/2204) Fehlerhafte Erhöhung der Gildengüter/macht beim mehrfachen Erweitern der Detailansicht eines Mitglieds

- Stadtübersicht:
  - [#2200](https://github.com/mainIine/foe-helfer-extension/issues/2200) falsches Hintergrundbild entfernt

- Produktionsübersicht:
  - [#2187](https://github.com/mainIine/foe-helfer-extension/issues/2187) Goldene Felder wurden nicht erkannt
  - [#2188](https://github.com/mainIine/foe-helfer-extension/issues/2187) Punkte des Rathauses wurden nicht erkannt
  

---

##### 2.5.9.3

**Neu**
- Alles Schließen Box:
	-[#2044](https://github.com/mainIine/foe-helfer-extension/issues/2044) Schwebende Box zum Ausblenden und Schließen aller FoE Helfer Fenster
		- aktivierbar in den Einstellungen des Helfers unter Boxen -> Alles Schließen Box 

**BugFix**
- Menü:
	-[2172](https://github.com/mainIine/foe-helfer-extension/issues/2172) Die Tooltipwarnung wurden dauerhaft angezeigt, auch wenn die Bedingungen erfüllt waren.

**Update**
- Gildengefecht Box:
	-[#2170](https://github.com/mainIine/foe-helfer-extension/issues/2170) Erweiterung der Snapshot Funktion:
		- Chronologische Speicherung der einzelnen Gildengefechtsrunden
		- Jeder Snapshot innerhalb der aktuell laufenden Gildengefechtsrunde, mit den jeweiligen Zuwächsen der Mitglieder, wird gespeichert. Mit Beginn einer neuen Gildengefechtsrunde werden die gespeicherten Snapshots der vorherigen Runde gelöscht.
		- Filterfunktion für die gepeicherten Snapshots (Spieler und Datum)
	-[#2176](https://github.com/mainIine/foe-helfer-extension/issues/2176) Filter um nur Mitglieder mit einem veränderten Fortschritt anzuzeigen hinzugefügt.

- Gildenmitglieder Übersicht:
	-[#2164](https://github.com/mainIine/foe-helfer-extension/issues/2164) 0 Werte bei Gex/GG in der Gildenmitgliederverwaltung anzeigen
		- Optional über das Einstellungsmenü der Box können nun auch die Einträge der einzelnen Spieler angezeigt werden, an dem der Spieler keine Teilnahme an GEX od. GG hatte
	-[#2165](https://github.com/mainIine/foe-helfer-extension/issues/2165) Datumsformat Gex/GG in der Mitgliederverwaltung
		- Das Datumsformat der Gex/GG Teilnahmen kann nun von Kalenderwoche zu Startdatum, Enddatum oder Kalenderwoche geändert werden
	- [#2174](https://github.com/mainIine/foe-helfer-extension/issues/2174) In der Mitgliederliste und den Zeitaltern ist es nun möglich alle Details mit einem Klick anzuzeigen/auszuklappen.

- Investitionsübersicht:
	-[#2173](https://github.com/mainIine/foe-helfer-extension/issues/2173) Der gesamte Gewinn an Medaillen wird in der Investitionsübersicht mit angezeigt, wenn in den Einstellungen der Box die Spalte Medaillen aktiviert ist.

---

##### 2.5.9.2

**Update**
- Gildenmitglieder Übersicht:
    - [#2137](https://github.com/mainIine/foe-helfer-extension/issues/2137):
        - Gewonnene Kämpfe der Mitglieder können in der Übersicht mit angezeigt werden (in den Einstellungen der Gilden Mitgliederübersicht aktivierbar).
        - Gewonnene Kämpfe und ob der Spieler noch aktives Mitglied der Gilde ist, wurden in den Export mit aufgenommen.

- Investitionsübersicht:
    - [#2141](https://github.com/mainIine/foe-helfer-extension/issues/2141): Anzeige einer Spalte mit dem Datum der letzten Einzahlung in das LG

- EA-Rechner:
    - [#2142](https://github.com/mainIine/foe-helfer-extension/issues/2142) Logik geändert wie Einstellungen im EA Rechner gespeichert werden.
        Anmerkung: Diese Änderungen haben zu Folge, dass einige Einstellungen (z.B. Copy Format) nach dem Update einmalig auf Standardeinstellungen zurück gesetzt werden müssen

- Moppelassistent:
    - [#2148](https://github.com/mainIine/foe-helfer-extension/issues/2148) Spieleraktivitätsicons hinzugefügt, die anzeigen ob der Spieler mehr als 2 (gelb) oder 7 (rot) Tage nicht mehr eingelogged war (funktioniert für Freunde und Gildenmitglieder falls man mindestens Anführerrechte besitzt)

- Produktionsübersicht:
    - Boni und tägliche Belohnungskiste des Burgsystems hinzugefügt
  
- Blaue Galaxie Helfer:
	- [#2103](https://github.com/mainIine/foe-helfer-extension/issues/2103) Wenn das automatische öffnen aktiviert ist, schließt sich die Box am Ende aller Versuche auch automatisch

**BugFix**
- Gildenmitglieder Übersicht:
    - [#2117](https://github.com/mainIine/foe-helfer-extension/issues/2117) Darstellung der GEX Kalenderwoche ist jetzt der Beginn der GEX und nicht mehr das Ende
    - [#2128](https://github.com/mainIine/foe-helfer-extension/issues/2128) Die Übersicht öffnet sich nicht mehr automatisch und Inaktivitäten wurden nicht mehr übernommen aufgrund geänderter Berechtigungswerte durch Inno

- Export der Einstellungen und Daten
    - [#2119](https://github.com/mainIine/foe-helfer-extension/issues/2119) Weltspezifischer Fehler beim Import der lokalen Einstellungen behoben.

- Investitionsübersicht:
    - [#2138](https://github.com/mainIine/foe-helfer-extension/issues/2138) [2134](https://github.com/mainIine/foe-helfer-extension/issues/2134) Die Investitionsliste wird jetzt korrekt aktualisiert, wenn keine Investitionen mehr vorhanden sind.

- Produktionsübersicht, Stadtübersicht, Gebäudeeffizienzbewertung
    - [#2122](https://github.com/mainIine/foe-helfer-extension/issues/2122) Absturz behoben, der durch das neue Eventgebäude "Golden Crops" (Herbestevent) am Betaserver ausgelöst wurde

- LG Investitionen
    - [#2116](https://github.com/mainIine/foe-helfer-extension/issues/2116) Güterproduktion des Atlantis Museum korrigiert

- Außenposten
    - [#2147](https://github.com/mainIine/foe-helfer-extension/issues/2147) Moghulreich: Namen des ersten Gebäudes korrigiert von "Allee" in "Wasserkanal"

- Gildengefecht Box:
    - [#2150](https://github.com/mainIine/foe-helfer-extension/issues/2150) Fehlerhafte Zeichenkodierung beim Export behoben

---

##### 2.5.9.1

**Update**
- Blaue Galaxie:
    - [#1984](https://github.com/mainIine/foe-helfer-extension/issues/1984) Die Anzahl der verbleibenden Aufladungen wird nun im Menüicon angezeigt

- EA-Rechner:
    - [#1888](https://github.com/mainIine/foe-helfer-extension/issues/1888) Eigenanteil kann nun auch zum Copystring hinzugefügt werden

**BugFix**
- Erweiterung: 
    - [#1547](https://github.com/mainIine/foe-helfer-extension/issues/1547) Einige Boxen wurden beim zweiten Klick ins Menü nicht geschlossen

- GEX Ergebnisse:
	- Die gespeicherten Einstellungen wurden nach Reload des Spiels wieder auf die Standardeinstellungen gesetzt.

- GvG Freigaben:
	- [#2104](https://github.com/mainIine/foe-helfer-extension/issues/2104) Die Zähler wurden nach Neuladen des Spiels zurückgesetzt. Passiert nun nicht mehr.
	
- Gildenmitglieder Übersicht:
    - [#2108](https://github.com/mainIine/foe-helfer-extension/issues/2108) Ungültiger scoredb Link bei einigen Spielern im Tab "legendäre Bauwerke"

- Menü:
    - [#1537](https://github.com/mainIine/foe-helfer-extension/issues/1537) Einige Boxen konnten durch einen 2. Klick des Menüicons nicht geschlossen werden

- Infoboard:
    - [#2097](https://github.com/mainIine/foe-helfer-extension/issues/2097) Der Spielername wurde nicht korrekt angezeigt, wenn man in einer Auktion überboten wurde

- Produktionsübersicht/Effizienzbewertung:
    - [#2094](https://github.com/mainIine/foe-helfer-extension/issues/2094) Falsche Werte von Vorrats/Münzproduktion bei mehrmaligem öffnen der Produktionsübersicht
    - [#2099](https://github.com/mainIine/foe-helfer-extension/issues/2099) Ungültige Werte bei der Güterproduktion bei Gebäuden, die Gildengüter produzieren
    - [#2110](https://github.com/mainIine/foe-helfer-extension/issues/2110) Ungültige Werte bei der Güterproduktion, falls gerade eine Produktionsoption <> 24h aktiv ist

---

##### 2.5.9

**Neu**
- GEX Ergebnisse
	- die Ergebnisse der Gildenexpeditionen werden chronologisch jede Woche gespeichert (Rangliste und Mitgliederbeteiligung). Der Besuch der Teilnehmerübersicht und das Öffnen der Gilden Rangliste ist für die Aktualisierung der Daten notwendig. 
	- grafische Darstellung des Verlaufs der Gildenexpeditionen (Punkte, Begegnungen, Mitglieder (gesamt), Teilnehmer, Rang)
	- Export der Ergebnisse (Rangliste und Mitgliederbeteiligung) zu CSV / JSON

- Export der Einstellungen und Daten
	- Die gesamte Konfiguration des FOE-Helper sowie alle lokal gepeicherten Datenbanken können nun in den Einstellungen unter Import/Export gesichert und auf einem anderen PC oder Browser wiederhergestellt werden. 

- Gebäude Effizienzbewertung
	- Tool zum Auffinden nicht mehr effizienter Gebäude. Der Spieler legt fest welchen Ertrag pro Feld er wünscht. Das Tool gibt aus, welche Gebäude diesen Ertrag erreichen welche nicht.

- Links zum Spielerprofil auf scoredb.io
	- [#149](https://github.com/mainIine/foe-helfer-extension/issues/149) Spielernamen in Foe Helfer werden durch Links auf das Profil des Spielers auf der Seite scoredb.io ersetzt (kann im Einstellungsmenü aktivert bzw. deaktiviert werden)

**Update**
- Gildenmitglieder Übersicht
	- [#2033](https://github.com/mainIine/foe-helfer-extension/issues/2033) LG Liste aller Gildenmitglieder
	Filterbare Liste der LG aller Gildenmitglieder mit der aktuellen Stufe, freigeschalteten Stufen, investierten FP und benötigten FP zum Leveln.

- LG Investitionen
    - [#1550](https://github.com/mainIine/foe-helfer-extension/issues/1550) Option für die Berücksichtigung von Boni für die angreifende Armee
	- Unterstützung für Relikttempel und fliegende Insel

- Produktionsübersicht:
    - [#2060](https://github.com/mainIine/foe-helfer-extension/issues/2060) Es wird nun bei allen Ressourcen wie bei den Forgen Punkten zusätzlich die maximale Produktion wenn alles motiviert/poliert ist angezeigt

- Eigenanteilsrechner:
	- [#2045](https://github.com/mainIine/foe-helfer-extension/issues/2045) Die Buttons "Kopieren" und "Merken" sind nun auch im Hauptfenster vorhanden sofern ein Platz sicher ist. Es werden hierbei die Defaulteinstellungen zum Kopieren verwendet
	- Anzeige welche legendären Gebäude bereits gemerkt wurden
	- Nach dem Merken eines Gebäudes wird nun die aktuelle Liste auch in die Zwischenablage kopiert
	- [#2046](https://github.com/mainIine/foe-helfer-extension/issues/2046) Plätze, die als Mäzenbelohnung keine FP abwerfen werden und mit 1FP vorgeschlagen
	- In der Copybox wurde die Option "Alle + leere" durch die Option "Auto + nicht sichere" ersetzt. Diese kopiert alle Plätze, die noch nicht belegt sind

- Diverses:
	- [#1965](https://github.com/mainIine/foe-helfer-extension/issues/1965) Globale Einstellung zum Deaktivieren aller Soundeffekte im Foe Helfer hinzugefügt
	- [#2064](https://github.com/mainIine/foe-helfer-extension/issues/2064) Bei langen Tabellen wurde der Header beim Hinunterscrollen nun fixiert

**BugFix**
- Gildenmitglieder Übersicht
	- [#2085](https://github.com/mainIine/foe-helfer-extension/issues/2085) Falsche Anzeige des Zeitalters bei Gildengüter produzierenden Gebäuden
	- [#2086](https://github.com/mainIine/foe-helfer-extension/issues/2086) Gildengüter/macht produzierende Gebäude wurden in der Detailansicht manchmal nicht angezeigt

- Eigenanteilsrechner:
	- [#2052](https://github.com/mainIine/foe-helfer-extension/issues/2052) Mehrfaches Merken desselben legendären Bauwerks konnte zu doppelten Zeilen führen
	- [#2075](https://github.com/mainIine/foe-helfer-extension/issues/2075) Beim Einzahlen in legendäre Gebäude, die bereits gelevelt wurden konnten ungültige Werte angezeigt werden

- FP Einsammlungen:
	- [#2089](https://github.com/mainIine/foe-helfer-extension/issues/2089) Beim Datumsauswahldialog wurde das Jahr 1912 ausgewählt wenn die Sprache des Foe Helfers auf Niederländisch eingestellt war

- Investitionsübersicht:
	- [#2035](https://github.com/mainIine/foe-helfer-extension/issues/2035) Gewinn/Medaillen/Blaupausen wurden nach dem leveln der eigenen Arche nicht sofort aktualisiert.
	- Ausgeblendete LG wurden nach dem leveln der eigenen Arche wieder eingeblendet obwohl keine Investition stattgefunden hat.

- Produktionsübersicht:
	- [#2062](https://github.com/mainIine/foe-helfer-extension/issues/2062) Güterproduktion: Warnmeldung falls der Venus Außenposten noch nicht besucht wurde hinzugefügt (wie bei Mars und Asteroiden)
	- [#2058](https://github.com/mainIine/foe-helfer-extension/issues/2058) Beim Upgraden von Straßen konnten ungültige Werte angezeigt werden.
	- [#2090](https://github.com/mainIine/foe-helfer-extension/issues/2090) Rundung der Größenangaben auf 1 Stelle geändert, da der Wert auch den durchschnittlichen Straßenbedarf enthält

- LG Investitionen:
	- [#2029](https://github.com/mainIine/foe-helfer-extension/issues/2029) Güter berücksichtigen ließ sich nicht permanent deaktivieren

- Marktfilter:
	- [#2084](https://github.com/mainIine/foe-helfer-extension/issues/2084) Korrektur falscher Angaben in der Spalte "Seite" des "Vorteilhaft" Filters bei eigenen Angeboten

- Infobox:
	- [#1907](https://github.com/mainIine/foe-helfer-extension/issues/1907) [#2065](https://github.com/mainIine/foe-helfer-extension/issues/2065) In der Infobox konnten beim Leveln von LGs manchmal falsche FP Werte angezeigt werden

- CityMap:
	- [#1986](https://github.com/mainIine/foe-helfer-extension/issues/1986) Anzeige der gesamten und freien Fläche bei fremden Städten ausgeblendet, da die freigeschalteten Erweiterungen nur bei der eigenen Stadt bekannt sind

- Ereignisse:
	- [#1991](https://github.com/mainIine/foe-helfer-extension/issues/1991) Scherben der fliegenden Insel hinzugefügt

- Außenposten:
	- [#2067](https://github.com/mainIine/foe-helfer-extension/issues/2067) Berechnung der benötigten Beute bei Ägyptern fehlerhaft

---

##### 2.5.8

**Neu**

- GvG Karte & Protokoll (BETA):
	- GvG Karte: Zeigt alle Gilden, die gerade auf einer Karte vertreten sind (auch die, die nur belagern). Die Sektoren zeigen beim Klick weitere Details an. Diese Details werden beim Neuladen einer Karte aktualisiert.
	- Karte bearbeiten: Beim Klick auf Bearbeiten kannst du aus der Liste eine Gilde auswählen (oder oben über den weißen Button gar keine) und dann die Sektoren der gewünschten Gilde zuteilen. Die Gildenliste wird entsprechend aktualisiert. 
	- GvG Protokoll: Erfasst alle Aktionen, die auf einer GvG Karte passieren während du sie betrachtest.
	- GvG Protokoll Filter: Kann den Log nach allen enthaltenen Zeichen filtern.
- GVG Freigaben:
	- [#1781](https://github.com/mainIine/foe-helfer-extension/issues/1781) Anzahl deiner Sektor-Freigaben seit der letzten Abrechnung.

**Update**
- Extension:
    - [#692](https://github.com/mainIine/foe-helfer-extension/issues/692) [#1975](https://github.com/mainIine/foe-helfer-extension/issues/1975) Exportmöglichkeiten für diverse Boxen des Helfers. (Die Tabellen für "Markt", "Technologien" und "MoppelHelper" können nun in CSV exportiert werden. Weitere werden in zukünftigen Updates hinzugefügt)
- Gildenmitglieder Statistik:
	- [#1949](https://github.com/mainIine/foe-helfer-extension/issues/1949) [#1924](https://github.com/mainIine/foe-helfer-extension/issues/1924) Exportfunktion für jeden Tab der Statistik
	- Detailansicht aller Gildengebäude (erneuter Besuch aller Gildenmitglieder für die korrekte Darstellung empfohlen.) 
- Investitionsübersicht:
	- [#1990](https://github.com/mainIine/foe-helfer-extension/issues/1990) Anzeige von Medaillen und Blaupausen über Boxmenü auswählbar
- Statistiken: 
	- Die Belohnungen der fliegenden Insel werden nun erfasst.
	- Ereignisse werden jetzt erfasst.
	- Sobald sie da ist, werden auch die Belohnungen aus der PvP Arena erfasst.
- FP-Einsammlungen:
	- Man kann jetzt einen Zeitraum auswählen. Danke an Likeke181.
- LB-Aufladungen/Quests:
	- Den Symbolen wurden Tooltips hinzugefügt.

**BugFix**
- Extension:
    - [#2022](https://github.com/mainIine/foe-helfer-extension/issues/2022) Typo in deutscher Übersetzung ("Himej" >> "Himeji")
- Menü:
    - [#1928](https://github.com/mainIine/foe-helfer-extension/issues/1928) Fehler im CSS Code zerstörte Tooltipp
- Einstellungen:
    - [#1999](https://github.com/mainIine/foe-helfer-extension/issues/1999) [#2000](https://github.com/mainIine/foe-helfer-extension/issues/2000) Im Einstellungsmenü des Helfers war die Ansicht bei der Auswahl der Menü-Icons in einer bestimmten Ansicht falsch
- Gildenmitglieder Statistik:
	- Die Berechnung der Gildenmacht war in bestimmten Fällen ungenau.
- FP-Einsammlungen:
	- Manchmal wurden zu den Ereignissen FP aus anderen Quellen hinzugezählt.
- Infoboard:
    - Das "Ping" kam immer, obwohl nach einem besstimmten Inhalt gefiltert wurde. Das ist nun behoben
- BonusBar:
    - [#1989](https://github.com/mainIine/foe-helfer-extension/issues/1989) Außenposten Quests werden bei Quest Icon der BonusBar gezählt
- Eigenanteilsrechner:
    - [#1994](https://github.com/mainIine/foe-helfer-extension/issues/1994) Beim Zurückblättern von Leveln wird nun das Level korrekt anzeigen
    - [#2004](https://github.com/mainIine/foe-helfer-extension/issues/2004) Es fehlte Stufe 52
- Produktionsübersicht:
    - [#2026](https://github.com/mainIine/foe-helfer-extension/issues/2026) FP Produktion des Luftschiffs wurde nicht gezählt wenn nicht motiviert
    
---

##### 2.5.7.1

**BugFix**

- Extension:
    - Firefox BugFix
	- [#1970](https://github.com/mainIine/foe-helfer-extension/issues/1970) Menü Einstellung > Inhalt. versteckte Icons wurden nach mehrmaligem öffnen doppelt angezeigt
	- Menütooltip für Gildenstatistik fehlte

- Quest Grenze:
	- date = null BugFix, zählt nun korrekt

--

##### 2.5.7.0

**Neu**
- Gildenmitglieder Statistik:
	- Anzeige detailierter Informationen der Gildenmitglieder:
		- Zeitalter
		- GEX/GG Teilnahmen
		- Anzahl der Nachrichten im Gildenforum
		- Gildengüter produzierende Gebäude
		- Inaktivitätsverlauf (nur mit Gildengründer/-führer Rechten)
	- Übersicht aller Gildengüter produzierender Gebäude der Gildenmitglieder
	- Übersicht der vorhandenen Gildenkassen Güter 

- GVG Freigaben:
	- [#1781](https://github.com/mainIine/foe-helfer-extension/issues/1781) Zeigt an, wie viele Freigaben man selbst bereits seit der Abrechnung (20 Uhr) im GvG getätigt hat

- Questabschluss Info:
	- [#1915](https://github.com/mainIine/foe-helfer-extension/issues/1915) Questabschluss-Benachrichtigung in Gildengefechten
		- lässt einen Sound erklingen wenn ein Quest abgeschlossen wurde

- Quest Grenze:
	- [#1960](https://github.com/mainIine/foe-helfer-extension/issues/1960) Zeigt einen kleinen Counter wie viele Quest für diesen Tag noch übersprungen werden können
		- Ist per default deaktiviert (Einstellungen > Boxen > 2k Quest Grenze)

- Export Funktion für Tabellen:
	- [#692](https://github.com/mainIine/foe-helfer-extension/issues/692) Die Tabellen in den Modulen "Marktfilter", "Technologien" und "Moppelassistent" können nun mit Hilfe des Zahnrad Symbols als .csv oder .json Datei exportiert werden

**Update**
- Eigenanteilsrechner:
	- [#1923](https://github.com/mainIine/foe-helfer-extension/issues/1923) Automatische Aktualisierung beim Leveln fremder LGs
		- Ist im EA Rechner gerade ein fremdes LG geöffnet und dieses wird gelevelt, so wird die Anzeige nun automatisch aktualisiert.

- Menü:
	- Es lässt sich ab sofort über die Einstellungen festlegen welche Icons überhaupt im Menü dargestellt werden sollen; "Einstellungen > Erweiterungen > Menü Inhalt"

**Bugfix**

- Gebäude-Kits:
    - Kann wieder wie gewohnt aufgerufen werden

- EA-/Kostenrechner:
	- [#1921](https://github.com/mainIine/foe-helfer-extension/issues/1921) [#1958](https://github.com/mainIine/foe-helfer-extension/issues/1958) "Fliegende Insel" ergänzt
	
- Gildenmitglieder Statistik:
	- [#1938](https://github.com/mainIine/foe-helfer-extension/issues/1938) Updated nun die Mitglieder die aus der Gilde ausgetreten sind

- Infobox:
	- [#1941](https://github.com/mainIine/foe-helfer-extension/issues/1941) wenn ein "<" oder ">" im Titel eins Threads war, gab es eine falsche Darstellung

---

##### 2.5.6.3

**Update**
- Investitionsübersicht:
    - [#1871](https://github.com/mainIine/foe-helfer-extension/issues/1871) Es werden keine Daten mehr an foe-rechner.de gesendet

- Forschungskostenrechner:
    - [#1897](https://github.com/mainIine/foe-helfer-extension/issues/1897) Ab diesem Update wird das Zeitalter Venus korrekt erkannt

- Gildengefechte:
    - Wir haben die Ansicht der Gildengefechte-Box umgeschrieben, für die Übersichtlichkeit

- Moppelassistent:
    - [#1912](https://github.com/mainIine/foe-helfer-extension/issues/1912) Die Sortierung der Namen hat nicht richtig funktioniert, das klappt nun

- LG Investitionen:
    - Option für die Berücksichtigung von Güterproduktionen

- Bonus Bar:
	- [#1915](https://github.com/mainIine/foe-helfer-extension/issues/1915) Bonus Bar zeigt nun auch abgeschlossene Quests an

**BugFix**
- Extension:
    - [#1892](https://github.com/mainIine/foe-helfer-extension/issues/1892) Ein doppeltes Anführungszeichen konnte ein Tooltip zerstören

- Verhandlungsassistent:
    - [#1879](https://github.com/mainIine/foe-helfer-extension/issues/1879) Manchmal wurden die anzahl der Züge nicht korrekt erkannt, das wurde behoben

- Eigenanteilsrechner:
    - [#1891](https://github.com/mainIine/foe-helfer-extension/issues/1891) Erledigter Eigenanteil wurde falsch berechnet, wenn gelöschter Spieler etwas eingezahlt hatte

- Gebäude-Kits:
    - [#1910](https://github.com/mainIine/foe-helfer-extension/issues/1910) Die Anzahl wird nun korrekt berechnet

---

##### 2.5.6.2

**Update**
- Produktionsübersicht:
    - [#1668](https://github.com/mainIine/foe-helfer-extension/issues/1668) Angriff und Verteidigung wurden als neue Reiter eingefügt

- Gildengefechte:
    - verbesserte Ansicht wenn Provinz noch keinen Besitzer hat

- Investitionen: 
    - [#1853](https://github.com/mainIine/foe-helfer-extension/issues/1853) Investitionen können ignoriert - und Plätze nur "sicher" dargestellt werden

**BugFix**
- Menü:
    - [#1861](https://github.com/mainIine/foe-helfer-extension/issues/1861) Durch einen case sensitive (Groß-Kleinschreibung) Fehler konnte das Alarmicon nicht verschoben werden, oder verschwand

- Alerts:
    - [#1848](https://github.com/mainIine/foe-helfer-extension/issues/1848) Firefox Bug: Alarm konnte nicht erstellt werden

- Investitionen:
    - [#1854](https://github.com/mainIine/foe-helfer-extension/issues/1854) Falsche Sortierung der Eintragszeit bei Investitionen korrigiert

---

##### 2.5.6.1

**Update**
- Extension:
    - viele Übersetzungen/Korrekturen von [i18n.foe-helper.com](https://i18n.foe-helper.com) integriert [#1849](https://github.com/mainIine/foe-helfer-extension/issues/1849)

- Ivestitionen:
    - es lassen sich ab sofort unrentable LBs ausblenden und aus der Rechnung entfernen

**BugFix**
- Alerts:
    - [#1841](https://github.com/mainIine/foe-helfer-extension/issues/1841) das Icon vom Alarm Modul lies sich nicht verschieben oder verschwand einfach

- Martplatzfilter:
    - [#1847](https://github.com/mainIine/foe-helfer-extension/issues/1847) die Standardfilter waren verschwunden und die Box beim Start leer

---

##### 2.5.6.0
**Neu**
- Alerts (Alarme):
	- Erstelle Alarme mit dem von Dir gewünschten Zeitpunkt, so viele Du willst. Du hast dabei fast grenzenlose Einstellungsmöglichkeiten:
		- exakten Zeitpunkt mittels Datepicker auswählen
		- wiederholbare Alarme, auch mit vordefinierten Intervallen
		- erkennt Provinzen und deren Sperren, und kann sie als Alarm, auch direkt aus dem neuen Gildengefecht Tool erstellen
		- erkennt das Angebot im Antiquitätenhändler und kann daraus einen Alarm erstellen
		- die eingestellte Benachrichtigung erscheint auf dem Desktop von Windows
		- es muss nur der Browser offen sein, nicht das Spiel um die Benachrichtigungen zu erhalten


- Gildengefechte Übersicht:
	- zur Box der Spielerfortschritte, ist nun eine neue Box (im Menü) gekommen, die alle Fortschritte der umkämpften Provinzen in Echtzeit darstellt
	- ein zweiter Reiter zeigt in Echtzeit an, wann angrenzende Sektoren deiner Gilde, demnächst ihre Sperre verlieren
	- durch den Klick auf den kleinen Map-Marker, rechts oben in der Box, erscheint eine MiniMap die sich in Echtzeit aktualisiert

**Update**
- Investitionen: _danke an [danielvoigt01](https://github.com/danielvoigt01) für die Vorlage_
	- die kleine Box enthält nun detailliert alle Deine Investitionen und zeigt Dir jeden einzelnen Fortschritt an
	- Du siehst auf einen Blick, in welches LG weiter eingezahlt wurde
	- Die Box kann, jeder Zeit, aus dem Menü heraus, aufgerufen werden
	
- Statistikmodul:
	- [#1799](https://github.com/mainIine/foe-helfer-extension/issues/1799) Die Tabelle unter der Grafik kann jetzt, via Copy & Paste, kopiert werden

**BugFix**
- Kostenrechner:
	- [#1793](https://github.com/mainIine/foe-helfer-extension/issues/1793) Ein Schleifenquest der Artischen Zukunft (Spende 200 FP) wurde nicht korrekt erkannt

- Forschungskostenrechner:
	- [#1749](https://github.com/mainIine/foe-helfer-extension/issues/1749) Box ist resizeable und scrollbar geworden

- Toast-Meldungen (Benachrichtigungen):
	- [#1772](https://github.com/mainIine/foe-helfer-extension/issues/1772) sind intelligenter geworden. Menüpositionen rechts und unten werden erkannt

- Stadtübersicht:
	- [#1774](https://github.com/mainIine/foe-helfer-extension/issues/1774) Übermittlungsbox zu foe-rechner.de verschwand nicht mehr
	

---

##### 2.5.5.1

**Bugfix**
- Gildengefecht Box:
	- [#1779](https://github.com/mainIine/foe-helfer-extension/issues/1779) mit der Exportfunktion der Übersicht kam ein er kleiner Bug der den Unterschied zwischen den Schnappschüssen nicht mehr anzeigte

---

##### 2.5.5.0

**Update**
- Kostenrechner:
	- Tabellenüberschriften teilweise durch Icons getauscht, die Übersetzungen sind in manchen Sprachen viel zu lang

- Eigenanteilsrechner:
	- [#1507](https://github.com/mainIine/foe-helfer-extension/issues/1507) Tabellenüberschriften teilweise durch Icons getauscht, die Übersetzungen sind in manchen Sprachen viel zu lang

- Gildengefecht Box:
	- Tabellenüberschriften teilweise durch Icons getauscht, die Übersetzungen sind in manchen Sprachen viel zu lang

**Bugfix**
- Extension:
	- [#1770](https://github.com/mainIine/foe-helfer-extension/issues/1770) auf der Beta wurden die Spieler-Avatare nicht korrekt geladen, das haben wir vorsorglich bereits behoben

---

##### 2.5.4.4
**Neu**
- Handelsblocker:
	- Wenn gewünscht, legt sich eine kleine Box in der Karte der Kontinente über den "Verhandeln"-Button um diesen nicht ausversehen zu drücken

**Update**
- Extension:
	- moderneres Design für die Boxen
	- neue modernere Buttons für die Boxen integriert
	- diverse Übersetzungen von euch integriert

- FP-Collector:
	- Grafiken ergänzt (aktuelle/kommende Events)

- Kostenrechner:
	- Einstellungsbutton in der Box hinzugefügt, Werte der Archeförderung lassen sich nun einstellen

- Eigenanteilsrechner:
	- Einstellungsbutton in der Box hinzugefügt, Werte der Archeförderung lassen sich nun einstellen


**Bugfix**
- Forschungskosten:
	- [#1754](https://github.com/mainIine/foe-helfer-extension/issues/1754) Es wurden keine Werte mehr angezeigt

---

##### 2.5.4.3

**Update**
- Produktionsübersicht:
	- [#1647](https://github.com/mainIine/foe-helfer-extension/issues/1647) [#1662](https://github.com/mainIine/foe-helfer-extension/issues/1662) Ab sofort steht in jedem Tab in grüner Farbe rechts oben was fertig ist und geerntet werden kann

**Bugfix**
- Extension:
	- Kompatibilität zu älteren Browsern wieder hergestellt

- Marktplatz Filter:
	- [#1723](https://github.com/mainIine/foe-helfer-extension/issues/1723) Der Inhalt des Marktplatz-Filters wurde nicht angezeigt, Geht nun wieder

- Produktionsübersicht:
	- [#1726](https://github.com/mainIine/foe-helfer-extension/issues/1726) Eventgebäude die nicht an eine Straße angeschlossen sind produzieren dennoch Bevölkerung, das wurde korrigiert

---

##### 2.5.4.2

**Update**
- Produktionsübersicht:
	- Alcatraz in die Übersicht für "Einheiten" hinzugefügt

- FP-Collector:
	- Pfeile hinzugefügt um dazustellen das man die Einträge aufklappen kann

- Infobox:
	- [#1704](https://github.com/mainIine/foe-helfer-extension/issues/1704) Kann ab sofort, wenn gewünscht mit dem Spielstart geladen werden => "Einstellungen > Boxen > Infobox"
	- [#1416](https://github.com/mainIine/foe-helfer-extension/issues/1416) Kann ab ab sofort auf eine Länge beschränkt werden => "Einstellungen > Boxen > Infobox Nachrichten" um den Browser bei sehr vielen Einträgen zu schonen
	- Die Einträge der Infobox werden gespeichert wenn sie nur geschlossen und wieder geöffnet wird


**Bugfix**
- Extension:
	- [#1720](https://github.com/mainIine/foe-helfer-extension/issues/1720) Filter im Moppelassistent reagiert falsch, wenn Infobox offen ist
	- [#1707](https://github.com/mainIine/foe-helfer-extension/issues/1707) Einige Mitteilungen wurden nicht angezeigt

- Menü-Box:
	- [#1717](https://github.com/mainIine/foe-helfer-extension/issues/1717) Wenn die Box oben am Rand liegt, verschwanden die Tooltips ausserhalb des sichtbaren Bereiches

- Produktionsübersicht:
	- [#1709](https://github.com/mainIine/foe-helfer-extension/issues/1709) Die Box wurde zu lang, die ist nun wieder scrollbar

- Infobox:
	- [#1694](https://github.com/mainIine/foe-helfer-extension/issues/1694) Falsche Übersetzung im Filter gefixt "GvG" => "GG"
	- Der Nachrichtenfilter ist nun case-Insesitive (Groß- Kleinschreibung wird ignoriert)

- Moppelhelfer:
	- [#1658](https://github.com/mainIine/foe-helfer-extension/issues/1658) Datumserkennung für CZ gefixt

---

##### 2.5.4.1

**Bugfix**
- Menü:
	- [#1701](https://github.com/mainIine/foe-helfer-extension/issues/1701) [#1702](https://github.com/mainIine/foe-helfer-extension/issues/1702) in älteren Browsern konnte der Helfer nicht geladen werden

- Produktionsübersicht:
	- [#1696](https://github.com/mainIine/foe-helfer-extension/issues/1696) In manchen Browsers war die Tabelle nicht breit genug

- Extension:
	- [#1699](https://github.com/mainIine/foe-helfer-extension/issues/1699) Benachrichtiungen wurden trotz Deaktivierung dargestellt

---

##### 2.5.4.0

**Neu**
- Menü:
	- [#1664](https://github.com/mainIine/foe-helfer-extension/issues/1664) [#1665](https://github.com/mainIine/foe-helfer-extension/issues/1665) Es gibt nun 3 Menü Varianten (rechts, unten und Box)
	- Auswählbar über "Einstellungen > Erweiterung > Menü wechseln"
	- Redesign (kleiner, neue Grafiken) des unteren und der Box Variante für mehr Platz

- Erweiterung:
	- Die Benachrichtigungen sind nun abschaltbar "Einstellungen > Erweiterung > Benachrichtigung"
	- Die Benachrichtiungen können an unterschiedlichen Positionen erscheinen "Einstellungen > Erweiterung > Benachrichtigungs- positionen"

**Update**
- Stadtübersicht:
	- [#1659](https://github.com/mainIine/foe-helfer-extension/issues/1659) Übersetzungen für die Statistiken wurden ergänzt

- Blaue Galaxy Helfer:
	- [#1653](https://github.com/mainIine/foe-helfer-extension/issues/1653) kann nun nach Güter gewichten. Soll nur nach FP gewichtet werden, ändere den Wert auf "0" (Null)

- Produktionsübersicht:
	- [#1646](https://github.com/mainIine/foe-helfer-extension/issues/1646) aktualisiert sich nun wenn die Ernte mit Diamanten eingesammelt wird

- Infobox:
	- [#1552](https://github.com/mainIine/foe-helfer-extension/issues/1552) ab sofort kann im Filter nach einem Text gesucht werden

- Erweiterung:
	- viele Übersetzungen von [i18n.foe-helper.com](http://i18n.foe-helper.com/projects/foe-helper/extension/) wurden integriert. Helfe auch du noch mehr Übersetzungen zu integrieren und registriere dich

**Bugfix**
- FP-Collector:
	- [#1690](https://github.com/mainIine/foe-helfer-extension/issues/1690) der Collector hat nicht alle Verdopplungen gezählt
	- [#1693](https://github.com/mainIine/foe-helfer-extension/issues/1693) Übersetzungsfehler behoben

- Erweiterung:
	- [#1687](https://github.com/mainIine/foe-helfer-extension/issues/1687) im Firefox wurden nicht alle Übersetzungen geladen

- Menü:
	- [#1681](https://github.com/mainIine/foe-helfer-extension/issues/1681) das Drag&Drop war zu empfindlich und hat immer die Meldung gerbacht "Das neue Menü-Reihenfolge wurde gespeichert", das haben wir geändert

---

##### 2.5.3.2

**BugFix**
- FP-Collector:
	- Ein kleiner Bug verhinderte das Anzeigen des Menübuttons

---

##### 2.5.3.1

**Neu**

- FP-Collector:
	- Sammelt tagesweise und nach Art sortiert alle FPs ein die Du im kompletten Spiel sammelst um so eine Gesamtübersicht deiner "nebenbei" FPs zu erstellen

**Update**

- Menü:
	- [#1661](https://github.com/mainIine/foe-helfer-extension/issues/1661) [#1657](https://github.com/mainIine/foe-helfer-extension/issues/1657) wegen dem neuen dynamischen Menü weicht das Menü des Helfers an den unteren Rand aus

- Moppelhelfer:
	- Über den Tabbelkopf können die Werte sortiert werden
	- Filter für verschiedene Ereignisse [#1652](https://github.com/mainIine/foe-helfer-extension/issues/1652)
	- Farbige Werte für besseres unterscheiden

**BugFix**

- Eventhelfer:
	- [#1655](https://github.com/mainIine/foe-helfer-extension/issues/1655) Fehlerhafte Erkennung des Tagespreises Football Event 2021

---

##### 2.5.3.0

**Neu**

- Blaue Galaxy Helfer:
	- Wenn in den "Einstellungen > Boxen > Blaue Galaxy" aktivert (default "an") wird beim Klick auf die erntbare Blaue Galaxy eine Box geöffnet die die FP stärksten verdoppelbaren Gebäude mit der korrekten Versuchanzahl darstellt

- Moppelhelfer ****BETA****:
	- Wenn in den "Einstellungen > Boxen > Motivationen" aktivert (default = "an") werden sämtliche Ereignisse im Rathaus notiert und können über den Button im Menü geöffnet werden.
	  Sollte ein Tab durchgestrichen sein, bitte unten die Tabs des Spieles entsprechend anklicken.

**Update**
- Extension:
	- Icons überarbeitet

- Eigenanteilsrechner:
	- [#1638](https://github.com/mainIine/foe-helfer-extension/issues/1638) Kopier-Overlay zentriert und neue Checkbox integriert

- Kampfassistent:
	- [#903](https://github.com/mainIine/foe-helfer-extension/issues/903) Das Warnfenster lässt sich nun in den Einstellungen deaktiveren

- Produktüberischt:
	- [#1629](https://github.com/mainIine/foe-helfer-extension/issues/1629) Ein weiterer Tab zeigt an wie viele Einheiten in nicht militärischen Gebäuden produziert werden

**Bugfix**
- Extension:
	- [#1649](https://github.com/mainIine/foe-helfer-extension/issues/1649) Innogames hat etwas im Code umgestellt was das Menü zerschossen hatte

- Produktüberischt:
	- [#1640](https://github.com/mainIine/foe-helfer-extension/issues/1640) Produzierte FP der Ehrenstatue wurden nicht dargestellt

---

##### 2.5.2.9

**Bugfix**

- Extension:
	- kleiner Bug beim Ansprechen der API

---

##### 2.5.2.8

**Bugfix**

- Kostenrechner:
	- beim Öffnen eines anderen LGs schloss sich die Box

---

##### 2.5.2.7

**Update**
- Forschungskosten:
	- [#1622](https://github.com/mainIine/foe-helfer-extension/issues/1622) Das Fenster lässt sich nun individuell in der Größe verändern

- Kostenrechner:
	- [#1590](https://github.com/mainIine/foe-helfer-extension/issues/1590) Die Box schliesst sich beim zweiten Klick im Menü

**Bugfix**
- Notizen:
	- [#1627](https://github.com/mainIine/foe-helfer-extension/issues/1627) Es konnte keine neue Seite angelegt werden

- Kostenrechner:
	- [#1619](https://github.com/mainIine/foe-helfer-extension/issues/1619) Rundungsfehlern bei manchen Archefaktoren behoben

---

##### 2.5.2.6

**Update**
- Extension:
	- viele Übersetzungen von [i18n.foe-helper.com](https://i18n.foe-helper.com) importiert

**Bugfix**
- Extension:
	- Motivieren/Polieren angepasst, API neu gestaltet

---

##### 2.5.2.5

**Update**
- Extension:
	- viele Übersetzungen von [i18n.foe-helper.com](https://i18n.foe-helper.com) importiert

- Notizen:
	- der letzte Tab wird "gemerkt" wenn neue Seiten angelegt werden

**Bugfix**
- Verhandlungsassistenen:
	- Optische Korrekturen am Verhandlungsassistenen

---

##### 2.5.2.4

**BugFix**
- Verhandlungsassisten:
	- roten Rahmen beim falschen Auswählen eines Gutes gefixt

- Gefechtsassistent:
	- Das Fenster beim Verlieren einer Einheit aus dem nächsten ZA lässt sich nun "normal" wegklicken

---

##### 2.5.2.3

**Update**
- Motivieren/Polieren:
	- Übermittlung an foe-rechner.de überarbeitet

---

##### 2.5.2.2

**Update**
- Event/Schrittrechner:
	- [#1592](https://github.com/mainIine/foe-helfer-extension/issues/1592) Einstellung zum deaktivieren der Box hinzugefügt

- Gefechtsassistent:
	- Ab sofort wird auch einen Warnung ausgegeben wenn eine seltene Einheit des nächsten ZAs gestorben ist => Möglichkeit zu heilen

**BugFix**
- Eigenanteilsrechner:
	- [#1586](https://github.com/mainIine/foe-helfer-extension/issues/1586) Beim Ändern von Archefaktor oder externen Werten sprang der EA-Rechner auf das aktuelle Level zurück, falls zu einem höheren Level weitergescrollt wurde
	- [#1588](https://github.com/mainIine/foe-helfer-extension/issues/1588) EA Rechner ludt nicht bzw. aktualisierte sich, wenn externe Spalten befüllt wurden

- Legendäre Bauwerke:
	- [#1587](https://github.com/mainIine/foe-helfer-extension/issues/1587) LG-Investitionen Innovation Tower waren unterhalb von Level 10 verrutscht

- Forgepunkte Balken:
	- [#1589](https://github.com/mainIine/foe-helfer-extension/issues/1589) FP-Counter in GG zählte nicht hoch

- Notizen:
	- fehlenden "Speicher"-Button ergänzt

---
##### 2.5.2.1

**Neu**
- Gildenchat:
	- überarbeitet und mit verschiedenen "Räumen"

**Update**
- Tavernenbadge:
	- entfernt da es Inno nachgebaut hat

- Kostenrechner:
	- [#1504](https://github.com/mainIine/foe-helfer-extension/issues/1504) Redesign der "Kopieren" Funktion, Scheme ist ab sofort selber einstellbar

- Legendäre Bauwerke:
	- [#1518](https://github.com/mainIine/foe-helfer-extension/issues/1518) der erforderliche Platz Faktor kann ab sofort geändert werden
	- [#1574](https://github.com/mainIine/foe-helfer-extension/issues/1574) Unterstützung für blaue Galaxie hinzugefügt

- Infobox:
	- [#1542](https://github.com/mainIine/foe-helfer-extension/issues/1542) "Willkommenstext" kann mit "Box leeren" entfernt werden

**BugFix**
- Statistiken:
	- [#1522](https://github.com/mainIine/foe-helfer-extension/issues/1522) [#1568](https://github.com/mainIine/foe-helfer-extension/issues/1568) beim wechsel zwischen Außenposten und Stadt gab es einen Knick in der Statistik

- Marktplatz Filter:
	- [#1541](https://github.com/mainIine/foe-helfer-extension/issues/1541) hat man den Filter manuell geöffnet, wurde er nicht geöffnet
	- [#1543](https://github.com/mainIine/foe-helfer-extension/issues/1543) "fair bei niedrigem Lagerstand" wurde korrigiert

- Gildengefechte:
	- [#1547](https://github.com/mainIine/foe-helfer-extension/issues/1547) Tabellenkopf wurde überarbeitet

- Legendäre Bauwerke:
	- [#1567](https://github.com/mainIine/foe-helfer-extension/issues/1567) LG wurden dauerhauft ausgeblendet wenn die Güterkosten zu hoch waren

---

##### 2.5.2.0

**Neu**
- Gildenkassen Export:
	- [#670](https://github.com/mainIine/foe-helfer-extension/issues/670) [#926](https://github.com/mainIine/foe-helfer-extension/issues/926) [#1042](https://github.com/mainIine/foe-helfer-extension/issues/1042) klick alle Seiten durch bis zum gewünschten Datum, dann exportiere dir eine CSV; daraus kannst Du dir eine Excel Pivot Tabelle erstellen; einstellbar in den Einstellungen

- Marktplatz Filter:
	- beim betreten des Marktplatzes öffnet sich ein Fenster in dem alle Einträge nach belieben gefiltert werden können, die Seitenzahl zeigt sofort an wo im Spiel das Angebot anschließend zu finden ist; einstellbar in den Einstellungen

**Update**
- Legendäre Bauwerke:
	- [#1501](https://github.com/mainIine/foe-helfer-extension/issues/1501) can be calculated for a friend/guild member after a visit

- Infobox:
	- [#1509](https://github.com/mainIine/foe-helfer-extension/issues/1509) [#1515](https://github.com/mainIine/foe-helfer-extension/issues/1515) Style überarbeitet, für die neue Version (aktiv auf der Beta) angepasst

- Extension:
	- [#1514](https://github.com/mainIine/foe-helfer-extension/issues/1514) Boxen können durch anklicken in den Vordergrund geholt werden

- Event/Schrittrechner:
	- [#1532](https://github.com/mainIine/foe-helfer-extension/issues/1532) ab sofort werden auch Zutaten des Herbstevents korrekt erkannt

**BugFix**
- Infobox:
	- [#1439](https://github.com/mainIine/foe-helfer-extension/issues/1439) vierfach Einträge gefixt

- Kostenrechner:
	- [#1503](https://github.com/mainIine/foe-helfer-extension/issues/1503) falsche Farbe in der Differenz Spalte führte zu irretationen

- Infobox:
	- [#1506](https://github.com/mainIine/foe-helfer-extension/issues/1506) wenn eine Provinz in der GG eingenommen wurde diese Meldung doppelt mit einem anderern Event angezeigt
	- [#1520](https://github.com/mainIine/foe-helfer-extension/issues/1520) das löschen eines Gebäudes auf der GG Map erzeugte einen leeren Eintrag

- Legendäre Bauwerke:
	- [#1525](https://github.com/mainIine/foe-helfer-extension/issues/1525) wenn man die Kosten auf 0 stellte verschwand das LG

- Produktionsübersicht:
	- [#1528](https://github.com/mainIine/foe-helfer-extension/issues/1528) Boosts von Markusdom. Leuchtturm etc. wurden bei deaktivierter Übermittlung an foe-rechner.de ignoriert

---

##### 2.5.1.0

**Neu**
- Eigenanteilsrechner:
	- Powerleveln hinzugefügt:
		- ein neuer Button, unten rechts, startet diese Funktion in einer extra Box
		- Stufen bis > 100 Verfügbar
		- Gebäude mit Doppelernten werden berücksichtigt

**Update**
- Notizen:
	- [#1300](https://github.com/mainIine/foe-helfer-extension/issues/1300) Notizen werden beim schliessen der Box gespeichert

- Einstellungen:
	- [#1413](https://github.com/mainIine/foe-helfer-extension/issues/1413) Buttons aus dem Menü in die neue Einstellungsbox verschoben

- Produktionsübersicht:
	- [#1424](https://github.com/mainIine/foe-helfer-extension/issues/1424) Bonus von Botschaftern und Gildenboni wurde bei der Rückkehr beim Rathaus nicht angezeigt

- Kostenrechner:
	- [#1433](https://github.com/mainIine/foe-helfer-extension/issues/1433) korrekte Formatierung ergänzt

- Stadtübersicht:
	- [#1438](https://github.com/mainIine/foe-helfer-extension/issues/1438) auf der Map werden beim Mouseover die Zeitalter angezeigt

**BugFix**
- Infobox:
	- [#1375](https://github.com/mainIine/foe-helfer-extension/issues/1375) doppelte Einträge gefixt

- Statistiken:
	- [#917](https://github.com/mainIine/foe-helfer-extension/issues/917) "seit Dienstag" gefixt

- Übersetzungen:
	- [#924](https://github.com/mainIine/foe-helfer-extension/issues/924) String gefixt

- Ereignisse:
	- [#1321](https://github.com/mainIine/foe-helfer-extension/issues/1324) Counter im Menü zählt nun korrekt

- Produktionsübersicht:
	- [#1343](https://github.com/mainIine/foe-helfer-extension/issues/1343) Produktionen konnten doppelt erscheinen

- Eigenanteilsrechner:
	- [#1378](https://github.com/mainIine/foe-helfer-extension/issues/1378) beim Öffnen fremder LGs wurde der eigene Spielernamen angezeigt

- Notizen:
	- [#1454](https://github.com/mainIine/foe-helfer-extension/issues/1454) Content wurde zu breit angezeigt

- Kostenrechner:
	- [#1471](https://github.com/mainIine/foe-helfer-extension/issues/1471) Tooltip bliebt manchmal hängen
	- [#1495](https://github.com/mainIine/foe-helfer-extension/issues/1495) Farben der Level-Warnung angepasst

---

##### 2.5.0.1

**Update**
- Kostenrechner:
	- [#550](https://github.com/mainIine/foe-helfer-extension/issues/550) 80% Button hinzugefügt

**BugFix**

- Eigenanteilsrechner:
	- [#1317](https://github.com/mainIine/foe-helfer-extension/issues/1317) Sound beim Wechseln einer wiederholbaren "gib X FP aus" Quest wird nicht zuverlässig wiedergegeben
	- [#1318](https://github.com/mainIine/foe-helfer-extension/issues/1318) Ton im Kostenrechner komm in Bronzezeit bis FMA auch bei der Quest "erforsche 2 Technologien"

- versteckte Ereignisse:
	- [#1295](https://github.com/mainIine/foe-helfer-extension/issues/1295) blaues Zählericon verhinderte Klick
	- [#1314](https://github.com/mainIine/foe-helfer-extension/issues/1314) doppelte Straßen wurden nicht angezeigt

- Legendäre Bauwerke:
	- [#1305](https://github.com/mainIine/foe-helfer-extension/issues/1305) die Eingabe der FP Kosten verschwand in ein anderes Feld
	- [#1315](https://github.com/mainIine/foe-helfer-extension/issues/1315) Fehler wenn eines der FP produzierenden LG über lvl100 oder höher ist

- Verhandlungsassistent:
	- [#1342](https://github.com/mainIine/foe-helfer-extension/issues/1342) auf dem Beta Server konnte man den Helfer in der GG manuell starten (Inno Games möchte das aber nicht)

---

##### 2.5.0.0

**Neu**
- Boost-Box:
	- eine kleine Box, die in der GEX, GG, GvG und bei den Nachbarn eingeblendet wird zeigt an, wie viele Versuche für Kriegsbeute oder Verhandlungen verbleiben

- Legendäre Bauwerke:
	- diese Box errechnet, welches FP produzierende Gebäude das nächste kostengünstigeste wäre

- Notizen:
	- gruppiert und sortiert Notizen aller Art ablegen. Diese Funktion arbeite mit dem Server und ist geräteübergreifend

**Update**
- Gemäß Innos Wünschen haben wir folgende Elemente entfernt oder abgeändert: [https://foe-rechner.de/news/aenderungen-am-foe-helfer](https://foe-rechner.de/news/aenderungen-am-foe-helfer)
	- Snipe Spalte im Kostenrechner entfernt
	- PvP Aktivitäten entfernt
	- "Plünderhilfe" + Angriff und Verteidigungswerte entfernt
	- Event-Quest wird nur noch verlinkt
	- Verhandlungsassistent wird in den Gildengefechten ausgeblendet
	- versteckte Ereignisse werden ohne Ablaufdatum dargestellt

- Hidden Rewards:
	- ein Zähler zeigt an wie viele Ereignisse noch irgend wo auf der Map liegen

- Produktionsübersicht:
	- [#1185](https://github.com/mainIine/foe-helfer-extension/issues/1185) Zeitalter wird mit ausgegeben
	- Gildenmacht als neuer Tab Verfügbar
	- [#1205](https://github.com/mainIine/foe-helfer-extension/issues/1205) Sortierfunktion für Güter

- Kostenrechner:
	- [#1168](https://github.com/mainIine/foe-helfer-extension/issues/1186) neue Checkbox "Alle", damit werden ohne Abhängkeiten alle Plätze 1-5 ausgegeben

- Enstellungen:
	- [#1169](https://github.com/mainIine/foe-helfer-extension/issues/1189) Firefox: Einstellungsmenü zeigt sporadisch keine übersetzten Texte

**BugFixes**
- Kostenrechner:
	- [#1153](https://github.com/mainIine/foe-helfer-extension/issues/1153) bereits eingzahlte FP wurden nicht korrekt erkannt

- Tavernenbadge:
	- [#1182](https://github.com/mainIine/foe-helfer-extension/issues/1182) Counter für 4. Versuch stimmt nicht, Zeiten werden ab sofort vom Spiel übernommen

- CityMap (intern):
	- [#1184](https://github.com/mainIine/foe-helfer-extension/issues/1184) Fehlerhafte Anzeige der freien Fläche
	- [#1204](https://github.com/mainIine/foe-helfer-extension/issues/1204) Übermittlungsbox wird nicht mehr bim Nachbarn angezeigt

- Produtkionsübersicht:
	- [#1201](https://github.com/mainIine/foe-helfer-extension/issues/1201) Straße mit "Zufriedenheit" werden nicht mehr mit Straßenbindung berechnet
	- [#952](https://github.com/mainIine/foe-helfer-extension/issues/952) [#982](https://github.com/mainIine/foe-helfer-extension/issues/982) basierend auf den Gebäuden des Nachbarn kann ein ca. Angriff/Verteidigungswert berechnet werden
