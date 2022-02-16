let Lbsets = {

    lbs: {},
    possibleSets: {},

    /**
     * Get all sets from the server
     */
    init: ()=> {
        MainParser.loadJSON(extUrl + 'js/web/lbsets/data/sets.json', (data)=>{
            Lbsets.lbs = JSON.parse(data);
            Lbsets.calcPossibleSets();
            Lbsets.BuildBox();
        });
    },

    calcPossibleSets: function ()
    {
        let possibleSets = {};

        for(let idx in this.lbs) {
            let lbCosts = this.lbs[idx];
            let maxCount = null;

            for(let good in lbCosts) {
                let stock = ResourceStock[good];
                let max = Math.floor(stock / lbCosts[good]);

                if(!maxCount || (maxCount && max <= maxCount)) {
                    maxCount = max;
                }
            }

            if(maxCount) {
                possibleSets[idx] = {
                    amount: maxCount,
                    costs: lbCosts
                };
            }
        }

        Lbsets.possibleSets = possibleSets;
    },

    BuildBox: ()=> {
        if( $('#lbsets').length === 0 )
        {
            HTML.AddCssFile('lbsets');

            HTML.Box({
                'id': 'lbsets',
                'title': i18n('Boxes.lbsets.Title'),
                'auto_close': true,
                'dragdrop': true,
                'minimize': true
            });


            let t = '<table class="foe-table">';

            t += 	`<tr>
                        <th></th>
                        <th>${i18n('Boxes.lbsets.Costs')}</th>
                        <th>${i18n('Boxes.lbsets.AvailableGoods')}</th>
                        <th>${i18n('Boxes.lbsets.PossibleAmount')}</th>
                     </tr>`;

            for(let idx in Lbsets.possibleSets) {
                let data = Lbsets.possibleSets[idx];
                let url = MainParser.InnoCDN + 'assets/city/buildings/' + idx + '.png';

                t += `
                    <tr>
                        <td>
                            <img width="50" class="sets" src="${url}" />
                        </td>
                        
                        <td>`;

                        for(let goodIdx in data.costs) {
                            t += `<b>${GoodsData[goodIdx].name}</b>: ${data.costs[goodIdx]}<br>`;
                        }

                t += `</td>
                         <td>`;

                        for(let goodIdx in data.costs) {
                            t += `<b>${GoodsData[goodIdx].name}</b>: ${ResourceStock[goodIdx]}<br>`;
                        }

                t += `</td>
                        <td>${data.amount}</td>
                    </tr>`;
            }

            t += '</table>';

            $('#lbsetsBody').append($('<div />').attr('id', 'lbsetsBodyInner'));
            $('#lbsetsBodyInner').html(t);
        } else {
            HTML.CloseOpenBox('lbsets');
        }
    },
};