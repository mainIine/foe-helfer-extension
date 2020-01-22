/*
 * **************************************************************************************
 *
 * Dateiname:                 sv.js
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
	"Local" : "sv-SE",
	"DateTime" : "YY/M/D h:mm:ss a",

	"Global" : {
		"BoxTitle": " <small><em>FoE Helper</em></small>"
	},

	"Boxes" : {
		"OwnpartCalculator" : {
			"Title" : "MB kalkylator",
			"HelpLink" : "https://foe-rechner.de/extension/index#Eigenanteilsrechner",
            "Step" : "Nivå",
            "OldLevel" : "Förra nivån",
			"PatronPart" : "Andras del",
			"OwnPart" : "Egen del",
            "LGTotalFP" : "MB Total-FP",
            "OwnPartRemaining" : "Kvar",
			"Done" : "Klart",
			"BPs" : "Ritning",
			"Meds" : "Medalj",
			"Ext" : "Ext",
			"Arc" : "Ark",
			"Order" : "Order",
			"Deposit" : "Insats",
			"CopyValues" : "Kopiera värden",
			"Note" : "Anteckning",
			"YourName" : "Ditt namn",
			"IndividualName" : "MB Namn",
			"OutputScheme" : "Utskrift",
            "Auto" : "Auto",
            "Place" : "Placering",
            "Levels" : "Nivåer",
            "NoPlaceSafe" : "Inga säkra platser"
		},

		"Calculator": {
			"Title": "Kostnadskalkylator",
			"HelpLink": "https://foe-rechner.de/extension/index#Kostenrechner",
			"Step": "Nivå ",
			"AvailableFP": "Tillgängliga FP",
			"FriendlyInvestment": "Friendly invest:", //Todo: Translate
			"ArcBonus": "Arkbonus",
			"Rate": "Kvot",
			"Up2LevelUp": "Till nästa nivå",
			"FP": "FP",
			"Save": "Spara",
			"BPs": "Ritning",
			"Meds": "Medalj",
			"Commitment": "Kostnad",
			"Profit": "Vinst",
			"LevelWarning": "VARNING! Höjer nivå på MB!",
			"NoFPorMedsAvailable": "Inga FP eller ritning tillgängliga",
			"LGNotOpen": "Nästa niå är inte upplåst ännu",
			"LGNotConnected": "Byggnaden är inte inkopplad med en väg",
			"ActiveRecurringQuest": "Active recurring quest:", //Todo: Translate
			"Done": "done", //Todo: Translate
			"LevelWarningTT": "__fpcount__FP do not fit in<br>Maximum investment: __totalfp__FP", //Todo: Translate
			"NegativeProfitTT": "Place is not safe. __fpcount__ additional FP must bei invested to make it safe<br>Total to make the place safe: __totalfp__FP" //Todo: Translate
		},

		"LGOverviewBox": {
			"Title": "Möjliga insättningar",
			"Tooltip": {
				"FoundNew": "ny",
				"FoundAgain": "hittad igen",
				"NoPayment": "ingen har lagt in",
			},
			"Building": "Byggnad",
			"Level": "Nivå",
			"PayedTotal": "Betalt / Total",
			"Rate": "Kvot",
			"Profit": "Vinst",
			"NothingToGet": "<strong>__player__</strong> har inget att hämta"
		},

		"StrategyPoints" : {
			"Title" : "FP - Produktion",
			"TotalFPs": "Totalt FP från alla byggnader: ",
			"Amount": "Antal",
			"FPBar" : "FP-bank: ",
			"BuyableFP" : "Buyable: " //Todo: Translate
		},

		"Productions" : {
			"Title" : "Produktionsöversikt",
			"SearchInput": "Sök byggnad...",
			"Total" : "Total: ",
			"ModeGroups": "Gruppera",
			"ModeSingle": "Enkel",
			"Happiness": "Glädje",
			"AdjacentBuildings": "Angränsande byggnad",
			"Headings" : {
				"number" : "Nummer",
				"amount" : "Antal",
				"earning" : "Förtjänat",
				"greatbuilding" : "Mäktiga byggnader",
				"production" : "Produktion byggnader",
				"random_production" : "Slumpmässig produktion",
				"residential": "Residential buildings", //Todo: Translate
				"decoration": "Dekoration",
				"street": "Väg",
				"goods": "Varubyggnader",
				"culture": "Kulturbyggnad",
				"main_building": "Stadshus",
				"boost": "Boost",
				"all" : "Alla"
			}
		},

		"Neighbors" : {
			"Title" : "Produktions av ",
			"ReadyProductions" : "Slutförd produktion",
			"OngoingProductions" : "Pågående produktion"
		},

		"Outpost" : {
			"Title" : "Varor från bosättning",
			"TitleShort" : "Varuöversikt - ",
			"TitleBuildings" : "Byggnad",
			"TitleFree" : "Gratis",
			"DescRequired" : "Behov",
			"DescInStock" : "Tillgängliga",
			"DescStillMissing" : "<span style='color:#29b206'>Överskott</span> / <span style='color:#ef1616'>Saknas</span>",
			"ExpansionsSum" : "Expansion",
			"nextTile" : "nästa expansion",
			"tileNotPlanned" : "av",
			"infoLine" : "__runNumber__. run, Bonus x4 Chans: __chanceX4__%",
        },

        "Technologies": {
            "Title": "Forskningskostnad för",
            "Resource": "Resurs",
            "DescRequired": "Behov",
            "DescInStock": "Tillgängligt",
			"DescStillMissing": "<span style='color:#29b206'>Överskott</span> / <span style='color:#ef1616'>Saknas</span>",
			"NoTechs": "You have reached the end of this era", //Todo: Translate
            "Eras": {
                1: "Stenåldern",
                2: "Bronsåldern",
                3: "Järnåldern",
                4: "Tidig medeltid",
                5: "Högmedeltid",
                6: "Senmedeltid",
                7: "Kolonialåldern",
                8: "Industriåldern",
                9: "Progressiva eran",
                10: "Modern tid",
                11: "Postmodern tid",
                12: "Nutid",
                13: "Morgondagen",
                14: "Framtiden",
                15: "Arktisk framtid",
                16: "Oceanisk framtid",
                17: "Virtuell framtid",
                18: "Rymdålder Mars",
                19: "Rymdålder Ceres"
            }
        },

        "Campagne": {
            "Title": "Erövringskostnad för ",
            "Reward": "Total belöning ",
            "AlreadyDone": " redan erövrad!",
            "Resource": "Resurs",
            "DescRequired": "Behov",
            "DescInStock": "Tillgängliga",
            "DescStillMissing": "<span style='color:#29b206'>Överskott</span> / <span style='color:#ef1616'>Saknas</span>",
		},

		"EventList": {
			"Title": "Event quest list for: ", //Todo: Translate
			"Desc": "Task", //Todo: Translate
			"Reward": "Reward", //Todo: Translate
            "Number": "No.", //Todo: Translate
			"Or": " or ", //Todo: Translate
			"And": " and ", //Todo: Translate
			"Upcoming": "UPCOMING QUESTS (Numbers may vary)", //Todo: Translate
			"Waiting": "No quest available",  // Todo: Translate
		},

        "Negotiation": {
            "Title": "Förhandling hjälp",
            "WrongGoods": "Fel vara vald, välj manuell för avslut",
            "TryEnd": "Inga fler försök",
            "Canceled": "Förhandling har avbrytits",
            "Success": "Framgång",
            "Chance": "Chans",
			"Person": "Person",
			"Average": "Ø mängd",
			"Costs": "Kostar:",
			"Round": "Omgång",
			"Stock": "Lager:",
			"GoodsLow": "VARNING: Varulager är lågt",
			"GoodsCritical": "VARNING: Varulager är kritiskt",
			"DragDrop": "Du kan omorganisera ikonerna på medel via dra & släpp för att välja ordningen för första försöket.",
			"TableLoadError": "Error loading the negotiation table" //Todo: Translate
        },

		"Settings" : {
			"Title" : "Inställningar",
			"Active" : "Aktiv",
			"Inactive" : "Inaktiv",
		},

		"Infobox" : {
			"Title" : "Informationshubb",
			"Filter" : "Filter",
			"FilterGex" : "IE",
			"FilterAuction" : "Auktion",
			"FilterLevel" : "Ny nivå",
			"FilterMessage" : "Meddelanden",
			"FilterGildFights" : "Guild Fights", //Todo: Translate
			"FilterTrade" : "Handel",
			"ResetBox" : "Töm",
			"Messages" : {
				"GEX" : "<strong>__player__</strong> har precis fått __points__ poäng i IE.",
				"LevelUp" : "__player__'s __building__ building has just reached level __level__.<br>You took <strong>__rank__th</strong> place and got <strong>__fps__</strong> FPs back.", //Todo: Translate
				"Auction" : "'<strong>__player__</strong> har precis erbjudit __amount__ mynt.",
				"Trade" : "<strong>__player__</strong> accepterat ditt bud.<br>Du fick __needValue__ __need__ for __offerValue__ __offer__",
				"MsgBuilding" : "__building__ - Nivå __level__",
				"GildFightOccupied": "Province <span style=\"color:#ffb539\">__provinceName__</span> was taken over by <span style=\"color:__attackerColor__;text-shadow: 0 1px 1px __attackerShadow__\">__attackerName__</span> and is closed until __untilOccupied__"   // Todo: Translate
			}
		},

		"Units" : {
			"Title": "Arméöversikt",
			"NextUnitsIn": "Nästa __count__ enhet kommer om <span class=\"alca-countdown\"></span> vid __harvest__ Uhr",
			"ReadyToLoot": "Redo att plundra!",
			"Proportionally": "Proportionellt",
			"Quantity": "Antal",
			"Unit": "Trupp",
			"Status": "Status",
			"Attack": "Attack",
			"Defend": "Försvar",
			"NotFilled": "Inte fylld",
			"Bind": "Bunden",
			"Unbind": "Obunden"
		},

		"CityMap": {
			"TitleSend": "Submit data", //Todo: Translate
			"Desc1": "To be able to plan your city we need to transfer your data to foe-rechner.de", //Todo: Translate
			"Desc2": "<button class='btn-default' id='submit-data' onclick='CityMap.SubmitData()'>Submit</button>", //Todo: Translate
			"SubmitSuccess": "Data was transfered successfully... Now visit ", //Todo: Translate
			"WholeArea": "The whole area: ", // @Todo: Translate
			"FreeArea": "Free area: " // @Todo: Translate
		},

		"Gildfights": {
			"Title": "Player overview", //Todo: Translate
			"Player": "Player", //Todo: Translate
			"Negotiations": "Negotiations", //Todo: Translate
			"Fights": "Fights", //Todo: Translate
			"LastSnapshot": " - last snapshot __time__ ago", //Todo: Translate
		},

		"HiddenRewards": {
			"Title": "Hidden Rewards",  // Todo: Translate
			"Appears": "Appears",  // Todo: Translate
			"Disappears": "Disappears",  // Todo: Translate
			"NoEvents": "No events presents"  // Todo: Translate
		}
	},

	"Menu" : {
		"Productions" : {
			"Title" : "Produktionsöversikt",
			"Desc" : "Visar en översikt av all produktion."
		},
		"Calculator" : {
			"Title" : "Kostnadskalkylator",
			"Desc" : "Räkna alla placeringar för dig och FP som du kan stjäla",
			"Warning": "Inaktiverat: Öppna en annan spelares MB först!"
		},
		"OwnpartCalculator" : {
			"Title" : "MB Kalkylator",
			"Desc" : "Skapa en betalningsplan, beräkna externa placeringar och kopiera värden",
			"Warning": "Inaktiverat: Öppna en av dina MB först!"
        },
        "Technologies": {
            "Title": "Teknologier",
            "Desc": "Beräkna kostnad för forskning",
            "Warning": "Inaktiverat: Öppna forskningsmenyn först!"
        },
        "Campagne": {
            "Title": "Kampanj",
            "Desc": "Översikt vilka resurser som behövs",
        	"Warning" : "Inaktiverat: Besök en provins först!"
		},
        "Event": {
            "Title": "Event Questlist", //Todo: Translate
            "Desc": "Overview of the current and upcoming quests" //Todo: Translate
		},
        "Negotiation": {
            "Title": "Förhandlingshjälp",
			"Desc": "Gör beräknade förslag till forhandling",
			"Warning": "Inaktiverat: Starta en förhandling först!"
        },
		"Settings" : {
			"Title" : "Inställningar",
			"Desc" : "Här finns några inställningar"
		},
		"Chat" : {
			"Title" : "Imperie realtids chat",
			"Desc" : "Prata i realtid med alla"
		},
		"Unit" : {
			"Title" : "Arméer",
			"Desc": "En översikt av dina enheter",
			"Warning": "Öppna din \"Arméhantering\" <br>knapp \"U\""
		},
		"Forum" : {
			"Title" : "Forum",
			"Desc" : "Har du en fråga? något som irritera dig? eller bara vill prata ..."
		},
		"Ask" : {
			"Title" : "Frågor / Svar",
			"Desc" : "Du vet inte hur något fungerar?<br>Kolla här!"
		},
		"Bugs" : {
			"Title" : "Misstag / Önskemål",
			"Desc" : "Något är inte som det borde vara eller du har en idé?"
		},
		"OutP" : {
			"Title" : "Bosättning",
            "Desc": "Översikt av de resurser du behöver",
            "DescWarningOutpostData": "<em id='outPW' class='tooltip-error'>Inaktiverat: Starta en bosättning och ladda om spelet (F5)",
			"DescWarningBuildings" : "<em id='outPW' class='tooltip-error'>Inaktiverat: kolla i bossättningen först!<br></em>Översikt av de resurser du behöver"
		},
		"Info" : {
			"Title" : "Informationshubb",
			"Desc" : "Visar allt som händer i \"bakgrunden\"<br><em>Fills up with info ...</em>"
		},
		"HiddenRewards": {
			"Title": "Hidden rewards", //Todo: Translate
			"Desc": "Overview of hidden rewards" //Todo: Translate
		},
		"Citymap": {
			"Title": "City overview",
			"Desc": "Shows your city schematically from above"
		}
	},

	"Settings" : {
		"Version": {
			"Title" : "Version",
			"DescDebug" : "<p>Extension <strong class='text-danger'>BETA</strong></p><a target='_blank' href='https://foe-rechner.de/extension/update?v=__version__&lang=__language__'>Changelog</a>",  // Todo: Translate: Translate
			"Desc" : "Chrome tillägg version",
			"PlayerId": "Player-Id:",
			"GuildId": "Gild-Id:",
			"World": "World:"
		},
		"GlobalSend": {
			"Title" : "Överföring till foe-rechner.de",
			"Desc" : "Om du vill spåra och dela data med ditt imperium, aktivera detta. <br> Om du inte vill dela data inaktivera."
		},
		"SendTavernInfo": {
			"Title" : "Motiveringsaktivitet",
			"Desc" : "Ska motiveringsaktivitet skickas när event anropas"
		},
		"SendGEXInfo": {
			"Title" : "IE evaluations",
			"Desc" : "When clicking in the GEX on placements or rankings the data transmitted."
		},
		"SendGildMemberLGInfo": {
			"Title" : "MB data av andra imperiemedlemmar",
			"Desc" : "När du besäker andra imperiemedlemmar kommer MB data skickas till foe-rechner.de vid globala aktiviteter."
		},
		"ShowNeighborsGoods": {
			"Title" : "Grannfarmning",
			"Desc" : "Under besök visa vad som håller på att produceras."
		},
		"SendInvestigations": {
			"Title" : "FP investering",
			"Desc" : "Gå in i 'Stadshuset'> 'Nyheter'> 'Mäktiga byggnader' kommer skicka dina FP investeringar."
		},
		"ShowTavernBadge": {
			"Title" : "Visa värdshusprestation",
			"Desc" : "När extra runda i värdshuset aktiverats kommer en ikon visas."
		},
		"PreScanLGList": {
			"Title" : "Preliminär kontroll av MB översikt",
			"Desc" : "Kontrollera listan av MB och visar om det finns MB placeringar att ta. <br> <u> Notering: </u> Eftersom sista platsen bara skickas om man öppnar MB kan resltatet skifta. Kontrollen sparas."
		},
		"AutomaticNegotiation": {
			"Title" : "Förhandlingshjälp",
			"Desc" : "Ska vi automatiskt hjälpa med förhandling och stänga vid avbryt?"
		},
		"ResetBoxPositions": {
			"Title" : "Dialog kordinater",
			"Desc" : "Ska alla dialog kordinater bli nollställda?",
			"Button" : "Ta bort!"
		},
		"MenuLength": {
			"Title" : "Menu length",
			"Desc" : "How many elements high should the menu be?<br> Empty or \"0\" means automatic height."
		},
		"ChangeLanguage": {
			"Title" : "Byt språk",
			"Desc" : "Vilket språk istället för det som hittas automatiskt ska användas?",
			"Dropdown": {
				"de" : "German",
				"en" : "English",
				"fr" : "French",
				"es" : "Spanish",
				"ru" : "Русский",
                "sv" : "Svenska",
				"cs": "Český",
				"ro": "Română"
			}
		}
	},

	"Eras": {
		"NoAge": "Alla eror",
		"StoneAge": "Stenåldern",
		"BronzeAge": "Bronsåldern",
		"IronAge": "Järnåldern",
		"EarlyMiddleAge": "Tidig medeltid",
		"HighMiddleAge": "Högmedeltid",
		"LateMiddleAge": "Senmedeltid",
		"ColonialAge": "Kolonialåldern",
		"IndustrialAge": "Industriåldern",
		"ProgressiveEra": "Progressiva eran",
		"ModernEra": "Modern tid",
		"PostModernEra": "Postmodern tid",
		"ContemporaryEra": "Nutid",
		"TomorrowEra": "Morgondagen",
		"FutureEra": "Framtiden",
		"ArcticFuture": "Arktisk framtid",
		"OceanicFuture": "Oceanisk framtid",
		"VirtualFuture": "Virtuell framtid",
		"SpaceAgeMars": "Rymdålder Mars"
	},

	"API" : {
		"UpdateSuccess" : "Uppdatering utförd",
		"GEXPlayer" : "IE placering för medlemmar har uppdaterats",
		"GEXChampionship" : "IE placering för imperiet har uppdaterats",
		"LGInvest" : "Dina MB investeringar har överförts",
		"LGGildMember" : "__player__'s Mäktig byggnad har skickats in"
	},

	"HiddenRewards": {
		"Positions": {
			"nature": "Nature",  //Todo: Translate
			"shore": "Shore",  //Todo: Translate
			"water": "in the water",  //Todo: Translate
			"cityRoadSmall": "small Road",  //Todo: Translate
			"cityRoadBig": "big Road",   // Todo: Translate
			"guildExpedition": "Guild expedition" //Todo: Translate
		},
		"Table": {
			"type": "Type", //Todo: Translate
			"position": "Position", //Todo: Translate
			"expires": "Expires at" //Todo: Translate
		}
	}
};
