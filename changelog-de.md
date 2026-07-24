## Extension Changelog

##### 4.4.3.0

**Neu**
- LG Rechner:
  - Neuer Knopf in der Titelleiste, um die Ansicht zu teilen: "LG Fördern" (Kostenrechner) und "LG Rechner" (Eigenanteilsrechner) werden dann wieder gleichzeitig als getrennte Fenster angezeigt
  - In der geteilten Ansicht behält der LG Rechner das zuletzt geöffnete eigene LG, wenn ein fremdes LG geöffnet wird, und öffnet sich automatisch nur bei eigenen LG (außer "Diese Ansicht für LG von Anderen nutzen" ist aktiv); fremde LG landen im Fenster "LG Fördern"
  - Die Einstellung wird gespeichert; ohne geteilte Ansicht wechselt die Box wie bisher automatisch zwischen den beiden Rechnern

- Gebäude-Effizienzbewertung:
  - Neuer Schalter in der Kopfzeile, um pro Gebäudekette nur die höchste erreichbare Stufe anzuzeigen (niedrigere Stufen aus Stadt und Inventar werden ausgeblendet)

**Update**
- Gebäude-Sets und -Ketten: Die Liste der Sets wird jetzt aus den Spieldaten erzeugt statt aus einer mitgelieferten Liste — neue Sets und Ketten erscheinen ohne Extension-Update

**Bugfix**
- Gebäude-Effizienzbewertung:
  - Beim Tippen im Suchfeld werden nicht passende Zeilen jetzt ausgeblendet (bisher wurden Treffer nur markiert)
  - Tooltips bleiben nicht mehr stehen, wenn die Tabelle neu aufgebaut wird (z.B. nach Klick auf eine der Checkboxen)

- Gebäude-Sets und -Ketten:
  - Als Fragment-Bündel vorliegende Kits werden beim Zusammensetzen von Gebäuden aus dem Inventar korrekt gezählt
  - Zeitalter-basierte Auswahl-Kits lassen die Berechnung nicht mehr abstürzen
  - Die Kit-Zählung im Inventar-Tooltip enthält keine Kits aus verworfenen Kombinationen mehr

- LG Fördern:
  - Die Hinweise "Stufe nicht freigeschaltet" und "keine Straßenverbindung" werden wieder sauber angezeigt

- GG:
	- Countdown-Tab: Sektoren, deren Verbindung bis zur Öffnung gesichert ist, werden wieder unterstrichen (die Markierung war mit dem letzten Update verloren gegangen)

- Stadtplaner:
	- Schlägt das Übermitteln der Stadtdaten fehl, wird der Fehler jetzt immer als Meldung angezeigt (auch bei Server- und Netzwerkfehlern), statt dass stillschweigend nichts passiert
	- Der Server meldet Fehler beim Speichern jetzt mit einer verständlichen Ursache zurück; unkritische Probleme (z.B. Cache-Dateien) werden als Warnung angezeigt, die Stadt wird trotzdem gespeichert

---

##### 4.4.2.0

**Neu**
- GG:
  - Neue Zermürbungs-Spalte im Countdown-Tab (per Einstellung abschaltbar): farbcodiert (20% hellblau, 40/60% orange, ab 80% rot) und live berechnet
  - Die Sperr-Hand der Gilde wird jetzt wie das Fadenkreuz in den Tabellen angezeigt und auf der GildenKarte (Box)
  - Bauslot-Übersicht: Sektoren mit freien Slots werden dezent rot markiert, solange die 20%-Zermürbungsgrenze noch nicht erreicht ist
  - Gildenübersicht: neue Spalte mit der Anzahl der aktuell gehaltenen Provinzen jeder Gilde

- City Builder:
  - Neuer Button "City Builder" in der Stadtübersicht (nur in der eigenen Hauptstadt): berechnet einen kompakten Layout-Vorschlag für die Stadt
  - Mehrere Algorithmen und Bau-Reihenfolgen treten ein paar Sekunden lang gegeneinander an, das beste Ergebnis gewinnt: alle Gebäude untergebracht, mit so wenig Straßen wie möglich
  - Legendäre Gebäude werden direkt am Kartenrand verschachtelt und nur über einzelne Straßenfelder angebunden; Gebäude ohne Straßenbedarf stopfen Lücken abseits der Straßen, die restliche Freifläche bleibt als ein zusammenhängendes Stück erhalten
  - Die Karte lässt sich per Drag verschieben; im Pop-out-Fenster wird sie automatisch zentriert und eingepasst

**Update**
- Technologien:
  - Die Ressourcen-Tabelle ist jetzt per Klick auf die Spaltenköpfe sortierbar

- GG:
  - Die Zermürbungs-Spalte steht jetzt direkt neben der Provinz-Spalte; ohne gespeicherte Einstellungen ist sie standardmäßig eingeblendet und die VP-Spalte ausgeblendet
  - Siegpunkte, Zermürbung und Bauslots aktualisieren sich live in allen Tabs; das Gilden-Ranking übernimmt neue Siegpunkte ebenfalls sofort
  - Eroberte Sektoren wechseln sofort in den passenden Tab und zeigen direkt den neuen Gildennamen
  - Die Einstellung "VP-Spalte anzeigen" gilt jetzt auch in der Bauslot-Übersicht

**Bugfix**
- GG:
  - Entfernte Sektor-Markierungen (Fadenkreuz/Sperr-Hand) verschwinden jetzt auch aus der Box statt hängen zu bleiben
- Stadtübersicht:
  - Gebäude-Filter, "Daten kopieren" und "Stadtplaner" fehlten, wenn die Box von einer anderen Karte aus geöffnet wurde (z. B. GG oder GEX); sie erscheinen jetzt überall dort, wo die eigene Hauptstadt angezeigt wird

---

##### 4.4.1.1

**Bugfix**
- Notizen:
  - Beim Anlegen einer neuen Unterseite konnte die Gruppen-Zuordnung stillschweigend verloren gehen (die Seite wurde dann nicht gespeichert). Betroffen war vor allem der Fall "neue Gruppe anlegen und direkt eine Seite hinzufügen"; auch nach dem Umbenennen einer Gruppe oder dem Löschen der letzten Gruppe war kein Tab mehr aktiv
  - Beim Öffnen der Box ist jetzt immer eine gültige Gruppe (Tab) aktiviert; falls doch kein Tab aktiv sein sollte, wird die neue Seite der ersten Gruppe zugeordnet statt verworfen
  - Die Sortier-Eingabe beim Anlegen einer Seite wurde bisher ignoriert und funktioniert jetzt

---

##### 4.4.1.0

**Neu**
- Infobox:
  - Neuer Button "Filter zurücksetzen" in den Einstellungen (Zahnrad in der Titelleiste). Setzt Kategorie-Filter, "Nur Favoriten" und den Textfilter auf Standard zurück — hilfreich, wenn die Box wegen alter Filtereinstellungen leer erscheint

- Gebäude-Effizienzbewertung:
  - Der CSV/JSON-Export enthält jetzt die Spalte "In der Stadt aufgebaut" (1 = aufgebaut, 0 = im Inventar)
  - Legendäre Gebäude sind in der Tabelle jetzt sofort am LG-Symbol vor dem Namen zu erkennen

- GG:
  - Die Vorlaufzeit des Sektor-Alarms ist jetzt in den Einstellungen des Countdown-Fensters einstellbar (5-3600 Sekunden, Standard weiterhin 30)

- GB Tracker:
  - Neue Spalte mit dem Rang (Kupfer, Silber, Gold) der mehrstufigen Legendären Gebäude — sichtbar, sobald die Daten des Spielers geladen wurden

**Update**
- GB Tracker:
  - Wird das Fenster geöffnet, bevor die Gebäudeliste fertig geladen ist, wird die Auswahl jetzt nachträglich befüllt statt leer zu bleiben


- Gebäude-Effizienzbewertung:
  - Mehrere schnell aufeinanderfolgende Stadt- oder Inventaränderungen lösen jetzt nur noch eine Neuberechnung der Bewertung aus statt einer pro Ereignis


- Gebäude-Metadaten:
  - Der interne Gebäude-Cache ist robuster: Bei fehlgeschlagenen Downloads wird auf die zuletzt gespeicherte Version zurückgegriffen, defekte Cache-Einträge werden neu geladen, und ist die Browser-Datenbank (IndexedDB) blockiert, lädt die Extension alle Metadaten frisch statt mit leeren Gebäudedaten zu starten

**Bugfix**
- Alarme:
  - Alarme mit Zeitstempeln aus Spieldaten (auslaufende limitierte Gebäude, GG-Sektor-Alarm) wurden wegen Nachkommastellen stillschweigend nie angelegt (Konsolenfehler `"data.expires" needs to be a integer`). Zeitstempel werden jetzt gerundet


- Technologiebaum:
  - Die Spalte "Fehlt noch" rechnet bei zukünftigen Zeitaltern jetzt gegen den kumulativen Bedarf (aktuelles bis gewähltes Zeitalter) statt nur gegen das gewählte Zeitalter
  - Güter, die nur in dazwischenliegenden Zeitaltern gebraucht werden, tauchen jetzt ebenfalls in der Tabelle auf
  - Die Option "Forschungen aus vorherigen Zeitaltern ignorieren" funktioniert wieder: abgewählt werden offene Forschungen früherer Zeitalter in den kumulativen Bedarf einbezogen; außerdem ging die Einstellung beim erneuten Öffnen der Box verloren


- Gebäude-Effizienzbewertung (CSV/JSON-Export):
  - Armee-Boost-Spalten tragen jetzt eindeutige Namen mit Kontext-Zusatz (GEX, GG, QI). Vorher überschrieben die QI-Boost-Werte die Basis-Boost-Werte im Export, und die GEX/GG-Spalten für Angriff und Verteidigung waren nicht unterscheidbar
  - Es werden wieder Gebäudewert und Wert pro Feld exportiert, klar benannt über den Zusatz "(pro Feld)" — der Export passt damit wieder zur Anzeige

---

##### 4.4.0.0

**Neu**
- PopOut:
	- Größere Boxen können einfach in ein eigenes Fenster (Picture-in-Picture Chrome/ PopUp in Firefox) ausgelagert werden, alle Funktionen bleiben erhalten Viele Boxen haben diese Funktion bereits, es kommen schnell mehr dazu
      - Wird das PopUp-Fenster geschlossen, springt die eigentliche Box wieder an die alte Stelle im Spiel zurück (DOM)
      - Wird die Box im PopUp geschlossen, verschwindet die Box bis zum erneuten öffnen
      - Sind PopUp's generell blockiert, wird darauf hingewiesen
      - Diese PopUps bleiben immer on top, über dem Spiel und verschwinden nicht nach hinten, können aber minimiert werden
      - Wird das Spiel geschlossen, schließen sich automatisch alle PopUps

**Update**
- Gebäude Tooltips:
	- Überarbeitung des Moduls. Permanentes Berechnen der Mauspositionen entfernt, schon die Ressourcen bei kleineren CPUs
    - Gefährliche eval() Funktion entfernt
    - Start/Stopp verbessert für PopOut


- Historische Verbündete:
  - Zeigt nun an wie viel die nächste Stufe bringe
  - Fragment-Bestände sind farbig
  - Schalter für Kompakt-und Boostansicht


- Stadtübersicht:
  - Übermitteln der Daten an den CityPlanner v2 (foe-helper.com)
    - Modal ergänzt, dass einen Spinner zeigt, für ungeduldige
    - Einige Daten für Informationen im CityPlanner ergänzt


- LG Rechner (Unterstützung der neuen mehrstufigen Legendären Bauwerke):
  - Beim Öffnen eines LGs wird nun dessen aktueller Status im Kopf des Fensters angezeigt: Stufe / Maximalstufe, eingezahlte FP der aktuellen Stufe
  - Zusätzlich wird der Rang (Kupfer, Silber, Gold) als Prestige-Icon angezeigt – bei eigenen wie fremden LGs
  - Blaupausen-Belohnungen werden in der Tabelle nach Rang aufgeschlüsselt (z.B. 40× Kupfer + 11× Silber), inkl. Berücksichtigung des Förderbonus je Stufe
  - Das Blaupausen-Icon im Tabellenkopf passt sich dem Rang des Gebäudes an (Kupfer, Silber, Gold)
  - Die Option "Automatisch öffnen" ist jetzt auch in den Einstellungen der Ansicht für fremde LGs erreichbar


- Allgemeines Code-Cleaning gemäß [JSDoc](https://jsdoc.fyi) begonnen:
  - Dient der Lesbarkeit der gesamten Extension für externe Entwickler
  - Docstrings mit Parametern/Returns
  - Formatierungen gemäß "Visual Paragraphs" zugunsten der Lesbarkeit
  - Viele kleine Formatierungsfehler behoben
  - Anpassungen zu ES6 begonnen

**BugFix**
- LG Rechner:
  - Beim Öffnen eines eigenen LGs direkt nach einem fremden LG wurden die Daten beider Gebäude vermischt (falscher Name, falsche FP-Kosten). Die Datenzuordnung folgt jetzt der neuen Spiellogik, die beim Öffnen eines eigenen LGs keine Gebäudedaten mehr überträgt
  - Ein Klick auf das Zahnrad ohne geöffnetes LG führte zu einem Fehler, die Einstellungen blieben danach dauerhaft leer
  - Die Box zeigt ohne geladenes LG jetzt einen Hinweis statt eines leeren Fensters


---


##### 4.3.1.0

**Update**

- Forschungsbaum:
	- Überarbeitung des Moduls, neue Spalte ergänzt. Diese zeigt ab dem nächsten unerforschtem ZA eine Spalte aller summierten fehlenden Elemente 

---

##### 4.3.0.1

**BugFix**

- Forschungsbaum:
  - Eine strukturelle Umstellung in den Daten von Inno erzeugte im Helfer einen Fehler

---

##### 4.3.0.0

**Neu**
- LG Rechner: Es gibt nur noch einen Rechner, aber es wurde keine Funktionalität entfernt. Wenn ihr die bisherige Kostenrechner-Ansicht sucht, schaut in die Einstellung vom Fenster des Rechners!
- Gefechte: In den Einstellungen bei den Gefechts-Countdowns kann man jetzt einen Discord Webhook definieren
- Gefechte: Es gibt einen neuen Bereich, wo man schnell sehen kann, welche der eigenen Sektoren noch bebaut werden müssen
- Discord Webhooks: Erstelle Vorlagen (Templates) für eigene Gefechtsnachrichten und füge sie in den GG Einstellungen hinzu

**Update**
- Verbündete: Die Boosts sind nun tabellarisch nach Kategorie aufgelistet und können auch sortiert werden
- Infobox: QI Aktionen werden nun auch geloggt. Außerdem gibt es nun eine Favoritenfunktion und das Fenster ist etwas kompakter geworden
- LG Rechner: Der Konfigurationspfeil am Rand des Fensters ist nun ein Zahnrad in der Ecke unten links!
- Effizienzbewertung: Gebäude, die auf eine erhabene Version aufgewertet werden können, werden jetzt mit dem entsprechenden Pfeil gekennzeichnet
- Gildenmitglieder Übersicht: Die Detailansicht eines Mitglieds öffnet sich in einem eigenen Fenster und beinhaltet jetzt auch durchschnittliche Daten, sowie QI Daten
- "Kampagne" Modul entfernt! Sektoren zu verhandeln ist ein selten gewordener Spielstil und Güter gibt es heutzutage in Hülle und Fülle
- UI: An verschiedenen Stellen sieht der Helfer nun etwas anders aus
- Gebäude Effizienzberechnung: Die Ansicht öffnet sich per default mit absteigender Sortierung und wird sofort aktualisiert, sobald ein Gebäude entfernt, hinzugefügt oder ge-updated wird

---
 

##### 4.2.1.1

**Bugfix**
- Beide Rechner waren kaputt nach dem Spiel-Update auf Version 1.332

---

##### 4.2.1.0

**Update**
- Discord Webhooks: Modul wurde komplett verändert und kann nun jederzeit Nachrichten verschicken.
- Statistik: Güter des nächten Zeitalters in die Schnellauswahl hinzugefügt.
- Wiederholtes Bauen: entfernt für Umbaumodus, da nun spieleigene Funktion vorhanden.

**Bugfix**
- Merger-Minispiel: funktioniert nun wie ursprünglich geplant


---

##### 4.2.0.0

**Update**
- Kostenrechner: Einstellung zum automatischen Öffnen hinzugefügt
- Beide LG Rechner: Standard-Werte von 80, 85, 90 auf 80, 90, 100 geändert
- Effizienzberechnung: FP-Boost & Güter Boost hinzugefügt und man kann jetzt verschiedene Einstellungen zur Bewertung erstellen
- Merger-Minispiel: Tabelle reduziert und Warnfenster hinzugefügt, wenn Tasks fertig sind

**Bugfix**
- Beide LG Rechner: Ein Spiel-Update hat das LG Fenster verschoben, sodass die neue FP-Kopier-Funktion nicht mehr funktioniert hat
- Eigenanteilsrechner: beim Kopieren werden die bereits eingezahlten FP berücksichtigt (fremde LG)
- Automatisches öffnen: einige Fenster sind nicht mehr von alleine aufgegangen, wenn man sich noch nie mit den Einstellungen befasst hatte - funktioniert jetzt wieder wie vorher, aber: Guckt euch die Einstellungen an, sie sind praktisch.

---

##### 4.1.1.0

**Update**
- Effizienzbewertung: Man kann die Gebäude nun auch ohne Boosts der Verbündeten bewerten lassen
- Produktionsübersicht: Es gibt nun eine Liste für Spezialgüter-Produktionen
- Einstellungen: Manche "Automatisch öffnen"-Einstellungen wurden entfernt, weil sie auch im jeweiligen Fenster zu finden sind
- QI Stadtübersicht: Der Titel passt sich nun an
- Eigenanteilsrechner/Kostenrechner: die FP Werte können nun angeklickt werden - der Wert wird direkt in das Eingabefeld des LB-Fensters eingetragen oder zumindest in die Zwischenablage gelegt
- Eigenanteilsrechner: Option hinzugefügt, ob im Summenwert die bereits eingezahlten FP enthalten sein sollen

**Bugfix**
- Stadtdaten kopieren: das Datenformat hat nicht mehr zu den bekannten Schnittstellen gepasst - geht jetzt wieder
- Verbündete: 
	- Die Summen waren nicht korrekt und die Boosts sind beim leveln explodiert
	- Ein frisch zusammengesetzter Verbündeter tauchte doppelt in der Liste auf, wenn nach dem Zusammensetzen genau 0 Fragmente übrig waren
	- Die Box wurde nicht geschlossen, wenn der Menüeintrag angeklickt wurde
- Produktionen: Die Güter vom Klapperknochen-Technoclub waren falsch berechnet

---

##### 4.1.0.0

**Neu**
- Alles-Einsammeln-Blocker: schon mal 5 Diamanten ausgegeben, obwohl die FP-Leiste zu voll war? Aktivier den Blocker in den Einstellungen bei Pop-ups, damit das nicht nochmal passiert
- Umbaumodus: es kann nun eine Karte angeschaltet werden, die sich beim Bauen aktualisiert, den Button dafür findet ihr in der Umbaumodusliste

**Update**
- Stadt Übersicht: 
	- Die Statistiken und Filter an der Seite wurden überarbeitet: es gibt neue, interessantere Fakten zu den Gebäuden in der Stadt
	- Die Filter wurden optisch angepasst und befinden sich nun am unteren Ende der Seitenleiste (Schau genau hin, du findest sie schon!)
	- Die verfügbare Fläche ist jetzt auch bei anderen Spielern zu sehen
- Profil: 
	- QI Aktionskapazität hinzugefügt
	- Das Mini-Profilbild hat den Spiel-Button im Forschungsbaum verdeckt und wurde deshalb verschoben
	- Man kann den mittleren teil nun markieren und dann kopieren, um seine Werte auch im Spien in Nachrichten teilen zu können
- Menü-Icon für Gebäude-Sets und -Ketten-Modul ausgetauscht
- Verbündete: es gibt nun Summen unten im Fenster
- Die Einstellungen innerhalb von Fenstern wurden anders angemalt
- GG Liste: Sekunden in der "in"-Spalte hinzugefügt
- Wir haben den Sound für FP-Quests aus den Rechnern entfernt. Lasst uns wissen, wenn ihr den zurückhaben möchtet

**Bugfix**
- Produktionsübersicht: Die Güter von Gilden-LB waren manchmal zu hoch, weil Boosts angerechnet wurden
- QI Karte: Die Summen waren nicht korrekt gerundet
- QI Kapazität von 100.000 auf 200.000 erhöht
- Profil: Die Güter von anderen Spielern waren inkorrekt, wenn sie nicht im gleichen Zeitalter wie man selbst waren

---

##### 4.0.2.0

**Update**
- Effizienzbewertung: 
	- Default-Werte angepasst
	- Wenn die Option "zeige erhabene/eingeschränkte Gebäude" deaktiviert ist, wird für solche Gebäude, die aktuell in der Stadt sind, kein Inventarhaken angezeigt 
- Verbündetenboosts: an veränderte Datenübertragung angepasst

**Bugfix**
- Effizienzbewertung: Der Button zum Zurücksetzen in den Einstellungen hat nicht funktioniert.
- Produktionsübersicht: Der Item-Tab ging nicht auf, wenn man Zugteile mit Massenselbsthilfekit-Fragmenten hatte
- Abgelaufene Gebäude wurden nicht mehr überprüft beim Spielstart (zz1)
- Ältere Browserversionen konnten den Helfer nicht mehr starten

---

##### 4.0.1.0

**Update**
- GG
	- da die Serverzeit nicht konsistent durch das Spiel übertragen wird, kann die Differenz nun manuell gesetzt werden
- Allgemein
	- Weitere Verbesserung des Ladeverhaltens

---

##### 4.0.0.0

**Update**
- Allgemein
	- Verbessertes Ladeverhalten des Helfers
- QI Stadtübersicht
	- Anzahl Erweiterungen hinzugefügt
	- Rathaus produktion hinzugefügt
	- Geänderte Hervorhebung für bald fertige Produktionen
- GG
 	- Öffnungszeiten werden nun beim Kopieren in Serverzeit umgewandelt
	- Öffnungszeiten können per Einstellung in Serverzeit angegeben werden statt in lokaler Zeit
- Spieler-Links
	- Es kann nun zwischen foestats.com und scoredb.io gewählt werden in den allgemeinen Einstellungen 
- Shop Assistent
	- Spalte "Fehlend" gibt nun immer die Menge bis zum nächsten vollen Satz an
- Siedlung
	- Güter für Piratensiedlung hinzugefügt
- Spieler Profile:
	- Jetzt auch für andere Spieler: einfach besuchen und oben links in die Ecke klicken


**Bugfix**
- Shop Assistent
	- Alarme für alte Shop-Versionen wurden nicht korrekt gelöscht 
- QI Aktionsberechnung
	- Kapazitätsbonus wurde nicht korrekt beachtet
- Effizienzübersicht
	- Wurde für Kampf-Boosts nicht korrekt angezeigt, wenn nur ein Typ (Angriff oder Verteidigung) ausgewählt wurde

---

##### 3.13.1.0

**Update**
- Allgemein
	- Anpassung des Helfers an neues Ladeverhalten des Spiels 
	- Einige Hud Elemente wurden "nicht auswählbar" gemacht
	- Handling für Kettengebäude mit Spezialproduktion hinzugefügt
- Power Leveln
	- Viele neue Stufen fürs Atomium hinzugefügt
- FP Collector
	- Übersetzungen hinzugefügt
- Effizienzübersicht
	- Styling in der Suche angepasst
- Shop Assistent
	- Filter für Shop Währungen hinzugefügt – wenn eine Währung ignoriert werden soll, einfach draufklicken
	- Die Spalte "Ganz" wurde entfernt – dieser Wert ist nun sichtbar, wenn man mit der Maus auf die "Fehlend" Spalte zeigt
	- Spalte "Max" hinzugefügt – zeigt an, wie viel mit der vorhandenen Währung gekauft werden kann
	- Wenn man auf die "Max" Spalte zeigt, wird der Wert "Alle" angezeigt – also wie viel Währung nötig ist, um den Shop leer zu kaufen  
	- Tooltip für Verbündete hinzugefügt
- Stadtübersicht
	- QI: Hervorhebung für Euphorie Niveau hinzugefügt
	- QI: Hervorhebung von Gebäuden, die bald bereit für die Ernte sind
- FP-Leiste
	- Position in GE angepasst an verändertes Spiel-UI
- Menü
	- Einträge für den Shop Helfer und die Verbündeten hinzugefügt

**Bugfix**
- Effizienzübersicht
	- QI Güter Bewertung hat nicht funktioniert
- Verhandlungsfenster 
	- Schloss sich, wenn Tavernen update stattfand
- Stadtübersicht 
	- Reihenfolge der Dimensionen im Tooltip korrigiert
	- QI: Summenberechung korrigiert 

---


##### 3.13.0.0
**Neu**
- GEX Güter Verbrauch
	- Es kann ein Schwellwert angegeben werden.
	- Wenn bei Freischaltung der GEX Stufe der prozentuale Güterverbrauch größer ist als die Schwelle, wird eine Box geöffnet in der die 10 größten prozentualen Verbrauche vom Gildenvorrat angegeben werden
	- Aktivierung in den Einstellungen!

**Update**
- Effizienz
	- Neue Filter für LG und eingeschränkte Gebäude
- Stadtübersicht
	- Gebäudeliste für Siedlungen und Kolonien hinzugefügt
	- an kommende Veränderungen der QI angepasst
- Shop Assistent
	- Seltenheitsgrad des Angebots hinzugefügt
	- Bestand an Kaufwährung hinzugefügt
	- sind noch keine Favoriten ausgewählt, wird der Filter automatisch deaktiviert
- Blaue Galaxy
	- Berücksichtigt nun auch große FP-Pakete
- Gebäude Tooltip
	- wenn Fragmente produziert werden, werden nun auch die Anzahl an benötigter Fragmente angezeigt
- Gefechte Gebäudeempfehlung
	- Box schließt sich nun automatisch wenn Kampf/Verhandlung gestartet wird

**Bugfix**
- Eigenanteilsrechner
	- Rechenfehler behoben

---

##### 3.12.0.1

**Update**
- Shop Assistent
	- Freischaltbedingung "Getätigte Käufe der Seltenheit X" hinzugefügt

**Bugfix**
- Effizienzübersicht
	- Boosts funktionieren wieder richtig


---

##### 3.12.0.0
**Neu**
- Shop Assistent
	- kann in den Einstellungen aktiviert werden
	- listet, wieviel von den Angeboten bereits im Inventar verfügbar ist
	- listet wieviele Fragmente für eine Vervollständigung fehlen und wieviel das kosten würde
	- Es können Favoriten angegegeben werden und die Ansicht kann auf die Favoriten beschränkt werden
	- Gesperrte Gegenstände können ausgeblendet werden
	- Es kann für die Angebote ein Alarm gesetzt werden - sobald genug Währung für den Gegenstand verfügbar ist, erscheint eine Meldung

**Update** 
- Design des Helpers wurde an einigen Stellen überarbeitet 
	- Boxen können nicht mehr größer sein, als das Browserfenster

- Effizienzübersicht
	- Verarbeitung der Kettengebäude wurde an neue Datenstruktur angepasst
	- QI Bonis wurden ergänzt
	- beim Besuch einer fremden Stadt werden nun Inventarinhalte nicht mehr dargestellt

- Profil
	- Gildengüter-Boost hinzugefügt
	- Design des Profils kann durch Klick auf das Avatarbild verändert werden
	- Menu-Eintrag zum Aufruf des Profils hinzugefügt

- Idle Game
	- Verarbeitung der Daten wurde angepasst an veränderte Datenstruktur

- Einstellungen
	- Event Assistenten können nun einzeln de-/aktiviert werden

- Einheiten Modul
	- wurde reaktiviert

- Armee Empfehlungen
	- kann nun auch in der PvP Arena genutzt werden 

**Bugfix**
- Popgame
	- Anpassung an verändertes Event-Fenster

- Effizienzübersicht
	- Güterauswertung korrigiert

---

##### 3.11.7.0

**Update**
- Effizienzübersicht:
	- in den Einstellungen für die Produktion/Feld Werte werden beim Zeigen auf das Eingabefeld nun Werte aus der Stadt zum Vergleich angegeben
		- bester Wert
		- fünftbester Wert
		- beste 10%
		- Hinweis: ist euch eine Produktion im Vergleich zu den anderen Produktionen wichtig, sollte sich der Wert, den ihr eingebt, am niedrigsten dieser Werte oder einem noch niedrigeren Wert orientieren. Ist euch eine Produktion nicht so wichtig, sollte sich der eingegebene Wert am besten Wert oder einem noch größeren Wert orientieren
	- Rechner zur Ermittlung des Produktion/Feld Werts für "Spezialproduktion abschließen"-Fragmente hinzugefügt
		- Klick auf das Abakus/Taschenrechner-Zeichen öffnet den Rechner
		- hier können die zu erwartenden Produktionen, die der Einsatz des SPA bringen wird, eingegeben werden (Produktion des Gebäudes, das geerntet wird, evtl. mit BG Faktor)
		- Der Rechner ermittelt den Produktion/Feld Wert für das SPA anhand der eingegebenen Produktion/Feld Werte für die entsprechenden Produktionen

- Gebäude Tooltips:
	- zeigt nun für eingeschränkte/erhabene Gebäude die Effizienz des verfallenen Gebäudes an
	- zeigt nun für Gebäude, die zu eingeschränkten/erhabenen Gebäuden aufgewertet werden können die Effizienz des eingeschränkten Gebäudes mit an
	- zeigt nun an, welche Kits nötig sind, für das Gebäude
	- Kettengebäude mit zeitalter abhängigen Werten werden nun korrekt ausgewertet

- QI Aktionspunkterechner:
	- Kapazitätserhöhung sollte nun mit beachtet werden 

- Gildenmitglieder Übersicht:
	- Gildengüterproduktion zu Export hinzugefügt

**Entfernt**
- Einheiten-Modul

- Marktplatz-Angebote
	- Funktionalität wurde in die Marktübersicht transferiert

**BugFix**
- Effizienzübersicht: Sortieren nach Wert/Feld war nicht mehr möglich und ein kleiner Anzeigefehler wurde behoben

---

##### 3.11.6.0

**Update**
- Effizienzübersicht:
	- wenn die Option "Inventar" aktiviert ist, werden nun auch zusammensetzbare Gebäude gelistet. Im Tooltip des Inventar-Icon des jeweiligen Gebäudes werden nun angezeigt:
	- wie viele Gebäude dieses Typs insgesamt errichtet werden können, welche Upgrades dafür nötig sind und welche Upgrade-Pfade man zur verfügung hat. Dabei werden betrachtet:
		- komplette Gebäude im Inventar
		- Gebäude in der Stadt, die durch Inventargegenstände (Kits) verbessert werden können
		- Inventargegenstände, die zu kompletten Gebäuden zusammengesetzt werden können
		- Fragmente die zusammengesetzt werden können
	- Erhabene Gebäude werden zusätzlich in ihrer nicht erhabenen Form erfasst
	- wie viele erhabene Kits im Inventar vorrätig sind
	- wenn es ein Gebäude einer höheren Stufe gibt, was dafür nötig ist
	- Größenfilter: Mehrfachauswahl möglich

- Kits
	- wurde reduziert auf Sets und Ketten

**Entfernt**
- Boost-Inventar
	- wurde ersetzt durch oben beschriebene Änderung in der Effizienzübersicht

**BugFix**

- Effizienzübersicht:
  - Veränderungen der Werte in den Einstellungen wurden nicht sofort angewendet

---

##### 3.11.5.0

**Update**
- Manifest Datei korrigiert

- Gildenkasse
  - Schreibfehler behoben

---

##### 3.11.4.0

**Update**
- Ressourcenmanagement angepasst an veränderte Datenübertragung

---

##### 3.11.3.0

**Update**
- Verhandlungsassistent
	- angepasst an veränderte Datenübertragung

---

##### 3.11.2.0

**Entfernt**
- Kistenauswahlassistent (Es gibt keine Events mehr, für den dieser Relevant ist)

**Update**
- Verhandlungsassistent
	- unterstützt nun auch Verhandlungen mit 5 Versuchen

- Spielerprofil
	- enthält nun noch mehr Daten

- Belohnungsliste 
	- wird nun auch in der GE angezeigt

- Boxen
	- GBG Provinzliste wird nicht mehr automatisch geschlossen
	- Einstellung hinzugefügt, um automatisches Schließen abzuschalten

- Wiederkehrende Quests (Diamanten Checkliste)
	- Zustand (?/✓) kann nun durch geklickt Halten (5 Sekunden) umgeschaltet werden
	- Abkürzung der Aufgabentexte erfolgt nun in Abhängigkeit vom vorhandenen Platz

- Effizienzbewertung:
	- Einige Boosts wurden zusammengefasst. Dies hat aber keinen Einfluss auf den Score, er wird wie gehabt berechnet
	- Quanten Aktionen zur Effizienzbewertung hinzugefügt

- Stadtübersicht:
	- Man kann nun weniger effiziente Gebäude markieren lassen
	- Wir haben den bisherigen Tooltip durch den vollständigen Gebäude-Tooltip ersetzt

**BugFix**
- Wiederkehrende Quests (Diamanten Checkliste)
	- unabhängig von den Einstellungen bzw. vom Stand wurde nach Start der Zähler im Menu angezeigt

- Gildenkassenexport
	- Jahr wurde in manchen Sprachen falsch ausgelesen (z.B. 4025 statt 2025)

---

##### 3.11.1.0

**Neu**
- GG Belohnungsliste 
	- über dem Belohnungsbalken wird ausgegeben, welche Belohnung erhalten wurde

**Update**
- Boxen werden automatisch geschlossen, wenn Spielbereiche geöffnet werden, für die die Box nicht vorgesehen ist

**BugFix**
- Scrollbalken wurden eingeblendet, wenn eine Box über den Fensterrand herausragte
- Fenster konnten nicht bewegt werden nach dem ersten Öffnen
- Menu bleibt nach Fenstergrößenveränderung im Box Modus

---

##### 3.11.0.0

**Neu**
- Spieler Profil
	- Nachdem das Profil geöffnet wurde, erscheint links neben dem Stadtnamen ein Icon, zum Öffnen der Profilansicht
- Einstellungen
	- Popups für QI und GG sind nun deaktivierbar
- Verbündeten übersicht
	- Öffnet bei Klick auf das "Historische Verbündete" Gebäude
	- Zeigt eine Liste der Verbündeten und Gebäuden mit Räumen an - leere Räume und unzugewiesene Verbündete stehen am Anfang der Liste
- QI-Aktionspunkte-Rechner
	- In den QI wird am rechten Ende der Aktionspunkte-Leiste eine Sanduhr angezeigt
	- Im Tooltip der Sanduhr wird angezeigt, wann die Leiste voll sein wird

**Update**
- Effizienz
	- Gebäude aus dem Inventar hinzugefügt (noch nicht alle)
	- Filter für Gebäudegröße hinzugefügt
- Eigenanteilsrechner
	- Einstellung zum automatischen Öffnen hinzugefügt
	- Einstellung zum Entfernen der meisten kaum genutzten Features
- FoE Helper Updates öffnen nun nicht mehr automatisch einen neuen Browsertab zum Changelog
- Produktionsübersicht (Einheiten)
	- Grafik hinzugefügt für Einheiten des nächsten Zeitalters
- Box-Positionen werden nun in Bezug zur Bildschirmmitte ausgerichtet statt relativ zur linken oberen Ecke

**BugFix**
- Überlappungen an manchen Stellen behoben
- Beim Export der Gildenkasse war das Datum manchmal falsch

---

##### 3.10.1.0

**Update**
- Tooltip
	- 'Einmalige Gebäude' Eigenschaft hinzugefügt

**BugFix**
- Alarme gingen immer noch nicht
- Effizienz 
	- Gebäude mit Verbündeten zeigten falsche Anzahl
- Markt Übersicht
	- Filterliste überlagerte Tabellenkopf
- Gildenkassenbeiträge
	- Beim Export wurde das Datum nicht korrekt gelesen
- Blaue Galaxie und Gebäudeeffizienz
	- Fenster gingen manchmal nicht auf oder waren leer (ist noch in Untersuchung, ob die Reparatur geklappt hat)
- Tooltip
	- "motivieren"/"polieren" Eigenschaft war falsch herum für Gebäude der neuen Generation

---

##### 3.10.0.1

**BugFix**
- Alarme gingen nicht

---

##### 3.10.0.0

**Neu**
- QI Fortschritts Übersicht hinzugefügt (öffnet sich automatisch, wenn die QI-Spieler Rangliste geöffnet wird)
- Quellen für Gegenstände: In der Produktionsübersicht für Gegenstände und Fragmente gibt es nun die Möglichkeit, sich eine Liste von Gebäude ausgeben zu lassen, die einen bestimmten Gegenstand produzieren (auch, wenn diese nicht gebaut sind)
- Produktionsübersicht: Tabellen für Münz-, Vorrats- und FP-Boots hinzugefügt
- Effizienzbewertung: Feld für Spezialproduktion abschließen Fragmente hinzugefügt
- Stadtübersicht: Anzeigeoption für Gebäude, die eine erhabene Stufe haben und "abgelaufene" Gebäude
- Wiederholtes Bauen:
	- !!! ACHTUNG !!! Obwohl das Feature an sich grünes Licht von Inno bekommen hat, könnte es trotzdem vorkommen, dass die Bot-Erkennung ausgelöst wird. Benutzung auf eigene Gefahr!!!
	- Kann in den Einstellungen aktiviert werden
	- Wenn ein Gebäude aus dem Baumenü oder dem Umbaulager gebaut wird, wird das gleiche Gebäude automatisch erneut ausgewählt

**Update**
- Tooltip: Design der Gebäude-Tooltips angepasst
- Gebäude-Effizienz: 
	- Gebäude-Tooltips hinzugefügt
	- Ergebnisseite wird nun zuerst angezeigt
	- Itemliste versteckt
- Menü: Von unten nach rechts verschoben, weil die möglichen Einstellungen gerne übersehen werden
- Gefechte: 
	- Symbole für blauen/roten Angriff in die Countdown-Liste hinzugefügt
	- Angriffsfarben zur Karte hinzugefügt
	- Neue Kartenansicht, die die Angriffsfarben besser sichtbar macht
- GG Aktive Spieler:
	- Modul entfernt auf Anfrage durch Inno 

**BugFix**
- Tooltip: 
	- manche Browser haben nicht das korrekte Design verwendet
	- konnte offen bleiben, obwohl zugehöriges Fenster geschlossen wurde
- Umbau-Liste: 
	- Standardhöhe gesetzt
	- Umplatzieren von Gebäuden verringerte den Zähler
- Gebäude-Effizienz:
	- Die Bewertungen bei anderen Spielern haben dein aktuelles Zeitalter genutzt, statt ihr eigenes

---

##### 3.9.0.0

**Neu**
- Im Umbaumodus wird nun eine nach Größe sortierbare Gebäudeliste angezeigt
- Gex-Ergebnisse: Menu-Icon zeigt nun die aktuelle Anzahl an GE-Versuchen an
- Tooltips: in bestimmten Modulen werden nun die Gebäude-informationen als Tooltip angezeigt:
	- im Effizienz-Modul, im "Gebäude hinzufügen" dialog
	- im Boost-Inventar
	- in der Umbau-Größenliste
	- lasst uns auf Discord wissen, wo ihr diese Info noch gerne sehen würdet

**Update**
- Statistik: Dunkle Materie zu Spezial-Gütern hinzugefügt
- Einstellung "Lade aktuelle Beta" angepasst

**BugFix**
- Gebäude-Effizienz: 
	- Ist wegen eines Spiel-Updates kaputt gegangen
	- Gleiche Gebäude mit und ohne Verbündete wurden nicht korrekt gezählt
- Produktionsübersicht:
	- In der Fragmente-Übersicht war die Anzahl an Fragmenten teilweise nicht korrekt
	- In der Fragmente-Übersicht wurden nicht alle Gebäude gelistet

---

##### 3.8.1.0

**Neu**
- Produktionsübersicht:
	- QI Übersicht hinzugefügt
	- Einstellungen hinzugefügt: Man kann jetzt einstellen, ob man eine Art Countdown oder die Uhrzeit sehen möchte
	- "Fertig" und "Ernte" Spalte kombiniert: wenn eine Produktion fertig ist, wird es in dieser Spalte angezeigt

**Update**
- Idle Game Events:
	- Die Kosten zum günstigeren Abschluss einer Runde werden nun aus den Spieldaten generiert und sollten sich von alleine aktualisieren
- Legendäre Bauwerke Rechner - Powerlevel-Werte für Stufen 1-68 für Weltraumbasis hinzugefügt

**BugFix**
- Produktionsübersicht: ist wegen eines Spiel-Updates kaputtgegangen
- Der Weltraumfrachter hat in der Produktionsübersicht gefehlt
- Verhandlungs-Assistent: Die Güter wurden nicht angezeigt, wenn man alte Betriebssysteme nutzt
- LG Investitionen: Fenster repariert, die blaue Galaxie fehlt noch, aber man sollte die sowieso bis Stufe 91 leveln
- Burgsystem: Das Fenster war nach einem Spiel-Update kaputt

---

##### 3.8.0.0

**Neu**
- Produktionsübersicht Update:
	- Fehlerkorrekturen und fehlende Gebäude hinzugefügt
	- Güter-Übersicht überarbeitet
	- Übersicht aller Fragmente und Items hinzugefügt inkl. Summe über alle Gebäude
	- Filter hinzugefügt
	- Kampf-Boosts kategorisiert
	- Einheiten produktion nach Typ und Zeitalter summiert

- Effizienzbewertung Update:
	- Neue Kategorien hinzugefügt
	- Neue Übersicht inklusive Anzeige der produzierten Fragmente/Items
	- Neu: Möglichkeit zu suchen und zu filtern
	- Neu: Anzeige der Werte pro Feld hinzugefügt
	- Neu: Gebäude, die man nicht hat, zum Vergleichen hinzufügen

- Boost-Inventar
	- listet alle Gebäude aus dem Inventar, die Boosts (zum Beispiel für den Kampf) bereitstellen

- Aktive Mitglieder anderer Gilden
	- wenn innerhalb von 5 Minuten, zweimal nacheinander die Details derselben fremden Gilde aufgerufen werden (Hauptquartier in den GG) und zumindest ein Mitglied dieser Gilde aktiv war, wird ein Fenster geöffnet, in dem die aktiven Mitglieder gelistet werden

**Update**
- Kampf-Assistent:
	- es wird keine Warnung mehr ausgegeben, wenn eine Einheit eines höheren Zeitalters gefallen ist, da diese Einheiten jetzt im Krankenhaus wiederbelebt werden können

- Kits:
	- Effizienz-Werte der Gebäude hinzugefügt

- Technologien:
	- Raumfahrt: Weltraumbasis Daten und Güter hinzugefügt

- Einstellungen:
	- Kategorien umstrukturiert
	- Fenster vergrößert und verschiebbar gemacht

- Stadtübersicht QI:
	- Gebäude werden nun nach Typ kategorisiert
	- Münz-, Vorrats- und Quantenaktionsboosts aus der Hauptstadt werden mitberechnet - danke Juber!

**BugFix**
- Fenster:
	- können nun nicht mehr verschoben werden, wenn die Maus auf einen der Buttons des Fensters zeigt

---

##### 3.7.0.0

**Neu**
- Tränke Übersicht hinzugefügt in der oberen rechten Ecke um
	- die Laufzeit des Tranks mit kürzesten verbliebenen Laufzeit anzuzeigen (Tränke die für das aktuell gewählte Feature nicht relevant sind, werden ignoriert)
	- alle aktuell aktiven Tränke in einem Mouse-Over Pop-Up anzuzeigen 
	- alle im Inventar verfügbaren Tränke in einem Mouse-Over Pop-Up anzuzeigen

**Update**
- Kits - neue Teile hinzugefügt (bis Herbst 2024)

- Mergergame an Care Event angepasst


---

##### 3.6.5.0

**Neu**
- Sommer Event:
	- Der Event-Truhen-Helfer zeigt nun verdeckte Preise eines Bretts an

**Update**
- Stadtübersicht:
	- QI Aktionspunkte die durch Gebäude produziert werden, werden jetzt in der Stadtübersicht angezeigt (wenn in QI)
	- Man sieht nun auch bei anderen Spielern, welche Gebäude keine Straßenverbindungen benötigen

- Kulturelle Siedlungen:
	- Auf 5-Stunden Zyklus angepasst

- Alle verstecken/schließen funktioniert nun auch für Minispiel-Blocker

- Blaue Galaxie:
	- Aktuelle Güter werden nun separat gelistet

- Kits:
	- Aktualisiert bis Sommer Event 2024
	- Bilder werden nun erst geladen, wenn tatsächlich benötigt, um Ladezeiten zu verkürzen
	- Erhabene Upgrades werden nun auch in gelistet

- Abgelaufene beschränkte Gebäude:
	- Es kann nun eingestellt werden, für welche Gebäude die "ist abgelaufen" Warnung bei Start nicht mehr angezeigt werden soll

- Statistik:
	- Ereignisse und Scherben werden wieder gelistet

**BugFix**
- GG Gebäude-Empfehlung:
	- In 3er-Provinzen wurden manche Kombination übergangen

- (QI) Pass Belohnungen wurden nicht korrekt behandelt, wenn mehr als eine Belohnung auf einmal eingesammelt wurde

- FP-Einsammlungen:
	- QI-Belohnungen wurden falsch gezählt

- Stadtübersicht:
	- Bestimmte Gebäude konnten verhindern, dass die Übersicht korrekt lädt

- Bilder der Wiederkehrende Quest Übersicht werden wieder korrekt geladen


---

##### 3.6.4.0

**Update**
- Website Kommunikation:
	- Datenübertragung an die Webseite (Notizen + Stadtplaner) benötigt nun einen Token
	- der Token wird nach Registrierung auf der Webseite generiert und muss in die Helfer Einstellungen übertragen werden

- Stadt-Übersicht:
	- zeigt in den QI eine Produktionsübersicht

- Cardgame:
	- die Warnung wegen geringer Lebenspunkte schließt sich nun gemeinsam mit dem Helfer-Fenster

- Kits:
	- Es können nun Favoriten angelegt und gefiltert werden

**BugFix**
- Statistik:
	- einige Güterbelohnungen wurden nicht kombiniert

---

##### 3.6.3.0

**Update**
- Stadtübersicht:
	- Neu: Stadtübersicht auch bei Siedlungen, Kolonien und Quanten Invasionen
- Card Game:
	- An Änderungen des Geschichte-Events 2024 angepasst
- Quests:
	- Wenn eine Rivalen-Quest erfüllt ist, wird ein Ton abgespielt. Kann in den Einstellungen deaktiviert werden
- FP Sammlung:
	- QI und Event-Pass als mögliche Quellen hinzugefügt
- Statistik:
	- QI-Belohnungen werden erfasst
	- Güter- und Einheiten-Belohnungen werden nun gruppiert angezeigt, statt für jeden Typ einzeln
- Siedlungen:
	- Bilder für Polynesien hinzugefügt
- GvG:
	- Modul entfernt
- FP Leiste:
	- Wird in QI nun auf der linken Seite angezeigt
	- Wird nun auch in der Stadt angezeigt, wenn mehr als 999 FP in der Leiste sind
- GG Gebäudeempfehlung:
	- Einige Empfehlungen wurden entfernt
	- Empfehlungen werden nun hervorgehoben um darzustellen, warum diese empfohlen werden.
- Musik:
	- Neue Titel hinzugefügt (Polynesien und Geschichtsevent)
	- Kategorie GvG entfernt
- Kits:
	- Neue Gebäude bis Geschichtsevent 2024 hinzugefügt
	- Favoriten-Option hinzugefügt
- Idle-Game:
	- Es wurde ein separater Timer für 6.3Q (25% Rabatt) hinzugefügt
- Kampf-Empfehlungen:
	- Design angepasst

**BugFix**
- Idle Game:
	- Es konnte passieren, dass die Strategie nicht bearbeitet werden konnte
- Titan LB:
	- Manche Boosts waren vertauscht
- Kits:
	- In seltenen Fällen wurden falsche Bild-Daten genutzt
- Produktions-Übersicht:
	- Für das Rathaus wurde bei Berechnung des Platzbedarf angenommen, dass dies eine Straße braucht
- Kampf-Empfehlungen:
	- Einheiten Bilder für QI korrigiert
- Merger-Game:
	- Schlüssel-Werte korrigiert
- Wiederkehrende Quests (Diamanten-Abhaken):
	- Es war möglich, dass 1 oder 2 Quests aus einem früheren Zeitalter in der Liste stehen blieben - dies sollte nun nicht mehr passieren, sobald man das nächste Zeitalter erreicht

---

##### 3.6.2.0

**Update**
- Mergergame:
	- Eventänderungen eingearbeitet

- Kits/Sets Modul:
	- benötigte Anzahl an Teilen für volles Gebäude wird angezeigt

**BugFix**
- Siedlungen:
	- beim ersten Durchlauf einer Siedlung wird nun die korrekte 4x Chance angezeigt

- Statistiken:
	- verbesserte Datumsauswahl (thanks Linnun!)

---

##### 3.6.1.1

**BugFix**
- FP-Leiste:
	- Auf vielen Geräten hat die Animation zu Problemen geführt, wurde entfernt

---

##### 3.6.1.0

**Update**
- FP-Leiste:
	- neues Design

- Kits/Set:
	- neues Design
	- Liga-Belohnungen werden nun auch gefunden
	- neue Gebäude bis Geburtstag 2024 hinzugefügt

- Mergergame (Geburtags-Event):
	- vorbereitet für Änderungen
	- Vorhersage für nächstes Teil und voraussichtliche Belohnungen entfernt

- Blaue Galaxie:
	- Sortierung wird nun gespeichert
	- Sortierung umschaltbar zwischen kombinierter Wertung und Einzelwertung (FP/Güter/Gildengüter/Fragmente)

- Effizienzbewertung:
	- werte 0 und kleiner werden auch angezeigt

- Gildenmitglieder übersicht
	- Gildengüterproduktion einiger Gebäude hinzugefügt

- Eigenanteils-Rechner:
	- Einstellungen hinzugefügt: Medaillen- und Blaupausen-Anzeige deaktivieren

**BugFix**
- Eigenanteils-Rechner:
	- Einstellungen korrekt speichern/auswerten

---

##### 3.5.0.2

**BugFix**
- Export-Funktion:
	- Typo im Code gefixt

---

##### 3.5.0.1
**Update**
- Stadtübersicht
	- Gebäude-Highlighting verbessert
	- Markierung für Gebäude, die keine Straße benötigen, hinzugefügt
  	- globale Sortierung integriert, zeigt an wo Spalten sortiert werden können

**BugFix**
- Galaxie Helfer:
	- Liste hat sich nicht immer aktualisiert
	- Liste war zu lang

---

##### 3.5.0.0
**New**
- PvP Arena Protokoll (thanks to dersiedler1)
	- Es muss nicht durch protokoll geklickt werden
	- Protokolleinträge kategorisiert 
	- kann in den Einstellungen aktiviert werden, damit es beim Öffnen der Arena aufpoppt

- Armee Empfehlung
	- wurde bereits vor einiger Zeit hinzugefügt, aber nie in einem Changelog erwähnt
	- kann in den Einstellungen aktiviert werden
	- verfolgt die durchgeführten Kämpfe
	- wenn ein Kampf unvorteilhaft verläuft (z.B. 2 oder mehr Einheiten Verlust) erfolgt ein Pop-Up
	- der Spieler kann für Gegnerkombinationen und deren Boni Empfehlungen festlegen, die dann bei der Armeeauswahl angezeigt werden

**Update**
- Blaue Galaxie:
	- jetzt immer verfügbar
	- Fragmente und Gildengüter hinzugefügt
	- Auswertung der Gebäudeproduktion verbessert (z.B. Ägäisches Resort)

- Popgame:
	- Layout für kommendes Event angepasst

- Gebäudeeffizienz:
	- listet auch LB

- LB Spürhund:
	- an veränderte Server-Daten angepasst

- LB/Eigenanteil Rechner:
	- Spieler-Aktivitätsindikator hinzugefügt

**BugFix**
- Moppelhelfer:
	- Sortierung nach Zeitalter gefixt

- GG
	- Eigene Provinzen wurden manchmal nicht in der "gesperrt" Liste geführt

---

##### 3.4.0.0
**New**
- GG Gebäude Optimierer:
	- gibt eine Liste von Provinz-Gebäude Kombinationen die die geringste Belastung für die Gildenkasse darstellen

**Update**
- Card Game:
	- Datenerfassung ergänzt (Ausgegebene Zähne, aktuelles Level, aktuelle LP, erhaltene Schlüssel)

- GG Beteiligungstabelle:
	- Zermürbungsspalte hinzugefügt

**BugFix**
- GG Provinz Liste und Karte:
	- Code wurde an neue Datenstruktur der Serverübertragung angepasst (Danke Arklur!)

---

##### 3.3.0.0
**New**
- Card Game (Halloween Event):
	- gibt eine Übersichtstabelle mit den verbleibenden Karten
	- warnt, wenn die Durchführung des nächsten Zuges das Ende der Runde bedeutet

---

##### 3.2.9.0
**Update**
- Sets/Kits:
	- Gebäude Stand Halloween 2023 hinzugefügt
	
- Allgemein:
	- wenn ein beschränktes Gebäude verfällt, wird nun ein Alarm ausgegeben

---

##### 3.2.8.0
**Update**
- Produktionen (Dank an bencptest/apophis):
	- Fragmente Tab wurde ergänzt - hier werden alle Fragmente angezeigt die aktuell produziert werden (unmotivierte Produktionen werden ignoriert)
	
- Idle Game:
	- wenn der Markt (Festival/Bankett) eine höhere Produktion hat als die anderen Gebäude, wird nun in einem Tooltip über der Zeit für die Produktion der Upgrade-Kosten die Zeit angegeben unter der Annahme, dass kein Engpass vorliegt (z.B. wenn an den Zwischenlagern genug Vorrat anliegt)

- Popgame:
	- Anpassungen für Herbstevent

**BugFix**
- Idle Game:
	- es war möglich, dass Zeiten wie "1h:60min" ausgegeben wurden - dies passiert nun nicht mehr

---

##### 3.2.7.0
**Update**
- Wiederkehrende Quests:
	- man kann nun zwischen dem Titel der Quest und den Aufgaben der Quest hin und her schalten (Spaltenkopf klicken - Shuffle-Pfeile)

**BugFix**
- Extension:
	- Kleine Bugs gefixt - vor allem in Bezug auf Titan

---

##### 3.2.6.0

**Update**
- GvG Übersicht: 
  - Man kann jetzt in der GvG Übersicht ebenfalls auf den orange farbenen Button klickt, um die gesamte Macht und alle Gilden inklusive Daten einzelner Karten zu sehen. Bitte einmal alle Karten durchklicken, damit die Gilden und Sektoren erfasst werden können.

- Merger Game:
	- tägliche Übersicht hinzugefügt - es kann zwischen der Übersicht für den Tag und das aktuelle Spiel durch Klick auf den Kopf der zweiten Spalte gewechselt werden
	- Position des Blockers korrigiert
	- Es wurde eine Option hinzugefügt, die es erlaubt einen spezifischen Wert für die Rücksetz-Kosten (Reset) anzugeben der statt der tatsächlichen verwendet werden soll 
		- es sollte der Mittelwert der zu erwartenden Rücksetz-Kosten eingetragen werden (z.B.: 3 Spiele pro Tag --> 20, 4 Spiele pro Tag --> 35)
		- dies hilft dabei, die Effizienz eines Spiels besser abzuschätzen, da diese nicht mehr durch die Reset-Kosten beeinflusst wird

- Wildlife Preview --> Pop-Game Preview
	- Modul wurde für das Herbstevent vorbereitet

- Kits/Sets
	- ein paar fehlende Teile wurden ergänzt

**BugFix**
- Die Einladungslinks zu Discord waren abgelaufen, wir haben sie ersetzt.

---

##### 3.2.5.0

**Update**
- Raumfahrt Titan:
	- diverse Komponenten wurden für Raumfahrt Titan angepasst

- Burg System:
	- GE5 wird nun beachtet

- Gebäude Kits:
	- neue Teile wurden ergänzt

- Idle Game:
	- neue Bedingung "W"(arte bis Aufgabe aktiv oder erfüllt ist) wurde hinzugefügt:
		- ähnlich zu Typ "T", aber wird auch schon erfüllt, sobald die angegebene Aufgabe aktiv ist
		- z.B.: "warte bis aktualisiere 100 Gebäude aktiv #W-26"

- Merger Game:
	- jetzt kompatibel mit dem Soccer Event
	- die Tabelle zeigt nun in der jeweils ersten Zeile die Anzahl an freien Teilen an
	- In der Spalte "Sim" ist zu sehen, wieviel Fortschritt bzw. Spieler/Schlüssel mit der aktuellen Konfiguration erreichbar sind und wie effizient das ist
	- In der Spalte "nächster Spawn" wird angezeigt, wieviel Fortschritt/Spieler/Schlüssel durch das Erzeugen eines weiteren Spielsteins erreichbar sind und wie Effizient das wäre: Min - Max (Mittel)

**BugFix**
- Produktionsübersicht:
	- FP Boost wurde auch auf LB angewandt
  
- Idle Game:
	- Wecker/Timer werden nun korrekt gesetzt - beschränkt auf zeiten geringer als 24 Stunden

---

##### 3.2.4.0

**Update**
- Idle Game:
	- funktioniert nun auch im Gemeinschaftsevent
	- Strategy-Liste hinzugefügt
		- wenn du z.B. mooing cats Strategie Guides magst, wird dir dies helfen, diese auch umzusetzen ohne ständig nachschauen zu müssen
		- die Schritte des Guides können in der Event Box manuell hinzugefügt werden und werden für jedes Event und jeden Stadttyp unabhängig gespeichert. Format:
			- ...Beschreibung...#Bedingung1#Bedingung2#Bedingung3
			- Es kann beliebig viele Bedingungen geben
			- Bedingungs-Typen: L(evel) M(anager) T(ask)
			- Gebäudetypen: T(ransport) (Schiff, Kutsche), F(estival), 1, 2, 3, 4, 5 (Fabriken 1-5)
			- z.B.:
				- Festival Manager 3 + Ship Manager 3  #MF-3#MT-3
				- Hüte Manager 3, Level 10  #M1-3#L1-10
				- Warten bis 50B Blumen gesammelt sind#T-67
			- Die Bedingungen sind optional und werden nur benötgt, wenn du willst, dass der Helfer die Schritte automatisch abhakt
			- Schritte können manuell abgehakt und wieder geöffnet werden

- Produktionsübersicht und -effizienz:
	- die neuen Armee-Boosts (Angriff+Verteidigung) und der FP boost werden nun korrekt verarbeitet

- GB Spürhund
	- kann nun minimiert werden

- Gildengefechte
	- wenn in der Provinzübersicht keine Zeile ausgewählt ist, wird nun ein "alle auswählen" Button angezeigt

- Moppelhelfer
	- Spalte "Gilde" hinzugefügt
	- es kann nun ausgewählt werden, welche der Spalten Gilde, Era und Punkte angezeigt werden

- Powerleveln
	- Es kann nun ein Start Level angegeben werden

- Freunde in Gruppen finden
	- zeigt nun die Spieleraktivität

**BugFix**
- Wiederkehrenden Quests (Diamanten Check)
	- die Questliste setzt sich nun ordentlich zurück bei ZA-Wechsel

- Gildenexpedtions-Statistik
	- gelegentlich wurden für einzelne Spieler NaA angezeigt
	- Teilnahme% für GE seit Einführung von GE5 geändert
	- korrektes Icon für GE5

---

##### 3.2.3.0

**Update**
- Infobox:
	- es kann nun eingestellt werden, dass statt des vollen GG-Provinznamen nur das Kürzel ausgegeben wird.

**BugFix**
- externe Bilder:
	- wenn die Spieldatei nicht im Cache vorlag, konnte es passieren, dass Bilder von Innogames nicht korrekt geladen wurden

- Eigenanteils-Rechner:
	- war die Infobox vor dem Eigenanteilsrechner offen, konnte es passieren, dass durch Klick auf den Filter in der Infobox, die Einstellungen des Eigenanteilrechners geöffnet wurde.

##### 3.2.2.0

**Update**
- Merger Game:
	- Die Parameter, die die Farbe der Effizienz bestimmen können nun in den Optionen eingestellt werden
		- Fortschritt je Schlüssel: Soviel Fortschritt ist ein Schlüssel etwa wert (Kistenkauf - Standard:1,3)
		- Zielfortschritt: soweit willst du kommen in den Hauptpreisen (Standard: 3750 für goldenes Kit)
		- vorhandene Währung: soviel Energie steht zur Verfügung (Standard: 11000 - 10500 von Quests und geschätzte 500 von Ereignissen)
			- gekaufte Währung sollte entsprechend aufaddiert werden
		- Die Effizienz wird rot, wenn 5% unterhalb des Zielwerts
		- Die Effizienz ist grün 15% oberhalb des Zielwerts
		- Die Effizienz ist also gelb, wenn gerade gut genug, um Ziel zu erreichen
	- wenn auf die Effizienz gezeigt wird, wird in einem Tooltip ausgegeben, wie viel Fortschritt mit dieser Effizienz erreicht werden kann
	- wenn auf die Energie gezeigt wird, wird in einem Tooltip ausgegeben, wie viel Fortschritt für die aktuell ausgegebene Enrgie auf dem Brett gemacht werden sollte, um den Zielfortschritt zu erreichen
	- wenn der Reset-Blocker (nicht) verschwinden soll, wenn die Box minimiert wird, kann das nun eingestellt werden

- Statistik:
	- Belohnungen können nun nach Namen gefiltert werden

- Verhandlungshelfer:
	- Tooltip für die Hinweise zur Tastenkombination hinzugefügt

- Sets und Kits:
	- fehlende Teile hinzugefügt

- Boxen:
	- können nun nicht mehr über den Fensterrand hinaus vergrößert werden

**BugFix**
- Quest zähler:
	- [#2541](https://github.com/mainIine/foe-helfer-extension/issues/2541) wurden mehrere Wiederkehrenden Quests in kurzer Folge abgebrochen wurde nur eine gezählt

##### 3.2.1.0

**Update**
- Merger Game:
	- geänderte Werte (Inno Update) - sollte jetzt robuster sein, sollten weitere Änderungen kommen

- FP-Einsammlungen:
	- Geburtstags-Event ergänzt
	
---

##### 3.2.0.0

**New**
- Merger Game (Geburtstagsevent Minispiel)
	- gibt einen Überblick über die auf dem Spielbrett vorhandenen Schlüsselteile

**Update**
- Musik-Modul:
	- neuer Track hinzugefügt (aktuell nur auf Beta-Server verfügbar)

- Event-Kosten Rechner:
	- zweite Kostenspalte am Ende der Tabelle eingefügt 
	- Hervorheben der günstigsten Option erfolgt jetzt zusätzlich in der entsprechenden Kostenspalte

- Kits:
	- Die Liste kann nun gefiltert werden - nach Name des Gegenstands oder des Sets

**BugFix**
- General:
	- Spieler-Portraits wurden manchmal nicht angezeigt, wenn Module zu zeitig nach Spielstart geöffnet wurden

---

##### 3.1.0.1

**Update**
- Spieler-ID hinzugefügt zum Export von:
	- Expeditionsdaten
	- GG-Daten
	- Gildenmitglieder-Daten

**BugFix**
- Alarme:
	- Alarme wurden vorzeitig gelöscht

- General:
	- Die Changelog wurden nicht mehr aufgerufen, nachdem ein Update durchgeführt wurde

---

##### 3.1.0.0

**Neu**
- LB Spürhund:
	- hilft bei der LB-Suche - z.B. bei der BP-Jagd
	- während durch die LB-Rangliste oder die LB-Liste anderer Spieler geklickt wird, zeichnet der LB-Spürhund alle LB auf, die angegebenen Kriterien entsprechen
	- wähle das gewünschte LB aus, gib gegebenenfalls einen Stufenbereich an und geh auf die Jagd
	- "zurücksetzen" löscht die Liste und den Filter

**Update**
- LB Rechner:
	- neue Formatierung

- GvG:
	- BA Kosten für die nächste Belagerung wurden hinzugefügt
	- Macht Bonus für die ersten drei Gilden auf einer Karte wurde hinzugefügt

**BugFix**
- Menü:
	- Es konnte passieren, dass Tooltips zurückgelassen wurden, wenn das Menü durch Zoom oder ähnliche Aktionen von einem Modus in einen anderen Modus gezwungen wurde.

- StPatrick:
	- aktualisierte nicht mehr korrekt

- GG:
	- X1 wurde nicht korrekt aktualisiert

---

##### 3.0.0.1

**BugFix**
- Statistiken:
  - Script wurde nicht immer lokal eingebunden, das ist nun geändert

---

##### 3.0.0.0

**Neu**
- Erweiterung:
  - Kompatibilität für die neuen Manifest V3 Anforderungen für Chromium-Browser geschaffen, Firefox folgt  im 1 Quartal 2023
  - diverse CSS Anpassungen

**Update**
- Discord Webhooks:
  - Kopieren Button ergänzt
  - Maximale Höhe für viele Einträge ergänzt
  - Testbutton integriert
  - beliebig viele Webhook Urls können hinterlegt werden
  - neue Funktionen werden folgen...

**BugFix**
- Notizfunktion: 
  	- Box wurde wegen eines fehlerhaften Avatar links nicht angezeigt

