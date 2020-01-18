/*
 * **************************************************************************************
 *
 * Dateiname:                 cs.js
 * Projekt:                   foe-chrome
 *
 * erstellt von:              Daniel Siekiera <daniel.siekiera@gmail.com>
 * erstellt am:	              16.01.20, 18:33 Uhr
 * zuletzt bearbeitet:       16.01.20, 18:27 Uhr
 *
 * Copyright © 2020
 *
 * **************************************************************************************
 */

let i18n = {
	"Local" : "cs-CZ",
	"DateTime" : "D/M/YY h:mm:ss a",

	"Global" : {
		"BoxTitle": " <small><em> - FoE Helfer</em></small>"
	},

	"Boxes" : {
		"OwnpartCalculator" : {
			"Title": "Kalkulačka spolupráce",
			"HelpLink": "https://foe-rechner.de/extension/index#Eigenanteilsrechner",
            "Step": "Úroveň",
            "OldLevel": "Předchozí úroveň",
			"PatronPart": "Příspěvek ostatních",
			"OwnPart": "Vlastní příspěvek",
            "LGTotalFP": "Body výzkumu celkově",
            "OwnPartRemaining": "Zbývající",
			"Done": "Hotovo",
			"BPs": "Plánky",
			"Meds": "Medaile",
			"Ext": "Ext",
			"Arc": "Arc",
			"Order": "Pořadí",
			"Deposit": "Vklad",
			"CopyValues": "Kopírovat hodnoty",
			"Note": "Poznámka",
			"YourName": "Vaše jméno",
			"IndividualName": "Jméno přispěvatele",
			"OutputScheme": "Výstup",
            "Auto": "Auto",
            "Place": "Místo",
            "Levels": "Úrovně",
            "NoPlaceSafe": "No place safe"
		},

		"Calculator": {
			"Title": "Kalkulačka bodů výzkumu",
			"HelpLink": "https://foe-rechner.de/extension/index#Kostenrechner",
			"Step": "Úroveň ",
			"AvailableFP": "Dostupně body výzkumu",
			"ArcBonus": "Arc bonus",
			"Rate": "Rate",
			"Up2LevelUp": "Do nové úrovně",
			"FP": "BV",
			"Save": "Uložit",
			"BPs": "BPs", //Todo: Translate
			"Meds": "Meds", //Todo: Translate
			"Commitment": "Náklady",
			"Profit": "Zisk",
			"LevelWarning": "Upozornění! Zvýšení úrovně budovy",
			"NoFPorMedsAvailable": "Body výzkumu ani medaile nejsou k dispozici",
			"LGNotOpen": "Další úroveň není odemčená",
			"LGNotConnected": "Budova není připojena",
			"ActiveRecurringQuest": "Aktivovaný opakujicí se úkol:",
			"Done": "Hotovo"
		},

		"LGOverviewBox": {
			"Title": "Možný příspěvek",
			"Tooltip": {
				"FoundNew": "Nalezen nový",
				"FoundAgain": "recognized",
				"NoPayment": "Zatím nic",
			},
			"Building": "Budova",
			"Level": "Úroveň",
			"PayedTotal": "Přidáno / Celkem",
			"Rate": "Míra",
			"Profit": "Zisk",
			"NothingToGet": "<strong>__player__</strong> has nothing to fetch"
		},

		"StrategyPoints" : {
			"Title" : "Výroba bodů",
			"TotalFPs": "Celkové body ze všech budov: ",
			"Amount": "Počet",
			"FPBar" : "Zásoba bodů: ",
			"BuyableFP" : "Buyable: "
		},

		"Productions" : {
			"Title" : "Přehled produkce",
			"SearchInput": "Hledat budovu...",
			"Total" : "Celkem: ",
			"ModeGroups": "Skupiny",
			"ModeSingle": "Samostatné",
			"Happiness": "Spokojenost",
			"AdjacentBuildings": "Sousední budovy",
			"Headings" : {
				"number" : "Číslo",
				"amount" : "Množství",
				"earning" : "Příjem",
				"greatbuilding" : "Velkolepé budovy",
				"production" : "Dílny",
				"random_production" : "Náhodná produkce",
				"residential": "Residential buildings", //Todo: Translate
				"decoration": "Dekorace",
				"street": "Ulice",
				"goods": "Továrny",
				"culture": "Kulturní budovy",
				"main_building": "Radnice",
				"boost": "Bonus",
				"all" : "Celkem"
			}
		},

		"Neighbors" : {
			"Title" : "Výroby",
			"ReadyProductions" : "Hotové výroby",
			"OngoingProductions" : "Ve výrobě"
		},

		"Outpost" : {
			"Title" : "Kulturní továrny",
			"TitleShort" : "Zboží - ",
			"TitleBuildings" : "Budova",
			"TitleFree" : "Vyzkoumáno",
			"DescRequired" : "Vyžadováno",
			"DescInStock" : "K dispozici",
			"DescStillMissing" : "<span style='color:#29b206'>Excess</span> / <span style='color:#ef1616'>Is missing</span>",
			"ExpansionsSum" : "Rozšíření", // TODO: check translation
			"nextTile" : "Další rozšíření", // TODO: check translation
			"tileNotPlanned" : "off", // TODO: check translation
			"infoLine" : "__runNumber__. run, Bonus x4 Šance: __chanceX4__%", // TODO: check translation
        },

        "Technologies": {
            "Title": "Náklady na výzkum",
            "Resource": "Zdroj",
            "DescRequired": "Požadováno",
            "DescInStock": "K dispozici",
			"DescStillMissing": "<span style='color:#29b206'>Excess</span> / <span style='color:#ef1616'>Is missing</span>",
			"NoTechs": "Dokončili jste dobu",
            "Eras": {
                1: "Doba kamenná",
                2: "Doba bronzová",
                3: "Doba železná",
                4: "Raný středověk",
                5: "Vrcholný středověk",
                6: "Pozdní středověk",
                7: "Koloniální doba",
                8: "Průmyslový věk",
                9: "Doba pokroku",
                10: "Moderní doba",
                11: "Postmoderní doba",
                12: "Současnost",
                13: "Zítra",
                14: "Budoucnost",
                15: "Ledová budoucnost",
                16: "Oceánská budoucnost",
                17: "Virtuální budoucnost",
                18: "Kolonizace Marsu",
                19: "Kolonizace Ceres"
            }
        },

        "Campagne": {
            "Title": "Náklady na dobytí ",
            "Reward": "Celková odměna ",
            "AlreadyDone": " Již dobyto!",
            "Resource": "Zboží",
            "DescRequired": "Požadováno",
            "DescInStock": "K dispozici",
            "DescStillMissing": "<span style='color:#29b206'>Excess</span> / <span style='color:#ef1616'>Is missing</span>",
        },

		"EventList": {
			"Title": "Event quest list for: ",  // Todo: Translate: Translate
			"Desc": "Task",  // Todo: Translate: Translate
			"Reward": "Reward",  // Todo: Translate: Translate
            "Number": "No.",  // Todo: Translate: Translate
			"Or": " or ",  // Todo: Translate: Translate
			"And": " and ",  // Todo: Translate: Translate
			"Upcoming": "UPCOMING QUESTS (Numbers may vary)",  // Todo: Translate: Translate
		},
		
        "Negotiation": {
            "Title": "Pomocník s vyjednáváním",
            "WrongGoods": "Špatné zboží! Vyberte jiné",
            "TryEnd": "Skoro",
            "Canceled": "Vzdát",
            "Success": "Úspěch",
            "Chance": "Šance",
			"Person": "D",
			"Average": "Ø Množství",
			"Costs": "Costs:",
			"Round": "Round",
			"Stock": "Stock:",
			"GoodsLow": "ATTENTION: Good stock is low",
			"GoodsCritical": "ATTENTION: Good stock is critical",
			"DragDrop": "You can rearrange the icons of the average display yourself using drag & drop to determine the order from the first attempt.",
			"TableLoadError": "Error loading the negotiation table"
        },

		"Settings" : {
			"Title" : "Nastavení",
			"Active" : "Aktivováno",
			"Inactive" : "Deaktivováno",
		},

		"Infobox" : {
			"Title" : "Infobox",  // Todo: Translate: Translate
			"Filter" : "Filter",  // Todo: Translate: Translate
			"FilterGex" : "GEX",  // Todo: Translate: Translate
			"FilterAuction" : "Auction",  // Todo: Translate: Translate
			"FilterLevel" : "Level-Up",  // Todo: Translate: Translate
			"FilterMessage" : "Message",  // Todo: Translate: Translate
			"FilterGildFights" : "Guild Fights",  // Todo: Translate: Translate
			"FilterTrade" : "Trade",  // Todo: Translate: Translate
			"ResetBox" : "Reset Box",  // Todo: Translate: Translate
			"Messages" : {
				"GEX" : "<strong>__player__</strong> has just received __points__ points in the GEX.",  // Todo: Translate: Translate
				"LevelUp" : "__player__'s __building__ building has just reached level __level__.<br>You took <strong>__rank__th</strong> place and got <strong>__fps__</strong>FPs back.",  // Todo: Translate: Translate
				"Auction" : "'<strong>__player__</strong> has just offered __amount__ coins.",  // Todo: Translate: Translate
				"Trade" : "<strong>__player__</strong> accepted your Offer.<br>You got __needValue__ __need__ for __offerValue__ __offer__",  // Todo: Translate: Translate
				"MsgBuilding" : "__building__ - Level __level__",  // Todo: Translate: Translate
				"GildFightOccupied": "Province <span style=\"color:#ffb539\">__provinceName__</span> was taken over by <span style=\"color:__attackerColor__;text-shadow: 0 1px 1px __attackerShadow__\">__attackerName__</span> and is closed until __untilOccupied__"   // Todo: Translate: Translate
			}
		},

		"Units" : {
			"Title": "Armáda",
			"NextUnitsIn": "Příští(ch) __count__ jednotek se rekrutuje za <span class=\"alca-countdown\"></span> at __harvest__ hodin",
			"ReadyToLoot": "Ready to loot!",
			"Proportionally": "Proportionally",
			"Quantity": "Množství",
			"Unit": "Jednotka",
			"Status": "Status",
			"Attack": "Útok",
			"Defend": "Obrana",
			"NotFilled": "not filled",
			"Bind": "Závislá",
			"Unbind": "Nezávislá"
		},
		
		"CityMap": {
			"Title": "Vložit data", 
			"Desc1": "K naplánování vašeho města potřebujeme poslat data na foe-rechner.de",
			"Desc2": "<button class='btn-default' id='submit-data' onclick='CityMap.SubmitData()'>Submit</button>",
			"SubmitSuccess": "Data byla přijata... Nyní navštivte "
		},

		"Gildfights": {
			"Titel": "Player overview",  // Todo: Translate: Translate
			"Player": "Player",  // Todo: Translate: Translate
			"Negotiations": "Negotiations",  // Todo: Translate: Translate
			"Fights": "Fights",  // Todo: Translate: Translate
			"LastSnapshot": " - last snapshot __time__ ago",  // Todo: Translate: Translate
		},

		"HiddenRewards": {
			"Title": "Hidden Rewards"  // Todo: Translate: Translate
		}
	},

	"Menu" : {
		"Productions" : {
			"Title" : "Výroba v dílnách",
			"Desc" : "Zobrazuje výroby ve všech dílnách."
		},
		"Calculator" : {
			"Title" : "Kalkulačka bodů výzkumu",
			"Desc" : "Počítá odměny za přispívání bodů výzkumu.",
			"Warning": "Nejprve přispějte do něčí velkolepé budovy!"
		},
		"OwnpartCalculator" : {
			"Title" : "Kalkulačka spolupráce",
			"Desc" : "Připravte si plán, kolik Vám kamarádi přispějí do budovy",
			"Warning": "Nejprve otevřete jednu svoji velkolepou budovu!"
        },
        "Technologies": {
            "Title": "Technologie",
            "Desc": "Náklady na výzkum",
            "Warning": "Nejprve otevřte výzkum technologií"
        },
        "Campagne": {
            "Title": "Mapa území",
            "Desc": "Přehled potřebných surovin na vyjednávání",
        	"Warning" : "Vyberte nejprve provincii!"
		},
		"Event": {
            "Title": "Event Questlist",  // Todo: Translate: Translate
		},
        "Negotiation": {
            "Title": "Pomocník s vyjednáváním",
			"Desc": "Zlepšete svoji šanci během vyjednávání",
			"Warning": "Začněte vyjednávat!"
        },
		"Settings" : {
			"Title" : "Nastavení",
			"Desc" : "Něco málo z nastavení"
		},
		"Chat" : {
			"Title" : "Cechovní chat",
			"Desc" : "Popovídejte si s kamarády z cechu"
		},
		"Unit" : {
			"Title" : "Armády",
			"Desc": "Všechny vaše armády na jednom místě",
			"Warning": "Otevřete vaši \"Army Organization\" <br>Button \"U\""
		},
		"Forum" : {
			"Title" : "Fórum",
			"Desc" : "Máte otázku, štve vás něco nebo si jen chcete popovídat ..."
		},
		"Ask" : {
			"Title" : "Otázky/odpovědi",
			"Desc" : "Máte s něčím problémy?<br>Mrkněte sem!"
		},
		"Bugs" : {
			"Title" : "Chyby/přání",
			"Desc" : "Něco se pokazilo/ chybí vám něco?"
		},
		"OutP" : {
			"Title" : "Osada",
            "Desc": "Přehled potřebných surovin",
            "DescWarningOutpostData": "<em id='outPW' class='tooltip-error'>Disabled: Začněte osadu a aktualizujte hru (F5)",
			"DescWarningBuildings" : "<em id='outPW' class='tooltip-error'>Disabled: Otevřete osadu first!<br></em>Overview of the required resources"
		},
		"Info" : {
			"Title" : "Info Box",
			"Desc" : "Ukazuje co se událo \"background\"<br><em>Fills up with info ...</em>"
		},
		"HiddenRewards": {
			"Title": "Hidden rewards",  // Todo: Translate: Translate
			"Desc": "Overview of hidden rewards"  // Todo: Translate: Translate
		}
	},

	"Settings" : {
		"Version": {
			"Title" : "Verze",
			"DescDebug" : "Chrome Extension <strong class='text-danger'>BETA</strong>",
			"Desc" : "Chrome Extension Version",
			"PlayerId": "Player-Id:",  // Todo: Translate: Translate
			"GuildId": "Gild-Id:",  // Todo: Translate: Translate
			"World": "World:"  // Todo: Translate: Translate
		},
		"GlobalSend": {
			"Title" : "Přenos dat foe-rechner.de",
			"Desc" : "Pokud chcete dlouhodobě sledovat vaše data zapněte. <br>."
		},
		"SendTavernInfo": {
			"Title" : "Motivace",
			"Desc" : "Mají se záznamy odesílat na web"
		},
		"SendGEXInfo": {
			"Title" : "GEX evaluations",
			"Desc" : "When clicking in the GEX on placements or rankings the data transmitted"
		},
		"SendGildMemberLGInfo": {
			"Title" : "Velkolepé budovy členů cechu",
			"Desc" : "Po zapnutí se po každé návštěvě měst členů vašeho cechu odešlou data o jejich velkolepých budovách na foe-rechner.de"
		},
		"ShowNeighborsGoods": {
			"Title" : "Sousedstvít",
			"Desc" : "Během návštěvy ukazuje, co sousedé produkují"
		},
		"SendInvestigations": {
			"Title" : "Investování VB",
			"Desc" : "Otevření radnice'> 'Novinky'> 'Velkolepé budovy' pošle data o investování VB na web"
		},
		"ShowTavernBadge": {
			"Title" : "Ukázat odznaky krčmy",
			"Desc" : "Notifikace když přítel odemkne nové vylepšení krčmy."
		},
		"PreScanLGList": {
			"Title" : "Prvotní sken Velkolepých budov",
			"Desc" : "Oskenuje VB a označí možné budovy k investování. <br> <u> Note: </u> Kvůli odezvě a přenosovým problémům se může výsledek lišit. Sken neodporuje pravidlům."
		},
		"AutomaticNegotiation": {
			"Title" : "Pomocník s vyjednáváním",
			"Desc" : "Má být pomocník otvírán automaticky po zahájení vyjednávání a poté automaticky zavírán?"
		},
		"ResetBoxPositions": {
			"Title" : "Návrat k původnímu nastavení",
			"Desc" : "Má se nastavení vrátit na původní?",
			"Button" : "Návrat!"
		},
		"MenuLength": {
			"Title" : "Menu length",  // Todo: Translate: Translate
			"Desc" : "How many elements high should the menu be?<br> Empty or \"0\" means automatic height."  // Todo: Translate: Translate
		},
		"ChangeLanguage": {
			"Title" : "Změnit jazyk",
			"Desc" : "Který jazyk, kromě toho poznaného, má být zvolen?",
			"Dropdown": {
				"de": "Deutsch",
				"en": "English",
				"fr": "Français",
				"es": "Español",
				"ru": "Русский",
				"sv": "Svenska",
				"cs": "Česky",
				"ro": "Română"
			}
		}
	},

	"Eras": {
		"NoAge": "Bez doby",
		"StoneAge": "Doba kamenná",
		"BronzeAge": "Doba bronzová",
		"IronAge": "Doba železná",
		"EarlyMiddleAge": "Raný středověk",
		"HighMiddleAge": "Vrcholný středověk",
		"LateMiddleAge": "Pozdní středověk",
		"ColonialAge": "Koloniální doba",
		"IndustrialAge": "Průmyslový věk",
		"ProgressiveEra": "Doba pokroku",
		"ModernEra": "Moderní doba",
		"PostModernEra": "Postmoderní doba",
		"ContemporaryEra": "Současnost",
		"TomorrowEra": "Zítra",
		"FutureEra": "Budoucnost",
		"ArcticFuture": "Ledová budoucnost",
		"OceanicFuture": "Oceánská budoucnost",
		"VirtualFuture": "Virtuální budoucnost",
		"SpaceAgeMars": "Kolonizace Marsu"
	},

	"API" : {
		"UpdateSuccess" : "Update performed",
		"GEXPlayer" : "GEX umístění členů bylo updatováno",
		"GEXChampionship" : "The GEX umístění cechu bylo updatováno",
		"LGInvest" : "Investice vašich VB bylo posláno",
		"LGGildMember" : "__player__'s Velkolepé budovy byly poslány"
	},

	"HiddenRewards": {
		"Positions": {
			"nature": "Nature",   // Todo: Translate: Translate
			"shore": "Shore",   // Todo: Translate: Translate
			"water": "in the water",   // Todo: Translate: Translate
			"cityRoadSmall": "small Road",   // Todo: Translate: Translate
			"cityRoadBig": "big Road"   // Todo: Translate: Translate
		},
		"Table": {
			"type": "Type",  // Todo: Translate: Translate
			"position": "Position",  // Todo: Translate: Translate
			"expires": "Expires at"  // Todo: Translate: Translate
		}
	}
};