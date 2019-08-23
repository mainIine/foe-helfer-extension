/*
 * **************************************************************************************
 *
 * Dateiname:                 de.js
 * Projekt:                   foe
 *
 * erstellt von:              Daniel Siekiera <daniel.siekiera@gmail.com>
 * zu letzt bearbeitet:       15.08.19, 11:41 Uhr
 *
 * Copyright © 2019
 *
 * **************************************************************************************
 */

let i18n = {
	"Boxes" : {
		"OwnpartCalculator" : {
			"Title": "Eigenanteilsrechner",
			"HelpLink": "https://foe-rechner.de/extension/index#Eigenanteilsrechner",
			"Step": "Stufe",
			"ArcBonus": "Arche Bonus",
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
			"LastDeposit": "Letzte Einzahlung",
			"Harvest": "Ernte: "
		},

		"StrategyPoints" : {
			"Title" : "FP - Produktionen",
			"TotalFPs": "Gesamt FP aus allen Gebäuden: ",
			"Amount": "Anzahl"
		},

		"Neighbors" : {
			"Title" : "Produktionen von ",
			"ReadyProductions" : "Fertige Produktionen",
			"OngoingProductions" : "Laufende Produktionen"
		},

		"Outpost" : {
			"Title" : "Güter des Außenpostens",
			"TitleShort" : "Güterübersicht - ",
			"DescRequired" : "Benötigt",
			"DescInStock" : "Vorhanden",
			"DescStillMissing" : "Fehlt noch",
		}
	},

	"Menu" : {
		"TotalFPs" : {
			"Title" : "FP Produktion",
			"Desc" : "Zeigt die derzeitige Anzahl aller sammelbaren FPs an."
		},
		"Calculator" : {
			"Title" : "Kostenrechner",
			"Desc" : "Rechnet für Dich alle Plätze aus und ermittelt Snipe-Bare FPs",
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
			"Desc" : "Du hast eine Frage? Dich nervt etwas? Oder einfach nur zum reden..."
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
		}
	},

	"Settings" : {
		"active" : "Aktiv",
		"inactive" : "Inaktiv",
		"GlobalSend": {
			"Title" : "Übermittlung an foe-rechner.de",
			"Desc" : "Wenn Du mit deiner Gilde Daten tracken möchtest, aktiviere diesen Punkt.<br>Für eine autarke Extension einfach deaktiveren"
		},
		"SendTavernInfo": {
			"Title" : "Moppel Aktivität",
			"Desc" : "Sollen beim aufrufen der Events die Moppel-Aktivitäten übertragen werden?"
		},
		"SendGEXInfo": {
			"Title" : "GEX Auswertungen",
			"Desc" : "Übermittelt beim klicken in der GEX auf Platzierungen oder Rangliste die Daten"
		},
		"SendGildMemberLGInfo": {
			"Title" : "LG Daten anderer Gildenmitglieder",
			"Desc" : "Beim besuchen von anderen Gildenmitgliedern werden sämtliche LG Daten an foe-rechner.de geschickt, wenn Global aktivert"
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
	},

	"AllPoints" : {
		"headings" : {
			"greatbuilding" : "Legendäre Gebäude",
			"production" : "Produktionsgebäude",
			"random_production" : "Zufalls Produktionen",
			"residential" : "Eventgebäude"
		}
	}
};