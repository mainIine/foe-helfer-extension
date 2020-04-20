/*
 * **************************************************************************************
 *
 * Dateiname:                 indexdb.js
 * Projekt:                   foe-chrome
 *
 * erstellt von:              Daniel Siekiera <daniel.siekiera@gmail.com>
 * erstellt am:	              07.04.20, 21:58 Uhr
 * zuletzt bearbeitet:        07.04.20, 15:46 Uhr
 *
 * Copyright © 2020
 *
 * **************************************************************************************
 */

/*
*   "actions" structure
*   {
*      playerId: number,
*       date: Date,
*       type: ACTION_TYPE_BATTLE_WIN | ACTION_TYPE_BATTLE_LOSS | ACTION_TYPE_BATTLE_SURRENDERED,
*       battle: {
*           myArmy: Unit[],
*           otherArmy: Unit[],
*           round: number,
*           auto: boolean,
*           era: string,
*       }
*   }
*   OR
*   {
*       playerId: number,
*       date: Date,
*       type: Plunderer.ACTION_TYPE_PLUNDERED,
*       resources: Object, *
*       doublePlunder: boolean | undefined, * double plunder bonus is applied or not
*       doublePlunderApplied: boolean * true when double bonus is applied
*       sp: number, * strategy points
*       important: boolean, * if not supplies or money only
*       entityId: number, * foe city entity Id
*       buildId: string, * key for BuildingNamesi18n
*   }
*   OR
*   {
*       type: Plunderer.ACTION_TYPE_SHIELDED,
*       playerId: number,
*       date: Date,
*       expireTime: number, * timestamp. usage: new Date(expireTime * 1000)
*   }
*   where Unit =
*   {
*       startHP: number, * usually 10
*       endHp: number,
*       attBoost: number,
*       defBoost: number,
*       unitTypeId: string,
*       ownerId: number, * other player id
*   }

*   "players" structure
*   {
*       id: number,
*       name: string,
*       clanId: number, * 0 if no clan
*       clanName: string | undefined,
*       avatar: string,
*       era: string | 'unknown',
*       date: new Date(), * last visit date
*   }
*
*   "greatbuildings" structur
*   {
*       id: number,
*       playerid: number,
*       name: string,
*       level: number,
*       currentfp: number,
*       bestratenettofp: number
*       bestratecosts: number,
*       date: new Date(), * last visit date
*   }
*/

let IndexDB = {
    db: null,

    Init: (playerid) => {
        IndexDB.db = new Dexie("FoeHelper_" + playerid); //Create different IndexDBs if two players are sharing the same PC playing on the same world

        IndexDB.db.version(1).stores({
            players: 'id,date',
            actions: '++id,playerId,date,type',
            greatbuildings: '++id,playerId,name,&[playerId+name],level,currentFp,bestRateNettoFp,bestRateCosts,date',
        });

        IndexDB.db.open();

        setTimeout(() => {
            IndexDB.GarbageCollector();
        }, 10 * 1000);
    },



    /**
    * Perform garbage collection
    *
    * @returns {Promise<void>}
    */
    GarbageCollector: async () => {
        const sixWeeksAgo = moment().subtract(6, 'weeks').toDate();

        await IndexDB.db.actions
            .where('date').below(sixWeeksAgo)
            .delete();

        await IndexDB.db.players
            .where('date').below(sixWeeksAgo)
            .delete();

        let LeftPlayers = await IndexDB.db.players
            .where('id').above(0)
            .keys();

        await IndexDB.db.greatbuildings
            .where('playerId').noneOf(LeftPlayers)
            .delete();
    },


    /**
	 * Add user from PlayerDict if not added, without era information
	 *
	 * @param playerId
	 * @returns {Promise<void>}
	 */
    addUserFromPlayerDictIfNotExists: async(playerId, updateDate) => {
        const playerFromDB = await IndexDB.db.players.get(playerId);
        if (!playerFromDB) {
            let player = PlayerDict[playerId];
            if (player) {
                await IndexDB.db.players.add({
                    id: playerId,
                    name: player.PlayerName,
                    clanId: player.ClanId || 0,
                    clanName: player.ClanName,
                    avatar: player.Avatar,
                    era: 'unknown', // Era can be discovered when user is visited, not now
                    date: new Date(),
                });
            }
        }
        else if (updateDate) {
            IndexDB.db.players.update(playerId, {
                date: new Date()
            });
        }
    },
};
