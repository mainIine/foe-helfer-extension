/*
 * **************************************************************************************
 *
 * Dateiname:                 de.js
 * Projekt:                   foe
 *
 * erstellt von:              Daniel Siekiera <daniel.siekiera@gmail.com>
 * zu letzt bearbeitet:       20.11.19, 22:33 Uhr
 *
 * Copyright © 2019
 *
 * **************************************************************************************
 */

let i18n = {
	"Local" : "de-DE",
	"DateTime" : "DD.MM.YYYY HH:mm [Uhr]",
	
	"Boxes" : {
		"OwnpartCalculator" : {
			"Title": "Eigenanteilsrechner",
			"HelpLink": "https://foe-rechner.de/extension/index#Eigenanteilsrechner",
			"Step": "Stufe",
			"PatronPart": "Mäzen Anteil",
			"OwnPart": "Eigenanteil",
			"LGTotalFP": "LG Gesamt-FP",
            "OwnPartRemaining": "Verbleibend",
            "Done": "Erledigt",
			"Order": "Reihenfolge",
			"Deposit": "Einzahlen",
			"CopyValues": "Werte kopieren",
			"YourName": "Dein Name",
			"IndividualName": "Individueller LG Name",
			"OutputScheme": "Ausgabe Schema",
            "Auto": "Auto",
            "Place": "Platz",
            "Levels": "Leveln",
            "NoPlaceSafe": "Kein Platz sicher"
		},

		"Calculator": {
			"Title": "Kostenrechner",
			"HelpLink": "https://foe-rechner.de/extension/index#Kostenrechner",
			"Step": "Stufe ",
			"AvailableFP": "Verfügbare Forgepunke",
			"ArcBonus": "Arche Bonus",
			"Earnings": "Ertrag",
			"Rate": "Kurs",
			"Up2LevelUp": "Bis zum leveln",
			"FP": "FP",
			"Save": "Save",
			"Commitment": "Einsatz",
			"Profit": "Gewinn",
			"NoFPorMedsAvailable": "Keine FPs oder BPs verfügbar",
			"LGNotOpen": "Die nächste Stufe ist derzeit noch nicht freigeschaltet",
			"LGNotConnected": "Das Gebäude ist nicht mit einer Straße verbunden",
		},

		"LGOverviewBox": {
			"Title": "Mögliche Einzahlungen",
			"Tooltip": {
				"FoundNew": "neu gefunden",
				"FoundAgain": "wiedererkannt",
				"NoPayment": "bisher keine Einzahlung",
			},
			"Building": "Gebäude",
			"Level": "Level",
			"PayedTotal": "Eingez. / Gesamt",
			"Rate": "Kurs",
			"NothingToGet": "Bei <strong>__player__</strong> gibt es nichts zu holen"
		},

		"StrategyPoints" : {
			"Title" : "FP - Produktionen",
			"TotalFPs": "Gesamt FP aus allen Gebäuden: ",
			"Amount": "Anzahl",
			"FPBar" : "FP-Lager: "
		},

		"Productions" : {
			"Title" : "Produktions Übersicht",
			"SearchInput": "Gebäude Suche...",
			"Total" : "Gesamt: ",
			"ModeGroups": "Gruppiert",
			"ModeSingle": "Einzeln",
			"Headings" : {
				"number" : "Anzahl",
				"amount" : "Menge",
				"earning" : "Ernte",
				"greatbuilding" : "Legendäre Gebäude",
				"production" : "Produktionsgebäude",
				"random_production" : "Zufalls Produktionen",
				"residential" : "Eventgebäude",
				"main_building" : "Rathaus",
				"all" : "Alle"
			}
		},

		"Neighbors" : {
			"Title" : "Produktionen von ",
			"ReadyProductions" : "Fertige Produktionen",
			"OngoingProductions" : "Laufende Produktionen"
		},

		"Outpost" : {
			"Title" : "Güter des Außenpostens",
			"TitleShort" : "Güterübersicht - ",
			"TitleBuildings" : "Gebäude",
			"TitleFree" : "Frei",
			"DescRequired" : "Benötigt",
			"DescInStock" : "Vorhanden",
			"DescStillMissing" : "<span style='color:#29b206'>Überschuss</span> / <span style='color:#ef1616'>Fehlt</span>",
        },

        "Technologies": {
            "Title": "Forschungskosten für aktuelles Zeitalter",
            "Resource": "Ressource",
            "DescRequired": "Benötigt",
            "DescInStock": "Vorhanden",
            "DescStillMissing": "<span style='color:#29b206'>Überschuss</span> / <span style='color:#ef1616'>Fehlt</span>",
        },

		"Settings" : {
			"Title" : "Einstellungen",
			"Active" : "Aktiv",
			"Inactive" : "Inaktiv",
		},

		"Infobox" : {
			"Title" : "Infobox",
			"Filter" : "Filter",
			"FilterGex" : "GEX",
			"FilterAuction" : "Auktion",
			"FilterLevel" : "Level-Up",
			"FilterMessage" : "Nachricht",
			"ResetBox" : "Box leeren",
			"Messages" : {
				"GEX" : "<strong>__player__</strong> hat gerade __points__ Punkte in der GEX bekommen.",
				"LevelUp" : "__player__'s __building__ hat gerade Stufe __level__ erreicht.<br>Du hast Platz <strong>__rank__</strong> belegt",
				"Auction" : "<strong>__player__</strong> hat gerade __amount__ Münzen geboten",
				"MsgBuilding" : "__building__ - Stufe __level__"
			}
		}
	},

	"Menu" : {
		"Productions" : {
			"Title" : "Produktions Übersicht",
			"Desc" : "Zeigt die derzeitige Anzahl aller Produktionen an."
		},
		"Calculator" : {
			"Title" : "Kostenrechner",
			"Desc" : "Rechnet für Dich alle Plätze aus und ermittelt snipe-bare FPs",
			"Warning": "Deaktiviert: Öffne zuerst das LG eines anderen Spielers!"
		},
		"OwnpartCalculator" : {
			"Title" : "Eigenanteilsrechner",
			"Desc" : "Zahlplan erstellen, externe Plätze berechnen und Werte kopieren",
			"Warning": "Deaktiviert: Öffne zuerst eines deiner Legendären Gebäude!"
        },
        "Technologies": {
            "Title": "Technologien",
            "Desc": "Kosten für Forschung berechnen",
            "Warning": "Deaktiviert: Öffne zuerst das Forschungsmenü!"
        },
		"Settings" : {
			"Title" : "Einstellungen",
			"Desc" : "Hier stellst du ein paar Kleinigkeiten ein"
		},
		"Chat" : {
			"Title" : "Gilden Live-Chat",
			"Desc" : "In Echtzeit mit allen quatschen"
		},
		"Forum" : {
			"Title" : "Forum",
			"Desc" : "Du hast eine Frage? Dich nervt etwas? Oder einfach nur zum Reden..."
		},
		"Ask" : {
			"Title" : "Frage / Antwort",
			"Desc" : "Du weißt nicht wie etwas funktioniert?<br>Schau nach!"
		},
		"Bugs" : {
			"Title" : "Fehler / Wünsche",
			"Desc" : "Etwas geht nicht wie es soll oder du hast eine Idee?"
		},
		"OutP" : {
			"Title" : "Außenposten",
			"Desc" : "Übersicht über die benötigten Ressourcen",
			"DescWarning" : "<em id='outPW' class='tooltip-error'>Deaktiviert: Besuche zuerst den Außenposten!<br></em>Übersicht über die benötigten Ressourcen"
		},
		"Info" : {
			"Title" : "Info Box",
			"Desc" : "Zeigt dir alle Dinge an die im \"Hintergrund passieren\"<br><em>Füllt sich nach und nach mit Infos...</em>"
		}
	},

	"Settings" : {
		"GlobalSend": {
			"Title" : "Übermittlung an foe-rechner.de",
			"Desc" : "Wenn Du mit deiner Gilde Daten tracken möchtest, aktiviere diesen Punkt.<br>Für eine autarke Extension einfach deaktiveren"
		},
		"SendTavernInfo": {
			"Title" : "Moppel Aktivität",
			"Desc" : "Sollen beim Aufrufen der Events die Moppel-Aktivitäten übertragen werden?"
		},
		"SendGEXInfo": {
			"Title" : "GEX Auswertungen",
			"Desc" : "Übermittelt beim Klicken in der GEX auf Platzierungen oder Rangliste die Daten"
		},
		"SendGildMemberLGInfo": {
			"Title" : "LG Daten anderer Gildenmitglieder",
			"Desc" : "Beim Besuchen von anderen Gildenmitgliedern werden sämtliche LG Daten an foe-rechner.de geschickt, wenn Global aktivert"
		},
		"ShowNeighborsGoods": {
			"Title" : "Nachbarschafts Ernte",
			"Desc" : "Beim Besuch anzeigen was derzeit produziert wird"
		},
		"SendInvestigations": {
			"Title" : "FP Investitionen",
			"Desc" : "Beim betreten des 'Rathauses' > 'Neuigkeiten' > 'Legendäre Bauwerke' werden die FP investionen übermittelt"
		},
		"ShowTavernBadge": {
			"Title" : "Tavernen Badge anzeigen",
			"Desc" : "Sobald ein Boost in der Taverne aktiviert wird, erscheint ein global verschiebbarer Counter"
		},
		"ShowOutpost": {
			"Title" : "Außenposten Resourcen",
			"Desc" : "Blendet einen Menüpunkt für Außenposten Resourcen ein<br><u>Hinweis:</u> Spiel Reload erforderlich"
		},
		"PreScanLGList": {
			"Title" : "Vorab-Scann der LG Übersicht",
			"Desc" : "Scannt die Übersichtsliste des Nachbarn beim öffnen und ermittelt eventuell befüllbare LGs.<br><u>Hinweis:</u> Da die endgültigen Plätze erst beim öffnen eines LGs übermittel werden, kann das Ergebniss abweichen. Der Scann wird jedoch gespeichert."
		},
		"CalculatorShowNegativ": {
			"Title" : "Negativer Gewinn im Kostenrechner",
			"Desc" : "Möchtest Du auch den negativen Gewinn angezeigt bekommen?"
		},
		"ResetBoxPositions": {
			"Title" : "Box Koordinaten",
			"Desc" : "Sollen alle Box Koordinaten zurückgesetzt werden?",
			"Button" : "Löschen!"
		}
	},

	"API" : {
		"UpdateSuccess" : "Update durchgeführt",
		"GEXPlayer" : "Die GEX Platzierungen der Mitglieder wurden geupdatet",
		"GEXChampionship" : "Die GEX-Gilden Platzierung wurde geupdatet",
		"LGInvest" : "Deine LG Investitionen wurden übertragen",
		"LGGildMember" : "__player__'s LGs wurden übermittelt"
	}
};