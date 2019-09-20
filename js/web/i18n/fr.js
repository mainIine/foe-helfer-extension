/*
 * **************************************************************************************
 *
 * Dateiname:                 fr.js
 * Projekt:                   foe
 *
 * erstellt von:              Daniel Siekiera <daniel.siekiera@gmail.com>
 * zu letzt bearbeitet:       20.09.19, 11:18 Uhr
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
			"Title": "Calculatrice de up à plusieurs",
			"HelpLink": "https://foe-rechner.de/extension/index#Eigenanteilsrechner",
			"Step": "Niveau",
			"ArcBonus": "Bonus Arche",
			"PatronPart": "Patron share: ",
			"OwnPart": "Contribution personnelle",
			"LGTotalFP": "Total PFs",
			"ExternalFP": "PFs externes",
			"Order": "Séquence",
			"Deposit": "A poser",
			"CopyValues": "Copier les valeurs",
			"YourName": "Votre nom",
			"IndividualName": "nom individuel",
			"OutputScheme": "Schéma de sortie",
			"Place": "Place",
			"Levels": "niveaux"
		},

		"Calculator": {
			"Title": "Calculatrice de coûts",
			"HelpLink": "https://foe-rechner.de/extension/index#Kostenrechner",
			"Step": "Niveau ",
			"AvailableFP": "PFs disponibles",
			"ArcBonus": "Bonus Arche",
			"Earnings": "Gains",
			"Save": "Sauver",
			"Commitment": "PFs posés",
			"Profit": "Gain",
			"NoFPorMedsAvailable": "Pas de PFs ou plans disponible"
		},

		"StrategyPoints" : {
			"Title" : "PFs - Productions",
			"TotalFPs": "Total PFs pour tous les batiments: ",
			"Amount": "Nombre",
			"FPBar" : "PFs-Stock: "
		},

		"Productions" : {
			"Title" : "Vue d'ensemble des productions",
			"SearchInput": "Chercher un batiment...",
			"Total" : "Totalement: ",
			"ModeGroups": "Grouper",
			"ModeSingle": "Individuel",
			"Headings" : {
				"number" : "Nombre",
				"amount" : "Lot",
				"earning" : "Récolte",
				"greatbuilding" : "Grand monument",
				"production" : "Bâtiment de production",
				"random_production" : "Productions aléatoires",
				"residential" : "Bâtiments événementiels",
				"main_building" : "Hôtel de ville",
				"all" : "Tout"
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
		},

		"Settings" : {
			"Title" : "Paramètres",
			"Active" : "Actif",
			"Inactive" : "Inactif",
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
		"Settings" : {
			"Title" : "Paramètres",
			"Desc" : "Ici il y a quelques éléments à configurer"
		},
		"Chat" : {
			"Title" : "Chat de guilde",
			"Desc" : "Discute en temps réel avec tout le monde"
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
			"Desc" : "Quelque chose n'est pas comme il devrait où vous avez une idéée ?"
		},
		"OutP" : {
			"Title" : "Colonie",
			"Desc" : "Vue d'ensemble des ressources nécessaires",
			"DescWarning" : "<em id='outPW' class='tooltip-error'>Désactivé: Allez d'abord dans la colonie !<br></em>Vue d'ensemble des ressources nécessaires"
		},
		"Info" : {
			"Title" : "Info techniques",
			"Desc" : "Affiche tous les éléments qui se déroulent en 'arrière plan'<br><em>Cela se remplit avec les infos ...</em>"
		}
	},

	"Settings" : {
		"GlobalSend": {
			"Title" : "Envoi à foe-rechner.de",
			"Desc" : "Si vous voulez suivre les données avec votre guilde, activez cet élément. <br> Pour une utilisation personnelle, désactivez le."
		},
		"SendTavernInfo": {
			"Title" : "Activité PO/MO",
			"Desc" : "Est-ce que les activités de PO/MO doivent être transférer quand les événements ont lieu ?"
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
		"ShowOutpost": {
			"Title" : "Ressources de la colonie",
			"Desc" : "Affiche un menu pour les ressources de la colonie<br><u>Note:</u> Un rechargement du jeu est requis."
		}
	}
};