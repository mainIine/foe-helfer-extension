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

FoEproxy.addHandler('PopGameService', 'getOverview', (data, postData) => {
    //Start Minigame
    if(!Settings.GetSetting('ShowEventChest')) return;
    if (!data?.responseData?.currentGame?.config?.height) return;
    if (!data?.responseData?.currentGame?.config?.width) return;
    if (!data?.responseData?.currentGame?.tiles) return;
    
    Popgame.event = data.responseData.context.replace("_event","")
    Popgame.height=data?.responseData?.currentGame?.config?.height;
    Popgame.width=data?.responseData?.currentGame?.config?.width;
    
    let arr = new Array(Popgame.width);
    for (var i = 0; i < Popgame.width; i++) {
        arr[i] = new Array(Popgame.height);
    }

    Popgame.grid = arr;
    Popgame.updateTiles(data.responseData.currentGame.tiles);
    Popgame.Show();

});
FoEproxy.addHandler('ResourceShopService', 'buyOffer', (data, postData) => {
    //buy Extra turns
    if(!Settings.GetSetting('ShowEventChest')) return;
    if (!Array.isArray(data.responseData)) return;
    for (let G of data.responseData) {
        if (G.gains?.resources?.[`${Popgame.event}_pop_moves`]) {
            Popgame.Show();        
            return;
        };              
    }
});

FoEproxy.addHandler('RewardService', 'collectReward', (data, postData) => {
    //hide when reward window pops up
    if ($('#Popgame').length === 0) return;
    if (data.responseData[1]!==Popgame.event+'_event') return;
    Popgame.rewardactive += 1;
    if ($('#Popgame.open').length > 0) {
        $('#Popgame').removeClass("open");
        $('#Popgame').addClass("closed");
    };
    
});

$('#container').on("click", function (e) {
    if ($('#Popgame').length === 0) return;
    if (Popgame.rewardactive==0) return;
    
    let X=e.clientX,
        Y=e.clientY,
        Xc = window.innerWidth/2,
        Yc = window.innerHeight/2;
    
    if (X>Xc-313 && X<Xc+290 && Y<Yc+297 && Y>Yc-324 && (X<Xc-56 || X>Xc+73 || Y<Yc+151 ||Y>Yc+172)) return;
    
    if (Popgame.rewardactive > 0) Popgame.rewardactive -= 1;
    if ($('#Popgame.closed').length === 0) return;
    if (Popgame.rewardactive!==0) return;
    if (Popgame.minimized) return;
    $('#Popgame').addClass("open");
    $('#Popgame').removeClass("closed");
});


FoEproxy.addHandler('PopGameService', 'popTile', (data, postData) => {
    if ($('#Popgame').length === 0) return;
    if (!data?.responseData?.changes) return;
    for (let change of data.responseData.changes) {
        Popgame.updateTiles(change.newTiles)
        Popgame.updateTiles(change.updatedTiles)
    }
    let x=Popgame.lastX;
    let y=Popgame.lastY;
    Popgame.lastX=null;
    Popgame.lastY=null;
    Popgame.tempC=null;
    Popgame.prevC=null;
    Popgame.Update();
    Popgame.CoordsCheck(x, y);
    if (ResourceStock[`${Popgame.event}_pop_moves`] <= 0) Popgame.Close();
});

FoEproxy.addHandler('PopGameService', 'useBooster', (data, postData) => {
    if ($('#Popgame').length === 0) return;
    if (!data?.responseData?.changes) return;
    for (let change of data.responseData.changes) {
        Popgame.updateTiles(change.newTiles); 
        Popgame.updateTiles(change.updatedTiles); 
    }
    let x=Popgame.lastX;
    let y=Popgame.lastY;
    Popgame.lastX=null;
    Popgame.lastY=null;
    Popgame.tempC=null;
    Popgame.prevC=null;
    Popgame.Update();
    Popgame.CoordsCheck(x, y);
});

$(window).mousemove( function(e){
    if ($('#PopgameBody .PGwrapper').length === 0) return;
    if ($('#PopgameBody').css('visibility') === 'hidden') return;
    let elem=$('#PGwrapper')[0]
    let offset= $('#PGwrapper').offset();
    let x=e.clientX;
    let y=e.clientY;
    
    if ((y < offset.top) || (y > (offset.top + elem.clientHeight)) || (x < offset.left) || (x > (offset.left + elem.clientWidth))) {
        $('#PopgameBody .PGwrapper').hide();
        $('#Popgame').css('background-image','none');
        $('#PopgameBody .PGcell').show();
        Popgame.resetTempChest();
    } else {
        $('#PopgameBody .PGwrapper').show();
        $('#Popgame').css('background-image','');
        let c = (x-offset.left)/47;
        let cf = Math.floor(c);
        let cr = c-cf;
        let r = (offset.top+elem.clientHeight-y)/49;
        let rf = Math.floor(r);
        let rr = r-rf;
        if (cr>0.15 && cr < 0.85 && rr>0.15 && rr < 0.85 ) Popgame.CoordsCheck(cf, rf);
    }
});

let Popgame = {
    height: 0,
    width: 0,
    grid:[],
    lastX:null,
    lastY:null,
    tempC:null,
    hide:[],
    check:null,
    tool:null,
    rewardactive:0,
    event:"fall",

    Show: () => {
        Popgame.rewardactive = 0;
        if ($('#Popgame').length === 0) {
            // CSS in den DOM prügeln
            HTML.AddCssFile('popgame');
            // Box in den DOM
            HTML.Box({
                'id': 'Popgame',
                'title': 'Popgame preview',//i18n('Boxes.Popgame.Title'),
                'auto_close': true,
                'minimize': true,
                'dragdrop': false
            });
            let body='<div style="background:#553815">';
            body+=`<div id="PGwarning">${i18n("Boxes.Popgame.Warning")}</div>`;
            if (Popgame.event=="wildlife") {
                body+=`<div id="PGhammer" class="PGtool"></div>`;
                body+=`<div id="PGdestroyer" class="PGtool"></div>`;
            } else if (Popgame.event=="fall"){
                body+=`<div id="PGfork" class="PGtool"></div>`;
            }
            body+=`</div><div id="PGwrapper" class="${Popgame.event}"><div class="PGwrapper"></div></div>`
            
            $('#PopgameBody').html(body);
            Popgame.Update();
            $('.PGtool').on("click", (event)=>{
                Popgame.selectTool(event.target.id.replace("PG",""));
            })
            let box = $('#Popgame'),
            open = box.hasClass('open');
            Popgame.minimized = JSON.parse(localStorage.getItem("PopgameMinimized") || "true");
            if (open === true && Popgame.minimized) {
                box.removeClass('open');
                box.addClass('closed');
                box.find('.window-body').css("visibility", "hidden");
            }
            $('#PopgameButtons > span.window-minimize').on('click', function() {
                Popgame.minimized = !Popgame.minimized;
                localStorage.setItem('PopgameMinimized', JSON.stringify(Popgame.minimized));
            });
        } 
    },

    Close: () => {
        HTML.CloseOpenBox('Popgame');
    },

    Update: () => {
        if ($('#PopgameBody .PGwrapper').length === 0) return;
        let table=''
        for (let x=0; x<Popgame.width;x++) {
            table+='<div class="PGcolumn">'
            for (let y=Popgame.height-1;y>-1;y--) {
                let c = Popgame.grid[x][y];
                table+=`<div class="PGcell PG_${Popgame.event}_${(c === "grandPrize" || c.indexOf("_reward")>0) ? c + " PGdroppable" : c}" id="PGcellX${x}Y${y}"></div>`;
            }
            table+='</div>';
        }
        
        $('#PopgameBody .PGwrapper').html(table);
        
    },
    
    CoordsCheck: (x,y) => {
        if (Popgame.lastX==x && Popgame.lastY==y) return;
        if (x>Popgame.width-1 || y > Popgame.height-1 || x<0 || y<0) return;
        
        Popgame.resetTempChest();
        Popgame.lastX=x;
        Popgame.lastY=y;

        $('#PopgameBody .PGcell').fadeIn(0);
        Popgame.hide=[];
        let c = Popgame.grid[x][y];
        if (c === "grandPrize" || c.indexOf("_reward") > 0) return;

        if (Popgame.tool === "destroyer") {
            $(`.PG_${Popgame.event}_${c}`).fadeOut('fast');
        } else {
            Popgame.check = c;
            if (Popgame.tool === "hammer" || Popgame.tool === "fork") {
                Popgame.hide.push(`PGcellX${x}Y${y}`);
            } else {
                Popgame.CheckNeighbours(x,y);
                if (Popgame.hide.length === 1) return;    
                if (Popgame.hide.length > 4) {
                    $(`#PGcellX${x}Y${y}`).removeClass(`PG_${Popgame.event}_${Popgame.grid[x][y]}`);
                    Popgame.tempC = `PG_${Popgame.event}_${Popgame.grid[x][y]}_reward`;
                    $(`#PGcellX${x}Y${y}`).addClass(Popgame.tempC);
                    $(`#PGcellX${x}Y${y}`).addClass("PGdroppable");
                    Popgame.hide.splice(Popgame.hide.indexOf(`PGcellX${x}Y${y}`),1);
                }
            }
            for (let cell of Popgame.hide) {
                $(`#${cell}`).fadeOut('fast');
            }
        }
        setTimeout(Popgame.hideDrops,250);
    },

    CheckNeighbours: (x,y) => {
        if (x<0||y<0||x>=Popgame.width||y>=Popgame.height) return;
        if (Popgame.hide.includes(`PGcellX${x}Y${y}`)) return;
        let c = Popgame.grid[x][y];
        if (c!==Popgame.check) return;
        Popgame.hide.push(`PGcellX${x}Y${y}`);
        Popgame.CheckNeighbours(x,y+1);
        Popgame.CheckNeighbours(x,y-1);
        Popgame.CheckNeighbours(x+1,y);
        Popgame.CheckNeighbours(x-1,y);
    },

    selectTool: (tool) => {
        if (Popgame.tool === tool) {
            Popgame.tool=null;
            tool=null;
        } else {
            Popgame.tool = tool;
        };
        $('.PGtool').removeClass("PGselected");
        if (tool) {
            $(`#PG${tool}`).addClass("PGselected");
            $('#Popgame').css("pointer-events","auto");
        } else {
            $('#Popgame').css("pointer-events","none");
        }
    },

    hideDrops: () => {
        if ($('#Popgame').length === 0) return
        let c=0;
        let drops = $('.PGdroppable');
        h=$('#Popgame')[0].clientHeight;
        if (drops.length >0) {
            for (let drop of drops) {
                if((h - drop.offsetTop) < 155 && (h - drop.offsetTop) > 145) {
                    c+=1;
                    $(`#${drop.id}`).fadeOut('fast');
                };
            }
        }

        if (c>0) setTimeout(Popgame.hideDrops,250);
    },

    resetTempChest: () => {
        if (Popgame.tempC !== null) {
            $(`#PGcellX${Popgame.lastX}Y${Popgame.lastY}`).removeClass(Popgame.tempC);
            $(`#PGcellX${Popgame.lastX}Y${Popgame.lastY}`).removeClass('PGdroppable');
            $(`#PGcellX${Popgame.lastX}Y${Popgame.lastY}`).addClass(`PG_${Popgame.event}_${Popgame.grid[Popgame.lastX][Popgame.lastY]}`);
            Popgame.tempC = null;
        }
        Popgame.lastX=null;
        Popgame.lastY=null;   
    },

    updateTiles:(tiles)=>{
        if (!tiles) return;
        for (let tile of tiles) {
            let x = tile.position?.x || 0;
            let y = tile.position?.y || 0;
            Popgame.grid[x][y] = tile.type + ((tile.popType === "default" || tile.type === "grandPrize") ? "" : "_reward");
        }
    }    
};