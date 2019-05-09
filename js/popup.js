/*
 * **************************************************************************************
 *
 * Dateiname:                 popup.js
 * Projekt:                   foe
 *
 * erstellt von:              Daniel Siekiera <daniel.siekiera@gmail.com>
 * erstellt am:	              22.01.19 20:55 Uhr
 * zu letzt bearbeitet:       22.01.19 20:55 Uhr
 *
 * Copyright © 2019
 *
 * **************************************************************************************
 */

$(function(){
	$('body').on('click', '.foe-link', ()=> {
		chrome.tabs.create({url: "https://foe-rechner.de/"});
	});
});

// Saves options to chrome.storage
function save_options(){

    let costC = $('#cost_calc').val(),
        cost_calc = parseFloat(costC.replace(',', '.'));

    chrome.storage.sync.set({
        cost_calc: cost_calc

    }, ()=> {

        $('body').prepend('<div id="save-msg" class="alert alert-success" role="alert">Alles gespeichert!<br>Das Spiel wird f&uuml;r die &Auml;nderungen neu geladen</div>');

        setTimeout(()=>{

            chrome.tabs.query({active: true, currentWindow: true}, (tabs)=> {

                // sind wir in FoE?
                if(tabs[0].url.indexOf('forgeofempires.com/game/index') > -1){

                    // ja? dann neu laden
                    chrome.tabs.reload(tabs[0].id);
                }
            });

			window.close();

        }, 3500);
    });
}

function restore_options(){
    chrome.storage.sync.get({
        cost_calc:''
        
    }, (items)=> {
        $('#cost_calc').val(items.cost_calc);
    });
}

document.addEventListener('DOMContentLoaded', restore_options);
document.getElementById('save').addEventListener('click', save_options);
