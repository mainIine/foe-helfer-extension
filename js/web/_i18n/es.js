/*
 * **************************************************************************************
 *
 * Dateiname:                 es.js
 * Projekt:                   foe-chrome
 *
 * erstellt von:              Daniel Siekiera <daniel.siekiera@gmail.com>
 * erstellt am:	              17.12.19, 22:44 Uhr
 * zuletzt bearbeitet:       17.12.19, 22:32 Uhr
 *
 * Copyright © 2019
 *
 * **************************************************************************************
 */

let i18n = {
	"Local" : "es-ES",
	"DateTime" : "DD.MM.YYYY HH:mm [Uhr]",

	"Global" : {
		"BoxTitle": " <small><em>FoE Helper</em></small>"
	},

	"Boxes" : {
		"OwnpartCalculator" : {
			"Title": "Calculator cuata propia",
			"HelpLink": "https://foe-rechner.de/extension/index#Eigenanteilsrechner",
            "Step": "Nivel",
            "OldLevel": "Nivel viejo",
			"PatronPart": "Parte del contribuyente",
			"OwnPart": "Cuota propia",
			"LGTotalFP": "Gran edificio FP en total",
            "OwnPartRemaining": "quedan",
			"Done": "Listo",
			"BPs": "Plano", //Todo: Translate
			"Meds": "Méds", //Todo: Translate
			"Ext": "Ext", //Todo: Translate
			"Arc": "Arca", //Todo: Translate
			"Order": "Orden",
			"Deposit": "Ingresar",
			"CopyValues": "Copiar valores",
			"Note": "Guadar",
			"YourName": "Tu nombre",
			"IndividualName": "Nombre de gran edicio individual",
			"OutputScheme": "Esquema del output",
            "Auto": "Auto",
            "Place": "Puesto",
            "Levels": "Aumentar nivel",
            "NoPlaceSafe": "Ningun puesto esta seguro"
		},

		"Calculator": {
			"Title": "Calculador de costes",
			"HelpLink": "https://foe-rechner.de/extension/index#Kostenrechner",
			"Step": "Nivel",
			"AvailableFP": "Disponibles puntos forge",
			"FriendlyInvestment": "Friendly invest:", //Todo: Translate
			"ArcBonus": "Bonus del Arca",
			"Rate": "Cotizacion",
			"Up2LevelUp": "Hasta el proximo nivel",
			"FP": "FP",
			"Save": "Guardar",
			"BPs": "Plano",
			"Meds": "Méds",
			"Commitment": "Contribucion",
			"Profit": "Ganancia",
			"LevelWarning": "ATENCIÓN: nivela el legendario edificio!", //Todo: Translate
			"NoFPorMedsAvailable": "No hay FP o planos disponibles",
			"LGNotOpen": "El proximo nivel no esta disponible todavia",
			"LGNotConnected": "El edificio no esta conectado a una carretera",
			"ActiveRecurringQuest": "Active recurring quest:", //Todo: Translate
			"Done": "done", //Todo: Translate
			"LevelWarningTT": "__fpcount__FP do not fit in<br>Maximum investment: __totalfp__FP", //Todo: Translate
			"NegativeProfitTT": "Place is not safe. __fpcount__ additional FP must bei invested to make it safe<br>Total to make the place safe: __totalfp__FP" //Todo: Translate
		},

		"LGOverviewBox": {
			"Title": "Posibles desembolsos",
			"Tooltip": {
				"FoundNew": "encontrado nuevo",
				"FoundAgain": "reconocido",
				"NoPayment": "no hay desembolsos hasta ahora",
			},
			"Building": "Edificio",
			"Level": "Nivel",
			"PayedTotal": "Ingresado / Total",
			"Rate": "Cotizacion",
			"Profit": "Ganancia",
			"NothingToGet": "Con <strong>__player__</strong> no hay nada para pillar"
		},

		"StrategyPoints" : {
			"Title" : "FP - Producciones",
			"TotalFPs": "Todos los FP de todos los edificios: ",
			"Amount": "Cantidad",
			"FPBar" : "FP en almacen: ",
			"BuyableFP" : "Buyable: "
		},

		"Productions" : {
			"Title" : "Produktions Übersicht",
			"SearchInput": "Edificio busqueda...",
			"Total" : "Gesamt: ",
			"ModeGroups": "Gruppiert",
			"ModeSingle": "Einzeln",
			"Happiness": "Happiness", //Todo: Translate
			"AdjacentBuildings": "Adjacent buildings", //Todo: Translate
			"Headings" : {
				"number" : "Numero",
				"amount" : "Cantidad",
				"earning" : "Cosecha",
				"greatbuilding" : "Grandes Edificio",
				"production" : "Edificios de produccion",
				"random_production" : "Produccion casual",
				"residential": "Residential buildings", //Todo: Translate
				"decoration": "Decorations",
				"street": "Streets",
				"goods": "Goods buildings",
				"culture": "Cultural buildings",
				"main_building" : "Ayuntamiento",
				"boost": "Boost",
				"all" : "Todos"
			}
		},

		"Neighbors" : {
			"Title" : "Produccion de ",
			"ReadyProductions" : "Produccion terminada",
			"OngoingProductions" : "Produccion corriente"
		},

		"Outpost" : {
			"Title" : "Mercancias de los Asentamientos Culturales",
			"TitleShort" : "Resumen de mercancias - ",
			"TitleBuildings" : "Edificio",
			"TitleFree" : "Libre",
			"DescRequired" : "Necesitado",
			"DescInStock" : "Disponible",
			"DescStillMissing" : "<span style='color:#29b206'>Exceso</span> / <span style='color:#ef1616'>Fehlt</span>",
			"ExpansionsSum" : "Expansions", // TODO: translate
			"nextTile" : "next Expansion", // TODO: translate
			"tileNotPlanned" : "off", // TODO: translate
			"infoLine" : "__runNumber__. run, Bonus x4 Chance: __chanceX4__%", // TODO: translate
        },

        "Technologies": {
            "Title": "Coste de investigacion por",
            "Resource": "Recurso",
            "DescRequired": "Necesitado",
            "DescInStock": "Disponible",
			"DescStillMissing": "<span style='color:#29b206'>Exceso</span> / <span style='color:#ef1616'>Fehlt</span>",
			"NoTechs": "You have reached the end of this era", //Todo: Translate
            "Eras": {
                1: "Edad de Piedra",
                2: "Edad de Bronce",
                3: "Edad de Hierro",
                4: "Alta Edad Media",
                5: "Plena Edad Media",
                6: "Baja Edad Media",
                7: "Edad Colonial",
                8: "Edad Industrial ",
                9: "Edad del Progreso",
                10: "Edad Moderna",
                11: "Edad PostModerna",
                12: "Edad Contemporánea",
                13: "El Mañana",
                14: "El Futuro",
                15: "Futuro Ártico",
                16: "Futuro Oceánico",
                17: "Futuro Virtual",
                18: "Edad Espacial: Marciana",
                19: "Edad Espacial: Ceres"
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
            "Title" : "Ayudante de negociacion",
            "WrongGoods": "Mercancia equivocada, por favor seguir a mano",
            "TryEnd": "Se terminaron los intentos",
            "Canceled": "Negociacion cancelada",
            "Success": "Acierto",
			"Chance": "Oportunidad",
			"Person": "Persona",
			"Average": "Ø Amount", //Todo: Translate
			"Costs": "Costs:", //Todo: Translate
			"Round": "Round", //Todo: Translate
			"Stock": "Stock:", //Todo: Translate
			"GoodsLow": "ATTENTION: Good stock is low", //Todo: Translate
			"GoodsCritical": "ATTENTION: Good stock is critical", //Todo: Translate
			"DragDrop": "You can rearrange the icons of the average display yourself using drag & drop to determine the order from the first attempt.", //Todo: Translate
			"TableLoadError": "Error loading the negotiation table" //Todo: Translate
        },

		"Settings" : {
			"Title" : "Ajustes",
			"Active" : "Activo",
			"Inactive" : "Inactivo",
		},

		"Infobox" : {
			"Title" : "Infobox",
			"Filter" : "Filtro",
			"FilterGex" : "EG",
			"FilterAuction" : "Subasta",
			"FilterLevel" : "Level-Up",
			"FilterMessage" : "Mensaje",
			"FilterGildFights" : "Guild Fights", //Todo: Translate
			"FilterTrade" : "Comercio",
			"ResetBox" : "Vaciar el box",
			"Messages" : {
				"GEX" : "<strong>__player__</strong> ha conseguido __points__ puntos en la EG.",
				"LevelUp" : "__player__'s __building__ building has just reached level __level__.<br>You took <strong>__rank__th</strong> place and got <strong>__fps__</strong> FPs back.",
				"Auction" : "<strong>__player__</strong> ha pujado ahora mismo__amount__ monedas",
				"Trade" : "<strong>__player__</strong> ha aceptado tu oferta.<br>Tienes __needValue__ __need__ por __offerValue__ __offer__",
				"MsgBuilding" : "__building__ - nivel __level__",
				"GildFightOccupied": "Province <span style=\"color:#ffb539\">__provinceName__</span> was taken over by <span style=\"color:__attackerColor__;text-shadow: 0 1px 1px __attackerShadow__\">__attackerName__</span> and is closed until __untilOccupied__"   // Todo: Translate
			}
		},

		"Units" : {
			"Title": "Resumen del ejercito",
			"NextUnitsIn": "Las proximas __count__ unidades llegan <span class=\"alca-countdown\"></span> a las __harvest__ horas",
			"ReadyToLoot": "Listo para la cosecha!",
			"Proportionally": "En proporción",
			"Quantity": "Cantidad",
			"Unit": "Unidad",
			"Status": "Estado",
			"Attack": "Ataque",
			"Defend": "Defensa",
			"NotFilled": "no esta lleno",
			"Bind": "Atado",
			"Unbind": "libre"
		},
		
		"CityMap": {
			"TitleSend": "Submit data", //Todo: Translate
			"Desc1": "To be able to plan your city we need to transfer your data to foe-rechner.de", //Todo: Translate
			"Desc2": "<button class='btn-default' id='submit-data' onclick='CityMap.SubmitData()'>Submit</button>", //Todo: Translate
			"SubmitSuccess": "Data was transfered successfully... Now visit ", //Todo: Translate
			"WholeArea": "The whole area: ",
			"FreeArea": "Free area: "
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
			"Title" : "Resumen de produccion ",
			"Desc" : "Muestra la cantidad de las producciones actuales."
		},
		"Calculator" : {
			"Title" : "Calculador de costes",
			"Desc" : "Calcula todos los puestos para ti y determina si se pueden mangar FPs",
			"Warning": "Deactivado: Metete primero en un edificio grande de otro jugador!"
		},
		"OwnpartCalculator" : {
			"Title" : "Calculator cuata propia",
			"Desc" : "Crear plan de pago, calcular puestos externos y copiar el valor",
			"Warning": "Deactivado: Metete primero en un edificio grande tuyo!"
        },
        "Technologies": {
            "Title": "Tecnologia",
            "Desc": "Calcular costes de investigacion",
            "Warning": "Deactivado: Abre prinmero el arbol de tecnologias!"
        },
		"Campagne": {
            "Title": "Campaign", //Todo: Translate
            "Desc": "Overview of the resources required", //Todo: Translate
        	"Warning" : "Disabled: Visit a province first!" //Todo: Translate
		},
        "Event": {
            "Title": "Event Questlist", //Todo: Translate
            "Desc": "Overview of the current and upcoming quests" //Todo: Translate
		},
        "Negotiation": {
            "Title": "Asistente de negociaciones",
			"Desc": "Te da sugerencias precisas para las negociaciones",
			"Warning": "Deactivado: Comienca primero una nueva negociacion!"
        },
		"Settings" : {
			"Title" : "Ajustes",
			"Desc" : "Aquí ajustas algunas cositas"
		},
		"Chat" : {
			"Title" : "Chat en vivo del gremio",
			"Desc" : "Chatea en tiempo real con todos"
		},
		"Unit" : {
			"Title" : "Ejercito",
			"Desc": "Todas tus tropas a simple vista",
			"Warning": "Abre primero 1x tu \"Gestión del Ejercito\"<br>tecla \"U\""
		},
		"Forum" : {
			"Title" : "Forum",
			"Desc" : "Tienes una pregunta? Estas molesto por algo? O solo para hablar..."
		},
		"Ask" : {
			"Title" : "Pregunta / Respuesta",
			"Desc" : "No sabes como funciona algo?<br>Compruebalo!"
		},
		"Bugs" : {
			"Title" : "Error / Deseo",
			"Desc" : "Algo no funciona como debería o tienes una idea??"
		},
		"OutP" : {
			"Title" : "Asentamientos Culturales",
            "Desc": "Resumen de los recursos necesitados",
            "DescWarningOutpostData": "<em id='outPW' class='tooltip-error'>Deactivado: Comienca primero un asentamiento cultural y vualva a cragar el juego (F5)",
			"DescWarningBuildings" : "<em id='outPW' class='tooltip-error'>Deactivado: Primero visita el asentamiento cultural!<br></em>Resumen de los recursos necesitados"
		},
		"Info" : {
			"Title" : "Info Box",
			"Desc" : "Te enseña todas las cosas que pasan en el \"fondo \"<br><em>Poco a poco se llena con información...</em>"
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
			"Desc" : "Chrome Extension Version",
			"PlayerId": "Player-Id:",
			"GuildId": "Gild-Id:",
			"World": "World:"
		},
		"GlobalSend": {
			"Title" : "Transmision a foe-rechner.de",
			"Desc" : "Si deseas realizar un seguimiento de datos con tu gremio, activa este punto.<br>Para una extension autosuficiente, simplemente desactiva"
		},
		"SendTavernInfo": {
			"Title" : "Actividad de motivar",
			"Desc" : "Quieres que sean transferidas las actividades de motivar al iniciar?"
		},
		"SendGEXInfo": {
			"Title" : "EG evaluaciones",
			"Desc" : "Transmite los datos de EG al hacer clic en rankings o colocaciones"
		},
		"SendGildMemberLGInfo": {
			"Title" : "Datos de edificios grandes de otros mienmbros del gremium",
			"Desc" : "Cuando visitas otros miembors del gremium, todos los datos de los edificios grandos son transferidas a foe-rechner.de, si global esta activado"
		},
		"ShowNeighborsGoods": {
			"Title" : "Cosecha de la vecindad",
			"Desc" : "Mostrar lo que actualmentese se esta produciendo cuando visitas la vecindad"
		},
		"SendInvestigations": {
			"Title" : "FP inversiones",
			"Desc" : "Al entrar al 'Ayuntamiento' > 'Novedades' > 'Grandes edificios' seran transferidas las inversiones de FP"
		},
		"ShowTavernBadge": {
			"Title" : "Mostrar placa de tabernas ",
			"Desc" : "Tan pronto como se activa un boost en la taberna, aparece un contador, globalmente desplazable"
		},
		"PreScanLGList": {
			"Title" : "Escanear con antelacion los grandes edificios",
			"Desc" : "Escanea la lista de resumen de grandes edificios del vecino cuando se abre y, determina rellenables grandes edificios.<br><u>Nota:</u> Dado que los puestos finales solo se transmiten cuando se abre un edificio grande, puede que el resultado sea diferente. Sin embargo, el escaneo se guarda."
		},
		"AutomaticNegotiation": {
			"Title" : "Verhandlungsassisten",
			"Desc" : "Soll der Assistent automatisch mit einer Verhandlung geöffnet und bei Abbruch geschlossen werden?"
		},
		"ResetBoxPositions": {
			"Title" : "Coordenadas del box",
			"Desc" : "Quieres que todos los coordenadas sean restablecidos?",
			"Button" : "Borrar!"
		},
		"MenuLength": {
			"Title" : "Menu length", //Todo: Translate
			"Desc" : "How many elements high should the menu be?<br> Empty or \"0\" means automatic height." //Todo: Translate
		},
		"ChangeLanguage": {
			"Title" : "Cambiar idioma",
			"Desc" : "Que idioma debe usarse en lugar del reconocido?",
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
		"NoAge": "Sin siglo",
		"StoneAge": "Edad de Piedra",
		"BronzeAge": "Edad de Bronce",
		"IronAge": "Edad de Hierro",
		"EarlyMiddleAge": "Alta Edad Media",
		"HighMiddleAge": "Plena Edad Media",
		"LateMiddleAge": "Baja Edad Media",
		"ColonialAge": "Edad Colonial",
		"IndustrialAge": "Era Industrial",
		"ProgressiveEra": "Era del Progreso",
		"ModernEra": "Edad Moderna",
		"PostModernEra": "Edad Postmoderna",
		"ContemporaryEra": "Edad Contemporánea",
		"TomorrowEra": "Era del Mañana",
		"FutureEra": "Era del Futuro",
		"ArcticFuture": "Futuro Artico",
		"OceanicFuture": "Futuro Oceanico",
		"VirtualFuture": "Futuro Virtual",
		"SpaceAgeMars" : "Era espacial: marciana"
	},

	"API" : {
		"UpdateSuccess" : "Actualizacion realizada",
		"GEXPlayer" : "Se han actualizado los puestos de los miembros en la EG",
		"GEXChampionship" : "Se ha actualizado el puesto del gremio en la EG",
		"LGInvest" : "Tus inversiones en grandes edifivios han sido transferidos",
		"LGGildMember" : "__player__'s GEs han sido transferidos"
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