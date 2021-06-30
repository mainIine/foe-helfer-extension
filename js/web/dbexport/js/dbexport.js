//
// When document is ready, bind export/import funktions to HTML elements
//
document.addEventListener('DOMContentLoaded', () => {
    showContent().catch(err => console.error('' + err));
    const dropZoneDiv = document.getElementById('dropzone');
    const exportLink = document.getElementById('exportLink');
    // Configure exportLink
});

function progressCallback({ totalRows, completedRows }) {
    console.log(`Progress: ${completedRows} of ${totalRows} rows completed`);
}

let DBExport = {

    selectedDB: undefined,
    allDatabases: undefined,


    BuildBox: (event) => {
        if ($('#DBExport').length === 0)
        {
            HTML.Box({
                id: 'DBExport',
                title: i18n('Boxes.DBExport.Title'),
                auto_close: true,
                dragdrop: true,
                resize: true,
                minimize: true
            });

            HTML.AddCssFile('dbexport');
        } else if (!event)
        {
            HTML.CloseOpenBox('DBExport');
            return;
        }
        DBExport.Show();
    },


    Show: async () => {
        let h = [];

        DBExport.allDatabases = await Dexie.getDatabaseNames();
        const databases = DBExport.allDatabases;


        h.push('<div id="dbexport_wrapper">');
        h.push('<p>Bitte eine Datenbank auswählen</p>');
        h.push(`<select id="selDexieDB" name="dexiedb"><option value=""${DBExport.selectedDB === undefined ? ' selected="selected"' : ''}>Bitte eine Datenbank auswählen</option>`);

        databases.forEach(item => {
            h.push(`<option value="${item}"${DBExport.selectedDB === item ? ' selected="selected"' : ''}>${item}</option>`);
        });

        h.push(`</select>`);
        h.push('</p><div id="databaseInfo"></div>');

        $('#DBExportBody').html(h.join('')).promise().done(function () {

            $("#selDexieDB").off('change').on('change', function () {
                let selected = $(this).val().trim();
                if (selected.length)
                {
                    DBExport.selectedDB = $(this).val().trim();
                    DBExport.Show();
                }
                return;
            });



            if (DBExport.selectedDB !== undefined)
            {
                DBExport.ShowTableData();


            }
            else
            {
                $('#DBExportBody #databaseInfo').html("");
            }
        });

        DBExport.hidePreloader();
    },


    FullExport: async () => {
        let fullBlob = [];

        let localStorageJSON = JSON.stringify(localStorage, null, 2);
        let localStorageBlob = new Blob([localStorageJSON], { type: "application/json" });

        download(localStorageBlob, ExtWorld + '_localStorage_' + moment().format("YYYYMMDD-HHmmss") + ".json", "application/json");

        for (let i in DBExport.allDatabases)
        {
            if (!DBExport.allDatabases.hasOwnProperty(i))
            {
                continue;
            }

            const database = DBExport.allDatabases[i];
            let DexieDB = await new Dexie(database);

            await DexieDB.open();

            try
            {
                const blob = await DexieDB.export({ prettyJson: true, progressCallback });
                fullBlob.push(blob);
                console.log(blob);
                download(blob, ExtWorld + '_' + DexieDB.name + "_" + moment().format("YYYYMMDD-HHmmss") + ".json", "application/json");
                await DexieDB.close();
            }
            catch (error)
            {
                console.error('' + error);
            }
        }

        DBExport.hidePreloader();
    },


    ShowTableData: async () => {

        if (DBExport.selectedDB !== undefined)
        {
            let c = [];
            let DexieDB = await new Dexie(DBExport.selectedDB);
            await DexieDB.open();

            //const tbody = document.getElementById('dbexportstable');
            const tables = await Promise.all(DexieDB.tables.map(async table => ({
                name: table.name,
                count: await table.count(),
                primKey: table.schema.primKey.src
            })));

            c.push(`<div class="column"><h2>Datenbank: ${DexieDB.name}</h2>` +
                `<p><button class="btn btn-default" id="exportLink" href="#">Klicke hier um die Datenbank zu exportieren.</button>` +
                `<button class="btn btn-default" id="exportFull" href="#">Klicke hier um alle Daten zu exportieren.</button></p>` +
                `<div id="dropzone">Ziehe eine lokale ${DexieDB.name.replace('_' + ExtPlayerID, '')}.json hier herein, um die Datenbank zu importieren.</div></div>` +
                `<div class="column"><h3>Datenbank Übersicht</h3>` +
                `<table class="foe-table"><thead><th>Tabellenname</th><th>Primärschlüssel</th><th>Anzahl der Zeilen</th></thead>` +
                `<tbody>`);

            tables.map(({ name, count, primKey }) => { c.push(`<tr><td>Table: "${name}"</td><td>${primKey}</td><td>${count}</td></tr>`) });
            c.push(`</tbody></table></div>`);

            $('#DBExportBody #databaseInfo').html(c.join('')).promise().done(function () {

                $('#exportLink').off('click').on('click', async function () {
                    DBExport.showPreloader('#DBExport');

                    try
                    {
                        const blob = await DexieDB.export({ prettyJson: true, progressCallback });
                        console.log(blob);
                        download(blob, DexieDB.name + "_" + moment().format("YYYYMMDD-HHmmss") + ".json", "application/json");
                        DBExport.hidePreloader();
                    }
                    catch (error)
                    {
                        console.error('' + error);
                    }

                });

                $('#exportFull').off('click').on('click', async function () {

                    DBExport.showPreloader('#DBExport');
                    await DBExport.FullExport();

                });



                const dropZoneDiv = document.getElementById('dropzone');
                // Configure dropZoneDiv

                dropZoneDiv.ondragover = event => {
                    event.stopPropagation();
                    event.preventDefault();
                    event.dataTransfer.dropEffect = 'copy';
                };

                // Handle file drop:
                dropZoneDiv.ondrop = async ev => {
                    ev.stopPropagation();
                    ev.preventDefault();
                    DBExport.showPreloader('#DBExport');

                    // Pick the File from the drop event (a File is also a Blob):
                    const file = ev.dataTransfer.files[0];

                    try
                    {
                        if (!file) throw new Error(`Only files can be dropped here`);

                        console.log("Importing " + file.name);
                        const importMeta = await DexieDB.peek(file);

                        //Abort Import if selected DB != File DB
                        if (!importMeta || !importMeta.data || importMeta.data.databaseName !== DBExport.selectedDB)
                        {
                            console.log("Import aborted: wrong file for selected DB");
                            DBExport.hidePreloader();
                            return;
                        }

                        // Delete existing DB
                        console.log("Delete existing " + importMeta.data.databaseName)
                        await DexieDB.delete();

                        console.log("Import DB " + importMeta.data.databaseName + " from file")

                        DexieDB = await Dexie.import(file, {
                            progressCallback
                        });

                        console.log("Import complete");

                        await DBExport.Show();
                    }
                    catch (error)
                    {
                        console.error('' + error);
                    }
                }
            });

        }

    },

    showPreloader: (id) => {

        if (!$('#dbex-loading-data').length)
        {
            $(id).append('<div id="dbex-loading-data"><div class="loadericon"></div></div>');
        }

    },


    hidePreloader: () => {

        $('#dbex-loading-data').fadeOut(600, function () {
            $(this).remove();
        });

    }
}