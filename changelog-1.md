## Changelog - Extension

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
    - [#1592](https://github.com/dsiekiera/foe-helfer-extension/issues/1592) Einstellung zum deaktivieren der Box hinzugefügt

- Gefechtsassistent:
    - Ab sofort wird auch einen Warnung ausgegeben wenn eine seltene Einheit des nächsten ZAs gestorben ist => Möglichkeit zu heilen

**BugFix**
- Eigenanteilsrechner:
    - [#1586](https://github.com/dsiekiera/foe-helfer-extension/issues/1586) Beim Ändern von Archefaktor oder externen Werten sprang der EA-Rechner auf das aktuelle Level zurück, falls zu einem höheren Level weitergescrollt wurde
    - [#1588](https://github.com/dsiekiera/foe-helfer-extension/issues/1588) EA Rechner ludt nicht bzw. aktualisierte sich, wenn externe Spalten befüllt wurden

- Legendäre Bauwerke:
    - [#1587](https://github.com/dsiekiera/foe-helfer-extension/issues/1587) LG-Investitionen Innovation Tower waren unterhalb von Level 10 verrutscht

- Forgepunkte Balken:
    - [#1589](https://github.com/dsiekiera/foe-helfer-extension/issues/1589) FP-Counter in GG zählte nicht hoch

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
    - [#1504](https://github.com/dsiekiera/foe-helfer-extension/issues/1504) Redesign der "Kopieren" Funktion, Scheme ist ab sofort selber einstellbar

- Legendäre Bauwerke:
    - [#1518](https://github.com/dsiekiera/foe-helfer-extension/issues/1518) der erforderliche Platz Faktor kann ab sofort geändert werden
    - [#1574](https://github.com/dsiekiera/foe-helfer-extension/issues/1574) Unterstützung für blaue Galaxie hinzugefügt

- Infobox:
    - [#1542](https://github.com/dsiekiera/foe-helfer-extension/issues/1542) "Willkommenstext" kann mit "Box leeren" entfernt werden

**BugFix**
- Statistiken:
    - [#1522](https://github.com/dsiekiera/foe-helfer-extension/issues/1522) [#1568](https://github.com/dsiekiera/foe-helfer-extension/issues/1568) beim wechsel zwischen Außenposten und Stadt gab es einen Knick in der Statistik

- Marktplatz Filter:
    - [#1541](https://github.com/dsiekiera/foe-helfer-extension/issues/1541) hat man den Filter manuell geöffnet, wurde er nicht geöffnet
    - [#1543](https://github.com/dsiekiera/foe-helfer-extension/issues/1543) "fair bei niedrigem Lagerstand" wurde korrigiert
    
- Gildengefechte:
    - [#1547](https://github.com/dsiekiera/foe-helfer-extension/issues/1547) Tabellenkopf wurde überarbeitet
    
- Legendäre Bauwerke:
    - [#1567](https://github.com/dsiekiera/foe-helfer-extension/issues/1567) LG wurden dauerhauft ausgeblendet wenn die Güterkosten zu hoch waren

---

##### 2.5.2.0

**Neu**
- Gildenkassen Export:
    - [#670](https://github.com/dsiekiera/foe-helfer-extension/issues/670) [#926](https://github.com/dsiekiera/foe-helfer-extension/issues/926) [#1042](https://github.com/dsiekiera/foe-helfer-extension/issues/1042) klick alle Seiten durch bis zum gewünschten Datum, dann exportiere dir eine CSV; daraus kannst Du dir eine Excel Pivot Tabelle erstellen; einstellbar in den Einstellungen

- Marktplatz Filter:
    - beim betreten des Marktplatzes öffnet sich ein Fenster in dem alle Einträge nach belieben gefiltert werden können, die Seitenzahl zeigt sofort an wo im Spiel das Angebot anschließend zu finden ist; einstellbar in den Einstellungen

**Update**
- Legendäre Bauwerke:
    - [#1501](https://github.com/dsiekiera/foe-helfer-extension/issues/1501) can be calculated for a friend/guild member after a visit

- Infobox:
    - [#1509](https://github.com/dsiekiera/foe-helfer-extension/issues/1509) [#1515](https://github.com/dsiekiera/foe-helfer-extension/issues/1515) Style überarbeitet, für die neue Version (aktiv auf der Beta) angepasst

- Extension:
    - [#1514](https://github.com/dsiekiera/foe-helfer-extension/issues/1514) Boxen können durch anklicken in den Vordergrund geholt werden

- Event/Schrittrechner:
    - [#1532](https://github.com/dsiekiera/foe-helfer-extension/issues/1532) ab sofort werden auch Zutaten des Herbstevents korrekt erkannt

**BugFix**
- Infobox:
     - [#1439](https://github.com/dsiekiera/foe-helfer-extension/issues/1439) vierfach Einträge gefixt

- Kostenrechner:
    - [#1503](https://github.com/dsiekiera/foe-helfer-extension/issues/1503) falsche Farbe in der Differenz Spalte führte zu irretationen

- Infobox:
    - [#1506](https://github.com/dsiekiera/foe-helfer-extension/issues/1506) wenn eine Provinz in der GG eingenommen wurde diese Meldung doppelt mit einem anderern Event angezeigt
    - [#1520](https://github.com/dsiekiera/foe-helfer-extension/issues/1520) das löschen eines Gebäudes auf der GG Map erzeugte einen leeren Eintrag

- Legendäre Bauwerke:
    - [#1525](https://github.com/dsiekiera/foe-helfer-extension/issues/1525) wenn man die Kosten auf 0 stellte verschwand das LG
    
- Produktionsübersicht:
    - [#1528](https://github.com/dsiekiera/foe-helfer-extension/issues/1528) Boosts von Markusdom. Leuchtturm etc. wurden bei deaktivierter Übermittlung an foe-rechner.de ignoriert

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
    - [#1300](https://github.com/dsiekiera/foe-helfer-extension/issues/1300) Notizen werden beim schliessen der Box gespeichert

- Einstellungen:
    - [#1413](https://github.com/dsiekiera/foe-helfer-extension/issues/1413) Buttons aus dem Menü in die neue Einstellungsbox verschoben
    
- Produktionsübersicht:
    - [#1424](https://github.com/dsiekiera/foe-helfer-extension/issues/1424) Bonus von Botschaftern und Gildenboni wurde bei der Rückkehr beim Rathaus nicht angezeigt

- Kostenrechner:
    - [#1433](https://github.com/dsiekiera/foe-helfer-extension/issues/1433) korrekte Formatierung ergänzt
    
- Stadtübersicht:
    - [#1438](https://github.com/dsiekiera/foe-helfer-extension/issues/1438) auf der Map werden beim Mouseover die Zeitalter angezeigt

**BugFix**
- Infobox:
    - [#1375](https://github.com/dsiekiera/foe-helfer-extension/issues/1375) doppelte Einträge gefixt

- Statistiken:
    - [#917](https://github.com/dsiekiera/foe-helfer-extension/issues/917) "seit Dienstag" gefixt

- Übersetzungen:
    - [#924](https://github.com/dsiekiera/foe-helfer-extension/issues/924) String gefixt

- Ereignisse:
    - [#1321](https://github.com/dsiekiera/foe-helfer-extension/issues/1324) Counter im Menü zählt nun korrekt

- Produktionsübersicht:
    - [#1343](https://github.com/dsiekiera/foe-helfer-extension/issues/1343) Produktionen konnten doppelt erscheinen

- Eigenanteilsrechner:
    - [#1378](https://github.com/dsiekiera/foe-helfer-extension/issues/1378) beim Öffnen fremder LGs wurde der eigene Spielernamen angezeigt

- Notizen:
    - [#1454](https://github.com/dsiekiera/foe-helfer-extension/issues/1454) Content wurde zu breit angezeigt

- Kostenrechner:
    - [#1471](https://github.com/dsiekiera/foe-helfer-extension/issues/1471) Tooltip bliebt manchmal hängen
    - [#1495](https://github.com/dsiekiera/foe-helfer-extension/issues/1495) Farben der Level-Warnung angepasst

---

##### 2.5.0.1

**Update**
- Kostenrechner:
    - [#550](https://github.com/dsiekiera/foe-helfer-extension/issues/550) 80% Button hinzugefügt
    
**BugFix**

- Eigenanteilsrechner:
    - [#1317](https://github.com/dsiekiera/foe-helfer-extension/issues/1317) Sound beim Wechseln einer wiederholbaren "gib X FP aus" Quest wird nicht zuverlässig wiedergegeben
    - [#1318](https://github.com/dsiekiera/foe-helfer-extension/issues/1318) Ton im Kostenrechner komm in Bronzezeit bis FMA auch bei der Quest "erforsche 2 Technologien"

- versteckte Ereignisse:
    - [#1295](https://github.com/dsiekiera/foe-helfer-extension/issues/1295) blaues Zählericon verhinderte Klick
    - [#1314](https://github.com/dsiekiera/foe-helfer-extension/issues/1314) doppelte Straßen wurden nicht angezeigt
    
- Legendäre Bauwerke:
    - [#1305](https://github.com/dsiekiera/foe-helfer-extension/issues/1305) die Eingabe der FP Kosten verschwand in ein anderes Feld
    - [#1315](https://github.com/dsiekiera/foe-helfer-extension/issues/1315) Fehler wenn eines der FP produzierenden LG über lvl100 oder höher ist
    
- Verhandlungsassistent:
    - [#1342](https://github.com/dsiekiera/foe-helfer-extension/issues/1342) auf dem Beta Server konnte man den Helfer in der GG manuell starten (Inno Games möchte das aber nicht)

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
    - [#1185](https://github.com/dsiekiera/foe-helfer-extension/issues/1185) Zeitalter wird mit ausgegeben
    - Gildenmacht als neuer Tab Verfügbar
    - [#1205](https://github.com/dsiekiera/foe-helfer-extension/issues/1205) Sortierfunktion für Güter
    
- Kostenrechner:
    - [#1168](https://github.com/dsiekiera/foe-helfer-extension/issues/1186) neue Checkbox "Alle", damit werden ohne Abhängkeiten alle Plätze 1-5 ausgegeben
    
- Enstellungen:
    - [#1169](https://github.com/dsiekiera/foe-helfer-extension/issues/1189) Firefox: Einstellungsmenü zeigt sporadisch keine übersetzten Texte

**BugFixes**
- Kostenrechner:
    - [#1153](https://github.com/dsiekiera/foe-helfer-extension/issues/1153) bereits eingzahlte FP wurden nicht korrekt erkannt

- Tavernenbadge:
    - [#1182](https://github.com/dsiekiera/foe-helfer-extension/issues/1182) Counter für 4. Versuch stimmt nicht, Zeiten werden ab sofort vom Spiel übernommen    

- CityMap (intern): 
    - [#1184](https://github.com/dsiekiera/foe-helfer-extension/issues/1184) Fehlerhafte Anzeige der freien Fläche
    - [#1204](https://github.com/dsiekiera/foe-helfer-extension/issues/1204) Übermittlungsbox wird nicht mehr bim Nachbarn angezeigt

- Produtkionsübersicht:
    - [#1201](https://github.com/dsiekiera/foe-helfer-extension/issues/1201) Straße mit "Zufriedenheit" werden nicht mehr mit Straßenbindung berechnet

---

##### 2.4.6.2

**BugFix**
- Extension: 
    - Debug Code entfernt

- Kostenrechner:
    - [#1118](https://github.com/dsiekiera/foe-helfer-extension/issues/1118) [#1124](https://github.com/dsiekiera/foe-helfer-extension/issues/1124) Lautsprecher Button gefixt

- Produktionsübersicht:
    - zweispurige Straßen werden bei der Effizienz beachtet

---

##### 2.4.6.1

**BugFix**
- FP-Bar:
    - [#836](https://github.com/dsiekiera/foe-helfer-extension/issues/836) [#1025](https://github.com/dsiekiera/foe-helfer-extension/issues/1025) [#1044](https://github.com/dsiekiera/foe-helfer-extension/issues/1044) [#1059](https://github.com/dsiekiera/foe-helfer-extension/issues/1059) [#1075](https://github.com/dsiekiera/foe-helfer-extension/issues/1075) [#1089](https://github.com/dsiekiera/foe-helfer-extension/issues/1089) [#1097](https://github.com/dsiekiera/foe-helfer-extension/issues/1097) [#1098](https://github.com/dsiekiera/foe-helfer-extension/issues/1098) [#1100](https://github.com/dsiekiera/foe-helfer-extension/issues/1100) [#1101](https://github.com/dsiekiera/foe-helfer-extension/issues/1101) [#1108](https://github.com/dsiekiera/foe-helfer-extension/issues/1108) [#1114](https://github.com/dsiekiera/foe-helfer-extension/issues/1114) [#1116](https://github.com/dsiekiera/foe-helfer-extension/issues/1116) [#1117](https://github.com/dsiekiera/foe-helfer-extension/issues/1117) Inno hat eine neue Technik für die Verwaltung und Übertragung der Forgepunkte integriert, wir haben das nun angepasst

- Infobox:
    - [#555](https://github.com/dsiekiera/foe-helfer-extension/issues/555) [#742](https://github.com/dsiekiera/foe-helfer-extension/issues/742) [#771](https://github.com/dsiekiera/foe-helfer-extension/issues/771) [#939](https://github.com/dsiekiera/foe-helfer-extension/issues/939) [#1080](https://github.com/dsiekiera/foe-helfer-extension/issues/1080) Falsche FP Anzahl beim leveln eines anderen LGs in der Box gefixt

- Erntehelfer:
    - [#1036](https://github.com/dsiekiera/foe-helfer-extension/issues/1036) [#1110](https://github.com/dsiekiera/foe-helfer-extension/issues/1110) Nicht plünderbares Gebäude wurde als plünderbar angezeigt
    - [#1058](https://github.com/dsiekiera/foe-helfer-extension/issues/1058) Workaround für verschobenes Fenster außerhalb des Viewports

- Statistik:
    - [#1077](https://github.com/dsiekiera/foe-helfer-extension/issues/1077) gleiche Einheiten als Belohnung wurden nicht gruppiert

- Kostenrechner:
    - [#1118](https://github.com/dsiekiera/foe-helfer-extension/issues/1118) The speaker button in the pre-scan box was not working

---

##### 2.4.6

**Neu**
- Citymap:
    - Es gibt eine neue Option zum planen einer Stadt: [weitere Infos](https://foe-rechner.de/docs/1/stadtplaner/)

**Update**
- Produktionsübersicht:
    - [#590](https://github.com/dsiekiera/foe-helfer-extension/issues/590) [#945](https://github.com/dsiekiera/foe-helfer-extension/issues/945) Diamantproduktionen werden, wenn vorhanden, angezeigt
    - [#997](https://github.com/dsiekiera/foe-helfer-extension/issues/997) Es kann umgeschaltet werden zwischen Tages- und aktueller Produktion
    - [#999](https://github.com/dsiekiera/foe-helfer-extension/issues/999) Außenposten Güter (Mars/Asteroiden) werden korrekt erfasst
    - [#998](https://github.com/dsiekiera/foe-helfer-extension/issues/998) [#1026](https://github.com/dsiekiera/foe-helfer-extension/issues/1026) Die Güter werden pro Zeitalter summiert

- Ernte-Helfer:
    - [#952](https://github.com/dsiekiera/foe-helfer-extension/issues/952) [#982](https://github.com/dsiekiera/foe-helfer-extension/issues/982) basierend auf den Gebäuden des Nachbarn kann ein ca. Angriff/Verteidigungswert berechnet werden

- Einstellungen:
    - [#987](https://github.com/dsiekiera/foe-helfer-extension/issues/987) Infofenster für Investitionen ist abschaltbar
    - [#972](https://github.com/dsiekiera/foe-helfer-extension/issues/972) Eigenanteilsrechner ist auch für andere LGs zuschaltbar

**BugFix**
- Extension:
    - [#764](https://github.com/dsiekiera/foe-helfer-extension/issues/764) doppelten Eventhandler gefixt
    - [#899](https://github.com/dsiekiera/foe-helfer-extension/issues/899) [#909](https://github.com/dsiekiera/foe-helfer-extension/issues/909) [#922](https://github.com/dsiekiera/foe-helfer-extension/issues/922) [#927](https://github.com/dsiekiera/foe-helfer-extension/issues/927) [#937](https://github.com/dsiekiera/foe-helfer-extension/issues/937) [#981](https://github.com/dsiekiera/foe-helfer-extension/issues/981) [#1045](https://github.com/dsiekiera/foe-helfer-extension/issues/1045) [#1053](https://github.com/dsiekiera/foe-helfer-extension/issues/1053) diverse Eingabe- und Dropdownelemente konnten nicht geändert werden
    - [#993](https://github.com/dsiekiera/foe-helfer-extension/issues/993) Übersetzungsfehler korrgiert

- Statistikmodul:
    - [#902](https://github.com/dsiekiera/foe-helfer-extension/issues/902) Box war bei zu kleiner Auflösung zu groß

- Außenposten:
    - [#1019](https://github.com/dsiekiera/foe-helfer-extension/issues/1019) Werte werden wieder korrekt berechnet

---

##### 2.4.5

**Neu**
- Statistik:
    - Langzeittracking der Belohungen für GEX, Gildengefechte, Himeji und Frachter
    - Langzeit-Bestandstracking für eigenen Vorrat, Gildenkassen, eigene Armeen
    - Langzeittracking für Gildengefechte
    - Langzeittracking für GvG Güterausgaben [#812](https://github.com/dsiekiera/foe-helfer-extension/issues/812)
    - verschiedene Darstellungen
    - verschiedene Exportmöglichkeiten (CSV, XLS)
    - verschieden Filter (Zeitspannen, Eras)

- Armee-Blocker:
    - [#866](https://github.com/dsiekiera/foe-helfer-extension/issues/866) sind in der zweiten Angriffswelle nur noch Agenten enthalten, legt sich ein Fenster über den "Angriff"-Button und verhindert die versehendliche Niederlage

**Update**
- Außenposten:
    - [#847](https://github.com/dsiekiera/foe-helfer-extension/issues/847) auf Wunsch werden zwischensummen pro Zeile dargestellt
    - [#672](https://github.com/dsiekiera/foe-helfer-extension/issues/672) zeigt nun die erforderliche Beute bei den Ägyptern an

- Erntehelfer:
    - [#845](https://github.com/dsiekiera/foe-helfer-extension/issues/845) geschätzer Angriffs- und Verteidigungswert wird angezeigt (Berechnung anhand der Gebäude)

- Verhandlungsassisten:
    - [#786](https://github.com/dsiekiera/foe-helfer-extension/issues/786) [#694](https://github.com/dsiekiera/foe-helfer-extension/issues/694) [#572](https://github.com/dsiekiera/foe-helfer-extension/issues/572) zwei neue Checkboxen erlauben eine andere Aufteilung der Güter ("Aktuelle Güter sparen", "Medaillen sparen")
    
- Armeeübersicht:
    - [#741](https://github.com/dsiekiera/foe-helfer-extension/issues/741) der vierte Tab der Alcaernte bleibt nun dauerhaft sichtbar

**BugFix**
- Produktionsübersicht:
    - [#884](https://github.com/dsiekiera/foe-helfer-extension/issues/884) falsches Zeitformat geändert

- PvP Übersicht:
    - [#763](https://github.com/dsiekiera/foe-helfer-extension/issues/763) Darstellungsfehler im Stadtschild wenn Nachbar noch nicht bekannt, behoben

- Erntehelfer:
    - [#844](https://github.com/dsiekiera/foe-helfer-extension/issues/844) es wurde "Apfelsaft" statt "Gildenmacht" ausgegeben

- Einstellungen:
    - [#851](https://github.com/dsiekiera/foe-helfer-extension/issues/851) Übersetzung korrgiert

- Außenposten:
    - [#848](https://github.com/dsiekiera/foe-helfer-extension/issues/848) Rundungsfehler bei 4-Ernte gefixt
    - [#843](https://github.com/dsiekiera/foe-helfer-extension/issues/843) Namen der Agyptischen Gebäude waren zu lang

- PvP Übersicht:
    - [#805](https://github.com/dsiekiera/foe-helfer-extension/issues/805) [#820](https://github.com/dsiekiera/foe-helfer-extension/issues/820) [#826](https://github.com/dsiekiera/foe-helfer-extension/issues/826) Kämpfen gegen Nachbarn wurden nicht alle erfasst

- Changelog:
    - [#807](https://github.com/dsiekiera/foe-helfer-extension/issues/807) Englische Darstellung gefixt

- FP-Übersicht:
    - [#798](https://github.com/dsiekiera/foe-helfer-extension/issues/798) FP-Balken wurde nicht hinzugerechnet
    
 - Extension:
    - [#772](https://github.com/dsiekiera/foe-helfer-extension/issues/772) Meldung beim öffnen des Gildenforums im neuen Fenster entfernt
    
- Forschungskosten:
    - [#769](https://github.com/dsiekiera/foe-helfer-extension/issues/769) nach dem Freischalten wurden die Werte nicht neu berechnet
    
---

##### 2.4.4

**Neu**
- PvP Übersicht:
    - [#686](https://github.com/dsiekiera/foe-helfer-extension/issues/686) Nachbarschafts - Plünderdatenbank
    - Werte von Dir und dem Nachbarn der angreifenden, verteidigenden Armeen werden notiert
    - welche Art von Kampf du durchgeführt hast und ob gewonnen, verloren oder aufgegeben
    - Sämtliche Zeiten, wann du angegriffen, geplündert oder ihn zuletzt besucht hast
    - was du geplündert hast, aus welchem Gebäude
    - zeigt alle aktiven Stadtschilde deiner Nachbarschaft

**Update**
- Extension:
    - [#727](https://github.com/dsiekiera/foe-helfer-extension/issues/727) Fehlende Texte bei den Mo/Po Meldungen ergänzt
    - [#726](https://github.com/dsiekiera/foe-helfer-extension/issues/726) Extension fragt nach einem Update ab sofort nach ob es neu laden darf

- Kostenrechner:
    - [#756](https://github.com/dsiekiera/foe-helfer-extension/issues/756) Nummerierung in den Listen des Vorabscanns integriert

**Bugfix**
- Forschungskostenrechner: 
    - [#718](https://github.com/dsiekiera/foe-helfer-extension/issues/718) "Asteroiden Eis" wurde vom Rechner nicht erkannt

---

##### 2.4.3.2

**Bugfix**
- Menü:
    - [#709](https://github.com/dsiekiera/foe-helfer-extension/issues/709) Menüleiste gefixt

---

##### 2.4.3.1
**Neu**
- Kits:
    - Diese Box zeigt alle Sets / Auswahlkits aus dem Inventar an

**Update**
- Extension:
    - einige sprachliche Anpassungen der Übersetzer
    - [#671](https://github.com/dsiekiera/foe-helfer-extension/issues/671) Changelog-Link in der Englischen Sprache integriert


- Eventaufgaben:
    - Chestbox (Vorschläge für Sprünge) optisch und sprachlich angepasst
    
- Erreignisse:
    - Box grafisch angepasst
    - Kirschbaumgrafik ergänzt

**Bugfix**
- Extension:
    - [#688](https://github.com/dsiekiera/foe-helfer-extension/issues/688) Neues Zeitalter wird nun erkannt

- Eigenanteilsrechner:
    - [#682](https://github.com/dsiekiera/foe-helfer-extension/issues/682) "Ausklappfeil" korrigiert
    
---

##### 2.4.3

**Update**
- Verhandlungsassistent:
    - Zeigt ab sofort an welches falsche Gut tatsächlich geklickt wurde
    - Schlägt ab sofort nach dem letzen Zug den nächsten noch vor

- Eventaufgaben:
    - Helfer für "Kirsch-Event" integriert, schlägt entweder besten Weg für Tagespreis oder Preise vor

- Übersetzungen:
    - Italienisch, Französisch und Russisch wurde von Community Mitgliedern angepasst
    - Slovenisch hinzugefügt

**Bugfix**
- Extension:
    - [#654](https://github.com/dsiekiera/foe-helfer-extension/issues/654) fehlende Übersetzungen ergänzt fehlende Variablen für Übersetzungen ergänzt
    - falsche Grafik für "Fragezeichen" am oberen Rand der Boxen gefixt

- Eventaufgaben:
    - [#648](https://github.com/dsiekiera/foe-helfer-extension/issues/648) wurde nach Abschluß des Events noch fehlerhaft angezeigt

- Forschungskosten:
    - [#638](https://github.com/dsiekiera/foe-helfer-extension/issues/638) Forschungskosten wurden fehlerhaft berechnet

- Verhandlungsassistent:
    - [#617](https://github.com/dsiekiera/foe-helfer-extension/issues/617) [#614](https://github.com/dsiekiera/foe-helfer-extension/issues/614) Falsche Guterkennung gefixt

---

##### 2.4.2.2

**Update**
- Extension:
    - Italienische Übersetzunge hinzugefügt
    - Portugiesisch abgepasst

- Investitionen:
    - neuer API Endpunkt + neue Landigpage (History, Rang Warnung, usw.)

**Bugfix**
- Extension:
    - [#602](https://github.com/dsiekiera/foe-helfer-extension/issues/602) fehlende Übersetzungen ergänzt

- Menü:
    - [#609](https://github.com/dsiekiera/foe-helfer-extension/issues/609) Speicherproblem beim verändern via Drag&Drop behoben

---

##### 2.4.2.1

**Update**
- Mopelaktivitäten:
    - Neustrukturierung der API + Datenbank
    - Angriffe + Plünderungen werden erfasst

**Bugfix**
- Menü:
    - Speicherproblem beim verändern via Drag&Drop behoben

---

##### 2.4.2
**Neu**
- Investitionen:
    - [#413](https://github.com/dsiekiera/foe-helfer-extension/issues/413) [#415](https://github.com/dsiekiera/foe-helfer-extension/issues/415) [#429](https://github.com/dsiekiera/foe-helfer-extension/issues/413) Gesamtübersicht FP eingefügt (Rathaus > Neuigkeiten > Legendäre Bauwerke)

**Update**
- Produtkübersicht:
    - [#278](https://github.com/dsiekiera/foe-helfer-extension/issues/278) [#484](https://github.com/dsiekiera/foe-helfer-extension/issues/484) Güter Sortierung nach Zeitalter

- Armeeübersicht:
    - [#434](https://github.com/dsiekiera/foe-helfer-extension/issues/434) [#467](https://github.com/dsiekiera/foe-helfer-extension/issues/467) Neue Armee Boni integriert
    
- Verhandlungsassitent:    
    - [#519](https://github.com/dsiekiera/foe-helfer-extension/issues/519) Nummerntasten Anzeige und Benutzung (erste Zahl Person, zweite Taste Gut + Leertaste abschicken)

- Menü:
    - [#561](https://github.com/dsiekiera/foe-helfer-extension/issues/561) Fenster schnell wieder ausblenden durch zweiten Klick in die Leiste

**Bugfix**
- Extension: 
    - [#540](https://github.com/dsiekiera/foe-helfer-extension/issues/540) Extension wird bei allen forgeofempires.com Subseiten aktiv, die "game" enthalten

- Menü:
    - [#411](https://github.com/dsiekiera/foe-helfer-extension/issues/411) [#413](https://github.com/dsiekiera/foe-helfer-extension/issues/413) doppelte Einträge gefixt

- Verhandlungsassitent:
    - [#421](https://github.com/dsiekiera/foe-helfer-extension/issues/421) Vorrats-Tooltip beim Verhandlungsassistent blieb sichtbar
    - [#459](https://github.com/dsiekiera/foe-helfer-extension/issues/459) zeigte ausgeschlossene Güter
    - [#491](https://github.com/dsiekiera/foe-helfer-extension/issues/491) Fehler beim Verhandlungsassistent
    
- FP-Lager:
    - [#424](https://github.com/dsiekiera/foe-helfer-extension/issues/424) Kleiner Bug beim FP kaufen (Münzen Rechner)

- Infobox:
    - [#451](https://github.com/dsiekiera/foe-helfer-extension/issues/451) Falsche Anzahl der FP beim Level-Up/Info Box
    - [#462](https://github.com/dsiekiera/foe-helfer-extension/issues/462) Infobox warf Exceptions

- Kostenrechner:
    - [#465](https://github.com/dsiekiera/foe-helfer-extension/issues/465) Anzeige Rest-FP aktive Schleifenquest fehlerhaft

- Eigenanteilsrechner:
    - [#501](https://github.com/dsiekiera/foe-helfer-extension/issues/501) Eigenanteilsrechner zeigt keine sicheren Plätze an

- Forschungskosten:
    - [#571](https://github.com/dsiekiera/foe-helfer-extension/issues/571) Forschungskosten für das Marszeitalter ergänzt

- Ereignisse:
    - [#499](https://github.com/dsiekiera/foe-helfer-extension/issues/499) Große Straße wird ausgeblendet, wenn nicht gebaut

- Armeeübersicht:
    - [#582](https://github.com/dsiekiera/foe-helfer-extension/issues/582) Icons der Arme-Einheiten waren verschwommen

- Produtkübersicht:
    - [#545](https://github.com/dsiekiera/foe-helfer-extension/issues/545) Ruhmeshalle wurde nicht dargestellt

---

##### 2.4.1.1

**Bugfix**
- Infobox:
    - [#380](https://github.com/dsiekiera/foe-helfer-extension/issues/380) [#408](https://github.com/dsiekiera/foe-helfer-extension/issues/408) Level-Up zeigt korrekte FPs an

- Motivationen/Polieren:
    - [#388](https://github.com/dsiekiera/foe-helfer-extension/issues/388) Infos werden wieder korrekt übertragen
    
- Eventliste:
    - [#405](https://github.com/dsiekiera/foe-helfer-extension/issues/405) [#432](https://github.com/dsiekiera/foe-helfer-extension/issues/432) Beim erreichen der Tagesaufgaben war die Liste komplett leer

- Citymap:
    - [#412](https://github.com/dsiekiera/foe-helfer-extension/issues/412) Manche Gebäude am linken Rand wurden nicht eingeblendet

- Kostenrechner:
    - [#416](https://github.com/dsiekiera/foe-helfer-extension/issues/416) Zeile unten am Rand für Schleifenquests war verschwunden

**Update**
- Infobox:
    - [#435](https://github.com/dsiekiera/foe-helfer-extension/issues/435) Speichert ab sofort die eingestellten Filter

- Menü:
    - Hält man ein Menü-Item via Mouse-Drag min. 1,5s über einen der aktiven hoch- oder runter Pfeile, scrollt das Menü zur nächsten Ansicht

- Verhandlungsassistent:
    - [#420](https://github.com/dsiekiera/foe-helfer-extension/issues/420) Erkennt vertauschte Güter und kann damit weiter arbeiten, wenn es noch in die Logik passt

---

##### 2.4.1

**Neu**
- Eventliste: 
    - [#309](https://github.com/dsiekiera/foe-helfer-extension/issues/309) Events in "Rohform" werden aufgelistet, das aktuelle (gelber Rahmen) wird korrekten mit Daten befüllt; Autoupdate


- Citymap: 
    - [#249](https://github.com/dsiekiera/foe-helfer-extension/issues/249) 2D Übersicht (schematisch) der eigenen Stadt


- Ereignisse:
    - [#365](https://github.com/dsiekiera/foe-helfer-extension/issues/365) [#378](https://github.com/dsiekiera/foe-helfer-extension/issues/378) Werden ausgelesen und in einer Box mit Start-/Endzeit + einer "etwa" Ortsangabe ausgegeben. Danke an [h3llraz0r](https://github.com/Marcel-Wagner)

**Update**
- Extension: 
    - Schriften der Boxen lesbarer gemacht


- Infobox: 
    - [#333](https://github.com/dsiekiera/foe-helfer-extension/issues/333) Lässt sich einklappen
    - [#379](https://github.com/dsiekiera/foe-helfer-extension/issues/379) Gildengefechte werden in Infobox aufgeführt wenn GG Karte betreten wird. Daten werden von Inno nur dann übermittelt; Filter komplett überarbeitet


- Kostenrecher:
    - Umfangreiches Update, Box ist in linken (Fördern) und rechten Breich (snipern) aufgeteilt
    - Hintergrundfarben + ToolTipps erklären beim hover über gelb und rot
    - [#171](https://github.com/dsiekiera/foe-helfer-extension/issues/171) [#353](https://github.com/dsiekiera/foe-helfer-extension/issues/353) Zeig in einer kleiner roten Zahl hinter dem Mäzen Bonus an wie viel bis "save" fehlt (linke Seite)


- Gildengefechte:
    - [#330](https://github.com/dsiekiera/foe-helfer-extension/issues/330) Box lässt sich verschieben, minimieren und merkt sich letzte Position
    - [#335](https://github.com/dsiekiera/foe-helfer-extension/issues/335) i18n ergänzt 


- FP-Lager: 
    - Bei Klick auf kaufen erscheint oben rechts neben den Lager die Info wie viele FP derzeit für Münzen kaufbar wären. Danke an [h3llraz0r](https://github.com/Marcel-Wagner)


- Erntehelfer:
    - [#333](https://github.com/dsiekiera/foe-helfer-extension/issues/333) Lässt sich einklappen
    - Mousedrag für die Map hinzugefügt
    - neue Zoom-Technik verbaut


- Menü:
    - [#351](https://github.com/dsiekiera/foe-helfer-extension/issues/351) Länge lässt sich über die Einstellungen in der Höhe begrenzen


**BugFix**
- Produktionsübersicht:
    - [#126](https://github.com/dsiekiera/foe-helfer-extension/issues/126) [#338](https://github.com/dsiekiera/foe-helfer-extension/issues/338) Münzproduktion von Wunsch- und Jungbrunnen gefixt
    - [#349](https://github.com/dsiekiera/foe-helfer-extension/issues/349) Doppelter Name bei den Resourcen ließ "Verpackungen" verschwinden


- Infobox: 
    - [#203](https://github.com/dsiekiera/foe-helfer-extension/issues/203) Titel werden beim umbennen erkannt und geändert
    - [#348](https://github.com/dsiekiera/foe-helfer-extension/issues/348) [#380](https://github.com/dsiekiera/foe-helfer-extension/issues/380) Box warf bei Level-Up Meldung Fehler


- Menü: 
    - [#331](https://github.com/dsiekiera/foe-helfer-extension/issues/331) Tooltips gefixt


- Entehelfer:
    - [#339](https://github.com/dsiekiera/foe-helfer-extension/issues/339) "Ruhm" (Kronen) wird als Resource erkannt und ausgebeben


- Kostenrechner:
    - [#341](https://github.com/dsiekiera/foe-helfer-extension/issues/341) Fehler behoben wenn der 5 Platz keinen "Reward" bekam stürzte die Box ab


- Eigenanteilsrechner:
    - [#332](https://github.com/dsiekiera/foe-helfer-extension/issues/332) Höhe für "Werte kopieren" im Firefox korrigiert

---

##### 2.4.0.1

**Neu**
- Extension:
    - volle [Chrome](https://chrome.google.com/webstore/detail/foe-helper/bkagcmloachflbbkfmfiggipaelfamdf) und [Firefox](https://addons.mozilla.org/addon/foe-helper/) Unterstützung

**Update**
- Menü:
    - [#279](https://github.com/dsiekiera/foe-helfer-extension/issues/279) Drag&Drop für Sortierung eingebaut
    - resettet sich nach einem Resize

**BugFix**
- Extension:
    - [#284](https://github.com/dsiekiera/foe-helfer-extension/issues/284) neue Mechanik zum besseren stabilen laden der kompletten Extension
    - [#297](https://github.com/dsiekiera/foe-helfer-extension/issues/297) der FP Balken (oben Mitte) wird ab sofort zum Inventar dazu gerechnet
    
- Kampagnen Karte:
    - [#260](https://github.com/dsiekiera/foe-helfer-extension/issues/260) Angenommene Handelsangebote werden mit der Güterliste verrechnet
    
- Eigenanteilsrechner:
    - [#285](https://github.com/dsiekiera/foe-helfer-extension/issues/285) Breite des Rechners für Englisch vergrößert
    - [#195](https://github.com/dsiekiera/foe-helfer-extension/issues/195) Merken- und Kopierenbutton funktionieren nun sauber

- Außenposten:
    - Übersetzungen gefixt
    - [#302](https://github.com/dsiekiera/foe-helfer-extension/issues/302) Fehlerhafte leere Box behoben

- Kostenrechner:
    - [#239](https://github.com/dsiekiera/foe-helfer-extension/issues/239) [#261](https://github.com/dsiekiera/foe-helfer-extension/issues/261) [#287](https://github.com/dsiekiera/foe-helfer-extension/issues/287) Farben für korrekte Belegung gefixt
    - [#276](https://github.com/dsiekiera/foe-helfer-extension/issues/276) Rundung Kostenrechner vs. Vorab Scan gefixt
    - [#282](https://github.com/dsiekiera/foe-helfer-extension/issues/282) am unteren Ende wird eine Leiste mit aktiven Schleifen-Quests angezeigt
    
- Gildengefechte
    - [#306](https://github.com/dsiekiera/foe-helfer-extension/issues/306) fehlerhaftes laden der Portraits hat die Box abstürzen lassen

---

##### 2.4.0

**BugFix**
- Extension:
    - [#314](https://github.com/dsiekiera/foe-helfer-extension/issues/314) Firefox Version lädt die Module in falscher Reihenfolge

---

##### 2.3.15.1

**Update**
- Erntehelfer:
    - Sortierung geändert, Münzen und Werkzeugen werden erst am Ende der Tabelle angezeigt


**BugFix**
- Gebäudenamen
    - fehlerhafte Konstante konnte Extensionübersetzungen zerstören
    

---

##### 2.3.15

**Neu**
- Gildengefechte: 
    - [#206](https://github.com/dsiekiera/foe-helfer-extension/issues/206) - Snapshot zwischenspeichern

**Update**
- Produktionen:
    - [#140](https://github.com/dsiekiera/foe-helfer-extension/issues/140) - Bevölkerung und Zufriedenheit hinzugefügt
     
- Verhandlungen:
    - [#215](https://github.com/dsiekiera/foe-helfer-extension/issues/215) - Default Priorität von Marsgütern verringert
     
- Eigenanteilsrechner:
    - [#263](https://github.com/dsiekiera/foe-helfer-extension/issues/263) - aktivierter Prozentbutton wird hervorgehoben

- Außenposten:
    - [#136](https://github.com/dsiekiera/foe-helfer-extension/issues/136) - Erweiterungen können geplant werden und Gesamtkosten werden mit aufgelistet
    - [#240](https://github.com/dsiekiera/foe-helfer-extension/issues/240) - Kosten für die nächste Erweiterung wird angezeigt, Aktuelle Münzproduktion pro 4 Stunden wird angezeigt

- Menü:
    - [#196](https://github.com/dsiekiera/foe-helfer-extension/issues/196) - Die Menüleiste wird nun je nach Auflösung dynamisch in der Höhe angepasst

**BugFix**

- Produktionen:
    - [#173](https://github.com/dsiekiera/foe-helfer-extension/issues/173) - Boost auf Grund von verärgerter/begeisterter Bevölkerung hinzugefügt, Vorratsboosts auf Nicht Produktionsgebäude korrigiert
	- [#269](https://github.com/dsiekiera/foe-helfer-extension/issues/269) - Korrekte Karte wird beim Klick auf das Auge geladen (Gebäudestandort)
    - [#246](https://github.com/dsiekiera/foe-helfer-extension/issues/246) - Fehler in der Güterübersicht des Gutes "Verpackungen" behoben.

- Verhandlungen: 
    - [#268](https://github.com/dsiekiera/foe-helfer-extension/issues/268) - Fehler bei der Erkennung der 4. Runde in der GEX bei deaktiviertem Tavernen Badge behoben
    - [#215](https://github.com/dsiekiera/foe-helfer-extension/issues/215) - Fehler beim Ermitteln des aktuellen Lagerstandes bei deaktiviertem Außenpostenmodul behoben

- Eigenanteilsrechner:
    - [#248](https://github.com/dsiekiera/foe-helfer-extension/issues/248) - Falscher Name bei mehreren Accounts pro Browser

- Infobox:
    - [#207](https://github.com/dsiekiera/foe-helfer-extension/issues/207) - Eigener Name taucht nicht mehr auf
    - [#262](https://github.com/dsiekiera/foe-helfer-extension/issues/262) - bessere Funktion zum updaten der Nachrichten-Überschriften
    - [#281](https://github.com/dsiekiera/foe-helfer-extension/issues/281) - hing sich beim wechsel in die GildenGefechte auf


---

##### 2.3.14

**Neu**
- Extension:
    - Spanisch eingefügt

- Karte der Kontinente:
	- Besucht man eine Provinz werden auf Wunsch alle Güterkosten für diese Provinz angezeigt - Danke an [Th3C0D3R](https://github.com/Th3C0D3R)


**Update**
- Eigenanteilsrechner:	
    - es werden nun die FP bis leveln des LGs angezeigt [#205](https://github.com/dsiekiera/foe-helfer-extension/issues/205)
    - es ist nun möglich den EA Rechner auch für bereits abgeschlossene Level zu verwenden, im LG rückwärts blättern

- Produktübersicht:
	- Zusammenzählung der Güter wird nach Zeitaltern gruppiert [#228](https://github.com/dsiekiera/foe-helfer-extension/issues/228)
	- Mit dem Auge-Icon kann das eigene Gebäude auf der Map angezeigt werden [#154](https://github.com/dsiekiera/foe-helfer-extension/issues/154)
	- "tägliche FP" und sämtliche Bonus von Botschaftern werden in das Rathaus eingefügt und dargestellt [#175](https://github.com/dsiekiera/foe-helfer-extension/issues/175)

- Verhandlungsassisten:
    - Güterkosten optimiert
    - es werden nun die durchschnittlichen Güterkosten für den Rest der Verhandlung angezeigt
    - Warnmeldungen, wenn der Gütervorrat knapp wird
    - Mouseover über Icons (oberste Reihe) zeigt Lagerbestand

**BugFix**

- Armee-Übersicht:
	- beim entfernen von Einheiten aus dem Angriff oder der Verteidigung kam es zu Fehlern
	- wenn kein Alcatraz vorhanden war, kam es zu einem Fehler

- Infobox:
	- Bei LevelUp Nachrichten stand statt dem Level “unknown” [Dank an Thomas (via Mail)]


---

##### v2.3.13
**Neu**
- Verhandlungsassistent:
    - schlägt durch berechnete Algorithmen passende Güter für jede Runde vor [#183](https://github.com/dsiekiera/foe-helfer-extension/issues/183)
    - erkennt den 4 Zug der Taverne und kalkuliert entsprechend die Möglichkeiten der Kombinationen

**Update**
- Erntehelfer:
    - CityMap und Gebäudeliste schliessen beim verlassen des Nachbarn [Forum](https://forum.foe-rechner.de/d/11-wunsche-zur-plunderanzeige)

**BugFix**
- Gilden-LiveChat:
    - Token ergänzt [#198](https://github.com/dsiekiera/foe-helfer-extension/issues/198)

---

##### v2.3.12.5
**BugFix**
- Armee Übersicht:
    - Wenn ein Boost-LG fehlte wurde die Box nicht geladen [#185](https://github.com/dsiekiera/foe-helfer-extension/issues/185)
    - Abfragen Dreher gefixt, Danke an [Th3C0D3R](https://github.com/Th3C0D3R)

**Update**
- Extension:
    - Erntehelfer schliesst sich beim zurückkehren in die eigenen Stadt [#178](https://github.com/dsiekiera/foe-helfer-extension/issues/178)
    - "Transparente" Box gefixt [#188](https://github.com/dsiekiera/foe-helfer-extension/issues/188)

---

##### v2.3.12.4
**Update**
Neues Tool:
    - Forschungen: 
        -Zeigt die gesamten Güter / FP / Vorratskosten bis zum Ende des aktuellen oder des gewählten Zeitalters an
    - Armeen (BETA):
        - Zeigt alle vorhanden Einheiten übersichtlich mit Angriff- und Verteidigungswerten

**BugFix**
- Außenposten:
	- Unvollständige Güteranzeige beim ersten Start der Extension behoben bzw. Wechsel des Außenpostens behoben [#163](https://github.com/dsiekiera/foe-helfer-extension/issues/163)

- Erntehelfer:
    - Es wurden nicht alle Gebäude angezeigt [#159](https://github.com/dsiekiera/foe-helfer-extension/issues/159)

---


##### v2.3.12.3
**Bugfix**
- Extension:
    - Lautsprecher Icon nachgereicht
    - optische Anpassungen am Eigenanteilsrechner
    
---

##### v2.3.12.2
**Bugfix**
- Extension:
    - Spracherkennung für Changelog gefixt
    - API Endpunkte neu definiert, Daten wie LGs der Gildies, eigene Daten, GEX usw. werden nun sauber übertragen [#67](https://github.com/dsiekiera/foe-helfer-extension/issues/67)
    - fehlende Übersetzungen ergänzt
    - Lautsprecher Icon gefixt
---

##### v2.3.12.1
**Update**
- Extension: 
    - Boxen können nicht mehr "zu hoch" geschoben werden [#129](https://github.com/dsiekiera/foe-helfer-extension/issues/129) [#145](https://github.com/dsiekiera/foe-helfer-extension/issues/145)

- Produkt Übersicht:
    - Zeigt an welche Gebäude auch FPs produzieren würden => Mögliche Höhstproduktion (insbesondere SdWs)
    - Boost zu Vorräten hinzugefügt
---

##### v2.3.12

**BugFix**
- Kostenrechner:
    - Name wurde nicht immer erkannt
    - Fehler Behoben [#133](https://github.com/dsiekiera/foe-helfer-extension/issues/133)
    - Fehlende Übersetzung ergänzt

- LG-Investionen:
    - Timeout gesetzt [#134](https://github.com/dsiekiera/foe-helfer-extension/issues/134)

**Update**
- Kostenrechner:
    - LG Übersicht: Tooltip für Erläuterung, bessere Erkennung
    - Wenn Stufe nicht offen oder Straße fehlt, erscheint ein Overlay

- Eigenanteilsrechner:
    - komplett überarbeitet 
        - beliebig viele Externe Spieler/Sniper werden beachtet [#47](https://github.com/dsiekiera/foe-helfer-extension/issues/47) [#72](https://github.com/dsiekiera/foe-helfer-extension/issues/72) [#113](https://github.com/dsiekiera/foe-helfer-extension/issues/113) [#139](https://github.com/dsiekiera/foe-helfer-extension/issues/139) [#143](https://github.com/dsiekiera/foe-helfer-extension/issues/143)
        - Echtzeit Aktualsierung
        - Individuelle Prozente pro Platz einstellbar

- Einstellungen:
    - neuer Menüpunkt => "Box Koordinaten resetten"
    
---

##### v2.3.11.2 

**BugFix**
- Extension:
    - Übersetzungen korrigiert (Englisch, Französisch)

---

##### v2.3.11.1 

**Update**
- Info Box:
    - Kopf überarbeitet
    
**BugFix**
- Extension:
    - Übersetzungen vervollständigt (Englisch, Französisch)

---

##### v2.3.11
**Update**
- Kostenrechner:
    - scannt bereits in der Übersicht ob es Gebäude gibt in die man investieren könnte und mekrt sich diese
    - Rest-FP Anzeige bis zum leveln
    - Zusätzliche Buttons für Prozente ordnen sich korrekt ein

- Info Box:
    - Filter für das selektive anzeigen von Meldungen [#121](https://github.com/dsiekiera/foe-helfer-extension/issues/121)
    - "Box leeren" Button hinzugefügt
    - wenn gewünscht, kann ein Ton aktivert werden um beim wechseln des Tabs einen Ton zu hören
    
- Produkt Übersicht:
    - Rathaus aus der Münzboost Berechnung entfernt [#122](https://github.com/dsiekiera/foe-helfer-extension/issues/122)
    - Sticky Tabellenköpfe (bleiben beim Scollen oben stehen)
    - Tab Icons aufgrund eines Inno-Updates gefixt
    - Sortierungen der ersten 4 Tabs verbessert

---

##### v2.3.10.2

**Bugfix**
- Außenposten:
	- Anzeige der Güter für alle Außenposten gefixt [#108](https://github.com/dsiekiera/foe-helfer-extension/issues/108) [#110](https://github.com/dsiekiera/foe-helfer-extension/issues/110)
	- Formatierung nach Sprache gefixt

- Webseite:
    - Moppelaktivitäten werden wieder sauber erfasst [#119](https://github.com/dsiekiera/foe-helfer-extension/issues/119)

---

##### v2.3.10.1

**Bugfix**
- Extension:
    - Spielupdate von Inno läd das komplette Game schneller, Extension entsprechend angepasst [#116](https://github.com/dsiekiera/foe-helfer-extension/issues/116#issuecomment-537002900)

- Produkt Übersicht:
    - falsche Sprache bei relativer Zeitangabe angepasst
    
- Kosterrechner:
    - "flackern" vor der Berechnung verringert

---

##### v2.3.10

**Update**
- Kostenrechner:
    - Formel verbessert
    - wenn der eingestellte Arche Bonus nicht 85% oder 90% ist => neue Buttons zum schnellen umschalten der Erträge

**Bugfix**
- Außenposten:
    - Erkennung der Japanischen Außenposten verbessert
    
- Extension:
    - Chrome GUI Sprache wird genutzt (genauer) [#107](https://github.com/dsiekiera/foe-helfer-extension/issues/107) 
  
- Eigentanteilsrechner
    - in englischer Sprache brach der Text unschön um [#106](https://github.com/dsiekiera/foe-helfer-extension/issues/106)  
---

##### v2.3.9.1

**BugFix**
- Kostenrechner:
    - öffnet sich ab sofort auch aus einer Nachricht oder dem Gilden [#97](https://github.com/dsiekiera/foe-helfer-extension/issues/97) [#101](https://github.com/dsiekiera/foe-helfer-extension/issues/101)

- Eigenanteilsrechner:
    - Kopierfunktion gefixt [#104](https://github.com/dsiekiera/foe-helfer-extension/issues/104)

- Außenposten:
    - Diplomatie-Empfehlung (blaues Fragezeichen) nutzte falsche Werte [#103](https://github.com/dsiekiera/foe-helfer-extension/issues/103)
    
**Update**
- Extension
    - Französisch geupdated
    
---

##### v2.3.9

**Neu**
- Extension:
    - Französische Übersetzung integriert [#96](https://github.com/dsiekiera/foe-helfer-extension/issues/96)
    - komplett internationalisiert

---

##### v2.3.8
**Neu**
- Extension:
    - Englische Übersetzung integriert

**BugFix**
- Kostenrechner:
    - berechnet nun genau ob überhaupt noch ein Platz eingezahlt werden kann [#86](https://github.com/dsiekiera/foe-helfer-extension/issues/86) [#82](https://github.com/dsiekiera/foe-helfer-extension/issues/82)

- Tavernenboost:
    - manchmal wurde ein JS Fehler erzeugt, wobei das Badge nicht verschwand [#91](https://github.com/dsiekiera/foe-helfer-extension/issues/91)

---


##### v2.3.7.1

- Produkt Übersicht:
    - Kopf-Filter angepasst [#92](https://github.com/dsiekiera/foe-helfer-extension/issues/92)
    - aktive Münzbonus hinzugefügt => korrekte Berechnung [#90](https://github.com/dsiekiera/foe-helfer-extension/issues/90)
    
- Eigenanteilsrechner:
    - Kopierbutton war außer Funktion [#95](https://github.com/dsiekiera/foe-helfer-extension/issues/95)


---

##### v2.3.7

**BugFix**
- Außenposten:
    - "leere Box" - Fehler behoben [#73](https://github.com/dsiekiera/foe-helfer-extension/issues/73) [#87](https://github.com/dsiekiera/foe-helfer-extension/issues/87) [#94](https://github.com/dsiekiera/foe-helfer-extension/issues/94)

- Produkt Übersicht:
    - doppelter Quellcode verursachte falschen Filter [#93](https://github.com/dsiekiera/foe-helfer-extension/issues/93)
    - Trennzeichen bei großen Zahlen zerschoss die Sortierung [#92](https://github.com/dsiekiera/foe-helfer-extension/issues/92)

**Neu**
- Produkt Übersicht:
    - sortierbar nach Erntezeit

---

##### v2.3.6.1

**BugFix**
- Erntehelfer (CityMap):
    - Werte wurden teilweise vom Nachbarn davor nicht gelöscht
    
---

##### v2.3.6

**Neu**
- Produkt Übersicht:
    - zeigt alle Produkte gruppiert an
    - mit Klick auf Tabellenkopf neu sortierbar
    - zeigt Erntezeitpunkt exakt an, auch relativ
    - Errechnung aller Produktionen

- InfoBox:
    - am Anfang leer, zeigt sie aber nach einer Zeit alle Aktivitiäten vom Hintergund an: 
        - GEX Punkte pro Stufe anderer Gildenmitglieder
        - Auktionen
        - Nachrichten aller Art
        - gelevelte LGs
        - mehr folgen...
        
**Update**
- Erntehelfer:
    - zeigt auf einer Map die genaue Position des Gebäudes an
    - erkennt nun zuverlässiger die Güter und Produktionen

- Sidebar:
    - ermittelt automatisch die scrollbaren "Ansichten", derzeit 3

- Kostenrechner:
    - berechnet ob noch etwas einzahlbar ist, ansonsten => "grau"

**BugFix**
- Eigenanteilsrechner:
    - Overlay hinter dem Einzahlschema flackerte oder blieb schwarz

---

##### v2.3.5

**Update**
- Außenposten:
	- Sammeln der Resourcen geschieht nun häufiger => aktuellerer Bestand

- Eigenanteilsrechner:
	- "Werte kopieren" umgebaut [#59](https://github.com/dsiekiera/foe-helfer-extension/issues/59)

**BugFix**
- Extension:
    - unter bestimmten Konstelationen wurde keine Daten übertragen

- Außenposten:
    - fehlender Wert erzeugte einen Error und blockierte das weitere ausführen

---

##### v2.3.4
**Update**
- FP-Lager Anzeige:
	- wird nun beim Spielstart ermittelt
- Kostenrechner:
	- Ab sofort erscheint in der letzten Spalte eine "0" wenn +-0 erreicht würde (verlustfrei) => [#80](https://github.com/dsiekiera/foe-helfer-extension/issues/80) 


**BugFix**
- Kostenrechner:
	- Erntedatum des LGs entfernt, wurde von Inno ausgebaut
	
- Außenposten:
	- wird korrekt erkannt und geöffnet	[#61](https://github.com/dsiekiera/foe-helfer-extension/issues/61), ggf. Reload!

- Tavernenboost:
	- zeigt wirklich nur noch den extra Zug an [#75](https://github.com/dsiekiera/foe-helfer-extension/issues/75), wenn aktiviert
	
---


##### v2.3.3
**BugFix**
- Kostenrechner:
	- erkennt nun Besitzer, gelöschte User und P6 ohne Gewinn

- Eigenanteilsrechner:
	- erkennt nun Besitzer, gelöschte User und P6 ohne Gewinn

---


##### v2.3.2
**BugFix**
- Menü:
	- Neue Startup-Prozedur, stabilerer Start der Extension
	
- Erntehelfer:
	- Neuer Filter um Gebäude mit "GuildPower" (als Produktion) zu erkennen, verhinderte die Darstellung der Box

---


##### v2.3.1
**BugFix**
- Außenposten:
	- Erkennung der Güter angepasst, startet nun sauber
	
- Boxen:
	- eine Box kann nun auch geschlossen werden wenn der Inhalt nicht geladen wird (bei einem Fehler)

---

##### v2.3.0
**BugFix**
- Extension:
	- überarbeitet, Cache Problem gelöst
	- neue stabilere StartUp Prozedur integriert

---

##### v2.2.16
**BugFix**
- Außenposten:
	- kleiner Logikfehler verhindert den ersten Start des Fensters

---

##### v2.2.15

**Neu**
- TavernenBooster:
	- wenn in den Einstellungen aktivert, wird ein verschiebbares Overlay mit der Restzeit eingeblendet
	
- Außenposten:
	- erkennt automatisch das richtige Event und führt alle benötigten Güter auf

**Update**
- Eigenanteilsrechner:
	- "Bitte leveln" wurde hinter den LG Namen verschoben

**BugFix**
- Kostenrechner:
	- bei TA, Zeus usw. erschien "Invalid date"

---

##### v2.2.14

**Update**
- Live-Chat:
	- Neue Spalte für Anwesende Mitglieder
	- neue Sounds ergänzt
	- Erwähnung verbaut => Wird eine Zeile mit einem "@" begonnen gefolgt vom Namen des Spielers, wird in seiner Anzeige sein Name hervorgehoben
	- Lesemodus verbaut (kleines Augen-Icon oben links) => Chat scrollt nicht selbstständig (zum nachlesen bei Abwesenheit)
	
- Kostenrechner:
	- Countdowntimer für Erntezeitpunkt eingefügt
	
- Einstellungen:
	- **_HINWEIS_**: neuer Schalter für FP Investitionen eingefügt	

**BugFix**
- Einstellungen:
	- der Verknüfung zwischen "Globale Kommunikation" und Erntehelfer entfernt

---

##### v2.2.13

**Update**
- Extension:
	- Globalen Schalter integriert; wenn "inaktiv" läuft die Extension nur im Browser ohne Kontakt zu foe-rechner.de (autark)
	

- Live-Chat:
	- Läuft nun stabil wenn min. 1 Spieler aus der Gilde Daten an foe-rechner.de übermittelt
	- Avatar integriert, bessere Lesbarkeit
	- alle [Funktionen](/extension/index#Gilden_Livechat) auf einen Blick

---

##### v2.2.12
**Update**
- Kostenrechner:
	- Erntezeitpunkt des offnen LGs wird dargestellt
	- Box verbreitert => lesbarer

---


##### v2.2.11
**Update**
- Kostenrechner:
	- eigene Einzahlungen werden blau markiert
	- wenn zu viel bezahlt wird rot markiert
	- es werden alle 5 Ränge dargestellt, falls BPs gesucht werden
	- Archebonus-Feld => Stufen 1-80 "_0.5_" Schritte > ab Stufe 80 "_0.1_" Schritte

**Neu**
- LG-BP Inventar:
	- Vorbereitet => zeigt dann an wie viele BPs von jedem LG verfügbar sind

**BugFix**
- Eigenanteilsrechner:
	- wenn minimiert wird auch die links ausgeklappte Box ausgeblendet

---

##### v2.2.10
**Update**

- Eigenanteilsrechner:
	- Hakenvariante wie auf feo-rechner.de, Plätze können selbst gewählt werden
	
- LG Daten:
	- jeder Spieler kann nun selbst seine LG Daten auswerten und ist nicht auf jemand anderen angewiesen, werden beim betreten des Spieles übertragen

- Erntehelfer:
	- übersichtlicher nach "Abgeschlossende Produktionen", "Laufende Produktionen"
	- neuer Filter verbaut 

---

##### v2.2.9
**Update**
- Boxen:
	- Können ab sofort minimiert werden wenn der Platz knapp ist
	- "Merken" sich ihre letzte Position an der sie geschlossen wurden

- Menü:
	- Neuer Button für Einstellungen, hier werden die Übermittlungen gesteuert
	- Neuer Button für FAQ
	- Neuer Button für Features / Bugs

---

##### v2.2.8
**Bugfix**
- Eigenanteilsrechner:
	- Kopierbuttons zeigen falsche Werte, behoben
	- Mäzen Anteil wurde nicht immer berechnet, gefixt

---

##### v2.2.7
**Bugfix**
- Eigenanteilsrechner:
	- Fehlendes Objekt mit den Plätzen für die Kopierbuttons ergänzt

---

##### v2.2.6
**Update**
- Kostenrechner:
	- Zeigt an wann die letzte Einzahlung war, so kann geprüft werden ob das LG derzeit überhaupt gelevelt wird
- Eigenanteilsrechner:
	- Arche-Prozente sind von der Popup-Box entkoppelt und werden nun individuell nur für diesen Rechner benutzt (Einstellung direkt im Rechner)
	- berechnet alle Werte unter einbezug von externen Belegungen
	- _Achtung_: Die Berechnung der externen Plätze ist in der BETA-Phase! Falls hier irgend welche Fehler auftreten, bitte im [GitHub](https://github.com/dsiekiera/foe-helfer-extension/issues) melden

---

##### v2.2.5
**Update**
- FP Produktion:
	- Gruppierung und Sortierung integriert
	
	
- Kostenrechner:
	- einmalig zwischen den Tabs [Nachbarn, Gilde, Freunde] wechseln, dann wird beim FP Snipen oder befüllen der Namen des Besitzers angezeigt
	- es wird nun auch "+-0" angezeigt falls BPs oder Meds gewonnen werden können, aber keine FPs hängen bleiben

---

##### v2.2.4
**Update**
- Eigenanteilsrechner:
	- Archeprozente von den eigenen Arche Werten entkoppelt => eigenes Eingabefeld für Einzahlungen

---

##### v2.2.3
**Update**
- Eigenanteilsrechner:
	- Dropdowns entfernt, maximale Stufen aufgehoben
	- Erechnet die Belegung aus den Daten beim öffnen des LGs

---

##### v2.2.2
**Update**
- Kostenrechner: 
	- Zeigt nun an ob ein Platz mit den eingezahlten FP "save" ist. Danke an Lashandan von Rugnir dafür!
- Eigenanteilsrechner:
	- Überarbeitung Teil 1: Werte können mit Namen (dauerhaft änderbar) des Spielers und des Lgs (z.B.: Burg von Himeiji => BvH) kopiert werden

---

##### v2.2.1
**Update**
- Gildenchat: 
	- Emotes wie im WhatsApp integriert und auswählbar
	- Bild URLs werden als Vorschau dargestellt und automatisch verlinkt
	- Strings die als URL erkannt werden, werden zu URLs umgebaut und sind anklickbar

---
##### v2.2.0
**Update**
- Gildenchat: - wurde in ein eigenes Fenster verschoben, ebenso wurden Emojis hinzugefügt (Zeichen wie ;) oder :D aber auch named Emoyies wie :beer:, :heart: oder :cat: sind möglich)
- Extension: - Stylesheet wird ab sofort mit Versionsnummer geladen, sorgt immer für eine aktuelle Ansicht

---

##### v2.1.1
**Update**
- Extension: Komplette Größe der Extension verkleinert

**Bugfix**
- Helfer-Klasse: - Typo im Code (verhinderte das Starten der Button-Klasse)

---

##### v2.1.0
**Neu**
- GildenChat: - BetaPhase _(Funktioniert wirklich nur wenn er offen ist und nur innerhalb der Gilde)_

**Update**
- Kostenrechner: - Zeigt die ermittelte Stufe und den Spielernamen an, aktualisiert sich automatisch beim öffnen eines anderen LGs selbstständig
- Eigenanteilsrechner: - einmal offen, werden zuerst die Werte des eigenen geöffneten LGs übernommen

**Bugfix**
- Eigenanteilsrechner: - merkt sich in der Session die letzten Werte

---

##### v2.0.2
**Bugfix**
- "Erntehelfer": wurde Aufgrund eines Objektfehlers nicht dargestellt

---

##### v2.0.1
**Update**
- Gebäudenamen sind aktuell

**Bugfix**
- Eigenanteilsrechner: holte Daten der falschen Stufe

---

##### v2.0.0
**Neu**
- Menü: neues Menü am rechten Bildrand
- Kostenrechner: aktiviert sich beim ersten öffnen eines fremden LGs
- Eigenanteilsrechner komplett überarbeitet

---


##### v1.9.5
**Neu**
- Kostenrechner: die Anzeige im Fenster aktualisiert sich beim einzahlen

**Bugfix**
- Eigenanteilsrechner: Button Darstellung korrigiert
- Kostenrechner: Button Darstellung korrigiert

---


##### v1.9.4
**Bugfix**
- Eigenanteilsrechner: Button arbeitet jetzt sauber mit den Tabs
- Kostenrechner: Button arbeitet jetzt sauber mit den Tabs

---

##### v1.9.2
**Bugfix**
- Scripte: Versionierung eingefügt

---

##### v1.9.1
**Bugfix**
- Einstellungen: Bonus ließ sich nicht speichern

---

##### v1.9.0
**Update**
- Scripte: Performance Schub durch neue Logik

**Bugfix**
- Multiworld: Trackt nun korrekt in allen Bereichen

---

##### v1.8.5
**Update**
- Einstellungen: Es muss keine Player-ID oder Gilden-ID mehr angegeben werden

**Bugfix**
- Eigenanteilsrechner: Zeigt wieder korrekte Werte an

---

##### v1.8.4
**Bugfix**
- Eigenanteilsrechner: Button wird wieder korrekt angezeigt

---

##### v1.8.3
**Update**
- Motivationen: Es wird nun auch der Rang innerhalb der Freundesliste übertragen

---

##### v1.8.2
**Update**
- Nachbar-Produktionen: Alle Übersetzungen sind Verfügbar

---

##### v1.8.1
**Update**
- Mutliworld: Extra Kennung für den Chrome Storage ergänzt

---

##### v1.8.0
**Neu**
- Mutliworld: Ab sofort werden alle Welten eines Spielers unterstützt

---

##### v1.7.3
**Update**
- Nachbar-Produktionen:
	- Jede Menge Übersetzungen eingefügt

---

##### v1.7.2
**Update**
- Benachrichtigungen sind Zeitgesteuert und verschwinden nun schneller, je nach Typ
- Mit der ESC-Taste können alle Buttons + Overlays geschlossen werden
- Nachbar-Produktionen werden komplett ausgelesen

**Bugfix**
- kleinen Bug im Script beim extenden von JS-Klassen behoben
- Arche-Bonus verschwand

---

##### v1.7.1
**Update**
- Initial-Scripte konnten blockiert werden, geht nun

---

##### v1.7.0
**Neu**
- Eigenanteilsrechner integriert

**Update**
- Kostenrechner: an das FoE Design angepasst

_Hinweis: Beide Rechner reagieren auf den [X]- und [Schliessen]-Button des Hauptfensters_ 

---

##### v1.6.0
**Update**
- App: Name geändert
- Benachrichtigung: System eigene Benachrichtigungen, weniger Code, App ist schneller

**Neu**
- Extension kann auch ohne Acc bei foe-rechner.de genutzt werden => nur Kostenrechner
- Kostenrechner: Schalter verbaut, kann nun auch deaktivert werden

---

##### v1.5.2
**Update**
- Benachrichtigung: neues Stack-Message System integriert (Nachrichten können sich oben rechts sammeln)

---

##### v1.5.1
**Update**
- Motivationen: kleine Ergänzung um alle Freunde korrekt zu ermitteln

---

##### v1.5.0
**Neu**
- Motiviation (Moppeln): Werden aus der Eventübersicht ermittelt und und können in den [Statistiken](/stats/motivations) eingesehen werden => [FAQ / Bedienung](/faq/chrome-extension#motivationskontrolle)


**Update**
- Kostenrechner: wurde das Spieldesign angepasst


**Bugfix**
- Kostenrechner: beim wechsel des LGs sind die hinteren Plätze verschwunden

---

##### v1.4.1
**Update**
- Im Einstellungsfenster kann ein eigener Arche Standard Wert hinterlegt werden, für den Kostenrechner

**Bugfix**
- Kostenrechner: macht nun 0.1 Steps statt 0.5
- Kostenrechner: Arche Bonus niedrigster möglicher Wert ist nun 12

---

##### v1.4.0
**Neu**
- Kostenrechner: zeigt beim öffnen eines nicht eigenen LGs die Plätze und dessen Bonus an

---

##### v1.3.0
**Neu**
- Freundes Taverne kann ausgewertet auswerten


---
##### v1.2.0
**Neu**
- LG Investitionen werden übergeben und ausgewertet


---
##### v1.1.0
**Bugfix**
- das Mitteilungsfenster erschien nicht immer trotz Datenübertragung

---

##### v1.0.0
- Werte der Gildenmitglieder werden übertragen und ausgewertet
- LGs der Gildenmitglieder werden ausgewertet
- Plazierung der Gilde in der GEX wird ausgewertet
- Plazierung der einzelnen Mitglieder in der GEX wird ausgewertet
