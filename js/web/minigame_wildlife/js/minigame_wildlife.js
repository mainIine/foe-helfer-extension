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
    
    Wildlife.height=data?.responseData?.currentGame?.config?.height;
    Wildlife.width=data?.responseData?.currentGame?.config?.width;
    
    let arr = new Array(Wildlife.width);
    for (var i = 0; i < Wildlife.width; i++) {
        arr[i] = new Array(Wildlife.height);
    }

    Wildlife.grid = arr;
    for (let tile of data.responseData.currentGame.tiles) {
        let x = tile.position?.x || 0;
        let y = tile.position?.y || 0;
        Wildlife.grid[x][y] = (tile.type === "grandPrize" ? "paw" : tile.type + (tile.popType === "default" ? "" : "_chest"));
    }

    Wildlife.Show();

});
FoEproxy.addHandler('ResourceShopService', 'buyOffer', (data, postData) => {
    //buy Extra turns
    if(!Settings.GetSetting('ShowEventChest')) return;
    if (!Array.isArray(data.responseData)) return;
    for (let G of data.responseData) {
        if (G.gains?.resources?.wildlife_pop_moves) {
            Wildlife.Show();        
            return;
        };        
    }
});

FoEproxy.addHandler('RewardService', 'collectReward', (data, postData) => {
    //hide when reward window pops up
    if ($('#Wildlife').length === 0) return;
    if (data.responseData[1]!=='wildlife_event') return;
    Wildlife.rewardactive += 1;
    if ($('#Wildlife.open').length > 0) $('#Wildlife .window-minimize')[0].click();
    
});

$('#container')[0].addEventListener("click", function (e) {
    if ($('#Wildlife').length === 0) return;
    if (Wildlife.rewardactive==0) return;
    
    let X=e.clientX,
        Y=e.clientY,
        Xc = window.innerWidth/2,
        Yc = window.innerHeight/2;
    
    if (X>Xc-432 && X<Xc+432 && Y<Yc+296 && Y>Yc-296 && (X<Xc-58 || X>Xc+73 || Y<Yc+144 ||Y>Yc+167)) return;
    
    if (Wildlife.rewardactive > 0) Wildlife.rewardactive -= 1;
    if ($('#Wildlife.closed').length === 0) return;
    if (Wildlife.rewardactive!==0) return;
    $('#Wildlife .window-minimize')[0].click();
});


FoEproxy.addHandler('PopGameService', 'popTile', (data, postData) => {
    if ($('#Wildlife').length === 0) return;
    if (!data?.responseData?.changes) return;
    for (let change of data.responseData.changes) {
        if (change.newTiles) {
            for (let tile of change.newTiles) {
                let x = tile.position?.x || 0;
                let y = tile.position?.y || 0;
                Wildlife.grid[x][y] = (tile.type === "grandPrize" ? "paw" : tile.type + (tile.popType === "default" ? "" : "_chest"));
            }
        }
        if (change.updatedTiles) {
            for (let tile of change.updatedTiles) {
                let x = tile.position?.x || 0;
                let y = tile.position?.y || 0;
                Wildlife.grid[x][y] = (tile.type === "grandPrize" ? "paw" : tile.type + (tile.popType === "default" ? "" : "_chest"));
            }
        }
    }
    let x=Wildlife.lastX;
    let y=Wildlife.lastY;
    Wildlife.lastX=null;
    Wildlife.lastY=null;
    Wildlife.tempC=null;
    Wildlife.prevC=null;
    Wildlife.Update();
    Wildlife.CoordsCheck(x, y);
    if (ResourceStock.wildlife_pop_moves <= 0) Wildlife.Close();
});

FoEproxy.addHandler('PopGameService', 'useBooster', (data, postData) => {
    if ($('#Wildlife').length === 0) return;
    if (!data?.responseData?.changes) return;
    for (let change of data.responseData.changes) {
        if (change.newTiles) {
            for (let tile of change.newTiles) {
                let x = tile.position?.x || 0;
                let y = tile.position?.y || 0;
                Wildlife.grid[x][y] = (tile.type === "grandPrize" ? "paw" : tile.type + (tile.popType === "default" ? "" : "_chest"));
            }
        }
        if (change.updatedTiles) {
            for (let tile of change.updatedTiles) {
                let x = tile.position?.x || 0;
                let y = tile.position?.y || 0;
                Wildlife.grid[x][y] = (tile.type === "grandPrize" ? "paw" : tile.type + (tile.popType === "default" ? "" : "_chest"));
            }
        }
    }
    let x=Wildlife.lastX;
    let y=Wildlife.lastY;
    Wildlife.lastX=null;
    Wildlife.lastY=null;
    Wildlife.tempC=null;
    Wildlife.prevC=null;
    Wildlife.Update();
    Wildlife.CoordsCheck(x, y);
    //if (ResourceStock.wildlife_pop_moves <= 0) Wildlife.Close();
});
$(window).mousemove( function(e){
    if ($('#WildlifeBody .WLwrapper').length === 0) return;
    if ($('#WildlifeBody').css('visibility') === 'hidden') return;
    let elem=$('#WLwrapper')[0]
    let offset= $('#WLwrapper').offset();
    let x=e.clientX;
    let y=e.clientY;
    
    if ((y < offset.top) || (y > (offset.top + elem.clientHeight)) || (x < offset.left) || (x > (offset.left + elem.clientWidth))) {
        $('#WildlifeBody .WLwrapper').hide();
        $('#Wildlife').css('background-image','none');
        $('#WildlifeBody .WLcell').show();
        Wildlife.resetTempChest();
    } else {
        $('#WildlifeBody .WLwrapper').show();
        $('#Wildlife').css('background-image','');
        let c = (x-offset.left)/47;
        let cf = Math.floor(c);
        let cr = c-cf;
        let r = (offset.top+elem.clientHeight-y)/49;
        let rf = Math.floor(r);
        let rr = r-rf;
        if (cr>0.15 && cr < 0.85 && rr>0.15 && rr < 0.85 ) Wildlife.CoordsCheck(cf, rf);
    }
});

let Wildlife = {
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

    Show: () => {
        if ($('#Wildlife').length === 0) {
            // CSS in den DOM prügeln
            HTML.AddCssFile('minigame_wildlife');
            // Box in den DOM
            HTML.Box({
                'id': 'Wildlife',
                'title': 'Wildlife preview',//i18n('Boxes.Wildlife.Title'),
                'auto_close': true,
                'minimize': true,
                'dragdrop': false
            });
            let body='<div style="background:#553815">';
            body+=`<div id="WLwarning">When no tool is selected, the window below is click-through - clicking interacts with the game!!!</div>`;
            body+=`<div id="WLhammer" class="WLtool"></div>`;
            body+=`<div id="WLdestroyer" class="WLtool"></div>`;
            body+='</div><div id="WLwrapper"><div class="WLwrapper"></div></div>'
            //let body='<div class="WLwrapper"></div>'
            $('#WildlifeBody').html(body);
            Wildlife.Update();
            $('#WLhammer')[0].addEventListener('click', function(){
                Wildlife.selectTool('hammer');
            });
            $('#WLdestroyer')[0].addEventListener('click', function(){
                Wildlife.selectTool('destroyer');
            });
        } 

    },
    Close: () => {
        HTML.CloseOpenBox('Wildlife');
    },

    Update: () => {
        if ($('#WildlifeBody .WLwrapper').length === 0) return;
        let table=''
        for (let x=0; x<Wildlife.width;x++) {
            table+='<div class="WLcolumn">'
            for (let y=Wildlife.height-1;y>-1;y--) {
                let c = Wildlife.grid[x][y];
                table+=`<div class="WLcell WL${(c === "paw" || c.indexOf("chest")>0) ? c + " WLdroppable" : c}" id="WLcellX${x}Y${y}"></div>`;
            }
            table+='</div>';
        }
        
        $('#WildlifeBody .WLwrapper').html(table);
        
    },
    
    CoordsCheck: (x,y) => {
        if (Wildlife.lastX==x && Wildlife.lastY==y) return;
        if (x>Wildlife.width-1 || y > Wildlife.height-1 || x<0 || y<0) return;
        
        Wildlife.resetTempChest();
        Wildlife.lastX=x;
        Wildlife.lastY=y;

        $('#WildlifeBody .WLcell').fadeIn(0);
        Wildlife.hide=[];
        let c = Wildlife.grid[x][y];
        if (c === "paw" || c.indexOf("chest") > 0) return;

        if (Wildlife.tool === "destroyer") {
            $(`.WL${c}`).fadeOut('fast');
        } else {
            Wildlife.check = c;
            if (Wildlife.tool === "hammer") {
                Wildlife.hide.push(`WLcellX${x}Y${y}`);
            } else {
                Wildlife.CheckNeighbours(x,y);
                if (Wildlife.hide.length === 1) return;    
                if (Wildlife.hide.length > 4) {
                    $(`#WLcellX${x}Y${y}`).removeClass(`WL${Wildlife.grid[x][y]}`);
                    Wildlife.tempC = `WL${Wildlife.grid[x][y]}_chest`;
                    $(`#WLcellX${x}Y${y}`).addClass(Wildlife.tempC);
                    $(`#WLcellX${x}Y${y}`).addClass("WLdroppable");
                    Wildlife.hide.splice(Wildlife.hide.indexOf(`WLcellX${x}Y${y}`),1);
                }
            }
            for (let cell of Wildlife.hide) {
                $(`#${cell}`).fadeOut('fast');
            }
        }
        //Wildlife.hideDrops()
        setTimeout(Wildlife.hideDrops,250);
    },

    CheckNeighbours: (x,y) => {
        if (x<0||y<0||x>=Wildlife.width||y>=Wildlife.height) return;
        if (Wildlife.hide.includes(`WLcellX${x}Y${y}`)) return;
        let c = Wildlife.grid[x][y];
        if (c!==Wildlife.check) return;
        Wildlife.hide.push(`WLcellX${x}Y${y}`);
        Wildlife.CheckNeighbours(x,y+1);
        Wildlife.CheckNeighbours(x,y-1);
        Wildlife.CheckNeighbours(x+1,y);
        Wildlife.CheckNeighbours(x-1,y);
    },

    selectTool: (tool) => {
        if (Wildlife.tool === tool) {
            Wildlife.tool=null;
            tool=null;
        } else {
            Wildlife.tool = tool;
        };
        $('.WLtool').removeClass("WLselected");
        if (tool) {
            $(`#WL${tool}`).addClass("WLselected");
            $('#Wildlife').css("pointer-events","auto");
        } else {
            $('#Wildlife').css("pointer-events","none");
        }
    },

    hideDrops: () => {
        if ($('#Wildlife').length === 0) return
        let c=0;
        let drops = $('.WLdroppable');
        h=$('#Wildlife')[0].clientHeight;
        if (drops.length >0) {
            for (let drop of drops) {
                if((h-drop.offsetTop)<60 && (h-drop.offsetTop)>50) {
                    c+=1;
                    $(`#${drop.id}`).fadeOut('fast');
                };
            }
        }

        if (c>0) setTimeout(Wildlife.hideDrops,250);
    },

    resetTempChest: () => {
        if (Wildlife.tempC !== null) {
            $(`#WLcellX${Wildlife.lastX}Y${Wildlife.lastY}`).removeClass(Wildlife.tempC);
            $(`#WLcellX${Wildlife.lastX}Y${Wildlife.lastY}`).removeClass('WLdroppable');
            $(`#WLcellX${Wildlife.lastX}Y${Wildlife.lastY}`).addClass(`WL${Wildlife.grid[Wildlife.lastX][Wildlife.lastY]}`);
            Wildlife.tempC = null;
        }
        Wildlife.lastX=null;
        Wildlife.lastY=null;   
    },
};