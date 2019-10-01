/*
 * **************************************************************************************
 *
 * Dateiname:                 de.js
 * Projekt:                   foe
 *
 * erstellt von:              Daniel Siekiera <daniel.siekiera@gmail.com>
 * zu letzt bearbeitet:       01.10.19, 13:26 Uhr
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
			"ArcBonus": "Arche Bonus",
			"PatronPart": "Mäzen Anteil: ",
			"OwnPart": "Eigenanteil",
			"LGTotalFP": "LG Gesamt-FP",
			"ExternalFP": "Externe FP",
			"Order": "Reihenfolge",
			"Deposit": "Einzahlen",
			"CopyValues": "Werte kopieren",
			"YourName": "Dein Name",
			"IndividualName": "Individueller LG Name",
			"OutputScheme": "Ausgabe Schema",
			"Place": "Platz",
			"Levels": "Leveln"
		},

		"Calculator": {
			"Title": "Kostenrechner",
			"HelpLink": "https://foe-rechner.de/extension/index#Kostenrechner",
			"Step": "Stufe ",
			"AvailableFP": "Verfügbare Forgepunke",
			"ArcBonus": "Arche Bonus",
			"Earnings": "Ertrag",
			"Save": "Save",
			"Commitment": "Einsatz",
			"Profit": "Gewinn",
			"NoFPorMedsAvailable": "Keine FPs oder BPs verfügbar",
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

		"Settings" : {
			"Title" : "Einstellungen",
			"Active" : "Aktiv",
			"Inactive" : "Inaktiv",
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
			"Desc" : "Sobald ein Boost in der Taverne aktiviert wird, erschein ein global verschiebbarer Counter"
		},
		"ShowOutpost": {
			"Title" : "Außenposten Resourcen",
			"Desc" : "Blendet einen Menüpunkt für Außenposten Resourcen ein<br><u>Hinweis:</u> Spiel Reload erforderlich"
		}
	}
};