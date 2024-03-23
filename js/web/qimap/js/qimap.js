const QIMap = {
    CurrentMapData: {},

    init: (responseData) => {
        QIMap.CurrentMapData = responseData
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

		QIMap.init(QIMap.CurrentMapData)
		QIMap.showBody()
	},

    showBody: () => {
        let out = '<div id="nodeMap">'
        let maxX = 0 
        let maxY = 0
        let minX = 100
        let minY = 100
        QIMap.CurrentMapData.nodes.forEach(node => {
            let x = (node.position.x ? node.position.x : 0)
            maxX = (x > maxX ? x : maxX)
            maxY = ((node.position.y || 0) > maxY ? (node.position.y || 0) : maxY)
            minX = (x < minX ? x : minX)
            minY = ((node.position.y || 0) < minY ? (node.position.y || 0) : minY)
        })
        QIMap.CurrentMapData.nodes.forEach(node => {
            let x = (node.position.x - minX) * 4 + 1 || 1 
            let y = (node.position.y - minY) * 3 + 1 || 1
            let type = (node.type.type !== undefined ? node.type.type : node.type.fightType)
            let currentProgress = (node.state.state === "open" ? (node.state.currentProgress || 0) + "/" : (node.state.state === "finished") ? node.type.requiredProgress + "/" : '')
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
            $('#QIMapBody').css({'height': maxY*3+2+'em','width': maxX*4+9+'em'})
        })
    }
}