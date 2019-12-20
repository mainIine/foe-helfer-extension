/*
 * **************************************************************************************
 *
 * Dateiname:                 guildfights.js
 * Projekt:                   foe-chrome
 *
 * erstellt von:              Daniel Siekiera <daniel.siekiera@gmail.com>
 * erstellt am:	              20.12.19, 13:19 Uhr
 * zuletzt bearbeitet:       20.12.19, 13:17 Uhr
 *
 * Copyright © 2019
 *
 * **************************************************************************************
 */

let GildFights = {

	PrevAction: null,
	NewAction: null,
	MapData: null,
	Colors : {
		red: 'rgb(159,6,2)',
		green: 'rgb(78,175,18)',
		yellow: 'rgb(239,210,89)',
		teal: 'rgb(21,223,223)',
		orange: 'rgb(208,136,0)',
		blue: 'rgb(181,180,180)',
		purple: 'rgb(133,24,196)',
		pink: 'rgb(199,51,196)'
	},

	ProvinceNames : {
		2 : 'C1: Niali Diath'
	},

	InjectionLoaded: false,

	init: ()=> {

		if(GildFights.InjectionLoaded === false){
			WebSocket.prototype._send = WebSocket.prototype.send;

			WebSocket.prototype.send = function (data) {

				this._send(data);

				this.addEventListener('message', function(msg) {
					if(msg.data !== 'PONG' && $('#LiveGildFighting').length > 0){
						let d = JSON.parse(msg.data)[0];

						if(d['requestClass'] === 'GuildBattlegroundService' && d['responseData'][0] !== undefined){
							console.log('msg', d['responseData'][0]);
							GildFights.RefreshTable(d['responseData'][0]);
						}
					}

				}, false);

				this.send = function (data) {
					this._send(data);
				};
			};

			GildFights.InjectionLoaded = true;
		}
	},


	ShowBox: ()=> {
		// Wenn die Box noch nicht da ist, neu erzeugen und in den DOM packen
		if( $('#LiveGildFighting').length === 0 ){

			HTML.Box({
				id: 'LiveGildFighting',
				title: 'Live Gefechte',
				auto_close: true,
				dragdrop: true,
				resize: true,
				minimize: true
			});
		}

		GildFights.BuildContent();
	},


	BuildContent: () => {
		let t = [],
			mP = GildFights.MapData['map']['provinces'],
			bP = GildFights.MapData['battlegroundParticipants'],
			cnt = 0;

		t.push('<table class="foe-table">');

		t.push('<thead>');

		t.push('<th>&nbsp;</th>');

		for(let x in bP)
		{
			if(!bP.hasOwnProperty(x)){
				break;
			}

			t.push('<th>' + bP[x]['clan']['name'] + '<span class="head-color" style="background-color:' + GildFights.Colors[bP[x]['colour']] + '"></span></th>');
		}



		t.push('</thead>');

		t.push('<tbody>');

		for(let i in mP)
		{
			if(!mP.hasOwnProperty(i)){
				break;
			}

			t.push('<tr data-id="' + cnt + '">');

			t.push('<td>');
			t.push(cnt);
			t.push('</td>');

			for(let x = 0; x < bP.length; x++)
			{
				if(mP[i]['ownerId'] !== undefined && bP[x]['participantId'] === mP[i]['ownerId']){

					let bonus = mP[i]['victoryPointsBonus'] !== undefined ? ' <small class="text-success">+' + mP[i]['victoryPointsBonus'] + '</small>' : '';

					t.push('<td data-field="' + cnt + '-' + mP[i]['ownerId'] + '" class="text-center">');
					t.push('Sp: ' + mP[i]['victoryPoints'] + bonus);

					if(mP[i]['conquestProgress'].length > 0){
						let cP = mP[i]['conquestProgress'];

						for(let y in cP)
						{
							if(!cP.hasOwnProperty(y)){
								break;
							}

							let p = GildFights.MapData['battlegroundParticipants'].find(o => (o['participantId'] === cP[y]['participantId']));
							t.push('<span class="attack attacker-' + cP[y]['participantId'] + '"><span style="background-color:'+ GildFights.Colors[p['colour']] +';width:' + cP[y]['progress'] + '%"></span></span>');
						}

					}

					t.push('</td>');

				} else {
					t.push('<td class="">');
					t.push('&nbsp;');
					t.push('</td>');
				}
			}

			t.push('</tr>');

			cnt++;
		}

		t.push('</tbody>');

		t.push('<table>');

		$('#LiveGildFightingBody').html( t.join('') );
	},


	RefreshTable: (data)=> {

		// Provinz wurde übernommen
		if(data['conquestProgress'].length === 0)
		{

			$('[data-id="' + data['id'] + '"]').each(function(){
				$(this).html('');
			});

			$('[data-field="' + data['id'] + '-' + data['ownerId'] + '"]').text('Sp: ' + data['victoryPoints']);

			return;
		}

		// Es wird gerade gekämpft
		for(let i in data['conquestProgress'])
		{
			if(!data['conquestProgress'].hasOwnProperty(i)){
				break;
			}

			let d = data['conquestProgress'][i],
				cell = $('[data-field="' + data['id'] + '-' + data['ownerId'] + '"]'),
				p = GildFights.MapData['battlegroundParticipants'].find(o => (o['participantId'] === d['participantId']));

			// Angreifer gibt es schon
			if( cell.find('.attacker-' + d['participantId']).length > 0 ){
				// nur die Prozente updaten
				cell.find('.attacker-' + d['participantId']).children().css({'width': d['progress'] + '%'});
			}
			// neuen "Balken" einfügen
			else {
				cell.append($('<span class="attack attacker-' + d['participantId'] + '"><span style="background-color:'+ GildFights.Colors[p['colour']] +';width:' + d['progress'] + '%"></span></span>'));
			}

			cell.addClass('red-pulse');

			// nach 1s die Klasse wieder entfernen
			setTimeout(() =>  {
				cell.removeClass('red-pulse');
			}, 1000);
		}
	}
};
