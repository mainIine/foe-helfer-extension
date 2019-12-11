/*
 * **************************************************************************************
 *
 * Dateiname:                 en.js
 * Projekt:                   foe
 *
 * erstellt von:              Daniel Siekiera <daniel.siekiera@gmail.com>
 * zu letzt bearbeitet:       20.11.19, 22:37 Uhr
 *
 * Copyright © 2019
 *
 * **************************************************************************************
 */

let i18n = {
	"Local" : "en-EN",
	"DateTime" : "D/M/YY h:mm:ss a",

	"Boxes" : {
		"OwnpartCalculator" : {
			"Title": "Co-payment calculator",
			"HelpLink": "https://foe-rechner.de/extension/index#Eigenanteilsrechner",
            "Step": "Step",
            "OldLevel": "Old level",
			"PatronPart": "Patron share",
			"OwnPart": "Own contribution",
            "LGTotalFP": "GB Total-FP",
            "OwnPartRemaining": "Remaining",
            "Done": "Done",
			"ExternalFP": "External FP",
			"Order": "Sequence",
			"Deposit": "Deposit",
			"CopyValues": "Copy values",
			"YourName": "Your name",
			"IndividualName": "individual Lb name",
			"OutputScheme": "Output scheme",
            "Auto": "Auto",
            "Place": "Place",
            "Levels": "levels",
            "NoPlaceSafe": "No place safe"
		},

		"Calculator": {
			"Title": "Cost calculator",
			"HelpLink": "https://foe-rechner.de/extension/index#Kostenrechner",
			"Step": "Step ",
			"AvailableFP": "Available Forgepoints",
			"ArcBonus": "Arc bonus",
			"Earnings": "Earnings",
			"Rate": "Cours",
			"Up2LevelUp": "Until leveling",
			"FP": "FP",
			"Save": "Save",
			"Commitment": "Commitment",
			"Profit": "Profit",
			"NoFPorMedsAvailable": "No FPs or BPs available",
			"LGNotOpen": "The next level is currently not unlocked",
			"LGNotConnected": "The building is not connected to a street",
		},

		"LGOverviewBox": {
			"Title": "Possible deposits",
			"Tooltip": {
				"FoundNew": "found new",
				"FoundAgain": "recognized",
				"NoPayment": "so far no deposit",
			},
			"Building": "Building",
			"Level": "Level",
			"PayedTotal": "Payed / Total",
			"Rate": "Rate",
			"NothingToGet": "<strong>__player__</strong> has nothing to fetch"
		},

		"StrategyPoints" : {
			"Title" : "FP - Productions",
			"TotalFPs": "Total FPs from all buildings: ",
			"Amount": "Number",
			"FPBar" : "FP-Stock: "
		},

		"Productions" : {
			"Title" : "Production overview",
			"SearchInput": "Search building...",
			"Total" : "Total: ",
			"ModeGroups": "Groups",
			"ModeSingle": "Single",
			"Headings" : {
				"number" : "Number",
				"amount" : "Amount",
				"earning" : "Earning",
				"greatbuilding" : "Legendary buildings",
				"production" : "Production building",
				"random_production" : "Random productions",
				"residential" : "Event buildings",
				"main_building" : "Town hall",
				"all" : "All"
			}
		},

		"Neighbors" : {
			"Title" : "Productions of ",
			"ReadyProductions" : "Finished productions",
			"OngoingProductions" : "Ongoing productions"
		},

		"Outpost" : {
			"Title" : "Goods of the outpost",
			"TitleShort" : "Goods overview - ",
			"TitleBuildings" : "Building",
			"TitleFree" : "Free",
			"DescRequired" : "Required",
			"DescInStock" : "Available",
			"DescStillMissing" : "<span style='color:#29b206'>Excess</span> / <span style='color:#ef1616'>Is missing</span>",
        },

        "Technologies": {
            "Title": "Research cost for",
            "Resource": "Resource",
            "DescRequired": "Required",
            "DescInStock": "Available",
            "DescStillMissing": "<span style='color:#29b206'>Excess</span> / <span style='color:#ef1616'>Is missing</span>",
            "Eras": {
                1: "Stone Age",
                2: "Bronze Age",
                3: "Iron Age",
                4: "Early Middle Age",
                5: "High Middle Age",
                6: "Late Middle Age",
                7: "Colonial Age",
                8: "Industrial Age",
                9: "Progressive Era",
                10: "Modern Era",
                11: "PostModern Era",
                12: "Contemporary Era",
                13: "Tomorrow Era",
                14: "Future Era",
                15: "Arctic Future",
                16: "Oceanic Future",
                17: "Virtual Future",
                18: "Space Age Mars",
                19: "Space Age Ceres"
            }
        },

        "Negotiation": {
            "Title": "Negotiation helper",
            "WrongGoods": "Wrong goods selected, please finish manually",
            "TryEnd": "No more tries",
            "Canceled": "Negotiation has been canceled",
            "Success": "Success",
            "Chance": "Chance",
            "Person": "Person",
        },

		"Settings" : {
			"Title" : "Settings",
			"Active" : "Active",
			"Inactive" : "Inactive",
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
				"GEX" : "<strong>__player__</strong> has just received __points__ points in the GEX.",
				"LevelUp" : "__player__'s __building__ building has just reached level __level__.<br>You took <strong>__rank__th</strong> place.",
				"Auction" : "'<strong>__player__</strong> has just offered __amount__ coins.",
				"MsgBuilding" : "__building__ - Level __level__"
			}
		},

		"Units" : {
			"Title": "Army overview",
			"NextUnitsIn": "The next __count__ units will arrive in <span class=\"alca-countdown\"></span> at __harvest__ Uhr",
			"Unit": "Unit",
			"Status": "Status",
			"Attack": "Attack",
			"Defend": "Defense",
			"NotFilled": "not filled",
			"Bind": "Bound",
			"Unbind": "Unbound"
		}
	},

	"Menu" : {
		"Productions" : {
			"Title" : "Production overview",
			"Desc" : "Displays the current number of all productions."
		},
		"Calculator" : {
			"Title" : "Cost calculator",
			"Desc" : "Calculates all seats for you and calculates snipeable FPs",
			"Warning": "Disabled: Open another player's LG first!"
		},
		"OwnpartCalculator" : {
			"Title" : "Co-payment calculator",
			"Desc" : "Create payment plan, calculate external seats and copy values",
			"Warning": "Disabled: Open one of your Legendary Buildings first!"
        },
        "Technologies": {
            "Title": "Technologies",
            "Desc": "Calculate cost for research",
            "Warning": "Disabled: Open the research menu first!"
        },
        "Negotiation": {
            "Title": "Negotiation helper",
			"Desc": "Make precise proposals for negotiations",
			"Warning": "Disabled: Start a negotiation first!"
        },
		"Settings" : {
			"Title" : "Settings",
			"Desc" : "Here are some little settings"
		},
		"Chat" : {
			"Title" : "Guild live chat",
			"Desc" : "Talk in real time with everyone"
		},
		"Unit" : {
			"Title" : "Armies",
			"Desc": "All your armies at a glance",
			"Warning": "Open 1x your \"Army Organization\" <br>Button \"U\""
		},
		"Forum" : {
			"Title" : "Forum",
			"Desc" : "You have a question? You annoying something? Or just to talk ..."
		},
		"Ask" : {
			"Title" : "Question / Answer",
			"Desc" : "You do not know how something works?<br>Take a look!"
		},
		"Bugs" : {
			"Title" : "Mistakes / Wishes",
			"Desc" : "Something is not how it should or you have an idea?"
		},
		"OutP" : {
			"Title" : "Outpost",
            "Desc": "Overview of the required resources",
            "DescWarningOutpostData": "<em id='outPW' class='tooltip-error'>Disabled: Start an outpost and reload the game (F5)",
			"DescWarningBuildings" : "<em id='outPW' class='tooltip-error'>Disabled: check out the outpost first!<br></em>Overview of the required resources"
		},
		"Info" : {
			"Title" : "Info Box",
			"Desc" : "Shows you all the things that happen in the \"background\"<br><em>Fills up with info ...</em>"
		}
	},

	"Settings" : {
		"GlobalSend": {
			"Title" : "Transmission to foe-rechner.de",
			"Desc" : "If you want to track data with your guild, activate this point. <br> For a self-sufficient extension simply disable."
		},
		"SendTavernInfo": {
			"Title" : "Motivation activity",
			"Desc" : "Should the motivation activities be transferred when the events are called?"
		},
		"SendGEXInfo": {
			"Title" : "GEX evaluations",
			"Desc" : "When clicking in the GEX on placements or rankings the data transmitted"
		},
		"SendGildMemberLGInfo": {
			"Title" : "Lb data of other guild members",
			"Desc" : "When visiting other guild members, all Lb data will be sent to foe-rechner.de when Global activates."
		},
		"ShowNeighborsGoods": {
			"Title" : "Neighborhood harvest",
			"Desc" : "During the visit show what is currently produced"
		},
		"SendInvestigations": {
			"Title" : "FP investment",
			"Desc" : "Entering the 'Town Hall'> 'News'> 'Legendary Buildings' will transmit the Fp investments"
		},
		"ShowTavernBadge": {
			"Title" : "Show tavernas badge",
			"Desc" : "As soon as the extra move in the tavern is activated, a globally movable counter appears."
		},
		"ShowOutpost": {
			"Title" : "Outpost resources",
			"Desc" : "Displays a menu item for Outpost Resources <br><u>Note:</u> Game Reload required."
		},
		"PreScanLGList": {
			"Title" : "Preliminary scan of the LG overview",
			"Desc" : "Scans the overview list of the neighbor when opening and determines possibly fillable LGs. <br> <u> Note: </u> Since the final seats are only transmitted when opening a LG, the result may differ. The scan is saved, however."
		},
		"CalculatorShowNegativ": {
			"Title" : "Negative profit in the cost calculator",
			"Desc" : "Would you like to see the negative profit displayed?"
		},
		"ResetBoxPositions": {
			"Title" : "Box coordinates",
			"Desc" : "Should all box coordinates be reset?",
			"Button" : "Delete!"
		},
		"ChangeLanguage": {
			"Title" : "Change language",
			"Desc" : "Which language, instead of the recognized one, should be used?",
			"Dropdown": {
				"de" : "German",
				"en" : "English",
				"fr" : "French",
			}
		}
	},

	"Eras": {
		"NoAge": "Without Age",
		"Stone Age": "Stone Age",
		"Bronze Age": "Bronze Age",
		"Iron Age": "Iron Age",
		"EarlyMiddleAge": "Early Middle Ages",
		"HighMiddleAge": "High Middle Ages",
		"LateMiddleAge": "Late Middle Ages",
		"ColonialAge": "colonial era",
		"Industrial Age": "Industrial Age",
		"ProgressiveEra": "turn of the century",
		"ModernEra": "Modernity",
		"PostModernEra": "Postmodernism",
		"ContemporaryEra": "Present",
		"TomorrowEra": "Tomorrow",
		"FutureEra": "Future",
		"ArcticFuture": "Arctic Future",
		"Oceanic Future": "Oceanic Future",
		"VirtualFuture": "Virtual Future",
		"SpaceAgeMars": "Space: Mars"
	},

	"API" : {
		"UpdateSuccess" : "Update performed",
		"GEXPlayer" : "GEX placements of members have been updated",
		"GEXChampionship" : "The GEX guild placement has been updated",
		"LGInvest" : "Your LG investments have been transferred",
		"LGGildMember" : "__player__'s Legendary buildings have been submitted"
	}
};