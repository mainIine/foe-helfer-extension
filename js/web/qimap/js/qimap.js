const QIMap = {
    CurrentMapData: {},

    init: (responseData) => {
        this.CurrentMapData = responseData.nodes
    },

	showBox: () => {

		if ($('#QIMap').length > 0) {
			HTML.CloseOpenBox('QIMap')
			return
		}

		HTML.AddCssFile('qimap')

		HTML.Box({
			id: 'QIMap',
			title: i18n('Boxes.QIMap.Title'),
			auto_close: true,
			dragdrop: true,
			minimize: true,
			resize: true
		})

		QIMap.showBody()
	},

    showBody: () => {
        console.log(this.CurrentMapData);
        let out = '<div id="nodeMap">'
        let maxX, maxY, minX, minY = 0
        this.CurrentMapData.forEach(node => {
            let x = (node.position.x - 4) * 4 || 0 // - 4 needs to be made non-static depending on the minimum value of x of all nodes
            let y = node.position.y * 3 || 0
            maxX = (x > maxX ? x : maxX)
            maxY = (y > maxY ? y : maxY)
            let type = (node.type.type !== undefined ? node.type.type : node.type.fightType)
            let currentProgress = (node.state.state === "open" ? node.state.currentProgress + "/" : (node.state.state === "finished") ? node.type.requiredProgress + "/" : '')
            if (node.type.__class__ !== "GuildRaidsMapNodeStart") {
                out += '<span style="left:'+x+'em;top:'+y+'em" class="'+node.state.state+ " " + type + " " + (node.type.armyType ? node.type.armyType : '') + (node.state.hasTarget ? ' target' : '') + '">'
                    out += '<span class="img"></span>'
                    out += '<b></b>'+currentProgress + node.type.requiredProgress
                    if (node.mapEffects?.effectActiveBeforeFinish?.boosts) {
                        out += '<br>'
                        node.mapEffects.effectActiveBeforeFinish.boosts.forEach(boost => {
                            out += '<i class="' + boost.type + '">' + boost.value + '</i> '
                        })
                    }
                out +='</span>'
            }
            else 
                out += '<span style="left:'+x+'em;top:'+y+'em" class="start"><span class="img"></span></span>'
        })
        out += '</div>'
        
        $('#QIMap').find('#QIMapBody').html(out).promise().done(function () {
            $('#QIMapBody').css({'height': maxY+100+'em','width': maxX+3+'em'})
        })
    }
}