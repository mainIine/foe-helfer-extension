const QIMap = {
    CurrentMapData: {},
    NodeConnections: [],
    MaxX: 0,
    MaxY: 0,
    MinX: 100,
    MinY: 100,
    XMultiplier: 60,
    YMultiplier: 50,
    XOffset: 60,
    YOffset: 10,

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
        
		QIMap.Map = document.createElement("canvas");
		QIMap.MapCTX = QIMap.Map.getContext('2d');

		$(QIMap.Map).attr({
			id: 'nodeConnections',
			width: ProvinceMap.Size.width,
			height: ProvinceMap.Size.height,
		});

        QIMap.CurrentMapData.nodes.forEach(node => {
            let x = (node.position.x ? node.position.x : 0)
            QIMap.MaxX = (x > QIMap.MaxX ? x : QIMap.MaxX)
            QIMap.MaxY = ((node.position.y || 0) > QIMap.MaxY ? (node.position.y || 0) : QIMap.MaxY)
            QIMap.MinX = (x < QIMap.MinX ? x : QIMap.MinX)
            QIMap.MinY = ((node.position.y || 0) < QIMap.MinY ? (node.position.y || 0) : QIMap.MinY)

            // BUG works the first time, then adds more to the array
            node.connectedNodes.forEach(connection => {
                let findDuplicates = QIMap.NodeConnections.find(x => x.id == node.id && x.connectedNode == connection.targetNodeId)
                if (!findDuplicates) {
                    let newNode = {
                        id: node.id, 
                        nodePosition: node.position,
                        connectedNode: connection.targetNodeId, 
                        connectedNodePosition: connection.pathTiles
                    }
                    QIMap.NodeConnections.push(newNode)
                }
            })
        })
        
        QIMap.showNodeConnections()

        QIMap.CurrentMapData.nodes.forEach(node => {
            let x = (node.position.x - QIMap.MinX) * QIMap.XMultiplier + QIMap.XOffset || QIMap.XOffset
            let y = (node.position.y - QIMap.MinY) * QIMap.YMultiplier + QIMap.YOffset || QIMap.YOffset
            let type = (node.type.type !== undefined ? node.type.type : node.type.fightType)
            let currentProgress = (node.state.state === "open" ? (node.state.currentProgress || 0) + "/" : (node.state.state === "finished") ? node.type.requiredProgress + "/" : '')
            if (node.type.__class__ !== "GuildRaidsMapNodeStart") {
                out += '<span id="'+ node.id +'" style="left:'+x+'px;top:'+y+'px" class="'+node.state.state+ " " + type + " " + (node.type.armyType ? node.type.armyType : '') + (node.state.hasTarget ? ' target' : '') + '">'
                    out += '<span class="img"></span>'
                    out += '<b></b>'+currentProgress + node.type.requiredProgress
                    if (node.mapEffects?.effectActiveBeforeFinish?.boosts) {
                        out += '<br>'
                        node.mapEffects.effectActiveBeforeFinish.boosts.forEach(boost => {
                            out += '<i class="' + boost.type + '">' + boost.value + '</i> '
                        })
                    }
                    if (node.mapEffects?.effectActiveAfterFinish?.boosts) {
                        out += '<br>'
                        node.mapEffects.effectActiveAfterFinish.boosts.forEach(boost => {
                            out += '<i class="' + boost.type + '">' + boost.value + '</i> '
                        })
                    }
                out +='</span>'
            }
            else 
                out += '<span style="left:'+x+'px;top:'+y+'px" class="start"><span class="img"></span></span>'
        })
        out += '</div>'
        
        $('#QIMap').find('#QIMapBody').html(out).promise().done(function () {
            $('#nodeMap').append(QIMap.Map)
            $('#QIMapBody, #nodeConnections').css({'width': QIMap.MaxY*QIMap.XMultiplier+QIMap.XOffset+QIMap.XOffset+'px','height': QIMap.MaxY*QIMap.YMultiplier+QIMap.YOffset+80+'px'})
        })
    },

    showNodeConnections: () => {
        QIMap.MapCTX.strokeStyle = '#000'
        QIMap.MapCTX.lineWidth = 3

        QIMap.NodeConnections.forEach(connection => {
            let prevX = '', prevY = ''
            connection.connectedNodePosition.forEach(path => {
                let x = 0, y = 0, targetX = 0, targetY = 0
                if (prevX == '') {
                    x = ((connection.nodePosition.x || 0) - QIMap.MinX) * QIMap.XMultiplier *1.2 + QIMap.XOffset +80 || QIMap.XOffset
                    y = (connection.nodePosition.y - QIMap.MinY) * QIMap.YMultiplier *1.45 + QIMap.YOffset +40 || QIMap.YOffset +40
                }
                else {
                    x = prevX
                    y = prevY
                }
                targetX = ((path.x || 0) - QIMap.MinX) * QIMap.XMultiplier *1.2 + QIMap.XOffset +80 || QIMap.XOffset
                targetY = (path.y - QIMap.MinY) * QIMap.YMultiplier *1.45 + QIMap.YOffset +40 || QIMap.YOffset +40
    
                QIMap.MapCTX.beginPath()
                QIMap.MapCTX.moveTo(x, y)
                QIMap.MapCTX.lineTo(targetX, targetY)
                QIMap.MapCTX.closePath()
                QIMap.MapCTX.stroke()
                
                prevX = targetX, prevY = targetY
            })
        })
    }
}