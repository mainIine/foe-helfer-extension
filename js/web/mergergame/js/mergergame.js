/*
 * **************************************************************************************
 * Copyright (C) 2022 FoE-Helper team - All Rights Reserved
 * You may use, distribute and modify this code under the
 * terms of the AGPL license.
 *
 * See file LICENSE.md or go to
 * https://github.com/mainIine/foe-helfer-extension/blob/master/LICENSE.md
 * for full license details.
 *
 * **************************************************************************************
 */

FoEproxy.addHandler('MergerGameService', 'all', (data, postData) => {
	
	if (data.requestMethod != "getOverview" && data.requestMethod != "resetBoard") return;
	//Do not show window if deactivated in settings
	if(!Settings.GetSetting('ShowEventChest')){
		return;
	}
	mergerGame.event = data.responseData.context.replace("_event","")
	mergerGame.cells = data.responseData.cells;
	mergerGame.levelValues = data.responseData?.lookup?.pieceConfig[0]?.grandPrizeProgress || {1:1,2:2,3:3,4:4};
	mergerGame.keyValues = {3:data.responseData?.lookup?.keyConversion[0]?.amount || 1,4:data.responseData?.lookup?.keyConversion[1]?.amount|| 3};
	mergerGame.spawnCost = data.responseData?.cells[1]?.spawnCost?.resources[`${mergerGame.event}_energy`] || 10;
	mergerGame.state["maxProgress"]= 0;
	mergerGame.state["energyUsed"]= 0;
	mergerGame.state["progress"]= 0;
	mergerGame.state["keys"]= 0;
	mergerGame.colors = mergerGame.eventData[mergerGame.event].colors;
	mergerGame.types = mergerGame.eventData[mergerGame.event].types;
	for (let x of mergerGame.cells) {
		if (x.isFixed) mergerGame.state.maxProgress += mergerGame.levelValues[x.level];
	};
	for (let x of mergerGame.cells[1].spawnChances) {
		if (!x) continue;
		if (!mergerGame.spawnChances[x.type.value]) mergerGame.spawnChances[x.type.value] = {}
		mergerGame.spawnChances[x.type.value][x.level] = x.spawnChance;
	}
	mergerGame.updateTable();
	
	if (data.requestMethod == "getOverview") {
		mergerGame.checkSave();
		mergerGame.ShowDialog();
	} else { //resetBoard
		mergerGame.state.energyUsed +=  mergerGame.resetCost;
		mergerGame.saveState();
		mergerGame.updateDialog();
	}
	if (mergerGame.state.progress == mergerGame.state.maxProgress) {
		mergerGame.resetCost = 0;
	} else {
		mergerGame.resetCost = data.responseData.resetCost?.resources[`${mergerGame.event}_energy`] || 0;
	}
	
});


FoEproxy.addHandler('MergerGameService', 'spawnPieces', (data, postData) => {
	// Don't handle when module not open
    if ($('#mergerGameDialog').length === 0) {
		return;
	}
	
	mergerGame.cells.push(data.responseData[0])
	mergerGame.state.energyUsed += mergerGame.spawnCost;
	mergerGame.updateTable();
	mergerGame.saveState();
	mergerGame.updateDialog();
});

FoEproxy.addHandler('MergerGameService', 'mergePieces', (data, postData) => {
	// Don't handle when module not open
    if ($('#mergerGameDialog').length === 0) {
		return;
	}
	
	let t_id = data.responseData.id;
	let o_id = postData[0].requestData[1];
	if (o_id==t_id) o_id = postData[0].requestData[2];

	let target = mergerGame.cells.findIndex((e) => e.id == t_id);
	let origin = mergerGame.cells.findIndex((e) => e.id == o_id);

	if (mergerGame.cells[target].isFixed) mergerGame.state.progress += mergerGame.levelValues[mergerGame.cells[target].level];
	if (mergerGame.state.progress == mergerGame.state.maxProgress) mergerGame.resetCost = 0;

	mergerGame.cells[target] = data.responseData;
	mergerGame.cells.splice(origin,1);

	mergerGame.updateTable();
	mergerGame.saveState();

	mergerGame.updateDialog();

});

FoEproxy.addHandler('MergerGameService', 'convertPiece', (data, postData) => {
	// Don't handle when module not open
    if ($('#mergerGameDialog').length === 0) {
		return;
	}
	
	target = mergerGame.cells.findIndex((e) => e.id == postData[0].requestData[1]);
	
	mergerGame.state.keys += mergerGame.cells[target].level == 3 ? 1 : 3;
	mergerGame.cells.splice(target,1);

	mergerGame.updateTable();
	mergerGame.saveState();

	mergerGame.updateDialog();
});

let mergerGame = {
	event:"anniversary",
	colors: ["white","yellow","blue"],
	types: ["top","bottom","full"],
	/*event:"soccer",
	colors: ["attacker","midfielder","defender"],
	types: ["left","right","full"],*/
	cells:[],
	spawnChances:{white:{1:14,2:8,3:5,4:3},blue:{1:14,2:8,3:5,4:3},yellow:{1:19,2:10,3:7,4:4},defender:{1:14,2:8,3:5,4:3},attacker:{1:14,2:8,3:5,4:3},midfielder:{1:19,2:10,3:7,4:4}},
	state: {
		maxProgress: 0,
		energyUsed:0,
		progress:0,
		keys: 0
	},
	resetCost: 0,
	spawnCost: 10,
	levelValues: {1:1,2:1,3:1,4:2},
	keyValues: {3:1, 4:3},
	settings: JSON.parse(localStorage.getItem("MergerGameSettings") || '{"keyValue":1.3,"targetProgress":3750,"availableCurrency":11000,"hideOverlay":true}'),
	eventData:{
		anniversary: {
			progress:"/shared/seasonalevents/league/league_anniversary_icon_progress.png",
			energy:"/shared/seasonalevents/anniversary/event/anniversary_energy.png",
			keyfile:"/shared/seasonalevents/anniversary/event/anniversay_icon_key_",
			colors: ["white","yellow","blue"],
			CSScolors: {white:"#7fecba",yellow:"#e14709",blue:"#08a9f7"},
			types: ["top","bottom","full"],
			partname:"key",
			tile:"gem"
		},
		soccer:{
			progress:"/shared/seasonalevents/league/league_soccer_icon_progression.png",
			energy:"/shared/seasonalevents/soccer/event/soccer_football.png",
			keyfile:"/shared/seasonalevents/soccer/event/soccer_icon_badge_",
			colors: ["attacker","midfielder","defender"],
			types: ["left","right","full"],
			CSScolors: {attacker:"#ec673a",midfielder:"#e7d20a",defender:"#44d3e2"},
			partname:"badge",
			tile:"player"
		}
	},
	solved: {keys:0,progress:0, value:0},
	simulation: {},
	simKeys:null,
	simProgress:null,

	updateTable: () => {
		let table = {},
			unlocked = {};
		for (x of mergerGame.colors) {
			table[x]={}
			unlocked[x]={}
			for (l of [1,2,3,4]) {
				table[x][l]={}
				unlocked[x][l]={}
				for (t of mergerGame.types) {
					table[x][l][t]=0;
					unlocked[x][l][t]=0;
				}
				unlocked[x][l]["none"]=0;
			}
		}
		for (let x of mergerGame.cells) {
			if (! x.id || x.id<0) continue;
			if (!x.keyType?.value) continue;
			if (x.keyType.value !="none") {
				table[x.type.value][x.level][x.keyType.value]++;
			}
			if (!x.isFixed) {
				unlocked[x.type.value][x.level][x.keyType.value]++;
			}
		};
		mergerGame.state["table"] = table;
		mergerGame.state["unlocked"] = unlocked;
		mergerGame.solve();
	},

	checkSave: () => {
		let x = localStorage.getItem("mergerGameState");
		if (!x) return;
		let oldState=JSON.parse(x);
		let oldTable=JSON.stringify(oldState.table);
		let newTable=JSON.stringify(mergerGame.state.table);
		if (oldTable==newTable) {
			mergerGame.state.maxProgress = oldState.maxProgress;
			mergerGame.state.progress = oldState.progress;
			mergerGame.state.energyUsed = oldState.energyUsed;
			mergerGame.state.keys = oldState.keys;
		}
	},
	
	saveState:() => {
		localStorage.setItem("mergerGameState",JSON.stringify(mergerGame.state))
	},

	keySum:() => {
		let sum = 0;
		for (let x of mergerGame.cells) {
			if (x.keyType?.value == "full") sum += mergerGame.keyValues[x.level];
		}
		if (sum>0 && !($('#mergerGameDialog.closed').length > 0 && mergerGame.settings.hideOverlay)) {
			if ($('#mergerGameResetBlocker').length === 0) {
				let blocker = document.createElement("img");
				blocker.id = 'mergerGameResetBlocker';
				blocker.src = srcLinks.get("/city/gui/great_building_bonus_icons/great_building_bonus_plunder_repel.png", true);
				blocker.title = i18n("Boxes.MergerGame.KeysLeft."+mergerGame.event);
				$('#game_body')[0].append(blocker);
				$('#mergerGameResetBlocker').on("click",()=>{$('#mergerGameResetBlocker').remove()});
			} 
		} else {
			$('#mergerGameResetBlocker').remove()
		}
		return mergerGame.state.keys + sum;
	},

    /**
     * Shows a User Box with the current production stats
     *
     * @constructor
     */
    ShowDialog: () => {
        
		// Don't create a new box while another one is still open
		if ($('#mergerGameDialog').length === 0) {
			HTML.AddCssFile('mergergame');
			
			HTML.Box({
				id: 'mergerGameDialog',
				title: 'Merger Game',
				auto_close: true,
				dragdrop: true,
				minimize: true,
				resize : true,
				ask: i18n('Boxes.MergerGame.HelpLink'),
				settings: 'mergerGame.ShowSettingsButton()'
			});

			$('#mergerGameDialogclose').on("click",()=>{$('#mergerGameResetBlocker').remove()});
			$('#mergerGameDialogButtons .window-minimize').on("click",()=>{
				if (mergerGame.settings.hideOverlay) $('#mergerGameResetBlocker').remove()
			});
		}
		
		mergerGame.updateDialog();
    },
	
	updateDialog: () => {
		let type1 = mergerGame.types[1],
			type2 = mergerGame.types[0];
		if ($('#mergerGameDialog').length === 0) {
			return;
		}
		htmltext=``
		
		let table = mergerGame.state.table
	
		let remainingProgress = mergerGame.state.maxProgress - mergerGame.state.progress|0;
		let keys = mergerGame.keySum()|0;
		let totalValue = mergerGame.state.progress + keys*mergerGame.settings.keyValue|0;
		let efficiency = (totalValue / mergerGame.state.energyUsed).toFixed(2)|0;
		
		let targetEfficiency = mergerGame.settings.targetProgress/mergerGame.settings.availableCurrency;
		html = `<table class="foe-table">`
		html += `<tr><td>${i18n("Boxes.MergerGame.Progress")}</td><td>${remainingProgress} / ${mergerGame.state.maxProgress} <img src="${srcLinks.get(mergerGame.eventData[mergerGame.event].progress,true)}"></td></tr>`
		html += `<tr><td>${i18n("Boxes.MergerGame.Energy."+mergerGame.event)}</td><td title="${i18n("Boxes.MergerGame.EfficiencyTargetProgress."+mergerGame.event)+Math.floor(totalValue)+"/"+Math.floor(mergerGame.state.energyUsed*targetEfficiency)|0}">${mergerGame.state.energyUsed} <img src="${srcLinks.get(mergerGame.eventData[mergerGame.event].energy,true)}"></td></tr>`
		html += `<tr><td>${i18n("Boxes.MergerGame.Keys."+mergerGame.event)}</td><td>${keys} <img ${mergerGame.event=="soccer"?'class="toprightcorner"':''} src="${srcLinks.get(`${mergerGame.eventData[mergerGame.event].keyfile}full_${mergerGame.colors[2]}.png`,true)}"><img ${mergerGame.event=="soccer"?'class="toprightcorner"':''} src="${srcLinks.get(`${mergerGame.eventData[mergerGame.event].keyfile}full_${mergerGame.colors[1]}.png`,true)}"><img ${mergerGame.event=="soccer"?'class="toprightcorner"':''} src="${srcLinks.get(`${mergerGame.eventData[mergerGame.event].keyfile}full_${mergerGame.colors[0]}.png`,true)}"></td></tr>`
		html += `<tr><td>${i18n("Boxes.MergerGame.Efficiency."+mergerGame.event)}</td><td style="font-weight:bold; color: ${efficiency > targetEfficiency*1.15 ? 'var(--text-success)' : efficiency < targetEfficiency * 0.95 ? 'red' : 'var(--text-bright)'}" title="${i18n("Boxes.MergerGame.EfficiencyTotalProgress") + Math.floor(efficiency*mergerGame.settings.availableCurrency)}">${efficiency} <img src="${srcLinks.get(mergerGame.eventData[mergerGame.event].progress,true)}"> /<img src="${srcLinks.get(mergerGame.eventData[mergerGame.event].energy,true)}"></td></tr>`
		html += `</table>`

		let totalPieces = {}
		for (x of mergerGame.colors) {
			totalPieces[x]={}
			for (t of mergerGame.types) {
				totalPieces[x][t]=0;
			}
		}

		for (let i of mergerGame.colors) {
			for (let t of mergerGame.types) {
				totalPieces[i][t] = table[i][1][t] + table[i][2][t] + table[i][3][t] + table[i][4][t];
			}
			totalPieces[i]["min"] = Math.min(totalPieces[i][type1],totalPieces[i][type2]);
		}

		for (let i of mergerGame.colors) {
			html += `<table class="foe-table"><tr><th></th>`
			for (let lev = 4; lev>0; lev--) {
				html += `<th>${mergerGame.state.unlocked[i][lev].none}<img src="${srcLinks.get(`/shared/seasonalevents/${mergerGame.event}/event/${mergerGame.event}_${mergerGame.eventData[mergerGame.event].tile}_${i}_${lev}.png`,true)}" title="${mergerGame.spawnChances[i][lev]}%"></th>`
			}
			for (let o of mergerGame.types) {
				let m = totalPieces[i].min;
				let t = totalPieces[i][o];
				html += `</tr><tr><td ${((t==m && o != "full") || (0==m && o == "full") ) ? 'style="font-weight:bold"' : ''}>${t}${(o == "full") ? '/'+ (t+m) : ''}`;
				html += `<img ${mergerGame.event=="soccer"?'class="toprightcorner"':''} src="${srcLinks.get(`${mergerGame.eventData[mergerGame.event].keyfile}${o}_${i}.png`,true)}"></td>`
				for (let lev = 4; lev>0; lev--) {
					val = table[i][lev][o];
					if (val==0) val = "-";
					html += `<td style="${val != "-" ? 'font-weight:bold;' : ''}${(o=="full" && lev==3 && table[i][lev][o]>1)?' color:red"': ''}">${val}</td>`
				}
			}
			html += `</tr></table>`
		}
		
		$('#mergerGameDialogBody').html(html);
	},

	ShowSettingsButton: () => {
        let h = [];
		h.push(`<table class="foe-table"><tr><td>`)
        h.push(`${i18n('Boxes.MergerGame.KeyValue.'+mergerGame.event)}</td><td>`);
        h.push(`<input type="Number" id="MGkeyValue" oninput="mergerGame.SaveSettings()" value="${mergerGame.settings.keyValue}"></td></tr><tr><td>`);
        h.push(`${i18n('Boxes.MergerGame.availableCurrency.'+mergerGame.event)}</td><td>`);
        h.push(`<input type="Number" id="MGavailableCurrency" oninput="mergerGame.SaveSettings()" value="${mergerGame.settings.availableCurrency}"></td></tr><tr><td>`);
        h.push(`${i18n('Boxes.MergerGame.targetProgress')}</td><td>`);
        h.push(`<input type="Number" id="MGtargetProgress" oninput="mergerGame.SaveSettings()" value="${mergerGame.settings.targetProgress}"></td></tr><tr><td>`);
        h.push(`${i18n('Boxes.MergerGame.hideOverlay')}</td><td>`);
        h.push(`<input type="checkbox" id="MGhideOverlay" oninput="mergerGame.SaveSettings()"${mergerGame.settings.hideOverlay ? ' checked' : ''}></td></tr></table>`);
        
		$('#mergerGameDialogSettingsBox').html(h.join(''));
		$("#mergerGameDialogSettingsBox input").keyup(function(event) {
			if (event.keyCode === 13) {
				$("#mergerGameDialogButtons .window-settings").trigger("click");
			}
		});
    },

    SaveSettings: () => {
        mergerGame.settings.keyValue = Number($('#MGkeyValue').val()) || 1;
		mergerGame.settings.targetProgress = Number($('#MGtargetProgress').val()) || 3250;
		mergerGame.settings.availableCurrency = Number($('#MGavailableCurrency').val()) || 10500;
		mergerGame.settings.hideOverlay = $('#MGhideOverlay')[0].checked;
		localStorage.setItem('MergerGameSettings', JSON.stringify(mergerGame.settings));
        mergerGame.updateDialog();
    },

	
	simStart:(i=20)=> {
		mergerGame.cells = [0];
		for (let i=1;i<=32;i++) {
			let color= mergerGame.colors[Math.floor(Math.random()*3)];
			let level=Math.floor(Math.random()*4)+1;
			let type= mergerGame.types[Math.floor(Math.random()*2)]
			mergerGame.cells.push({id:i,keyType:{value:type},type:{value:color},level:level,isFixed:true})
		}
		mergerGame.updateTable();
		mergerGame.ShowDialog();
		while (i>0) {
			mergerGame.simSpawn()
			i--;
			if (mergerGame.simProgress.max==0) break
		}
	},
	simSpawn:()=> {
		let x={}
		x["id"] = mergerGame.cells.length;
		x["isFixed"] = false;
		x["keyType"]={value:"none"}
		let c=Math.floor(Math.random()*100);
		if (c<14) {
			x["type"]={value:mergerGame.colors[2]};
			x["level"]=1;
		} else if (c<22) {
			x["type"]={value:mergerGame.colors[2]};
			x["level"]=2;
		} else if (c<27) {
			x["type"]={value:mergerGame.colors[2]};
			x["level"]=3;
		} else if (c<30) {
			x["type"]={value:mergerGame.colors[2]};
			x["level"]=4;
		} else if (c<44) {
			x["type"]={value:mergerGame.colors[0]};
			x["level"]=1;
		} else if (c<52) {
			x["type"]={value:mergerGame.colors[0]};
			x["level"]=2;
		} else if (c<57) {
			x["type"]={value:mergerGame.colors[0]};
			x["level"]=3;
		} else if (c<60) {
			x["type"]={value:mergerGame.colors[0]};
			x["level"]=4;
		} else if (c<79) {
			x["type"]={value:mergerGame.colors[1]};
			x["level"]=1;
		} else if (c<89) {
			x["type"]={value:mergerGame.colors[1]};
			x["level"]=2;
		} else if (c<96) {
			x["type"]={value:mergerGame.colors[1]};
			x["level"]=3;
		} else {
			x["type"]={value:mergerGame.colors[1]};
			x["level"]=4;
		}
		mergerGame.cells.push(x);
		//console.log("color",x.type.value);
		//console.log("level",x.level);
		mergerGame.updateTable();
		mergerGame.ShowDialog();
	},

	solve:() => {
		let type1 = mergerGame.types[1],
			type2 = mergerGame.types[0];
		
		let solved = {}
		
		for (let c of mergerGame.colors) {
			let locked= {}
			locked[type1]=[]
			locked[type2]=[]
			let free = {full:[], none:[]}
			free[type1]=[]
			free[type2]=[]
			for (let t of mergerGame.types.concat(["none"])) {
				for (let l of [1,2,3,4]) {
					free[t].push(mergerGame.state.unlocked[c][l][t])
					if (t=="full"||t=="none") continue
					locked[t].push(mergerGame.state.table[c][l][t]-mergerGame.state.unlocked[c][l][t]);
					
				}
			}
			solved[c] = mergerGame.solver(locked,free,c);
			for (x of solved[c].solution) x.css ? console.log(x.text,x.css) : console.log(x)
		}

		let progress = 0
		for (let c of mergerGame.colors) {
			progress += solved[c].progress;
		}
		mergerGame.solved.progress = progress;
		//keys
		let keys = 0
		for (let c of mergerGame.colors) {
			keys += solved[c].keys;
		}
		mergerGame.solved.keys = keys;
		[mergerGame.simKeys,mergerGame.simProgress] = mergerGame.simulate(solved);
	},
	simulate:(solved) => {
		let keys = {min:10,max:0,average:0};
		let progress = {min:100,max:0,average:0};
		for (let c of mergerGame.colors) {
			for (let l of [1,2,3,4]) {
					let free = window.structuredClone(solved[c].free)
					free["none"][l-1] += 1
					let simulated = mergerGame.solver(window.structuredClone(solved[c].locked),window.structuredClone(free),c,true)
					let addKeys = simulated.keys - solved[c].keys;
					let addProgress = simulated.progress - solved[c].progress;
					if (addKeys<0 || addProgress<0) {
						mergerGame.solver(window.structuredClone(solved[c].locked),window.structuredClone(free),c,false)
						console.error("solver not working properly",mergerGame.debugginfo({color:c, level:l,solved:solved,free:free}))
						console.log("progress",solved[c].progress)
						console.log("keys",solved[c].keys)
						console.log("simKeys",simulated.keys);
						console.log("simProgress",simulated.progress);
						console.count("inconsistent");
						for (x of simulated.solution) x.css ? console.log(x.text,x.css) : console.log(x)
					}
					if (addKeys<keys.min) keys.min = addKeys;
					if (addKeys>keys.max) keys.max = addKeys;
					keys.average += mergerGame.spawnChances[c][l]/100*addKeys;
					if (addProgress<progress.min) progress.min = addProgress;
					if (addProgress>progress.max) progress.max = addProgress;
					progress.average += mergerGame.spawnChances[c][l]/100*addProgress;
			}
		}
		return [keys,progress]
	}, 

	simulate2:(solved,c) => {
		let best = window.structuredClone(solved);
		for (let l of [1,2,3,4]) {
			if (solved.free.none[l-1] == 0) continue 
			let free = window.structuredClone(solved.free),
				locked=window.structuredClone(solved.locked);
			free["none"][l-1] -= 1;
			let simulated = mergerGame.solver(locked,free,c);
			if (simulated.keys*mergerGame.settings.keyValue+simulated.progress>best.keys*mergerGame.settings.keyValue+best.progress) best = window.structuredClone(simulated);
		}
		return best
	}, 

	solver: (locked,free, color,sim=false) =>{
		let result1 = mergerGame.solver1(window.structuredClone(locked),window.structuredClone(free),color);
		let result2 = mergerGame.solver2(window.structuredClone(locked),window.structuredClone(free),color);
		let result = null

		if (result1.keys*mergerGame.settings.keyValue+result1.progress>result2.keys*mergerGame.settings.keyValue+result2.progress) 
			result = result1
		else
			result = result2;
		
		if (sim) {
			result = mergerGame.simulate2(result,color)
		}
		
		return result;
		
	},

	solver1:(locked,free, color)=>{
		let lockedO = window.structuredClone(locked),
			freeO = window.structuredClone(free),
			type1 = mergerGame.types[0],
			type2 = mergerGame.types[1],
			total1_ = locked[type1].reduce((a, b) => a + b, 0)+free[type1].reduce((a, b) => a + b, 0),
			total2_ = locked[type2].reduce((a, b) => a + b, 0)+free[type2].reduce((a, b) => a + b, 0),
			total1_2 = total1_ - locked[type1][0],
			total2_2 = total2_ - locked[type2][0],
			startProgress = 0,
			Solution=[];

		//Progress:
		for (let t of [type1,type2]) {
			for (let l of [1,2,3,4]) {
				startProgress += locked[t][l-1]*mergerGame.levelValues[l]
			}
		}
		
		Solution.push ({text:"%c=======Modified Solver=======",css: "color:"+mergerGame.eventData[mergerGame.event].CSScolors[color]})
		//Solution.push ("==Level 1 Merges==")
		while (true) {
			if (free.none[0] == 0) break;
			
			if (locked[type2][0] == 0 && locked[type1][0] == 0) {
				if (free.none[0] >= 2) {
					free.none[0] -= 2
					free.none[1] += 1
					Solution.push ("Free L1 + Free L1")
					continue;
				} else break;
			}
			let pick = null
			if (total2_2 == total1_2) {
				if (locked[type1][0] > locked[type2][0])
					pick = type1
				else
					pick = type2
			} else if (total2_2 > total1_2) {
				if (locked[type1][0] > 0)
					pick = type1
				else
					pick = type2
			} else {
				if (locked[type2][0] > 0)
					pick = type2
				else
					pick = type1
			}        
			if (pick == type1) {
				free.none[0] -= 1
				free[type1][1] += 1
				locked[type1][0] -= 1
				total1_2 += 1
				Solution.push (`Free L1 + Locked L1 ${type1}`)
			} else {
				free.none[0] -= 1
				free[type2][1] += 1
				locked[type2][0] -= 1
				total2_2 += 1
				Solution.push (`Free L1 + Locked L1 ${type2}`)
			}
		}

		//Level 4 + 3 easy cleanup
		while (true) {
			if (free.none[3] > 0 && locked[type2][3] > 0 && locked[type1][3] > 0) {
				free.none[3] -= 1
				locked[type1][3] -= 1
				locked[type2][3] -= 1
				free.full[3] += 1
				Solution.push (`Free L4 + Locked L4 ${type1} + Locked L4 ${type2}`)
			} else if (free[type1][3] > 0 && locked[type2][3]>0) {
				free[type1][3] -= 1
				locked[type2][3] -= 1
				free.full[3] += 1
				Solution.push (`Free L4 ${type1} + Locked L4 ${type2}`)
			} else if (free[type2][3] > 0 && locked[type1][3]>0) {
				free[type2][3] -= 1
				locked[type1][3] -= 1
				free.full[3] += 1
				Solution.push (`Free L4 ${type2} + Locked L4 ${type1}`)
			} else if (free.none[2] >= locked[type2][3] + locked[type1][3] && 
						locked[type2][3] > 0 && locked[type1][2]>0) {
				locked[type2][3] -= 1
				locked[type1][2] -= 1
				free.none[2] -= 1
				free.full[3] += 1
				Solution.push (`Free L3 + Locked L3 ${type1} + Locked L4 ${type2}`)
			} else if (free.none[2] >= locked[type2][3] + locked[type1][3] && 
						locked[type1][3] > 0 && locked[type2][2]>0) {
				locked[type2][2] -= 1
				locked[type1][3] -= 1
				free.none[2] -= 1
				free.full[3] += 1
				Solution.push (`Free L3 + Locked L3 ${type2} + Locked L4 ${type1}`)
			} else if (free.none[2]> 0 && free.none[2] < locked[type2][3] + locked[type1][3] && 
						locked[type2][2]+locked[type2][1]+locked[type2][0]>=locked[type1][2]+locked[type1][1]+locked[type1][0] &&
						locked[type2][3] > 0 && locked[type1][2]>0) {
				locked[type2][3] -= 1
				locked[type1][2] -= 1
				free.none[2] -= 1
				free.full[3] += 1
				Solution.push (`Free L3 + Locked L3 ${type1} + Locked L4 ${type2}`)
			} else if (free.none[2]> 0 && free.none[2] < locked[type2][3] + locked[type1][3] && 
						locked[type2][2]+locked[type2][1]+locked[type2][0]<=locked[type1][2]+locked[type1][1]+locked[type1][0] &&
						locked[type1][3] > 0 && locked[type2][2]>0) {
				locked[type2][2] -= 1
				locked[type1][3] -= 1
				free.none[2] -= 1
				free.full[3] += 1
				Solution.push (`Free L3 + Locked L3 ${type2} + Locked L4 ${type1}`)
			} else break
		}

		let total1_3 = locked[type1][2] + locked[type1][3] + free[type1][2] + free[type1][3];
		let total2_3 = locked[type2][2] + locked[type2][3] + free[type2][2] + free[type2][3];
		//Solution.push ("==Level 2 Merges==")
		let occupied1_3=0;
		let occupied2_3=0;
		while (true) {
			
			if (free.none[1] > free[type2][1] && locked[type1][1] > 0 && (locked[type2][2]+free[type2][2]-occupied2_3) > 0 && (total1_3<=total2_3 || locked[type2][1] == 0 )) {
				free.none[1] -= 1;
				locked[type1][1] -= 1;
				free[type1][2] += 1;
				total1_3 +=1;
				occupied1_3 += 1;
				occupied2_3 += 1;
				Solution.push (`Free L2 + Locked L2 ${type1}`)
			} else if (free.none[1] > free[type1][1] &&  locked[type2][1] > 0 && (locked[type1][2]+free[type1][2]-occupied1_3) > 0) {
				free.none[1] -= 1
				locked[type2][1] -= 1
				free[type2][2] += 1
				total2_3 +=1;
				occupied1_3 += 1;
				occupied2_3 += 1;
				Solution.push (`Free L2 + Locked L2 ${type2}`)
			} else if (free.none[1] > 1 && free.none[1] > free[type1][1]+free[type2][1] && (locked[type1][1]> 0) && (locked[type2][1]> 0) && (locked[type1][2] + free[type1][2] -occupied1_3> 0) && (locked[type2][2] + free[type2][2] -occupied2_3> 0)) {
				free.none[1] -= 1
				locked[type1][1] -= 1
				free[type1][2] += 1
				total1_3 +=1;
				Solution.push (`Free L2 + Locked L2 ${type1}`)
				free.none[1] -= 1
				locked[type2][1] -= 1
				free[type2][2] += 1
				total2_3 +=1;
				Solution.push (`Free L2 + Locked L2 ${type2}`)
				occupied1_3 += 2;
				occupied2_3 += 2;
			} else if (free[type1][1]> 0 && locked[type2][1]> 0 && (locked[type1][2] + free[type1][2] + locked[type2][2] + free[type2][2] - occupied1_3 - occupied2_3 - free.none[2] > 0)) {
				free[type1][1] -= 1
				locked[type2][1] -= 1
				free.full[2] += 1
				if (locked[type1][2]+free[type1][2]-occupied1_3>free[type2][2]+locked[type2][2]-occupied2_3) 
					occupied1_3 += 1 
				else 
					occupied2_3 += 1;
				Solution.push (`Free L2 ${type1} + Locked L2 ${type2}`)
			} else if (free[type2][1]> 0 && locked[type1][1]> 0 && (locked[type1][2] + free[type1][2] + locked[type2][2] + free[type2][2] - occupied1_3 - occupied2_3 - free.none[2] > 0)) {
				free[type2][1] -= 1
				locked[type1][1] -= 1
				free.full[2] += 1
				if (locked[type1][2]+free[type1][2]-occupied1_3>free[type2][2]+locked[type2][2]-occupied2_3) 
					occupied1_3 += 1 
				else 
					occupied2_3 += 1;
				Solution.push (`Free L2 ${type2} + Locked L2 ${type1} (1)`)
			} else if (free.none[1] > 1 && free.none[1] > free[type1][1]+free[type2][1] && (locked[type1][1] + free[type1][1] > 0) && (locked[type2][1] + free[type2][1] > 0) && (locked[type1][2] + free[type1][2] -occupied1_3> 0) && (locked[type2][2] + free[type2][2] -occupied2_3> 0)) {
				if (locked[type1][1] > 0) {
					free.none[1] -= 1
					locked[type1][1] -= 1
					free[type1][2] += 1
					Solution.push (`Free L2 + Locked L2 ${type1}`)
				} else {
					free.none[1] -= 1
					free[type1][1] -= 1
					free[type1][2] += 1
					Solution.push (`Free L2 + Free L2 ${type1}`)
				}
				if (locked[type2][1] > 0) {
					free.none[1] -= 1
					locked[type2][1] -= 1
					free[type2][2] += 1
					Solution.push (`Free L2 + Locked L2 ${type2}`)
				} else {
					free.none[1] -= 1
					free[type2][1] -= 1
					free[type2][2] += 1
					Solution.push (`Free L2 + Free L2 ${type2}`)
				}
				occupied1_3 += 2;
				occupied2_3 += 2;
			} else if (free[type1][1] > 0 && locked[type2][1] > 0) {
				free[type1][1] -= 1
				free.full[2] += 1
				locked[type2][1] -= 1
				Solution.push (`Free L2 ${type1} + Locked L2 ${type2}`)
			} else if (free[type2][1] > 0 && locked[type1][1] > 0) {
				free[type2][1] -= 1
				free.full[2] += 1
				locked[type1][1] -= 1
				Solution.push (`Free L2 ${type2} + Locked L2 ${type1} (2)`)
			} else if (free[type2][1] > 0 && free[type1][1] > 0) {
				free[type2][1] -= 1
				free[type1][1] -= 1
				free.full[2] += 1
				Solution.push (`Free L2 ${type2} + Free L2 ${type1} (1)`)
			} else if (free.none[1] > 0 && (locked[type1][1] + locked[type2][1]) > 0) {
				let pick = null
				if (total2_3 == total1_3) {
					if (total2_ > total1_) {
						if (locked[type1][1] > 0)
							pick = type1
						else
							pick = type2
					} else {
						if (locked[type2][1] > 0)
							pick = type2
						else
							pick = type1
					}
				} else if (total2_3 > total1_3) {
					if (locked[type1][1] > 0)
						pick = type1
					else
						pick = type2
				} else {
					if (locked[type2][1] > 0)
						pick = type2
					else
						pick = type1
				}
				if (pick == type1) {
					free.none[1] -= 1
					free[type1][2] += 1
					locked[type1][1] -= 1
					total1_3 += 1
					Solution.push (`Free L2 + Locked L2 ${type1}`)
				} else {
					free.none[1] -= 1
					free[type2][2] += 1
					locked[type2][1] -= 1
					total2_3 += 1
					Solution.push (`Free L2 + Locked L2 ${type2}`)
				}
			} else if (free[type1][1] > 0 && locked[type1][1] > 0) {
				free[type1][1] -= 1
				locked[type1][1] -= 1
				free[type1][2] += 1
				Solution.push (`Free L2 ${type1} + Locked L2 ${type1}`)
			} else if (free[type2][1] > 0 && locked[type2][1] > 0) {
				free[type2][1] -= 1
				locked[type2][1] -= 1
				free[type2][2] += 1
				Solution.push (`Free L2 ${type2} + Locked L2 ${type2}`)
			} else if (free[type2][1] > 0 && free.none[1] > 0) {
				free[type2][1] -= 1
				free.none[1] -= 1
				free[type2][2] += 1
				Solution.push (`Free L2 + Free L2 ${type2}`)
			} else if (free[type1][1] > 0 && free.none[1] > 0) {
				free[type1][1] -= 1
				free.none[1] -= 1
				free[type1][2] += 1
				Solution.push (`Free L2 + Free L2 ${type1}`)
			} else if (free.none[1] >= 2) {
				free.none[1] -= 2
				free.none[2] += 1
				Solution.push ("Free L2 + Free L2")
			} else if (free[type1][1] >= 2) {
				free[type1][1] -= 2
				free[type1][2] += 1
				Solution.push (`Free L2 ${type1} + Free L2 ${type1}`)
			} else if (free[type2][1] >= 2) {
				free[type2][1] -= 2
				free[type2][2] += 1
				Solution.push (`Free L2 ${type2} + Free L2 ${type2}`)
			} else break
		}      
		//Solution.push ("==Level 3 Merges==")
		let total1_4 = locked[type1][3] + free[type1][3];
		let total2_4 = locked[type2][3] + free[type2][3];
		let occupied1_4=0;
		let occupied2_4=0;
		while (true) {
			
			if (free.none[2] >= locked[type1][2]+locked[type2][2]+free[type1][2]+free[type2][2] + free["full"][2] && locked[type1][2]+locked[type2][2]+free[type1][2]+free[type2][2]+ free["full"][2] > 0) {
				for (let x=0; x<locked[type1][2];x++) Solution.push (`Free L3 + Locked L3 ${type1}`)
				free[type1][3] += locked[type1][2];
				for (let x=0; x<free[type1][2];x++) Solution.push (`Free L3 + Free L3 ${type1}`)
				free[type1][3] += free[type1][2];
				for (let x=0; x<locked[type2][2];x++) Solution.push (`Free L3 + Locked L3 ${type2}`)
				free[type2][3] += locked[type2][2];
				for (let x=0; x<free[type2][2];x++) Solution.push (`Free L3 + Free L3 ${type2}`)
				free[type2][3] += free[type2][2];
				for (let x=0; x<free["full"][2];x++) Solution.push (`Free L3 + Free L3 full`)
				free["full"][3] += free["full"][2];
				
				free.none[2] -= locked[type1][2]+locked[type2][2]+free[type1][2]+free[type2][2]+free["full"][2];
				locked[type1][2] = 0;
				free[type1][2] = 0;
				locked[type2][2] = 0;
				free[type2][2] = 0;
				free["full"][2] = 0;
				
			} else if (free.none[2] > 0 && locked[type1][2] > 0 && (locked[type2][3]+free[type2][3]-occupied2_4) > 0 && (total1_4<=total2_4 || locked[type2][2]==0)) {
				free.none[2] -= 1
				locked[type1][2] -= 1
				free[type1][3] += 1
				Solution.push (`Free L3 + Locked L3 ${type1} `)
				total1_4 +=1;
				occupied1_4 +=1;
				occupied2_4 +=1;
			} else if (free.none[2] > 0 &&  locked[type2][2] > 0 && (locked[type1][3]+free[type1][3]-occupied1_4) > 0) {
				free.none[2] -= 1
				locked[type2][2] -= 1
				free[type2][3] += 1
				Solution.push (`Free L3 + Locked L3 ${type2}`)
				total2_4 +=1;
				occupied1_4 +=1;
				occupied2_4 +=1;
			} else if (free.none[2] > 1 && (locked[type1][2] + free[type1][2] > 0) && (locked[type2][2] + free[type2][2] > 0) && (locked[type1][3] + free[type1][3] - occupied1_4 > 0) && (locked[type2][3] + free[type2][3] - occupied2_4 > 0)) {
				//console.log("L3 double used")
				if (locked[type1][2] > 0) {
					free.none[2] -= 1
					locked[type1][2] -= 1
					free[type1][3] += 1
					Solution.push (`Free L3 + Locked L3 ${type1}`)
				} else {
					free.none[2] -= 1
					free[type1][2] -= 1
					free[type1][3] += 1
					Solution.push (`Free L3 + Free L3 ${type1} `)
				}
				if (locked[type2][2] > 0) {
					free.none[2] -= 1
					locked[type2][2] -= 1
					free[type2][3] += 1
					Solution.push (`Free L3 + Locked L3 ${type2}`)
				} else {
					free.none[2] -= 1
					free[type2][2] -= 1
					free[type2][3] += 1
					Solution.push (`Free L3 + Free L3 ${type2}`)
				}
				occupied1_4 += 2;
				occupied2_4 += 2;
				
			} else if (free[type1][2] > 0 && locked[type2][2] > 0) {
				free[type1][2] -= 1
				locked[type2][2] -= 1
				free.full[3] += 1
				Solution.push (`Free L3 ${type1} + Locked L3 ${type2}`)
			} else if ( free[type2][2] > 0 && locked[type1][2] > 0) {
				free[type2][2] -= 1
				locked[type1][2] -= 1
				free.full[3] += 1
				Solution.push (`Free L3 ${type2} + Locked L3 ${type1}`)
			} else if ( free[type2][2] > 0 && free[type1][2] > 0) {
				free[type2][2] -= 1
				free[type1][2] -= 1
				free.full[3] += 1
				Solution.push (`Free L3 ${type2} + Free L3 ${type1}`)
			} else if ( free.none[2] > 0 && locked[type1][2] > 0 && (locked[type2][3] + free[type2][3] - occupied2_4) > 0) {
				free.none[2] -= 1
				locked[type1][2] -= 1
				locked[type1][3] += 1
				occupied1_4 +=1
				occupied2_4 += 1
				Solution.push (`Free L3 + Locked L3 ${type1}`)
				
			} else if ( free.none[2] > 0 && locked[type2][2] > 0 && (locked[type1][3] + free[type1][3] - occupied1_4) > 0) {
				free.none[2] -= 1
				locked[type2][2] -= 1
				locked[type2][3] += 1
				occupied1_4 +=1
				occupied2_4 += 1
				Solution.push (`Free L3 + Locked L3 ${type2}`)
				
			} else if (free.none[2] > 0 && free[type1][2] > 0 && (locked[type2][3] + free[type2][3] - occupied2_4) > 0) {
				free.none[2] -= 1
				free[type1][2] -= 1
				free[type1][3] += 1
				occupied1_4 +=1
				occupied2_4 += 1
				Solution.push (`Free L3 + Free L3 ${type1} `)
				
			} else if (free.none[2] > 0 &&  free[type2][2] > 0 && (locked[type1][3] + free[type1][3] - occupied1_4) > 0) {
				free.none[2] -= 1
				free[type2][2] -= 1
				free[type2][3] += 1
				occupied1_4 += 1
				occupied2_4 += 1
				Solution.push (`Free L3 + Free L3 ${type2}`)

			} else if (free[type1][2] >0 && locked[type1][2]>0 && (locked[type2][3] + free[type2][3] - occupied2_4) > 0) {
				free[type1][2] -= 1
				locked[type1][2] -= 1
				free[type1][3] += 1
				occupied1_4 += 1
				occupied2_4 += 1
				Solution.push (`Free L3 ${type1} + Locked L3 ${type1}`)
			
			} else if (free[type2][2] >0 && locked[type2][2]>0 && (locked[type1][3] + free[type1][3] - occupied1_4)>0) {
				free[type2][2] -= 1
				locked[type2][2] -= 1
				free[type2][3] += 1
				occupied1_4 += 1
				occupied2_4 += 1
				Solution.push (`Free L3 ${type2} + Locked L3 ${type2}`)
			
			} else if ((free.none[2]+locked[type1][2]+locked[type2][2] - free.full[2] > 1) && free.none[2]>1 && locked[type2][2]>0 && locked[type1][2]>0) {
				free.none[2] -= 2
				locked[type2][2] -= 1
				locked[type1][2] -= 1
				free[type2][3] += 1
				free[type1][3] += 1
				occupied1_4 += 1
				occupied2_4 += 1
				Solution.push (`Free L3 + Locked L3 ${type2}`)
				Solution.push (`Free L3 + Locked L3 ${type1}`)
			
			} else if (free.full[2] > 0 && ((free.none[2] + free[type2][2] + free[type1][2] + locked[type2][2] + locked[type1][2]) > 0 || free.full[2] >= 2)) {
				if (locked[type2][2] > 0) {
					free.full[2] -= 1
					locked[type2][2] -= 1
					free.full[3] += 1
					Solution.push (`Free L3 Full + Locked L3 ${type2}`)
				} else if ( locked[type1][2] > 0) {
					free.full[2] -= 1
					locked[type1][2] -= 1
					free.full[3] += 1
					Solution.push (`Free L3 Full + Locked L3 ${type1}`)
				} else if ( free.none[2] > 0) {
					free.full[2] -= 1
					free.none[2] -= 1
					free.full[3] += 1
					Solution.push ("Free L3 Full + Free L3")
				} else if ( free[type1][2] > 0) {
					free.full[2] -= 1
					free[type1][2] -= 1
					free.full[3] += 1
					Solution.push (`Free L3 Full + Free L3 ${type1}`)
				} else if ( free[type2][2] > 0) {
					free.full[2] -= 1
					free[type2][2] -= 1
					free.full[3] += 1
					Solution.push (`Free L3 Full + Free L3 ${type2}`)
				} else {
					free.full[2] -= 2
					free.full[3] += 1
					Solution.push ("Free L3 Full + Free L3 Full")
				}
			} else if ( free.none[2] > 0 && (locked[type1][2] + locked[type2][2]) > 0) {
				pick = null
				if (total2_4 == total1_4) {
					if (total2_ > total1_) {
						if (locked[type1][2] > 0)
							pick = type1
						else
							pick = type2
					} else {
						if (locked[type2][2] > 0)
							pick = type2
						else
							pick = type1
					}
				} else if ( total2_4 > total1_4) {
					if (locked[type1][2] > 0)
						pick = type1
					else
						pick = type2
				} else {
					if (locked[type2][2] > 0)
						pick = type2
					else
						pick = type1
				}
				if (pick == type1) {
					free.none[2] -= 1
					free[type1][3] += 1
					locked[type1][2] -= 1
					total1_4 += 1
					Solution.push (`Free L3 + Locked L3 ${type1}`)
				} else {
					free.none[2] -= 1
					free[type2][3] += 1
					locked[type2][2] -= 1
					total2_4 += 1
					Solution.push (`Free L3 + Locked L3 ${type2}`)
				}
			} else if ( free[type1][2] > 0 && locked[type1][2] > 0) {
				free[type1][2] -= 1
				locked[type1][2] -= 1
				free[type1][3] += 1
				Solution.push (`Free L3 ${type1} + Locked L3 ${type1}`)       ///////////////////warum????
			} else if ( free[type2][2] > 0 && locked[type2][2] > 0) {
				free[type2][2] -= 1
				locked[type2][2] -= 1
				free[type2][3] += 1
				Solution.push (`Free L3 ${type2} + Locked L3 ${type2}`)
			} else if ( free[type2][2] > 0 && free.none[2] > 0) {
				free[type2][2] -= 1
				free.none[2] -= 1
				free[type2][3] += 1
				Solution.push (`Free L3 + Free L3 ${type2}`)
			} else if ( free[type1][2] > 0 && free.none[2] > 0) {
				free[type1][2] -= 1
				free.none[2] -= 1
				free[type1][3] += 1
				Solution.push (`Free L3 + Free L3 ${type1}`)
			} else if ( free.none[2] >= 2) {
				free.none[2] -= 2
				free.none[3] += 1
				Solution.push ("Free L3 + Free L3")
			} else if ( free[type1][2] >= 2) {
				free[type1][2] -= 2
				free[type1][3] += 1
				Solution.push (`Free L3 ${type1} + Free L3 ${type1}`)
			} else if ( free[type2][2] >= 2) {
				free[type2][2] -= 2
				free[type2][3] += 1
				Solution.push (`Free L3 ${type2} + Free L3 ${type2}`)
			} else break
		}            
		//Solution.push ("==Level 4 Merges==")
		total2_4 = locked[type2][3]
		total1_4 = locked[type1][3]
		while (true) {
			if (free[type1][3] > 0 && locked[type2][3] > 0) {
				free[type1][3] -= 1
				free.full[3] += 1
				locked[type2][3] -= 1
				Solution.push (`Free L4 ${type1} + Locked L4 ${type2}`)
			} else if ( free[type2][3] > 0 && locked[type1][3] > 0) {
				free[type2][3] -= 1
				free.full[3] += 1
				locked[type1][3] -= 1
				Solution.push (`Free L4 ${type2} + Locked L4 ${type1}`)
			} else if ( free[type2][3] > 0 && free[type1][3] > 0) {
				free[type2][3] -= 1
				free[type1][3] -= 1
				free.full[3] += 1
				Solution.push (`Free L4 ${type2} + Free L4 ${type1}`)
			} else if ( free.none[3] > 0 && (locked[type1][3] + locked[type2][3]) > 0) {
				pick = null
				if (total2_4 == total1_4) {
					if (total2_ > total1_) {
						if (locked[type1][3] > 0) 
							pick = type1
						else
							pick = type2
					} else {
						if (locked[type2][3] > 0)
							pick = type2
						else
							pick = type1
					}
				} else if ( total2_4 > total1_4) {
					if (locked[type1][3] > 0) 
						pick = type1
					else
						pick = type2
				} else {
					if (locked[type2][3] > 0)
						pick = type2
					else
						pick = type1
				}   
				if (pick == type1) {
					free.none[3] -= 1
					free[type1][3] += 1
					locked[type1][3] -= 1
					total1_4 -= 1
					Solution.push (`Free L4 + Locked L4 ${type1}`)
				} else {
					free.none[3] -= 1
					free[type2][3] += 1
					locked[type2][3] -= 1
					total2_4 -= 1
					Solution.push (`Free L4 + Locked L4 ${type2}`)
				}
			} else if (free.full[3] > 0 && (locked[type2][3] + locked[type1][3]) > 0) {
				if (locked[type2][3] > 0) {
					free.full[3] -= 1
					locked[type2][3] -= 1
					free.full[3] += 1
					Solution.push (`Free L4 Full + Locked L4 ${type2}`)
				} else if (locked[type1][3] > 0) {
					free.full[3] -= 1
					locked[type1][3] -= 1
					free.full[3] += 1
					Solution.push (`Free L4 Full + Locked L4 ${type1}`)
				}
			} else break
		}
		//Solution.push ("==Results==")
		let endProgress = 0;
		//Progress:
		for (let t of [type1,type2]) {
			for (let l of [1,2,3,4]) {
				endProgress += locked[t][l-1]*mergerGame.levelValues[l]
			}
		}
		//Progress:
		let keys = 0
		for (let l of [3,4]) {
			keys += free["full"][l-1]*mergerGame.keyValues[l]
		}
			
		return {keys:keys, progress:startProgress-endProgress,locked:lockedO, free:freeO,solution:Solution}
	},
	debugginfo:(x)=>{
		let out=[`Original (color ${x.color}):`];
		//out.push(`freeBot = ${JSON.stringify(x.solved[x.color].free[type2])}`)
		//out.push(`freeTop = ${JSON.stringify(x.solved[x.color].free[type1])}`)
		//out.push(`freeFull = ${JSON.stringify(x.solved[x.color].free.full)}`)
		//out.push(`free = ${JSON.stringify(x.solved[x.color].free.none)}`)
		//out.push(`lockedB = ${JSON.stringify(x.solved[x.color].locked[type2])}`)
		//out.push(`lockedT = ${JSON.stringify(x.solved[x.color].locked[type1])}`)
		//out.push(``);
		out.push(`modified by level ${x.level}):`);
		//out.push(`freeBot = ${JSON.stringify(x.free[type2])}`)
		//out.push(`freeTop = ${JSON.stringify(x.free[type1])}`)
		//out.push(`freeFull = ${JSON.stringify(x.free.full)}`)
		//out.push(`free = ${JSON.stringify(x.free.none)}`)
		//out.push(`lockedB = ${JSON.stringify(x.solved[x.color].locked[type2])}`)
		//out.push(`lockedT = ${JSON.stringify(x.solved[x.color].locked[type1])}`)
		out.push(`mergerGame.cells = ${JSON.stringify(mergerGame.cells)}`)
		out.push(`mergerGame.updateTable()`)
		out.push(`mergerGame.ShowDialog()`)
		return out.join('\n')
	},
	solver2:(locked,free, color)=>{
		let lockedO = window.structuredClone(locked),
			freeO = window.structuredClone(free),
			type1 = mergerGame.types[0],
			type2 = mergerGame.types[1],
			total1_ = locked[type1].reduce((a, b) => a + b, 0)+free[type1].reduce((a, b) => a + b, 0),
			total2_ = locked[type2].reduce((a, b) => a + b, 0)+free[type2].reduce((a, b) => a + b, 0),
			total1_2 = total1_ - locked[type1][0],
			total2_2 = total2_ - locked[type2][0],
			startProgress = 0,
			Solution=[];
		//Progress:
		for (let t of [type1,type2]) {
			for (let l of [1,2,3,4]) {
				startProgress += locked[t][l-1]*mergerGame.levelValues[l]
			}
		}
		
		Solution.push ({text:"%c=======Mooing cat's solver=======",css:"color:"+mergerGame.eventData[mergerGame.event].CSScolors[color]})
		Solution.push ("==Level 1 Merges==")
		while (true) {
			if (free.none[0] == 0) break;
			
			if (locked[type2][0] == 0 && locked[type1][0] == 0) {
				if (free.none[0] >= 2) {
					free.none[0] -= 2
					free.none[1] += 1
					Solution.push ("Free L1 + Free L1")
					continue;
				} else break;
			}
			let pick = null
			if (total2_2 == total1_2) {
				if (total2_ > total1_) {
					if (locked[type1][0] > 0)
						pick = type1
					else
						pick = type2
				} else {
					if (locked[type2][0] > 0)
						pick = type2
					else
						pick = type1
				}
			} else if (total2_2 > total1_2) {
				if (locked[type1][0] > 0)
					pick = type1
				else
					pick = type2
			} else {
				if (locked[type2][0] > 0)
					pick = type2
				else
					pick = type1
			}        
			if (pick == type1) {
				free.none[0] -= 1
				free[type1][1] += 1
				locked[type1][0] -= 1
				total1_2 += 1
				Solution.push (`Free L1 + Locked L1 ${type1}`)
			} else {
				free.none[0] -= 1
				free[type2][1] += 1
				locked[type2][0] -= 1
				total2_2 += 1
				Solution.push (`Free L1 + Locked L1 ${type2}`)
			}
		}
		let total2_3 = locked[type2][2] + locked[type2][3];
		let total1_3 = locked[type1][2] + locked[type1][3];
		Solution.push ("==Level 2 Merges==")
		while (true) {
			
			
			if (free.none[1] > 1 && (locked[type1][1] + free[type1][1] > 0) && (locked[type2][1] + free[type2][1] > 0) && (locked[type1][2] + free[type1][2] > 0) && (locked[type2][2] + free[type2][2] > 0)) {
				if (locked[type1][1] > 0) {
					free.none[1] -= 1
					locked[type1][1] -= 1
					free[type1][2] += 1
					Solution.push (`Free L2 + Locked L2 ${type1}`)
				} else {
					free.none[1] -= 1
					free[type1][1] -= 1
					free[type1][2] += 1
					Solution.push (`Free L2 + Free L2 ${type1}`)
				}
				if (locked[type2][1] > 0) {
					free.none[1] -= 1
					locked[type2][1] -= 1
					free[type2][2] += 1
					Solution.push (`Free L2 + Locked L2 ${type2}`)
				} else {
					free.none[1] -= 1
					free[type2][1] -= 1
					free[type2][2] += 1
					Solution.push (`Free L2 + Free L2 ${type2}`)
				}
			} else if (free[type1][1] > 0 && locked[type2][1] > 0) {
				free[type1][1] -= 1
				free.full[2] += 1
				locked[type2][1] -= 1
				Solution.push (`Free L2 ${type1} + Locked L2 ${type2}`)
			} else if (free[type2][1] > 0 && locked[type1][1] > 0) {
				free[type2][1] -= 1
				free.full[2] += 1
				locked[type1][1] -= 1
				Solution.push (`Free L2 ${type2} + Locked L2 ${type1}`)
			} else if (free[type2][1] > 0 && free[type1][1] > 0) {
				free[type2][1] -= 1
				free[type1][1] -= 1
				free.full[2] += 1
				Solution.push (`Free L2 ${type2} + Free L2 ${type1}`)
			} else if (free.none[1] > 0 && (locked[type1][1] + locked[type2][1]) > 0) {
				let pick = null
				if (total2_3 == total1_3) {
					if (total2_ > total1_) {
						if (locked[type1][1] > 0)
							pick = type1
						else
							pick = type2
					} else {
						if (locked[type2][1] > 0)
							pick = type2
						else
							pick = type1
					}
				} else if (total2_3 > total1_3) {
					if (locked[type1][1] > 0)
						pick = type1
					else
						pick = type2
				} else {
					if (locked[type2][1] > 0)
						pick = type2
					else
						pick = type1
				}
				if (pick == type1) {
					free.none[1] -= 1
					free[type1][2] += 1
					locked[type1][1] -= 1
					total1_3 += 1
					Solution.push (`Free L2 + Locked L2 ${type1}`)
				} else {
					free.none[1] -= 1
					free[type2][2] += 1
					locked[type2][1] -= 1
					total2_3 += 1
					Solution.push (`Free L2 + Locked L2 ${type2}`)
				}
			} else if (free[type1][1] > 0 && locked[type1][1] > 0) {
				free[type1][1] -= 1
				locked[type1][1] -= 1
				free[type1][2] += 1
				Solution.push (`Free L2 ${type1} + Locked L2 ${type1}`)
			} else if (free[type2][1] > 0 && locked[type2][1] > 0) {
				free[type2][1] -= 1
				locked[type2][1] -= 1
				free[type2][2] += 1
				Solution.push (`Free L2 ${type2} + Locked L2 ${type2}`)
			} else if (free[type2][1] > 0 && free.none[1] > 0) {
				free[type2][1] -= 1
				free.none[1] -= 1
				free[type2][2] += 1
				Solution.push (`Free L2 + Free L2 ${type2}`)
			} else if (free[type1][1] > 0 && free.none[1] > 0) {
				free[type1][1] -= 1
				free.none[1] -= 1
				free[type1][2] += 1
				Solution.push (`Free L2 + Free L2 ${type1}`)
			} else if (free.none[1] >= 2) {
				free.none[1] -= 2
				free.none[2] += 1
				Solution.push ("Free L2 + Free L2")
			} else if (free[type1][1] >= 2) {
				free[type1][1] -= 2
				free[type1][2] += 1
				Solution.push (`Free L2 ${type1} + Free L2 ${type1}`)
			} else if (free[type2][1] >= 2) {
				free[type2][1] -= 2
				free[type2][2] += 1
				Solution.push (`Free L2 ${type2} + Free L2 ${type2}`)
			} else break
		}      
		Solution.push ("==Level 3 Merges==")
		let total2_4 = locked[type2][3]
		let total1_4 = locked[type1][3]
		while (true) {
			
			let numtopTrios = Math.min(free.none[3],locked[type1][3],locked[type2][3])
			if (free.none[2] > 1 && (locked[type1][2] + free[type1][2] > 0) && (locked[type2][2] + free[type2][2] > 0) && (locked[type1][3] - numtopTrios + free[type1][3] > 0) && (locked[type2][3] - numtopTrios + free[type2][3] > 0)) {
				if (locked[type1][2] > 0) {
					free.none[2] -= 1
					locked[type1][2] -= 1
					free[type1][3] += 1
					Solution.push (`Free L3 + Locked L3 ${type1}`)
				} else {
					free.none[2] -= 1
					free[type1][2] -= 1
					free[type1][3] += 1
					Solution.push (`Free L3 + Free L3 ${type1} `)
				}
				if (locked[type2][2] > 0) {
					free.none[2] -= 1
					locked[type2][2] -= 1
					free[type2][3] += 1
					Solution.push (`Free L3 + Locked L3 ${type2}`)
				} else {
					free.none[2] -= 1
					free[type2][2] -= 1
					free[type2][3] += 1
					Solution.push (`Free L3 + Free L3 ${type2}`)
				}
			} else if (free[type1][2] > 0 && locked[type2][2] > 0) {
				free[type1][2] -= 1
				free.full[3] += 1
				locked[type2][2] -= 1
				Solution.push (`Free L3 ${type1} + Locked L3 ${type2}`)
			} else if ( free[type2][2] > 0 && locked[type1][2] > 0) {
				free[type2][2] -= 1
				free.full[3] += 1
				locked[type1][2] -= 1
				Solution.push (`Free L3 ${type2} + Locked L3 ${type1}`)
			} else if ( free[type2][2] > 0 && free[type1][2] > 0) {
				free[type2][2] -= 1
				free[type1][2] -= 1
				free.full[3] += 1
				Solution.push (`Free L3 ${type2} + Free L3 ${type1}`)
			} else if ( free.none[2] > 0 && locked[type1][2] > 0 && (locked[type2][3] - numtopTrios) > free[type1][3]) {
				free.none[2] -= 1
				locked[type1][2] -= 1
				free[type1][3] += 1
				Solution.push (`Free L3 + Locked L3 ${type1}`)
			} else if ( free.none[2] > 0 && locked[type2][2] > 0 && (locked[type1][3] - numtopTrios) > free[type2][3]) {
				free.none[2] -= 1
				locked[type2][2] -= 1
				free[type2][3] += 1
				Solution.push (`Free L3 + Locked L3 ${type2}`)
			} else if ( free.full[2] > 0 && ((free.none[2] + free[type2][2] + free[type1][2] + locked[type2][2] + locked[type1][2]) > 0 || free.full[2] >= 2)) {
				if (locked[type2][2] > 0) {
					free.full[2] -= 1
					locked[type2][2] -= 1
					free.full[3] += 1
					Solution.push (`Free L3 Full + Locked L3 ${type2}`)
				} else if ( locked[type1][2] > 0) {
					free.full[2] -= 1
					locked[type1][2] -= 1
					free.full[3] += 1
					Solution.push (`Free L3 Full + Locked L3 ${type1}`)
				} else if ( free.none[2] > 0) {
					free.full[2] -= 1
					free.none[2] -= 1
					free.full[3] += 1
					Solution.push ("Free L3 Full + Free L3")
				} else if ( free[type1][2] > 0) {
					free.full[2] -= 1
					free[type1][2] -= 1
					free.full[3] += 1
					Solution.push (`Free L3 Full + Free L3 ${type1}`)
				} else if ( free[type2][2] > 0) {
					free.full[2] -= 1
					free[type2][2] -= 1
					free.full[3] += 1
					Solution.push (`Free L3 Full + Free L3 ${type2}`)
				} else {
					free.full[2] -= 2
					free.full[3] += 1
					Solution.push ("Free L3 Full + Free L3 Full")
				}
			} else if ( free.none[2] > 0 && (locked[type1][2] + locked[type2][2]) > 0) {
				pick = null
				if (total2_4 == total1_4) {
					if (total2_ > total1_) {
						if (locked[type1][2] > 0)
							pick = type1
						else
							pick = type2
					} else {
						if (locked[type2][2] > 0)
							pick = type2
						else
							pick = type1
					}
				} else if ( total2_4 > total1_4) {
					if (locked[type1][2] > 0)
						pick = type1
					else
						pick = type2
				} else {
					if (locked[type2][2] > 0)
						pick = type2
					else
						pick = type1
				}
				if (pick == type1) {
					free.none[2] -= 1
					free[type1][3] += 1
					locked[type1][2] -= 1
					total1_4 += 1
					Solution.push (`Free L3 + Locked L3 ${type1}`)
				} else {
					free.none[2] -= 1
					free[type2][3] += 1
					locked[type2][2] -= 1
					total2_4 += 1
					Solution.push (`Free L3 + Locked L3 ${type2}`)
				}
			} else if ( free[type1][2] > 0 && locked[type1][2] > 0) {
				free[type1][2] -= 1
				locked[type1][2] -= 1
				free[type1][3] += 1
				Solution.push (`Free L3 ${type1} + Locked L3 ${type1}`)
			} else if ( free[type2][2] > 0 && locked[type2][2] > 0) {
				free[type2][2] -= 1
				locked[type2][2] -= 1
				free[type2][3] += 1
				Solution.push (`Free L3 ${type2} + Locked L3 ${type2}`)
			} else if ( free[type2][2] > 0 && free.none[2] > 0) {
				free[type2][2] -= 1
				free.none[2] -= 1
				free[type2][3] += 1
				Solution.push (`Free L3 + Free L3 ${type2}`)
			} else if ( free[type1][2] > 0 && free.none[2] > 0) {
				free[type1][2] -= 1
				free.none[2] -= 1
				free[type1][3] += 1
				Solution.push (`Free L3 + Free L3 ${type1}`)
			} else if ( free.none[2] >= 2) {
				free.none[2] -= 2
				free.none[3] += 1
				Solution.push ("Free L3 + Free L3")
			} else if ( free[type1][2] >= 2) {
				free[type1][2] -= 2
				free[type1][3] += 1
				Solution.push (`Free L3 ${type1} + Free L3 ${type1}`)
			} else if ( free[type2][2] >= 2) {
				free[type2][2] -= 2
				free[type2][3] += 1
				Solution.push (`Free L3 ${type2} + Free L3 ${type2}`)
			} else break
		}            
		Solution.push ("==Level 4 Merges==")
		total2_4 = locked[type2][3]
		total1_4 = locked[type1][3]
		while (true) {
			if (free[type1][3] > 0 && locked[type2][3] > 0) {
				free[type1][3] -= 1
				free.full[3] += 1
				locked[type2][3] -= 1
				Solution.push (`Free L4 ${type1} + Locked L4 ${type2}`)
			} else if ( free[type2][3] > 0 && locked[type1][3] > 0) {
				free[type2][3] -= 1
				free.full[3] += 1
				locked[type1][3] -= 1
				Solution.push (`Free L4 ${type2} + Locked L4 ${type1}`)
			} else if ( free[type2][3] > 0 && free[type1][3] > 0) {
				free[type2][3] -= 1
				free[type1][3] -= 1
				free.full[3] += 1
				Solution.push (`Free L4 ${type2} + Free L4 ${type1}`)
			} else if ( free.none[3] > 0 && (locked[type1][3] + locked[type2][3]) > 0) {
				pick = null
				if (total2_4 == total1_4) {
					if (total2_ > total1_) {
						if (locked[type1][3] > 0) 
							pick = type1
						else
							pick = type2
					} else {
						if (locked[type2][3] > 0)
							pick = type2
						else
							pick = type1
					}
				} else if ( total2_4 > total1_4) {
					if (locked[type1][3] > 0) 
						pick = type1
					else
						pick = type2
				} else {
					if (locked[type2][3] > 0)
						pick = type2
					else
						pick = type1
				}   
				if (pick == type1) {
					free.none[3] -= 1
					free[type1][3] += 1
					locked[type1][3] -= 1
					total1_4 -= 1
					Solution.push (`Free L4 + Locked L4 ${type1}`)
				} else {
					free.none[3] -= 1
					free[type2][3] += 1
					locked[type2][3] -= 1
					total2_4 -= 1
					Solution.push (`Free L4 + Locked L4 ${type2}`)
				}
			} else if (free.full[3] > 0 && (locked[type2][3] + locked[type1][3]) > 0) {
				if (locked[type2][3] > 0) {
					free.full[3] -= 1
					locked[type2][3] -= 1
					free.full[3] += 1
					Solution.push (`Free L4 Full + Locked L4 ${type2}`)
				} else if (locked[type1][3] > 0) {
					free.full[3] -= 1
					locked[type1][3] -= 1
					free.full[3] += 1
					Solution.push (`Free L4 Full + Locked L4 ${type1}`)
				}
			} else break
		}
		//Solution.push ("==Results==")
		let endProgress = 0;
		//Progress:
		for (let t of [type1,type2]) {
			for (let l of [1,2,3,4]) {
				endProgress += locked[t][l-1]*mergerGame.levelValues[l]
			}
		}
		//Progress:
		let keys = 0
		for (let l of [3,4]) {
			keys += free["full"][l-1]*mergerGame.keyValues[l]
		}
			
		return {keys:keys, progress:startProgress-endProgress,locked:lockedO, free:freeO,solution:Solution}
	},
		}
