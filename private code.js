/* function for scoutnig times module
getTimes: () => {
        if (scoutingTimes.Provinces == {}) return;

        for (let i in scoutingTimes.Provinces) {
            if (!scoutingTimes.Provinces[i]) continue;
            if (!scoutingTimes.Provinces[i].children) continue;
            if (scoutingTimes.Provinces[i].children.length < 1) continue;
            for (j in scoutingTimes.Provinces[i].children) {
                if (!scoutingTimes.Provinces[i].children[j]) continue;
                let x = scoutingTimes.Provinces[i].children[j]
                if (!scoutingTimes.Provinces[x.targetId].ScoutingTime || scoutingTimes.Provinces[x.targetId].ScoutingTime > x.travelTime) {
                    scoutingTimes.Provinces[x.targetId].ScoutingTime = x.travelTime;
                    scoutingTimes.Provinces[x.targetId].From = i;
                }
            }
        }
        let out = {};
        for (let i in scoutingTimes.Provinces) {
            let rew="";
            let reward = scoutingTimes.Provinces[i]?.reward?.type;
            switch (reward) {
                case "expansion":
                    rew= "{{IEXP}}"
                    break;
                case "tower":
                    rew= "{{IMED}} [[PvP Tournaments|PvP Tower]]";
                    break;
                case "exlorationSite":
                    rew= "ExplorationSite";
                    break;
                case "goods":
                    rew="{{Goods}} Good Deposit"
                    break;
                case "loot":
                    break;
                default:
                    break;
            }

            
            let string=""
            string += `*Owner: [[${scoutingTimes.Provinces[i]?.owner?.name}]]\n`;
            string += `*Scouting Cost: {{ICOI}} ${scoutingTimes.numberWithCommas(scoutingTimes.Provinces[i]?.scoutingCost)}\n`;
            string += `*Scouting Time: {{ITIM}} ${scoutingTimes.format2(scoutingTimes.Provinces[i].ScoutingTime)} from [[${scoutingTimes.Provinces[scoutingTimes.Provinces[i].From].name}]]"\n`;
            string += `*Sectors: ???\n`;
            string += `*Infiltration Cost: {{ICOI}} ??? per sector\n`;
            string += `*Owners Battle Bonus: {{IDEB}} ???%\n`;
            string += `*Total Loot: ???\n`;
            string += `*Province Reward: ${rew}`;

            out[i]=[scoutingTimes.Provinces[i].name,scoutingTimes.format2(scoutingTimes.Provinces[i].ScoutingTime) + " from [[" + scoutingTimes.Provinces[scoutingTimes.Provinces[i].From].name + "]]"];
        }
        return out;

    },
    format2: (time) => {

        let min = Math.floor(time/60);
        let hours = Math.floor(min/60);
        let days = Math.floor(hours/24);
        min = min % 60;
        hours = hours % 24;

        let timestring = `${days}:`;
        timestring += (hours<10) ? `0${hours}:` : `${hours}:`;
        timestring += (min<10) ? `0${min}` : `${min}`;

        return timestring
    },
    */