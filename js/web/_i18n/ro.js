/*
 * **************************************************************************************
 *
 * Dateiname:                 ro.js
 * Projekt:                   foe-chrome
 *
 * erstellt von:              Daniel Siekiera <daniel.siekiera@gmail.com>
 * erstellt am:	              18.01.20, 14:26 Uhr
 * zuletzt bearbeitet:       18.01.20, 14:26 Uhr
 *
 * Copyright © 2020
 *
 * **************************************************************************************
 */

let i18n = {
	"Local" : "ro-RO",
	"DateTime" : "DD.MM.YY h:mm:ss",

	"Global" : {
		"BoxTitle": " <small><em>FoE Helper</em></small>"
	},

	"Boxes" : {
		"OwnpartCalculator" : {
			"Title": "Calculator de contribuție proprie",
			"HelpLink": "https://foe-rechner.de/extension/index#Eigenanteilsrechner",
			"Step": "Nivel",
			"OldLevel": "Nivelul anterior",
			"PatronPart": "Contribuția externă",
			"OwnPart": "Contribuția proprie",
			"LGTotalFP": "Total PF nivel",
			"OwnPartRemaining": "Rest de depus",
			"Done": "Depus",
			"BPs": "BPs",
			"Meds": "Meds",
			"Ext": "Ext",
			"Arc": "Arc",
			"Order": "Ordine",
			"Deposit": "Depozit",
			"CopyValues": "Copiază valorile",
			"Note": "Notă",
			"YourName": "Numele tău",
			"IndividualName": "Denumire CL",
			"OutputScheme": "Șablon",
			"Auto": "Auto",
			"Place": "Locul",
			"Levels": "Niveluri",
			"NoPlaceSafe": "Nici un loc nu este asigurat"
		},

		"Calculator": {
			"Title": "Calculator costuri",
			"HelpLink": "https://foe-rechner.de/extension/index#Kostenrechner",
			"Step": "Nivelul ",
			"AvailableFP": "PF disponibile",
			"FriendlyInvestment": "Friendly invest:", //Todo: Translate
			"ArcBonus": "Bonusul Domului",
			"Rate": "Procent",
			"Up2LevelUp": "PF rămase până la închidere",
			"FP": "PF",
			"Save": "Salvat",
			"BPs": "BPs", //Todo: Translate
			"Meds": "Meds", //Todo: Translate
			"Commitment": "Cost",
			"Profit": "Profit", //Todo: Translate
			"LevelWarning": "ATENȚIE! Închide nivelul la CL!",
			"NoFPorMedsAvailable": "PF sau planuri indisponibile",
			"LGNotOpen": "Următorul nivel nu este deblocat",
			"LGNotConnected": "Clădirea nu este conectată la stradă",
			"ActiveRecurringQuest": "Misiunea repetitivă actuală:",
			"Done": "Terminat",
						"LevelWarningTT": "__fpcount__FP do not fit in<br>Maximum investment: __totalfp__FP", //Todo: Translate
			"NegativeProfitTT": "Place is not safe. __fpcount__ additional FP must bei invested to make it safe<br>Total to make the place safe: __totalfp__FP" //Todo: Translate
		},

		"LGOverviewBox": {
			"Title": "Contribuții posibile",
			"Tooltip": {
				"FoundNew": "nou găsit",
				"FoundAgain": "recunoscut",
				"NoPayment": "nici o contribuție",
			},
			"Building": "Clădire",
			"Level": "Nivel",
			"PayedTotal": "Depus / Total",
			"Rate": "Procent",
			"Profit": "Profit",
			"NothingToGet": "<strong>__player__</strong> nu are nimic de furat"
		},

		"StrategyPoints" : {
			"Title" : "Producția de PF-uri",
			"TotalFPs": "Total PF-uri de la clădiri: ",
			"Amount": "Număr",
			"FPBar" : "PF în inventar: ",
			"BuyableFP" : "Buyable: "
		},

		"Productions" : {
			"Title" : "Prezentarea generală a producției",
			"SearchInput": "Caută clădirea...",
			"Total" : "Total: ",
			"ModeGroups": "Grupare",
			"ModeSingle": "Extindere",
			"Happiness": "Fericre",
			"AdjacentBuildings": "Clădiri învecinate",
			"Headings" : {
				"number" : "Număr",
				"amount" : "Cantitate",
				"earning" : "Recoltare",
				"greatbuilding" : "Clădiri legendare",
				"production" : "Clădiri de producție",
				"random_production" : "Producție aleatorie",
				"residential": "Clădiri de eveniment",
				"decoration": "Decorațiuni",
				"street": "Străzi",
				"goods": "Clădiri de bunuri",
				"culture": "Clădiri culturale",
				"main_building": "Primărie",
				"boost": "Boost", // TODO: to be translated
				"all" : "Total"
			}
		},

		"Neighbors" : {
			"Title" : "Producție de ",
			"ReadyProductions" : "Producții finalizate",
			"OngoingProductions" : "Producții în curs"
		},

		"Outpost" : {
			"Title" : "Bunurile din așezarea culturală",
			"TitleShort" : "Sumar bunuri - ",
			"TitleBuildings" : "Clădire",
			"TitleFree" : "Deblocat",
			"DescRequired" : "Necesar",
			"DescInStock" : "Disponibil",
			"DescStillMissing" : "<span style='color:#29b206'>Surplus</span> / <span style='color:#ef1616'>Lipsă</span>",
			"ExpansionsSum" : "Expansiune",
			"nextTile" : "Următoarea expansiune",
			"tileNotPlanned" : "închis",
			"infoLine" : "__runNumber__ așezare, Șansă de bonus x4: __chanceX4__%"
		},

		"Technologies": {
			"Title": "Costul de cercetare pentru ",
			"Resource": "Resurse",
			"DescRequired": "Necesar",
			"DescInStock": "Disponibil",
			"DescStillMissing": "<span style='color:#29b206'>Surplus</span> / <span style='color:#ef1616'>Lipsă</span>",
			"NoTechs": "Ai finalizat toate cercetările din era curentă",
			"Eras": {
				1: "Epoca de Piatră",
				2: "Epoca Bronzului",
				3: "Epoca Fierului",
				4: "Evul Mediu Timpuriu",
				5: "Evul Mediu Mijlociu",
				6: "Evul Mediu Târziu",
				7: "Era Colonială",
				8: "Era Industrială",
				9: "Era Progresistă",
				10: "Epoca Modernă",
				11: "Epoca Postmodernă",
				12: "Era Contemporană",
				13: "Mâine",
				14: "Viitorul",
				15: "Viitorul Arctic",
				16: "Viitorul Oceanic",
				17: "Viitorul Virtual",
				18: "Marte în Era Spațială",
				19: "Ceres în Era Spațială"
			}
		},

		"Campagne": {
			"Title": "Costuri de cucerire pentru ",
			"Reward": "Total recompense",
			"AlreadyDone": " cucerită deja!",
			"Resource": "Resurse",
			"DescRequired": "Necesar",
			"DescInStock": "Disponibil",
			"DescStillMissing": "<span style='color:#29b206'>Surplus</span> / <span style='color:#ef1616'>Lipsă</span>",
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
			"Title": "Ajutor pentru negocieri",
			"WrongGoods": "Bunuri alese greșit. Finalizează manual.",
			"TryEnd": "Încercări indisponibile",
			"Canceled": "Negocierea a fost anulată",
			"Success": "Succes",
			"Chance": "Șansă",
			"Person": "Persoană",
			"Average": "Ø Cantitate",
			"Costs": "Cost:",
			"Round": "Rundă",
			"Stock": "Stoc:",
			"GoodsLow": "ATENȚIE: Stocul de bunuri este la nivel scăzut!",
			"GoodsCritical": "ATENȚIE: Stocul de bunuri este la nivel critic!",
			"DragDrop": "Poți muta pictogramelor bunurilor de mai sus, folosind drag & drop, pentru a stabili ordinea primei încercări.",
			"TableLoadError": "Eroare la încărcara mesei de negociere."
		},

		"Settings" : {
			"Title" : "Setări",
			"Active" : "Activ",
			"Inactive" : "Inactiv",
		},

		"Infobox" : {
			"Title" : "InfoBox",
			"Filter" : "Filtre",
			"FilterGex" : "EG",
			"FilterAuction" : "Licitație",
			"FilterLevel" : "Creștere CL",
			"FilterMessage" : "Centru de mesaje",
			"FilterGildFights" : "Guild Fights", //Todo: Translate
			"FilterTrade" : "Piața",
			"ResetBox" : "Resetare",
			"Messages" : {
				"GEX" : "<strong>__player__</strong> tocmai a primit __points__ puncte în EG.",
				"LevelUp" : "__player__'s __building__ building has just reached level __level__.<br>You took <strong>__rank__th</strong> place and got <strong>__fps__</strong> FPs back.", //Todo: Translate
				"Auction" : "'<strong>__player__</strong> a licitat __amount__ monede.",
				"Trade" : "<strong>__player__</strong> a acceptat oferta ta.<br>Ai primit __needValue__ __need__ pentru __offerValue__ __offer__",
				"MsgBuilding" : "__building__ - Nivelul __level__",
				"GildFightOccupied": "Province <span style=\"color:#ffb539\">__provinceName__</span> was taken over by <span style=\"color:__attackerColor__;text-shadow: 0 1px 1px __attackerShadow__\">__attackerName__</span> and is closed until __untilOccupied__"   // Todo: Translate
			}
		},

		"Units" : {
			"Title": "Prezentare generală a unităților militare",
			"NextUnitsIn": "Următoarele __count__ unități vor sosi în <span class=\"alca-countdown\"></span>, la ora __harvest__",
			"ReadyToLoot": "Pregătit să lupte!",
			"Proportionally": "Proporționalitate",
			"Quantity": "Cantitate",
			"Unit": "Unități",
			"Status": "Status",
			"Attack": "Atac",
			"Defend": "Apărare",
			"NotFilled": "nu este completat",
			"Bind": "Atașat",
			"Unbind": "Liber"
		},

		"CityMap": {
			"TitleSend": "Transmiteți datale",
			"Desc1": "Pentru a putea planifica orașul, este nevoie să trimitem datele tale către foe-rechner.de",
			"Desc2": "<button class='btn-default' id='submit-data' onclick='CityMap.SubmitData()'>Trimite</button>",
			"SubmitSuccess": "Datale au fost transmise cu susces... Vizitează acum ",
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
			"Title" : "Prezentarea generală a producției",
			"Desc" : "Afișează toate producțiile în curs."
		},
		"Calculator" : {
			"Title" : "Calculator contribuții externe",
			"Desc" : "Calculează toate locurile disponibile și punctele care pot fi obținute",
			"Warning": "Dezactivat: Deschide mai întâi o clădirea a unui jucător!"
		},
		"OwnpartCalculator" : {
			"Title" : "Calculator contribuție proprie",
			"Desc" : "Creează un plan de contribuție, calculează locurile disponibile și copiază valorile",
			"Warning": "Dezactivat: Deschide mai întâi o cladire legendară proprie!"
		},
		"Technologies": {
			"Title": "Technologii",
			"Desc": "Calculează costurile pentru cercetarea tehnologiilor noi",
			"Warning": "Dezactivat: Deschide mai întâi meniul de cercetare a tehnologiilor!"
		},
		"Campagne": {
			"Title": "Harta continent",
			"Desc": "Prezentarea generală a resurselor necesare",
			"Warning" : "Dezactivat: Vizitează mai întâi o provincie!"
		},
		"Event": {
            "Title": "Event Questlist", //Todo: Translate
            "Desc": "Overview of the current and upcoming quests" //Todo: Translate
		},
		"Negotiation": {
			"Title": "Ajutor pentru negocieri",
			"Desc": "Face propuneri precise pentru negocieri",
			"Warning": "Dezactivat: Începe mai întâi o negociere!"
		},
		"Settings" : {
			"Title" : "Setări",
			"Desc" : "Setări ale aplicației"
		},
		"Chat" : {
			"Title" : "Mesagerie pentru ghildă",
			"Desc" : "Discută în timp real cu toată lumea"
		},
		"Unit" : {
			"Title" : "Unități militare",
			"Desc": "Prezentarea generală a unităților tale militare",
			"Warning": "Deschide 1x \"Gestionarea armatei\" <br>Tasta \"U\""
		},
		"Forum" : {
			"Title" : "Forum",
			"Desc" : "Ai o întrebare? Te deranjează ceva? Sau doar vrei să discutăm ..."
		},
		"Ask" : {
			"Title" : "Întrebare / Răspuns",
			"Desc" : "Nu știi cum funcționează ceva din cadrul aplicație?<br>Aruncă o privire aici!"
		},
		"Bugs" : {
			"Title" : "Greșeli / Propuneri",
			"Desc" : "Ceva nu este cum trebuie sau ai o idee?"
		},
		"OutP" : {
			"Title" : "Așezare culturală",
			"Desc": "Prezentarea generală a resurselor necesare",
			"DescWarningOutpostData": "<em id='outPW' class='tooltip-error'>Dezactivat: Începe mai întâi construcția unei așezări culturale și reîncarcă pagina (F5)",
			"DescWarningBuildings" : "<em id='outPW' class='tooltip-error'>Dezactivat: Deschide mai întâi Așezarea culturală!<br></em>Prezentarea generală a resurselor necesare"
		},
		"Info" : {
			"Title" : "InfoBox",
			"Desc" : "Îți arată toate lucrurile care se petrec în \"background\"<br><em>Completează informațiile ...</em>"
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
			"Title" : "Versiune",
			"DescDebug" : "<p>Extension <strong class='text-danger'>BETA</strong></p><a target='_blank' href='https://foe-rechner.de/extension/update?v=__version__&lang=__language__'>Changelog</a>",  // Todo: Translate: Translate
			"Desc" : "Versiunea extensiei pentru ",
			"PlayerId": "Player-Id:", //Todo: Translate
			"GuildId": "Gild-Id:", //Todo: Translate
			"World": "World:" //Todo: Translate
		},
		"GlobalSend": {
			"Title" : "Transmitere către foe-rechner.de",
			"Desc" : "Dacă dorești să urmărești datele cu ghilda dvs., activează această opțiune. <br> Pentru utilizarea personală, dezactivează opțiunea."
		},
		"SendTavernInfo": {
			"Title" : "Activitatea de motivație",
			"Desc" : "Ar trebui să fie transferate activitățile de motivație la misiunile evenimentelor?"
		},
		"SendGEXInfo": {
			"Title" : "Evaluarea EG",
			"Desc" : "Datele sunt transmise când accesezi clasamentul EG"
		},
		"SendGildMemberLGInfo": {
			"Title" : "Datele clădirilor legendare ale membrilor ghildei",
			"Desc" : "Când vizitezi colegii de ghildă, toate datele CL vor fi trimise către foe-rechner.de, după ce se revine la Global." //TODO: to be check
		},
		"ShowNeighborsGoods": {
			"Title" : "Producția vecinilor",
			"Desc" : "În timpul vizitării orașului, arată care este producțiile finalizate ale acestuia"
		},
		"SendInvestigations": {
			"Title" : "PF investite",
			"Desc" : "Când accesezi 'Town Hall'> 'News'> 'Legendary Buildings' datele despre PF investite vor fi transmise"
		},
		"ShowTavernBadge": {
			"Title" : "Show tavernas badge",  //Todo: Translate
			"Desc" : "As soon as the extra move in the tavern is activated, a globally movable counter appears." //Todo: Translate
		},
		"PreScanLGList": {
			"Title" : "Citirea preliminară a datelor despre CL",
			"Desc" : "Citește datele despre toate clădirile legendare ale unui vecin și determină dacă există locuri disponibile. <br> <u> NOTĂ: </u> Deoarece datele exacte sunt transmise doar după deschiderea unei clădiri, rezultatul poate diferi. Citirea este însă salvată." //TODO: to be check
		},
		"AutomaticNegotiation": {
			"Title" : "Ajutor pentru negocieri",
			"Desc" : "Dorești ca asistentul de negociere să se deschidă automat cu o negociere și să fie închis la anulare?"
		},
		"ResetBoxPositions": {
			"Title" : "Coordonatele casetei",
			"Desc" : "Dorești resetarea tuturor coordonatelor casetei?",
			"Button" : "Șterge!"
		},
		"MenuLength": {
			"Title" : "Menu length",
			"Desc" : "How many elements high should the menu be?<br> Empty or \"0\" means automatic height."
		},
		"ChangeLanguage": {
			"Title" : "Schimbă limba",
			"Desc" : "Care limbă ar trebui folosită?",
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

	"Eras": {
		"NoAge": "Nici o eră",
		"StoneAge": "Epoca de Piatră",
		"BronzeAge": "Epoca Bronzului",
		"IronAge": "Epoca Fierului",
		"EarlyMiddleAge": "Evul Mediu Timpuriu",
		"HighMiddleAge": "Evul Mediu Mijlociu",
		"LateMiddleAge": "Evul Mediu Târziu",
		"ColonialAge": "Era Colonială",
		"IndustrialAge": "Era Industrială",
		"ProgressiveEra": "Era Progresistă",
		"ModernEra": "Epoca Modernă",
		"PostModernEra": "Epoca Postmodernă",
		"ContemporaryEra": "Era Contemporană",
		"TomorrowEra": "Mâine",
		"FutureEra": "Viitorul",
		"ArcticFuture": "Viitorul Arctic",
		"OceanicFuture": "Viitorul Oceanic",
		"VirtualFuture": "Viitorul Virtual",
		"SpaceAgeMars": "Marte în Era Spațială"
	},

	"API" : {
		"UpdateSuccess" : "Actualizare efectuată",
		"GEXPlayer" : "Clasamentul EG a fost actualizat",
		"GEXChampionship" : "Contribuția membrilor ghildei la EG a fost actualizată",
		"LGInvest" : "Datele despre investițiile tale în CL au fost transmise",
		"LGGildMember" : "Datele despre clădirile legendare ale lui _player__\'s au fost transmise"
	},

	"HiddenRewards": {
		"Positions": {
			"nature": "Nature", //Todo: Translate
			"shore": "Shore", //Todo: Translate
			"water": "in the water", //Todo: Translate
			"cityRoadSmall": "small Road", //Todo: Translate
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