/*
 * **************************************************************************************
 *
 * Dateiname:                 ws-chat.js
 * Projekt:                   foe
 *
 * erstellt von:              Daniel Siekiera <daniel.siekiera@gmail.com>
 * erstellt am:	              22.04.19 21:27 Uhr
 *
 * Copyright © 2019
 *
 * **************************************************************************************
 *
 * wss://connect.websocket.in/YOUR_CHANNEL_ID?room_id=YOUR_ROOM_ID
 */

Chat = {

	GildID: 0,
	PlayerID: 0,
	OtherPlayers: [],
	WebsocketChat : '',

	/**
	 * Holt die Daten mit einem kurzen Delay
	 */
	getData: ()=> {

		let getting = chrome.extension.getBackgroundPage(),
			data = getting.getDataForChat();

		setTimeout(function(){

			if(data === undefined){
				return ;
			}

			// Spieler Daten fehlen. Ohne die ist der Chat aber nutzlos...
			if(data['OtherPlayers'] === undefined){
				alert('Es fehlen die Spieler Daten. Wechsel zum Gilden Tab und lade Das Game neu.');
				window.close();
			}

			Chat.GildID = data['current_guild_id'];
			Chat.PlayerID = data['current_player_id'];
			Chat.OtherPlayers = JSON.parse(data['OtherPlayers']);

			// alles da, zünden
			Chat.init();

		}, 400);
	},


	/**
	 * Zündet die Chatbox und stellt eine Verbindung mit dem WebSocket Server her
	 */
	init: ()=> {

		let div = $('<div class="message_box" id="message_box"></div><div class="chat-panel"><input id="message-input" autocomplete="off" spellcheck="false" aria-autocomplete="none"><button id="send-btn">Senden</button></div>');

		$('#ChatBody').append(div);


		setTimeout(
			function(){
				Chat.Functions();
			}, 100
		);

		let wsUri = 'wss://connect.websocket.in/foe-gild-' + Chat.GildID + '?room_id=1';

		console.log('wsUri: ', wsUri);

		Chat.WebsocketChat = new WebSocket(wsUri);


		// Verbindung wurde hergestellt
		Chat.WebsocketChat.onopen = ()=> {
			Chat.SystemRow('Verbunden!', 'success');

			setTimeout(
				function(){
					Chat.SendMsg('onlyOthers', 'entered');
				}, 500
			);
		};


		// jemand anderes hat etwas geschrieben
		Chat.WebsocketChat.onmessage = function(ev) {
			let msg = JSON.parse(ev.data);

			Chat.TextRow(msg.id, msg.message, msg.time, msg.type);
		};


		// Error, da geht was nicht
		Chat.WebsocketChat.onerror	= function(ev){
			Chat.SystemRow('Es ist ein Fehler aufgetreten - ' + ev.data, 'error');
		};


		// User hat das [X] geklickt
		Chat.WebsocketChat.onclose 	= function(){
			Chat.SystemRow('Verbindung geschlossen', 'error');
		};
	},


	/**
	 * Bindet die Funktionen der Buttons an Events
	 *
	 * @constructor
	 */
	Functions: ()=> {

		// User benutzt [Enter] zum schreiben
		$('#message-input').on('keydown', function(e) {

			if (e.which == 13 || e.keyCode == 13) {
				e.preventDefault();

				Chat.SendMsg();
			}
		});

		$('#send-btn').click(function(){
			Chat.SendMsg()
		});

		Chat.EmoticonBar();

		// https://github.com/joypixels/emojify.js/blob/master/src/emojify.js
		emojify.setConfig({
			img_dir: '../vendor/emoyify/images/emoji'
		});

		window.onunload = ()=> {
			Chat.Close();
		}
	},


	/**
	 * Nachricht senden
	 *
	 * @constructor
	 */
	SendMsg: (type, SystemMsg)=> {
		let MyMsg = SystemMsg !== undefined ? SystemMsg : $('#message-input').val();

		if(MyMsg === ''){
			return;
		}

		$('.emoticon-bar').removeClass('show');

		let today = new Date(),
			//dd = today.getDate(),
			//mm = (today.getMonth()+1),
			//yyyy = today.getFullYear(),
			HH = today.getHours(),
			ii = today.getMinutes(),
			ss = today.getSeconds(),
			dateTime;

		//if(dd < 10) dd = '0' + dd;
		//if(mm < 10) mm = '0' + mm;
		if(HH < 10) HH = '0' + HH;
		if(ii < 10) ii = '0' + ii;
		if(ss < 10) ss = '0' + ss;

		// dateTime = HH + ':' + ii + ':' + ss + ' '+ dd + '.' + mm + '.' + yyyy;
		dateTime = HH + ':' + ii + ':' + ss;

		let msg = {
			message: MyMsg,
			id: Chat.PlayerID,
			time: dateTime,
			type: type
		};

		Chat.WebsocketChat.send(JSON.stringify(msg));

		if(type !== 'onlyOthers'){
			Chat.TextRow(Chat.PlayerID, MyMsg, dateTime, type);
		}

		$('#message-input').val('');
	},


	/**
	 * Setzt einen Nachrichtenzeile für die Chatbox zusammen
	 *
	 * @param id
	 * @param text
	 * @param time
	 * @constructor
	 */
	TextRow: (id, text, time, type)=> {
		let PlayerName = '',
			ExtClass = '',
			TextR = '';

		if(id === Chat.PlayerID) {
			PlayerName = '';
			ExtClass = 'user-self';
			TextR = emojify.replace(text);
			TextR = Chat.MakeImage(TextR);
			TextR = Chat.MakeURL(TextR);

		} else if(type === 'onlyOthers'){
			let Player = Chat.OtherPlayers.find(obj => {
				return obj.id === id;
			});

			if(text === 'entered'){
				TextR = '<em>' + Player['name'] + ' hat den Chat betreten</em>';

			} else if(text === 'leaved') {
				TextR = '<em>' + Player['name'] + ' ist gegangen</em>';
			}

			ExtClass = 'user-notification';
			PlayerName = '';

		} else {
			let Player = Chat.OtherPlayers.find(obj => {
				return obj.id === id;
			});

			PlayerName = Player['name'];
			ExtClass = 'user-other';
			TextR = Chat.MakeImage(text);
			TextR = emojify.replace(TextR);
			TextR = Chat.MakeURL(TextR);
		}

		if(document.hasFocus() === false){
			document.getElementById('notification-sound').play();
		}

		$('#message_box').append(
			'<div class="'+ExtClass+'">' +
				'<span class="user-message">' + TextR + '</span>' +
				'<div class="message-data">' +
					'<span class="user-name">' + PlayerName + '</span>' +
					'<span class="message-time">' + time + ' Uhr</span>' +
				'</div>' +
			'</div>'
		);

		$('#message_box').animate({
			scrollTop: $('#message_box').prop('scrollHeight')
		});
	},


	/**
	 * Ist der Text eine URL?
	 *
	 * @param text
	 * @returns {*}
	 * @constructor
	 */
	MakeURL: (text)=> {

		let regex = new RegExp('^(https?:\\/\\/)?'+ // protocol
			'((([a-z\\d]([a-z\\d-]*[a-z\\d])*)\\.)+[a-z]{2,}|'+ // domain name
			'((\\d{1,3}\\.){3}\\d{1,3}))'+ // OR ip (v4) address
			'(\\:\\d+)?(\\/[-a-z\\d%_.~+]*)*'+ // port and path
			'(\\?[;&a-z\\d%_.~+=-]*)?'+ // query string
			'(\\#[-a-z\\d_]*)?$','i'); // fragment locator

		if(regex.test(text)){
			return '<a href="'+ text +'" target="_blank">'+ ((text.length > 45) ? text.substring(0, 45) + '...' : text) +'</a>';

		} else {
			return text;
		}
	},


	/**
	 * Ist der Text eine Bild-URL
	 *
	 * @param text
	 * @returns {*}
	 * @constructor
	 */
	MakeImage: (text)=>{
		let expression = '^https?://(?:[a-z0-9\-]+\.)+[a-z]{2,6}(?:/[^/#?]+)+\.(?:jpg|gif|png)$',
			regex = new RegExp(expression);

		if(text.match(regex)){
			return '<a href="'+ text +'" target="_blank"><img src="'+ text +'" alt="" class="image-preview"></a>';
		} else {
			return text;
		}
	},


	/**
	 *	System Nachricht
	 *
	 * @param text
	 * @constructor
	 */
	SystemRow: (text, type)=>{
		$('#message_box').append(
			'<div class="system-message">' +
			'<span class="' + type + '">' + text + '</span>' +
			'</div>'
		);

		$('#message_box').animate({
			scrollTop: $('#message_box').prop('scrollHeight')
		});
	},


	/**
	 * Trennt die Verbindung
	 *
	 * @constructor
	 */
	Close: ()=> {
		Chat.SendMsg('onlyOthers', 'leaved');

		setTimeout(
			function(){
				Chat.WebsocketChat.close();
			}, 500
		);
	},


	/**
	 *
	 * @constructor
	 */
	EmoticonBar: ()=>{
		let icons = Chat.EmoticonBarIcons(),
			bar = $('<div />').addClass('emoticon-bar');

		for(let i in icons)
		{
			if(icons.hasOwnProperty(i)){
				bar.append(
					$('<img />').addClass('add-icon').attr('src', '../vendor/emoyify/images/emoji/'+ icons[i] +'.png').attr('alt', ':'+ icons[i] +':').attr('title', ':'+ icons[i] +':')
				);
			}
		}

		$('body').append(bar);

		let btn = $('<img />').attr('src', '../css/images/face.png').addClass('toggle-emoticon-bar');

		$('.chat-panel').append(btn);

		// Functions

		$('body').on('click', '.toggle-emoticon-bar', function()
		{
			if( $('.emoticon-bar').hasClass('show') ){
				$('.emoticon-bar').removeClass('show');

			} else {
				$('.emoticon-bar').addClass('show');
			}
		});


		$('body').on('click', '.add-icon', function()
		{
			let ico = $(this).attr('alt'),
				val = $('#message-input').val();

			$('#message-input').val( val + ' ' + ico);
		})
	},


	/**
	 * Icons für den Chat
	 *
	 * @returns {string[]}
	 * @constructor
	 */
	EmoticonBarIcons: ()=>{
		return 'angry,anguished,astonished,blush,bowtie,cold_sweat,disappointed_relieved,confounded,confused,cry,disappointed,dizzy_face,expressionless,flushed,fearful,frowning,grimacing,grin,grinning,heart_eyes,hushed,innocent,joy,kissing,laughing,mask,neutral_face,no_mouth,open_mouth,pensive,persevere,relaxed,relieved,satisfied,scream,sleeping,sleepy,smile,smiley,smirk,stuck_out_tongue,stuck_out_tongue_closed_eyes,stuck_out_tongue_winking_eye,sunglasses,sob,sweat,triumph,tired_face,unamused,wink,worried,yum,+1,-1,100,1234,8ball,a,ab,abc,abcd,accept,aerial_tramway,airplane,alarm_clock,alien,ambulance,anchor,angel,anger,ant,apple,aquarius,aries,arrow_backward,arrow_double_down,arrow_double_up,arrow_down,arrow_down_small,arrow_forward,arrow_heading_down,arrow_heading_up,arrow_left,arrow_lower_left,arrow_lower_right,arrow_right,arrow_right_hook,arrow_up,arrow_up_down,arrow_up_small,arrow_upper_left,arrow_upper_right,arrows_clockwise,arrows_counterclockwise,art,articulated_lorry,atm,b,baby,baby_bottle,baby_chick,baby_symbol,back,baggage_claim,balloon,ballot_box_with_check,bamboo,banana,bangbang,bank,bar_chart,barber,baseball,basketball,bath,bathtub,battery,bear,bee,beer,beers,beetle,beginner,bell,bento,bicyclist,bike,bikini,bird,birthday,black_circle,black_joker,black_medium_small_square,black_medium_square,black_nib,black_small_square,black_square,black_square_button,blossom,blowfish,blue_book,blue_car,blue_heart,boar,boat,bomb,book,bookmark,bookmark_tabs,books,boom,boot,bouquet,bow,bowling,boy,bread,bride_with_veil,bridge_at_night,briefcase,broken_heart,bug,bulb,bullettrain_front,bullettrain_side,bus,busstop,bust_in_silhouette,busts_in_silhouette,cactus,cake,calendar,calling,camel,camera,cancer,candy,capital_abcd,capricorn,car,card_index,carousel_horse,cat,cat2,cd,chart,chart_with_downwards_trend,chart_with_upwards_trend,checkered_flag,cherries,cherry_blossom,chestnut,chicken,children_crossing,chocolate_bar,christmas_tree,church,cinema,circus_tent,city_sunrise,city_sunset,cl,clap,clapper,clipboard,clock1,clock10,clock1030,clock11,clock1130,clock12,clock1230,clock130,clock2,clock230,clock3,clock330,clock4,clock430,clock5,clock530,clock6,clock630,clock7,clock730,clock8,clock830,clock9,clock930,closed_book,closed_lock_with_key,closed_umbrella,cloud,clubs,cn,cocktail,coffee,collision,computer,confetti_ball,congratulations,construction,construction_worker,convenience_store,cookie,cool,cop,copyright,corn,couple,couple_with_heart,couplekiss,cow,cow2,credit_card,crescent_moon,crocodile,crossed_flags,crown,crying_cat_face,crystal_ball,cupid,curly_loop,currency_exchange,curry,custard,customs,cyclone,dancer,dancers,dango,dart,dash,date,de,deciduous_tree,department_store,diamond_shape_with_a_dot_inside,diamonds,dizzy,do_not_litter,dog,dog2,dollar,dolls,dolphin,donut,door,doughnut,dragon,dragon_face,dress,dromedary_camel,droplet,dvd,e-mail,ear,ear_of_rice,earth_africa,earth_americas,earth_asia,egg,eggplant,eight,eight_pointed_black_star,eight_spoked_asterisk,electric_plug,elephant,email,end,envelope,es,euro,european_castle,european_post_office,evergreen_tree,exclamation,eyeglasses,eyes,facepunch,factory,fallen_leaf,family,fast_forward,fax,feelsgood,feet,ferris_wheel,file_folder,finnadie,fire,fire_engine,fireworks,first_quarter_moon,first_quarter_moon_with_face,fish,fish_cake,fishing_pole_and_fish,fist,five,flags,flashlight,floppy_disk,flower_playing_cards,foggy,football,fork_and_knife,fountain,four,four_leaf_clover,fr,free,fried_shrimp,fries,frog,fu,fuelpump,full_moon,full_moon_with_face,game_die,gb,gem,gemini,ghost,gift,gift_heart,girl,globe_with_meridians,goat,goberserk,godmode,golf,grapes,green_apple,green_book,green_heart,grey_exclamation,grey_question,guardsman,guitar,gun,haircut,hamburger,hammer,hamster,hand,handbag,hankey,hash,hatched_chick,hatching_chick,headphones,hear_no_evil,heart,heart_decoration,heart_eyes_cat,heartbeat,heartpulse,hearts,heavy_check_mark,heavy_division_sign,heavy_dollar_sign,heavy_exclamation_mark,heavy_minus_sign,heavy_multiplication_x,heavy_plus_sign,helicopter,herb,hibiscus,high_brightness,high_heel,hocho,honey_pot,honeybee,horse,horse_racing,hospital,hotel,hotsprings,hourglass,hourglass_flowing_sand,house,house_with_garden,hurtrealbad,ice_cream,icecream,id,ideograph_advantage,imp,inbox_tray,incoming_envelope,information_desk_person,information_source,interrobang,iphone,it,izakaya_lantern,jack_o_lantern,japan,japanese_castle,japanese_goblin,japanese_ogre,jeans,joy_cat,jp,key,keycap_ten,kimono,kiss,kissing_cat,kissing_face,kissing_heart,kissing_smiling_eyes,koala,koko,kr,large_blue_circle,large_blue_diamond,large_orange_diamond,last_quarter_moon,last_quarter_moon_with_face,leaves,ledger,left_luggage,left_right_arrow,leftwards_arrow_with_hook,lemon,leo,leopard,libra,light_rail,link,lips,lipstick,lock,lock_with_ink_pen,lollipop,loop,loudspeaker,love_hotel,love_letter,low_brightness,m,mag,mag_right,mahjong,mailbox,mailbox_closed,mailbox_with_mail,mailbox_with_no_mail,man,man_with_gua_pi_mao,man_with_turban,mans_shoe,maple_leaf,massage,meat_on_bone,mega,melon,memo,mens,metal,metro,microphone,microscope,milky_way,minibus,minidisc,mobile_phone_off,money_with_wings,moneybag,monkey,monkey_face,monorail,mortar_board,mount_fuji,mountain_bicyclist,mountain_cableway,mountain_railway,mouse,mouse2,movie_camera,moyai,muscle,mushroom,musical_keyboard,musical_note,musical_score,mute,nail_care,name_badge,neckbeard,necktie,negative_squared_cross_mark,new,new_moon,new_moon_with_face,newspaper,ng,nine,no_bell,no_bicycles,no_entry,no_entry_sign,no_good,no_mobile_phones,no_pedestrians,no_smoking,non-potable_water,nose,notebook,notebook_with_decorative_cover,notes,nut_and_bolt,o,o2,ocean,octocat,octopus,oden,office,ok,ok_hand,ok_woman,older_man,older_woman,on,oncoming_automobile,oncoming_bus,oncoming_police_car,oncoming_taxi,one,open_file_folder,open_hands,ophiuchus,orange_book,outbox_tray,ox,package,page_facing_up,page_with_curl,pager,palm_tree,panda_face,paperclip,parking,part_alternation_mark,partly_sunny,passport_control,paw_prints,peach,pear,pencil,pencil2,penguin,performing_arts,person_frowning,person_with_blond_hair,person_with_pouting_face,phone,pig,pig2,pig_nose,pill,pineapple,pisces,pizza,plus1,point_down,point_left,point_right,point_up,point_up_2,police_car,poodle,poop,post_office,postal_horn,postbox,potable_water,pouch,poultry_leg,pound,pouting_cat,pray,princess,punch,purple_heart,purse,pushpin,put_litter_in_its_place,question,rabbit,rabbit2,racehorse,radio,radio_button,rage,rage1,rage2,rage3,rage4,railway_car,rainbow,raised_hand,raised_hands,raising_hand,ram,ramen,rat,recycle,red_car,red_circle,registered,repeat,repeat_one,restroom,revolving_hearts,rewind,ribbon,rice,rice_ball,rice_cracker,rice_scene,ring,rocket,roller_coaster,rooster,rose,rotating_light,round_pushpin,rowboat,ru,rugby_football,runner,running,running_shirt_with_sash,sa,sagittarius,sailboat,sake,sandal,santa,satellite,saxophone,school,school_satchel,scissors,scorpius,scream_cat,scroll,seat,secret,see_no_evil,seedling,seven,shaved_ice,sheep,shell,ship,shipit,shirt,shit,shoe,shower,signal_strength,six,six_pointed_star,ski,skull,slot_machine,small_blue_diamond,small_orange_diamond,small_red_triangle,small_red_triangle_down,smile_cat,smiley_cat,smiling_imp,smirk_cat,smoking,snail,snake,snowboarder,snowflake,snowman,soccer,soon,sos,sound,space_invader,spades,spaghetti,sparkle,sparkler,sparkles,sparkling_heart,speak_no_evil,speaker,speech_balloon,speedboat,squirrel,star,star2,stars,station,statue_of_liberty,steam_locomotive,stew,straight_ruler,strawberry,sun_with_face,sunflower,sunny,sunrise,sunrise_over_mountains,surfer,sushi,suspect,suspension_railway,sweat_drops,sweat_smile,sweet_potato,swimmer,symbols,syringe,tada,tanabata_tree,tangerine,taurus,taxi,tea,telephone,telephone_receiver,telescope,tennis,tent,thought_balloon,three,thumbsdown,thumbsup,ticket,tiger,tiger2,tm,toilet,tokyo_tower,tomato,tongue,top,tophat,tractor,traffic_light,train,train2,tram,triangular_flag_on_post,triangular_ruler,trident,trolleybus,trollface,trophy,tropical_drink,tropical_fish,truck,trumpet,tshirt,tulip,turtle,tv,twisted_rightwards_arrows,two,two_hearts,two_men_holding_hands,two_women_holding_hands,u5272,u5408,u55b6,u6307,u6708,u6709,u6e80,u7121,u7533,u7981,u7a7a,uk,umbrella,underage,unlock,up,us,v,vertical_traffic_light,vhs,vibration_mode,video_camera,video_game,violin,virgo,volcano,vs,walking,waning_crescent_moon,waning_gibbous_moon,warning,watch,water_buffalo,watermelon,wave,wavy_dash,waxing_crescent_moon,waxing_gibbous_moon,wc,weary,wedding,whale,whale2,wheelchair,white_check_mark,white_circle,white_flower,white_large_square,white_medium_small_square,white_medium_square,white_small_square,white_square_button,wind_chime,wine_glass,wolf,woman,womans_clothes,womans_hat,womens,wrench,x,yellow_heart,yen,zap,zero,zzz'.split(/,/);
	}
};



