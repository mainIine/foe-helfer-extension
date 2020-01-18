/*
 * **************************************************************************************
 *
 * Dateiname:                 fr.js
 * Projekt:                   foe-chrome
 *
 * erstellt von:              Daniel Siekiera <daniel.siekiera@gmail.com>
 * erstellt am:	              17.12.19, 22:44 Uhr
 * zuletzt bearbeitet:       17.12.19, 22:19 Uhr
 *
 * Copyright © 2019
 *
 * **************************************************************************************
 */

let i18n = {
	"Local" : "fr-FR",
	"DateTime" : "DD.MM.YYYY HH:mm",

	"Boxes" : {
		"OwnpartCalculator" : {
			"Title": "Calcul de PFs pour mes GMs",
			"HelpLink": "https://foe-rechner.de/extension/index#Eigenanteilsrechner",
            "Step": "Niveau",
            "OldLevel": "Ancien niveau",
			"PatronPart": "Contribution externe",
			"OwnPart": "Contribution personnelle",
			"LGTotalFP": "Total PFs",
            "OwnPartRemaining": "Restant",
			"Done": "Fait",
			"BPs": "Plans",
			"Meds": "Méds",
			"Ext": "Ext.",
			"Arc": "Arche",
			"Order": "Séquence",
            "Deposit": "A poser",
			"CopyValues": "Copier les valeurs",
			"Note": "Ne pas oublier",
			"YourName": "Votre nom",
			"IndividualName": "Nom individuel",
			"OutputScheme": "Schéma de sortie",
            "Auto": "Automatique",
            "Place": "Place",
            "Levels": "niveaux",
            "NoPlaceSafe": "Pas de place à coup sûr"
		},

		"Calculator": {
			"Title": "Calcul de PFs pour les GMs des autres",
			"HelpLink": "https://foe-rechner.de/extension/index#Kostenrechner",
			"Step": "Niveau ",
			"AvailableFP": "PFs en stock",
			"ArcBonus": "Bonus d'arche",
            "Earnings": "Bénéfices",
            "Rate": "Ratio",
			"Up2LevelUp": "Jusqu'au niveau suivant",
			"FP": "PF",
			"Save": "Sauver",
			"Commitment": "PFs posés",
			"Profit": "Profit",
			"LevelWarning": "ATTENTION: faire passer le GM !",
			"NoFPorMedsAvailable": "Pas de PFs ou plans disponible",
			"LGNotOpen": "Le niveau suivant n'est pas déverrouillé",
			"LGNotConnected": "Le bâtiment n'est pas relié à une rue",
			"ActiveRecurringQuest": "Quête récurrente active:",
			"Done": "Fait"
		},

		"LGOverviewBox": {
			"Title": "Dépôts possibles",
			"Tooltip": {
				"FoundNew": "trouvé nouveau",
				"FoundAgain": "reconnu",
				"NoPayment": "jusqu'ici aucun dépôt",
			},
			"Building": "Bâtiment",
			"Level": "Niveau",
			"PayedTotal": "Payé / Total",
			"Rate": "Cours",
			"Profit": "Profit",
			"NothingToGet": "<strong>__player__</strong> n'a rien à récupérer"
		},

		"StrategyPoints" : {
			"Title" : "PFs - Productions",
			"TotalFPs": "Total PFs pour tous les bâtiments: ",
			"Amount": "Nombre",
			"FPBar" : "PFs en stock: "
		},

		"Productions" : {
			"Title" : "Vue d'ensemble des productions",
			"SearchInput": "Chercher un bâtiment...",
			"Total" : "Total: ",
			"ModeGroups": "Grouper",
			"ModeSingle": "Individuel",
			"Happiness": "satisfaction",
			"AdjacentBuildings": "bâtiment adjacent",
			"Headings" : {
				"number" : "Occurences",
				"amount" : "Nombre",
				"earning" : "Récolte",
				"greatbuilding" : "Grand monument",
				"production" : "Bâtiment de production",
				"random_production" : "Productions aléatoires",
				"residential" : "Bâtiments événementiels",
				"decoration": "Décorations",
				"street": "Rues",
				"goods": "Bâtiment fret", //Todo: Translate
				"culture": "Bâtiments culturels", //Todo: Translate
				"main_building": "Hôtel de ville",
				"boost": "Augmentation", //Todo: Translate
				"all" : "Tous"
			}
		},

		"Neighbors" : {
			"Title" : "Production de ",
			"ReadyProductions" : "Productions terminées",
			"OngoingProductions" : "Productions en cours"
		},

		"Outpost" : {
			"Title" : "Ressources de la colonie",
			"TitleShort" : "Vue des ressources - ",
			"TitleBuildings" : "Bâtiment",
			"TitleFree" : "Gratuit",
			"DescRequired" : "Requis",
			"DescInStock" : "Disponible",
			"DescStillMissing" : "<span style='color:#29b206'>Excès</span> / <span style='color:#ef1616'>Manquant</span>",
			"ExpansionsSum" : "Expansions",
			"nextTile" : "Prochaine expansion",
			"tileNotPlanned" : "off", // TODO: translate
			"infoLine" : "__runNumber__. run, Bonus x4 Chance: __chanceX4__%", // TODO: translate
        },

        "Technologies": {
            "Title": "Les coûts de recherche pour",
            "Resource": "Ressource",
            "DescRequired": "Requis",
            "DescInStock": "Disponible",
			"DescStillMissing": "<span style='color:#29b206'>Excès</span> / <span style='color:#ef1616'>Manquant</span>",
			"NoTechs": "Vous avez atteint la fin de cette ère",
            "Eras": {
                1: "Âge de Pierre",
                2: "Âge du Bronze",
                3: "Âge du Fer",
                4: "Haut Moyen Âge",
                5: "Moyen Âge Classique",
                6: "Renaissance",
                7: "Âge Colonial",
                8: "Âge Industriel",
                9: "Ère Progressiste",
                10: "Ère Moderne",
                11: "Ère Postmoderne",
                12: "Ère Contemporaine",
                13: "Ère de Demain",
                14: "Ère du Futur",
                15: "Futur Arctique",
                16: "Futur Océanique",
                17: "Futur Virtuel",
                18: "Ère Spatiale - Mars",
                19: "Ère Spatiale - Cérès"
            }
        },

        "Campagne": {
            "Title": "Coûts de conquête pour",
            "Reward": "Récompense totale ",
            "AlreadyDone": " déjà conquis!",
            "Resource": "Ressources",
            "DescRequired": "Requis",
            "DescInStock": "Disponible",
            "DescStillMissing": "<span style='color:#29b206'>Excès</span> / <span style='color:#ef1616'>Manquant</span>",
        },

        "Negotiation": {
            "Title": "Assistant de négociation",
            "WrongGoods": "Mauvais produits sélectionnés, veuillez terminer manuellement",
            "TryEnd": "Essayer de finir",
            "Canceled": "La négociation a été annulée",
            "Success": "Succès",
            "Chance": "Chance",
			"Person": "Personne",
			"Average": "Ø Coûts", //Todo: Translate
			"Costs": "Moyens:",
			"Round": "Tour",
			"Stock": "Stock:",
            "GoodsLow": "ATTENTION: le stock de marchandises est faible",
			"GoodsCritical": "ATTENTION: le stock de marchandises est critique",
			"DragDrop": "Vous pouvez réorganiser vous-même les icônes de l'affichage moyen en utilisant le glisser-déposer pour déterminer l'ordre dès la première tentative.",
			"TableLoadError": "Erreur de chargement de la table de négociation"
        },
        
		"Settings" : {
			"Title" : "Paramètres",
			"Active" : "Actif",
			"Inactive" : "Inactif",
		},

		"Infobox" : {
			"Title" : "Infobox",
			"Filter" : "Filtre",
			"FilterGex" : "GEX",
			"FilterAuction" : "Enchères",
			"FilterLevel" : "Niveau supérieur",
			"FilterMessage" : "Message",
			"FilterTrade" : "Commerce",
			"ResetBox" : "Vider la boîte",
			"Messages" : {
				"GEX" : "<strong>__player__</strong> vient de recevoir __points__ Punkte points au GEX.",
				"LevelUp" : "Le __building__ de __player__'s vient juste d'atteindre le niveau __level__.<br>Tu as pris la <strong>__rank__</strong>ème place",
				"Auction" : "<strong>__player__</strong> vient d'offrir __amount__ pièces.",
				"Trade" : "<strong>__player__</strong> a accepté votre offre.<br>Vous avez __needValue__ __need__ pour __offerValue__ __offer__",
				"MsgBuilding" : "__building__ - Niveau __level__"
			}
		},

		"Units" : {
            "Title": "Aperçu de l'armée",
			"NextUnitsIn": "Les __count__ prochaines unités arriveront dans <span class=\"alca-countdown\"></span> à __harvest__",
			"ReadyToLoot": "Prêt à récolter!",
			"Proportionally": "En proportion",
			"Quantity": "Nombre",
			"Unit": "Unité",
			"Status": "Status",
			"Attack": "Attaque",
			"Defend": "Défense",
			"NotFilled": "non rempli",
			"Bind": "Liè",
			"Unbind": "Non liè"
		},
		
		"CityMap": {
			"Title": "Envoyer les données",
			"Desc1": "Pour être capable de cartographier votre citée, nous devons transférer vos données à foe-rechner.de",
			"Desc2": "<button class='btn-default' id='submit-data' onclick='CityMap.SubmitData()'>Envoyer</button>",
			"SubmitSuccess": "Données transférées avec succès... Maintenant visitez "
		}
	},

	"Menu" : {
		"Productions" : {
			"Title" : "Vue d'ensemble des productions",
			"Desc" : "Affiche le nombre en cours de toutes les productions."
		},
		"Calculator" : {
			"Title" : "Calculatrice des coûts",
			"Desc" : "Calcule toutes les places pour vous et les PFs pour sniper",
			"Warning": "Désactivé: Ouvre d'abord un GM d'un autre joueur !"
		},
		"OwnpartCalculator" : {
			"Title" : "Calculatrice de up à plusieurs",
			"Desc" : "Crée un plan de pose de PFs, calcul les coûts et copies les valeurs",
			"Warning": "Désactivé: Ouvre d'abord un de tes GM !"
        },
        "Technologies": {
            "Title": "Recherches Technologiques",
            "Desc": "Calculer les coûts de la recherche",
            "Warning": "Désactivé: ouvrez d'abord le menu de recherche!"
        },
        "Campagne": {
            "Title": "Campagne",
            "Desc": "Aperçu des ressources nécessaires",
            "Warning": "Désactivé: visitez d'abord une province!"
		},
        "Negotiation": {
            "Title": "Assistant de négociation",
			"Desc": "Faire des propositions de négociations précises",
			"Warning": "Désactivé: commencez une négociation en premier!"
        },
		"Settings" : {
			"Title" : "Paramètres",
			"Desc" : "Ici il y a quelques éléments à configurer"
		},
		"Chat" : {
			"Title" : "Chat de guilde",
			"Desc" : "Discute en temps réel avec tout le monde"
		},
		"Unit" : {
			"Title" : "Armées",
			"Desc": "Toutes vos armées en un coup d'œil",
			"Warning": "Ouvrez 1x votre \"Organisation de l'Armée\" <br>Bouton \"U\""
		},
		"Forum" : {
			"Title" : "Forum",
			"Desc" : "Vous avez une question? Quelque chose à proposer ? Ou juste pour parler..."
		},
		"Ask" : {
			"Title" : "Question / Réponse",
			"Desc" : "Vous ne savez pas comment utiliser une fonctionnalité ?<br>Jetez un oeil ici !"
		},
		"Bugs" : {
			"Title" : "Erreurs / Envies",
			"Desc" : "Quelque chose n'est pas comme il devrait où vous avez une idée ?"
		},
		"OutP" : {
			"Title" : "Colonie",
            "Desc": "Vue d'ensemble des ressources nécessaires",
            "DescWarningOutpostData": "<em id='outPW' class='tooltip-error'>Désactivé: Démarrer une colonie et recharger le jeu (F5)",
			"DescWarningBuildings" : "<em id='outPW' class='tooltip-error'>Désactivé: Allez d'abord dans la colonie !<br></em>Vue d'ensemble des ressources nécessaires"
		},
		"Info" : {
			"Title" : "Info techniques",
			"Desc" : "Affiche tous les éléments qui se déroulent en 'arrière plan'<br><em>Cela se remplit avec les infos ...</em>"
		}
	},

	"Settings" : {
		"Version": {
			"Title" : "Version",
			"DescDebug" : "Version de l'extension Chrome <strong class='text-danger'>BETA</strong>",
			"Desc" : "Version de l'extension Chrome"
		},
		"GlobalSend": {
			"Title" : "Envoi à foe-rechner.de",
			"Desc" : "Si vous voulez suivre les données avec votre guilde, activez cet élément. <br> Pour une utilisation personnelle, désactivez le."
		},
		"SendTavernInfo": {
			"Title" : "Activité PO/MO",
			"Desc" : "Est-ce que les activités de PO/MO doivent être transférées quand les événements ont lieu ?"
		},
		"SendGEXInfo": {
			"Title" : "Evaluations des expéditions de guildes",
			"Desc" : "Quand vous cliquez sur l'emplacement des expéditions de guildes ou sur le classement, les infos sont envoyées"
		},
		"SendGildMemberLGInfo": {
			"Title" : "Info GM des membres de la guilde",
			"Desc" : "En visitant les autres membres de la guilde, les données des GM seront envoyées à foe-rechner.de quand l'option d'envoi est activé."
		},
		"ShowNeighborsGoods": {
			"Title" : "Récolte des voisins",
			"Desc" : "Pendant la visite, montre ce qui est en cours de production"
		},
		"SendInvestigations": {
			"Title" : "Investissements des PFs",
			"Desc" : "Ouvrir l'hôtel de ville> Nouvelles > Grand monuments ; cela enverra l'info des PFs investit"
		},
		"ShowTavernBadge": {
			"Title" : "Affiche un compteur sur la taverne",
			"Desc" : "Dès qu'un placement dans la taverne est effectué, un compteur global apparaît."
		},
		"PreScanLGList": {
			"Title" : "Analyse préliminaire de la vue d'ensemble d'un GM",
			"Desc" : "Parcourt la liste générale du voisin à l’ouverture lors de l’ouverture et détermine les GM éventuellement remplissables. <br> <u> Remarque: </u> Les dernières places étant uniquement transmises lors de l’ouverture d’un LG, le résultat peut être différent. L'analyse est enregistrée, cependant."
		},
		"AutomaticNegotiation": {
			"Title" : "Assistant de négociation",
			"Desc" : "L'assistant doit-il s'ouvrir automatiquement avec une négociation et fermé en cas d'annulation ?"
		},
		"ResetBoxPositions": {
			"Title" : "Coordonnées de la fenêtre",
			"Desc" : "Toutes les coordonnées des fenêtres doivent-elles être réinitialisées ?",
			"Button" : "Supprimer!"
		},
		"ChangeLanguage": {
			"Title" : "Changer de langue",
			"Desc" : "Quelle langue, au lieu de la langue reconnue, devrait être utilisée ?",
			"Dropdown": {
				"de": "Deutsch",
				"en": "English",
				"fr": "Français",
				"es": "Español",
				"ru": "Русский"
			}
		}
	},

	"Eras": {
		"NoAge": "Sans âge",
        "StoneAge": "Âge de Pierre",
        "BronzeAge": "Âge du Bronze",
        "IronAge": "Âge du Fer",
        "EarlyMiddleAge": "Haut Moyen Âge",
        "HighMiddleAge": "Moyen Âge Classique",
		"LateMiddleAge": "Renaissance",
        "ColonialAge": "Âge Colonial",
        "IndustrialAge": "Âge Industriel",
        "ProgressiveEra": "Ère Progressiste",
        "ModernEra": "Ère Moderne",
        "PostModernEra": "Ère Postmoderne",
        "ContemporaryEra": "Ère Contemporaine",
        "TomorrowEra": "Ère de Demain",
        "FutureEra": "Ère du Futur",
        "ArcticFuture": "Futur Arctique",
        "OceanicFuture": "Futur Océanique",
        "VirtualFuture": "Futur Virtuel",
        "SpaceAgeMars": "Ère spatiale - Mars"
	},

	"API" : {
		"UpdateSuccess" : "Mise à jour effectuée",
		"GEXPlayer" : "Les stages GEX des membres ont été mis à jour",
		"GEXChampionship" : "Le placement de guilde GEX a été mis à jour",
		"LGInvest" : "Vos investissements LG ont été transférés",
        "LGGildMember": "Les bâtiments légendaires de __player__ ont été soumis"
	}
};
