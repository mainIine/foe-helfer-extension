
/*
 * **************************************************************************************
 * Copyright (C) 2026 FoE-Helper team - All Rights Reserved
 * You may use, distribute and modify this code under the
 * terms of the AGPL license.
 *
 * See file LICENSE.md or go to
 * https://github.com/mainIine/foe-helfer-extension/blob/master/LICENSE.md
 * for full license details.
 *
 * **************************************************************************************
 */

FoEproxy.addWsHandler('ItemAuctionService', 'updateBid', data => {
    if (!Settings.GetSetting('Auctions')) {
        return;
    }
    Auction.current = data.responseData.amount;
    Auction.updateClipboard();
    
});

FoEproxy.addHandler('ItemAuctionService', 'getAuction', (data, postdata) => {
    if (!Settings.GetSetting('Auctions')) {
        return;
    }
    if (data.responseData.state == "closed") return;
    Auction.current = Math.max(data.responseData.highestBid?.amount||0,(data.responseData.startingBid||0)-Auction.diff[Auction.index]);
    Auction.updateClipboard();
});

FoEproxy.addHandler('ItemAuctionService', 'updateBid', (data, postdata) => {
    if (!Settings.GetSetting('Auctions')) {
        return;
    }
    Auction.current = data.responseData.amount;
    Auction.updateClipboard();
});

FoEproxy.addRequestHandler('ItemAuctionService', 'makeBid', (data, postdata) => {
    Auction.index = Math.min(Auction.index + 1, Auction.diff.length-1);
    if (Auction.timeout) clearTimeout(Auction.timeout)
    Auction.timeout = setTimeout(
        ()=>{Auction.index=0},
        60000);
});


let Auction = {
    diff: JSON.parse(localStorage.getItem('AuctionDifference') || '[1,2,5,222]'),
    fak: JSON.parse(localStorage.getItem('AuctionFactors') || '[1,1,1,1.1]'),
    index: 0,
    current: 0,
    timeout:null,
    
    updateClipboard: () => {
        newBid = Math.floor(Math.max(Auction.fak[Auction.index] * Auction.current, Auction.current + Auction.diff[Auction.index]));
        helper.str.copyToClipboard(newBid);
    },

	BuildBody: ()=> {

		if ($('#auctionSettingsBox').length === 0) {
			HTML.Box({
				id: 'auctionSettingsBox',
				title: i18n('Boxes.AuctionSettings.Title'),
				//ask: i18n('Boxes.AuctionSettings.HelpLink'),
				auto_close: true,
				dragdrop: true,
				minimize: true,
				resize: true,
			});

			HTML.AddCssFile('auctions');
		} 
        let t=[];
        t.push(`<button id="AuctionHelpBtn" class="btn">${i18n('Boxes.AuctionSettings.Help')}</button>`);
        t.push(`<div id="AuctionHelp" style="display:none"><ul><li>${i18n('Boxes.AuctionSettings.Help1')}</li><li>${i18n('Boxes.AuctionSettings.Help2')}</li><li>${i18n('Boxes.AuctionSettings.Help3')}</li><li>${i18n('Boxes.AuctionSettings.Help4')}</li><li>${i18n('Boxes.AuctionSettings.Help5')}</li></div> `);
        t.push(`<table><tr><th>${i18n('Boxes.AuctionSettings.Bid')}</th><th>${i18n('Boxes.AuctionSettings.Add')}</th><th>${i18n('Boxes.AuctionSettings.Factor')}</th></tr>`)
        for (let i = 0; i<Auction.diff.length;i++) {
            t.push(`<tr><td>${i+1}</td><td><Input class="AuctionInput" data-type="Add" data-id="${i}" type="number" value="${Auction.diff[i]}"></td><td><Input class="AuctionInput" data-type="Mult" data-id="${i}" type="number" value="${Auction.fak[i]}"></td></tr>`)

        }
        t.push(`<tr><td colspan="3"><button id="AuctionAddRow" class="btn">+</button><button id="AuctionDelRow" class="btn">-</button></td></tr>`)
        t.push(`</table>`)
        
        
        $('#auctionSettingsBoxBody').html(t.join(''));
        $('.AuctionInput').on("input", (e) => {
            let elem = e.target;
            if (elem.dataset.type=="Add") {
                Auction.diff[Number(elem.dataset.id)] = Number(elem.value);
                localStorage.setItem('AuctionDifference', JSON.stringify(Auction.diff))
            } else if (elem.dataset.type=="Mult") {
                Auction.fak[Number(elem.dataset.id)] = Number(elem.value);
                localStorage.setItem('AuctionFactors', JSON.stringify(Auction.fak))
            };
        });
        $('#AuctionAddRow').on("click", () => {
            Auction.diff.push(1);
            Auction.fak.push(1);
            localStorage.setItem('AuctionDifference', JSON.stringify(Auction.diff))
            localStorage.setItem('AuctionFactors', JSON.stringify(Auction.fak))
            Auction.BuildBody();            
        });
        $('#AuctionDelRow').on("click", () => {
            let x= Auction.diff.pop();
            x = Auction.fak.pop();
            localStorage.setItem('AuctionDifference', JSON.stringify(Auction.diff))
            localStorage.setItem('AuctionFactors', JSON.stringify(Auction.fak))
            Auction.BuildBody();            
        });
        $('#AuctionHelpBtn').on("click", () => {
            $('#AuctionHelp').fadeToggle();            
        });
    },
};