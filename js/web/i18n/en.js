/*
 * **************************************************************************************
 *
 * Dateiname:                 en.js
 * Projekt:                   foe
 *
 * erstellt von:              Daniel Siekiera <daniel.siekiera@gmail.com>
 * zu letzt bearbeitet:       19.09.19, 15:32 Uhr
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
			"ArcBonus": "Arc bonus",
			"PatronPart": "Patron share: ",
			"OwnPart": "Own contribution",
			"LGTotalFP": "Lb Total-FP",
			"ExternalFP": "External FP",
			"Order": "Sequence",
			"Deposit": "Deposit",
			"CopyValues": "Copy values",
			"YourName": "Your name",
			"IndividualName": "individual Lb name",
			"OutputScheme": "Output scheme",
			"Place": "Place",
			"Levels": "levels"
		},

		"Calculator": {
			"Title": "Cost calculator",
			"HelpLink": "https://foe-rechner.de/extension/index#Kostenrechner",
			"Step": "Step ",
			"AvailableFP": "Available Forgepoints",
			"ArcBonus": "Arc bonus",
			"Earnings": "Earnings",
			"Save": "Save",
			"Commitment": "Commitment",
			"Profit": "Profit",
			"NoFPorMedsAvailable": "No FPs or BPs available"
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
			"DescRequired" : "Requires",
			"DescInStock" : "Available",
			"DescStillMissing" : "<span style='color:#29b206'>Excess</span> / <span style='color:#ef1616'>Is missing</span>",
		},

		"Settings" : {
			"Title" : "Settings",
			"Active" : "Active",
			"Inactive" : "Inactive",
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
		"Settings" : {
			"Title" : "Settings",
			"Desc" : "Here are some little settings"
		},
		"Chat" : {
			"Title" : "Guild live chat",
			"Desc" : "Talk in real time with everyone"
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
			"Desc" : "Overview of the required resources",
			"DescWarning" : "<em id='outPW' class='tooltip-error'>Disabled: check out the outpost first!<br></em>Overview of the required resources"
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
		}
	}
};