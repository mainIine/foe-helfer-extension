/*
 * **************************************************************************************
 *
 * Dateiname:                 de.js
 * Projekt:                   foe-chrome
 *
 * erstellt von:              Daniel Siekiera <daniel.siekiera@gmail.com>
 * erstellt am:	              17.12.19, 22:44 Uhr
 * zuletzt bearbeitet:       17.12.19, 22:18 Uhr
 *
 * Copyright © 2019
 *
 * **************************************************************************************
 */

let i18n = {
	"Local" : "de-DE",
	"DateTime" : "DD.MM.YYYY HH:mm [Uhr]",

	"Global" : {
		"BoxTitle": " <small><em> - FoE Helfer</em></small>"
	},

	"Boxes" : {
		"OwnpartCalculator" : {
			"Title": "Eigenanteilsrechner",
			"HelpLink": "https://foe-rechner.de/extension/index#Eigenanteilsrechner",
            "Step": "Stufe",
            "OldLevel": "Altes Level",
			"PatronPart": "Mäzen Anteil",
			"OwnPart": "Eigenanteil",
			"LGTotalFP": "LG Gesamt-FP",
            "OwnPartRemaining": "Verbleibend",
			"Done": "Erledigt",
			"BPs": "BPs",
			"Meds": "Meds",
			"Ext": "Ext",
			"Arc": "Arche",
			"Order": "Reihenfolge",
			"Deposit": "Einzahlen",
			"CopyValues": "Werte kopieren",
			"Note": "Merken",
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
			"AvailableFP": "Verfügbare Forgepunkte",
			"FriendlyInvestment": "Fördern mit:",
			"ArcBonus": "Arche Bonus",
			"Rate": "Kurs",
			"Up2LevelUp": "Bis zum leveln",
			"FP": "FP",
			"Save": "Save",
			"BPs": "BPs",
			"Meds": "Meds",
			"Commitment": "Einsatz",
			"Profit": "Gewinn",
			"LevelWarning": "ACHTUNG! Levelt das LG!",
			"NoFPorMedsAvailable": "Keine FPs oder BPs verfügbar",
			"LGNotOpen": "Die nächste Stufe ist derzeit noch nicht freigeschaltet",
			"LGNotConnected": "Das Gebäude ist nicht mit einer Straße verbunden",
			"ActiveRecurringQuest": "Aktiver Schleifenquest:",
			"Done": "abgeschlossen",
			"LevelWarningTT": "__fpcount__FP passen nicht mehr hinein<br>Maximale Einzahlung: __totalfp__FP",
			"NegativeProfitTT": "Platz ist nicht sicher. __fpcount__FP müssen zusätzlich zum Absichern gezahlt werden<br>Gesamt zum Absichern: __totalfp__FP"
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
			"Profit": "Gewinn",
			"NothingToGet": "Bei <strong>__player__</strong> gibt es nichts zu holen"
		},

		"StrategyPoints" : {
			"Title" : "FP - Produktionen",
			"TotalFPs": "Gesamt FP aus allen Gebäuden: ",
			"Amount": "Anzahl",
			"FPBar" : "FP-Lager: ",
			"BuyableFP" : "Kaufbar: "
		},

		"Productions" : {
			"Title" : "Produktions Übersicht",
			"SearchInput": "Gebäude Suche...",
			"Total" : "Gesamt: ",
			"ModeGroups": "Gruppiert",
			"ModeSingle": "Einzeln",
			"Happiness": "Zufriedenheit",
			"AdjacentBuildings": "Angrenzende Gebäude",
			"Headings" : {
				"number" : "Anzahl",
				"amount" : "Menge",
				"earning" : "Ernte",
				"greatbuilding" : "Legendäre Gebäude",
				"production" : "Produktionsgebäude",
				"random_production" : "Zufalls Produktionen",
				"residential": "Wohngebäude",
				"decoration": "Dekorationen",
				"street": "Straßen",
				"goods": "Gütergebäude",
				"culture": "Kulturelle Gebäude",
				"main_building": "Rathaus",
				"boost": "Boost",
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
			"ExpansionsSum" : "Erweiterungen",
			"nextTile" : "nächste Erweiterung",
			"tileNotPlanned" : "off",
			"infoLine" : "__runNumber__. Durchlauf, Bonus x4 Chance: __chanceX4__%",
        },

        "Technologies": {
            "Title": "Forschungskosten für",
            "Resource": "Ressource",
            "DescRequired": "Benötigt",
            "DescInStock": "Vorhanden",
			"DescStillMissing": "<span style='color:#29b206'>Überschuss</span> / <span style='color:#ef1616'>Fehlt</span>",
			"NoTechs": "Du bist am Ende des Zeitalters angelangt",
            "Eras": {
                1: "Steinzeit",
                2: "Bronzezeit",
                3: "Eisenzeit",
                4: "Frühes Mittelalter",
                5: "Hochmittelalter",
                6: "Spätes Mittelalter",
                7: "Kolonialzeit",
                8: "Industriezeitalter",
                9: "Jahrhundertwende",
                10: "Moderne",
                11: "Postmoderne",
                12: "Gegenwart",
                13: "Morgen",
                14: "Zukunft",
                15: "Arktische Zukunft",
                16: "Ozeanische Zukunft",
                17: "Virtuelle Zukunft",
                18: "Raumfahrt: Mars",
                19: "Raumfahrt: Ceres"
            }
        },

        "Campagne": {
            "Title": "Eroberungskosten für ",
            "Reward": "Gesamtbelohnung ",
            "AlreadyDone": " bereits erobert!",
            "Resource": "Ressource",
            "DescRequired": "Benötigt",
            "DescInStock": "Vorhanden",
            "DescStillMissing": "<span style='color:#29b206'>Überschuss</span> / <span style='color:#ef1616'>Fehlt</span>",
        },

        "EventList": {
            "Title": "Event-Questliste für: ",
            "Desc": "Aufgabe",
            "Reward": "Belohnung",
			"Number": "Nr.",
			"Or": " oder ",
			"And": " und ",
			"Upcoming": "Ungefähre Vorschau <em>(Werte werden bei Aktiverung aktualisiert)</em>",
			"Waiting": "Keine Quest vorhanden",
        },

        "Negotiation": {
            "Title" : "Verhandlungassistent",
            "WrongGoods": "Falsche Güter ausgewählt, bitte manuell fertig spielen",
            "TryEnd": "Versuche zu Ende",
            "Canceled": "Verhandlung wurde abgebrochen",
            "Success": "Erfolg",
			"Chance": "Chance",
			"Person": "Person",
			"Average": "Ø Menge",
			"Costs": "Kosten:",
			"Round": "Runde",
			"Stock": "Lager:",
			"GoodsLow": "ACHTUNG: Der Gütervorrat ist knapp",
			"GoodsCritical": "ACHTUNG: Der Gütervorrat ist kritisch",
			"DragDrop": "Du kannst die Icons der Durchschnittsanzeige selber via Drag&Drop neu anordnen um die Reihenfolge vor dem 1. Versuch festzulegen.",
			"TableLoadError": "Fehler beim Laden der Verhandlungtabelle"
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
			"FilterGildFights" : "Gildengefechte",
			"FilterTrade" : "Handel",
			"ResetBox" : "Box leeren",
			"Messages" : {
				"GEX" : "<strong>__player__</strong> hat gerade __points__ Punkte in der GEX bekommen.",
				"LevelUp" : "__player__'s __building__ hat gerade Stufe __level__ erreicht.<br>Du hast Platz <strong>__rank__</strong> belegt und erhälst <strong>__fps__ FP</strong>",
				"Auction" : "<strong>__player__</strong> hat gerade __amount__ Münzen geboten",
				"Trade" : "<strong>__player__</strong> hat dein Angebot angenommen.<br>Du hast __needValue__ __need__ für __offerValue__ __offer__ bekommen",
				"MsgBuilding" : "__building__ - Stufe __level__",
				"GildFightOccupied": "Provinz <span style=\"color:#ffb539\">__provinceName__</span> wurde von <span style=\"color:__attackerColor__;text-shadow: 0 1px 1px __attackerShadow__\">__attackerName__</span> übernommen und ist bis __untilOccupied__ Uhr gesperrt"
			}
		},

		"Units" : {
			"Title": "Armee Übersicht",
			"NextUnitsIn": "Die nächsten __count__ Einheiten kommen in <span class=\"alca-countdown\"></span> um __harvest__ Uhr",
			"ReadyToLoot": "Bereit zur Ernte!",
			"Proportionally": "Anteilig",
			"Quantity": "Anzahl",
			"Unit": "Einheit",
			"Status": "Status",
			"Attack": "Angriff",
			"Defend": "Verteidigung",
			"NotFilled": "nicht gefüllt",
			"Bind": "Gebunden",
			"Unbind": "Ungebunden"
		},

		"CityMap": {
			"TitleSend": "Daten übermitteln",
			"Desc1": "Um deine Stadt planen zu können müssen wir deine Daten zu foe-rechner.de schicken. Dort kannst du dich dann austoben.",
			"Desc2": "<button class='btn-default' id='submit-data' onclick='CityMap.SubmitData()'>Abschicken</button>",
			"SubmitSuccess": "Die Daten wurden übermittelt... Geh nun zu ",
			"WholeArea": "Gesamte Fläche: ",
			"FreeArea": "Freie Fläche: "
		},

		"Gildfights": {
			"Title": "Spieler Übersicht",
			"Player": "Spieler",
			"Negotiations": "Verhandlungen",
			"Fights": "Kämpfe",
			"LastSnapshot": " - letzter Snapshot vor __time__",
		},

		"HiddenRewards": {
			"Title": "Ereignisse",
			"Appears": "Erscheint",
			"Disappears": "Verschwindet",
			"NoEvents": "Keine Ereignisse vorhanden"
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
        "Campagne": {
            "Title": "Kampagne",
            "Desc": "Übersicht über die benötigten Ressourcen",
        	"Warning" : "Deaktiviert: Besuche zuerst eine Provinz!"
		},
        "Event": {
            "Title": "Event Questliste",
            "Desc": "Übersicht über die nächsten Event Quests"
		},
        "Negotiation": {
            "Title": "Verhandlungassistent",
			"Desc": "Macht dir präzise Vorschläge für Verhandlungen",
			"Warning": "Deaktiviert: Starte zuerst eine neue Verhandlung!"
        },
		"Settings" : {
			"Title" : "Einstellungen",
			"Desc" : "Hier stellst du ein paar Kleinigkeiten ein"
		},
		"Chat" : {
			"Title" : "Gilden Live-Chat",
			"Desc" : "In Echtzeit mit allen quatschen"
		},
		"Unit" : {
			"Title" : "Armeen",
			"Desc": "Alle deine Armeen auf einen Blick",
			"Warning": "Öffne erst 1x deine \"Armee-Organisation\"<br>Taste \"U\""
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
            "Desc": "Übersicht über die benötigten Ressourcen",
            "DescWarningOutpostData": "<em id='outPW' class='tooltip-error'>Deaktiviert: Starte zuerst einen Außenposten und lade das Spiel neu (F5)",
			"DescWarningBuildings" : "<em id='outPW' class='tooltip-error'>Deaktiviert: Besuche zuerst den Außenposten!<br></em>Übersicht über die benötigten Ressourcen"
		},
		"Info" : {
			"Title" : "Info Box",
			"Desc" : "Zeigt dir alle Dinge an die im \"Hintergrund passieren\"<br><em>Füllt sich nach und nach mit Infos...</em>"
		},
		"HiddenRewards": {
			"Title": "Ereignisse",
			"Desc": "Übersicht der Ereignisse auf der Map"
		},
		"Citymap": {
			"Title": "Stadtübersicht",
			"Desc": "Zeigt deine Stadt schematisch von oben"
		}
	},

	"Settings" : {
		"Version": {
			"Title" : "Version",
			"DescDebug" : "<p>Extension <strong class='text-danger'>BETA</strong></p><a target='_blank' href='https://foe-rechner.de/extension/update?v=__version__&lang=__language__'>Changelog</a>",
			"Desc" : "Chrome Extension Version",
			"PlayerId": "Spieler Id:",
			"GuildId": "Gilden Id:",
			"World": "Welt:"
		},
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
		"PreScanLGList": {
			"Title" : "Vorab-Scann der LG Übersicht",
			"Desc" : "Scannt die Übersichtsliste des Nachbarn beim öffnen und ermittelt eventuell befüllbare LGs.<br><u>Hinweis:</u> Da die endgültigen Plätze erst beim öffnen eines LGs übermittel werden, kann das Ergebniss abweichen. Der Scann wird jedoch gespeichert."
		},
		"AutomaticNegotiation": {
			"Title" : "Verhandlungsassistent",
			"Desc" : "Soll der Assistent automatisch mit einer Verhandlung geöffnet und bei Abbruch geschlossen werden?"
		},
		"ResetBoxPositions": {
			"Title" : "Box Koordinaten",
			"Desc" : "Sollen alle Box Koordinaten zurückgesetzt werden?",
			"Button" : "Löschen!"
		},
		"MenuLength": {
			"Title" : "Menü Länge",
			"Desc" : "Wie viele Elemente soll das Menü hoch sein?<br> Leer oder \"0\" ist automatische Höhe."
		},
		"ChangeLanguage": {
			"Title" : "Sprache wechseln",
			"Desc" : "Welche Sprache, statt der erkannten, soll genutzt werden?",
			"Dropdown": {
				"de": "Deutsch", // Dont translate!!!
				"en": "English", // Dont translate!!!
				"fr": "Français", // Dont translate!!!
				"es": "Español", // Dont translate!!!
				"ru": "Русский", // Dont translate!!!
				"sv": "Svenska", // Dont translate!!!
				"cs": "Český", // Dont translate!!!
				"ro": "Română" // Dont translate!!!
			}
		}
	},

	"Eras" : {
		"NoAge": "Ohne Zeitalter",
		"StoneAge": "Steinzeit",
		"BronzeAge": "Bronzezeit",
		"IronAge": "Eisenzeit",
		"EarlyMiddleAge": "Frühes Mittelalter",
		"HighMiddleAge": "Hochmittelalter",
		"LateMiddleAge": "Spätes Mittelalter",
		"ColonialAge": "Kolonialzeit",
		"IndustrialAge": "Industriezeitalter",
		"ProgressiveEra": "Jahrhundertwende",
		"ModernEra": "Die Moderne",
		"PostModernEra": "Die Postmoderne",
		"ContemporaryEra": "Gegenwart",
		"TomorrowEra": "Morgen",
		"FutureEra": "Zukunft",
		"ArcticFuture": "Arktische Zukunft",
		"OceanicFuture": "Ozeanische Zukunft",
		"VirtualFuture": "Virtuelle Zukunft",
		"SpaceAgeMars" : "Raumfahrt: Mars"
	},

	"API" : {
		"UpdateSuccess" : "Update durchgeführt",
		"GEXPlayer" : "Die GEX Platzierungen der Mitglieder wurden geupdatet",
		"GEXChampionship" : "Die GEX-Gilden Platzierung wurde geupdatet",
		"LGInvest" : "Deine LG Investitionen wurden übertragen",
		"LGGildMember" : "__player__'s LGs wurden übermittelt"
	},

	"HiddenRewards": {
		"Positions": {
			"nature": "Natur",
			"shore": "Küste",
			"water": "im Wasser",
			"cityRoadSmall": "einspurige Strasse",
			"cityRoadBig": "große Strasse",
			"guildExpedition": "Gildenexpedition"
		},
		"Table": {
			"type": "Typ",
			"position": "Position",
			"expires": "Verschwindet am/um"
		}
	}
};