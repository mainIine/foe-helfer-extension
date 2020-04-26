/*
 * **************************************************************************************
 *
 * Dateiname:                 indexdb.js
 * Projekt:                   foe-chrome
 *
 * erstellt von:              Daniel Siekiera <daniel.siekiera@gmail.com>
 * erstellt am:               07.04.20, 21:58 Uhr
 * zuletzt bearbeitet:        07.04.20, 15:46 Uhr
 *
 * Copyright 2020
 *
 * **************************************************************************************
 */

/*
*   "pvpActions" structure
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
*       resources: Object, //
*       doublePlunder: boolean | undefined, // double plunder bonus is applied or not
*       doublePlunderApplied: boolean // true when double bonus is applied
*       sp: number, * strategy points
*       important: boolean, // if not supplies or money only
*       entityId: number, // foe city entity Id
*       buildId: string, // key for BuildingNamesi18n
*   }
*   OR
*   {
*       type: Plunderer.ACTION_TYPE_SHIELDED,
*       playerId: number,
*       date: Date,
*       expireTime: number, // timestamp. usage: new Date(expireTime * 1000)
*   }
*   where Unit =
*   {
*       startHP: number, // usually 10
*       endHp: number,
*       attBoost: number,
*       defBoost: number,
*       unitTypeId: string,
*       ownerId: number, // other player id
*   }
*
*   "players" structure
*   {
*       id: number,
*       name: string,
*       clanId: number, // 0 if no clan
*       clanName: string | undefined,
*       avatar: string,
*       era: string | 'unknown',
*       date: new Date(), // last visit date
*   }
*
*   "greatbuildings" structure
*   {
*       id: number,
*       playerid: number,
*       name: string,
*       level: number,
*       currentfp: number,
*       bestratenettofp: number
*       bestratecosts: number,
*       date: new Date(), // last visit date
*   }
*  "statsGBGPlayers", Battle ground leader board
* {
*   date: Date,
*   players: {
*       id: number, // player id
*       n: number, // negotiations won
*       b: number, // battles won,
*       r: number, // rank
*   }[]
* }
* Structure of "statsGBGPlayerCache". Battle ground player cache
* {
*   id: number, // player id
*   name: string,
*   avatar: string,
*   date: Date
* }
* Structure of "statsRewards" db
* {
*   date: Date,
*   type: 'battlegrounds_conquest' | 'guildExpedition' | 'spoilsOfWar' | 'diplomaticGifts',
*   amount: number,
*   reward: string, // eg. resource#strategy_points#10
* }
* Structure "statsRewardTypes" db is same FOE "GenericReward" class
* {
*   "id": "premium_50",
*   "name": "50 Бриллиантов",
*   "description": "",
*   "iconAssetName": "diamond",
*   "isHighlighted": true,
*   "flags": ["rare"], // Note: flag is not rarity of guild expedition reward
*   "type": "resource",
*   "subType": "premium",
*   "amount": 50,
* }
* Structure of "statsUnitsD", "statsUnitsH"
* {
*   date: Date,
*   army: Object // key - id of unit, value - number of units
* }
* Structure of "statsTreasurePlayerH", "statsTreasurePlayerD" DBs
* {
*   date: Date,
*   resources: Object, // key is id of resource
* }
* Structure of "statsTreasureClanH", "statsTreasureClanD" DBs
* {
*   date: Date,
*   resources: Object,
*   clandId: number
* }
*/

let IndexDB = {
    db: null,

    _dbPromise: new Promise(resolveCb => window._dbPromiseResolver = resolveCb),

    /**
     * Resolve db when ready for using.
     * SHOULD be always used in FoEproxy.addHandler.
     * In Boxes you can use IndexDB.db
     * @returns {Promise<void>}
     */
    getDB: () => {
        return IndexDB._dbPromise;
    },

    Init: async (playerId) => {
        const primaryDBName = 'FoeHelperDB_' + playerId; //Create different IndexDBs if two players are sharing the same PC playing on the same world
        const isNewDB = !await Dexie.exists(primaryDBName);

        const db = IndexDB.db = new Dexie(primaryDBName);
        IndexDB._applyIndexSchema(db);
        db.open();

        try {
            if (isNewDB) {
                await IndexDB.mergeDatabases(playerId);
            }
        } catch (e) {
            console.error(e);
        }
        window._dbPromiseResolver(db);

        setTimeout(() => {
            IndexDB.GarbageCollector();
        }, 10 * 1000);
    },

    // DB index schema
    _applyIndexSchema(db) {
        db.version(1).stores({
            players: 'id,date',
            pvpActions: '++id,playerId,date,type',
            greatbuildings: '++id,playerId,name,&[playerId+name],level,currentFp,bestRateNettoFp,bestRateCosts,date',

            statsGBGPlayers: 'date', // battleground
            statsGBGPlayerCache: 'id, date', // Cache of players for using in gbgPlayers
            statsRewards: 'date', // Collected rewards by Himeji, etc
            statsRewardTypes: 'id', // Human readable cache info about rewards
            statsUnitsD: 'date',
            statsUnitsH: 'date',
            statsTreasurePlayerH: 'date',
            statsTreasurePlayerD: 'date',
            statsTreasureClanH: 'date, clanId',
            statsTreasureClanD: 'date, clanId',
        });
    },

    /**
     * Database migration util function. Should be called once
     */
    mergeDatabases: async (playerId) => {
        // Skip if main db is not empty
        if (await IndexDB.db.players.count()) { return; }
        clearLog();

        log('Looks like your db is empty, trying to populate db using old databases');

        let betaDB = null;
        let masterDB = null;
        let statsDB = null;

        // DB from beta
        const betaDBName = 'FoeHelper_' + playerId;
        if (await Dexie.exists(betaDBName)) {
            betaDB = new Dexie(betaDBName);
            betaDB.version(1).stores({
                players: 'id,date',
                actions: '++id,playerId,date,type',
                greatbuildings: '++id,playerId,name,&[playerId+name],level,currentFp,bestRateNettoFp,bestRateCosts,date',
            });
            betaDB.open();
            if (!(await betaDB.players.count())) {
                betaDB = null;
            }
        }

        // Database from master
        const masterDBName = 'PlayerDB';
        if (await Dexie.exists(masterDBName)) {
            masterDB = new Dexie(masterDBName);
            masterDB.version(7).stores({
                players: 'id,date',
                actions: '++id,playerId,date,type'
            });
            masterDB.version(6).stores({
                players: 'id',
                actions: '++id,playerId,date,type'
            });
            masterDB.open();
            if (!(await masterDB.players.count())) {
                masterDB = null;
            }
        }

        // Stats db, beta
        const statsDBName = 'StatsDb';
        if (await Dexie.exists(statsDBName)) {
            statsDB = new Dexie(statsDBName);
            statsDB.version(4).stores({
                // battleground
                gbgPlayers: 'date', // battleground
                playerCache: 'id, date', // Cache of players for using in gbgPlayers
                // rewards
                rewards: 'date', // Collected rewards by Himeji, etc
                rewardTypes: 'id', // Human readable cache info about rewards
                // units
                unitsDaily: 'date',
                units: 'date',
                // treasure player
                treasurePlayer: 'date',
                treasurePlayerDaily: 'date',
                // treasure clan
                treasureClan: 'date, clanId',
                treasureClanDaily: 'date, clanId',
            });
            statsDB.open();
            if (!(await  statsDB.treasurePlayer.count())) {
                statsDB = null;
            }
        }

        if (betaDB) {
            log(`Found DB "${betaDBName}"`)
            await cloneTables(betaDB, {
                players: 'players',
                pvpActions: 'actions',
                greatbuildings: 'greatbuildings'
            });
        } else if (masterDB) {
            log(`Found DB "${masterDBName}"`)
            await cloneTables(masterDB, {
                players: 'players',
                pvpActions: 'actions',
            });
        }
        if (statsDB) {
            log(`Found DB "${statsDBName}"`)
            await cloneTables(statsDB, {
                statsGBGPlayers: 'gbgPlayers',
                statsGBGPlayerCache: 'playerCache',
                statsRewards: 'rewards',
                statsRewardTypes: 'rewardTypes',
                statsUnitsD: 'unitsDaily',
                statsUnitsH: 'units',
                statsTreasurePlayerH: 'treasurePlayer',
                statsTreasurePlayerD: 'treasurePlayerDaily',
                statsTreasureClanH: 'treasureClan',
                statsTreasureClanD: 'treasureClanDaily',
            });
        }
        log('Deleting old databases');
        await Dexie.delete(betaDBName);
        await Dexie.delete(masterDBName);
        await Dexie.delete(statsDBName);
        log('Done.');

        // Copy tables.
        // Basicly this is not transaction safe to bulkAdd, but we can ignore it because
        // `await getDb()` is used before insert or update.
        async function cloneTables(source, tables) {
            const destTables = Object.keys(tables);
            for (let destTable of destTables) {
                const sourceTable = tables[destTable];
                log(`  Copy ${sourceTable} => ${destTable}...`);
                await IndexDB.db[destTable].clear();
                await IndexDB.db[destTable].bulkAdd(await source[sourceTable].toArray());
            }
        }

        function clearLog() {
            localStorage.setItem('FH_IndexDBLastMigraion', '');
        }

        function log(text) {
            console.log('mergeDatabases: ' + text);
            let logTxt = localStorage.getItem('FH_IndexDBLastMigraion') || '';
            logTxt += text + '\n';
            localStorage.setItem('FH_IndexDBLastMigraion', logTxt);
        }
    },

    /**
     * Util function for making backup of db easier
     * @example
     *   // copy with name + _copy
     *   IndexDB.cloneDB('PlayerDB');
     *   // equals to
     *   IndexDB.cloneDB('PlayerDB', 'PlayerDB_copy');
     *   // copy and set version to 1
     *   IndexDB.cloneDB('PlayerDB', 'PlayerDB_copy', 1);
     */
    cloneDB: async (srcName, dstName, version) => {
        dstName = dstName || srcName + '_copy';
        const sdb = new Dexie(srcName),
              ddb = new Dexie(dstName);

        if (await Dexie.exists(dstName)) {
            console.error(`Aborted. Please firstly delete "${dstName}" before continue.`);
            return false;
        }

        return sdb.open().then(() => {
            // Clone scheme
            version = version || sdb.verno;
            console.log(`Cloning DB "${srcName}" v${sdb.verno} => "${dstName}" v${version}`);

            console.log('Dumping schema...');
            const schema = sdb.tables.reduce((result, table) => {
                console.log(` => ${table.name}...`);
                result[table.name] = (
                    [table.schema.primKey]
                        .concat(table.schema.indexes)
                        .map(indexSpec => indexSpec.src)
                ).toString();
                return result;
            }, {});
            console.log('Schema:', schema);
            ddb.version(version).stores(schema);

            return sdb.tables.reduce(
                (result, table) => result
                    .then(() => console.log(`Cloning table ${table.name}...`))
                    .then(() => table.toArray())
                    .then(rows => ddb.table(table.name).bulkAdd(rows) ),
                Promise.resolve()
            ).then((x) => {
                sdb.close();
                ddb.close();
                console.log(`Clonning DB is finished, created "${dstName}"`);
            })
        });
    },

    /**
    * Remove old records from db to avoid overflow
    *
    * @returns {Promise<void>}
    */
    GarbageCollector: async () => {
        await IndexDB.getDB();

        // TODO: make dates configurable

        const pvpActionExpiryTime = moment().subtract(6, 'weeks').toDate();
        // Expiry time for db with 1 record per day
        const daylyExpiryTime = moment().subtract(1, 'years').toDate();
        // Expiry time for db with 1 record per hour
        const hourlyExpiryTime = moment().subtract(8, 'days').toDate();
        // Keep logs for guild battlegrounds for 2 weeks
        const gbgExpiryTime = moment().subtract(2, 'weeks').toDate();

        await IndexDB.db.pvpActions
            .where('date').below(pvpActionExpiryTime)
            .delete();

        // Remove expired city shields
        await IndexDB.db.pvpActions
            .where('type').equals(5)
            .and((item)=>{ return item.expireTime < moment().unix() })
            .delete();

        await IndexDB.db.players
            .where('date').below(pvpActionExpiryTime)
            .delete();

        let LeftPlayers = await IndexDB.db.players
            .where('id').above(0)
            .keys();

        await IndexDB.db.greatbuildings
            .where('playerId').noneOf(LeftPlayers)
            .delete();

        for (const table of ['statsRewards', 'statsUnitsD', 'statsTreasurePlayerD', 'statsTreasureClanD']) {
            await IndexDB.db[table].where('date').below(daylyExpiryTime).delete();
        }

        for (const table of ['statsUnitsH', 'statsTreasurePlayerH', 'statsTreasureClanH']) {
            await IndexDB.db[table].where('date').below(hourlyExpiryTime).delete();
        }

        for (const table of ['statsGBGPlayers', 'statsGBGPlayerCache']) {
            await IndexDB.db[table].where('date').below(gbgExpiryTime).delete();
        }
    },

    /**
     * Calculate estimated space used in db
     * In fact db is more compact than returned value because this is not json
     */
    calculateSpace: async () => {
        let totalSize = 0;
        const db = IndexDB.db;
        for (let table of db.tables.map(it => it.name)) {
            const data = await db[table].limit(20).toArray();
            const count = await db[table].count();
            const sizePerItemBytes = (new Blob([JSON.stringify(data)]).size) / data.length;
            totalSize += count * sizePerItemBytes;
        }
        return parseInt(totalSize);
    },

    /**
     * Add user from PlayerDict if not added, without era information
     *
     * @param playerId
     * @param updateDate
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
