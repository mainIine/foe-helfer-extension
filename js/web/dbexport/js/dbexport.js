function progressCallback({ totalRows, completedRows }) {
    let percent = Math.ceil((completedRows / totalRows) * 100);
    $("#dbex-loading-data .message span.countRows").html(completedRows);
    $("#dbex-loading-data .message span.totalRows").html(totalRows);
    $("#dbex-loading-data .message .progressbar .state").css("width", `${percent}%`);
}

let DBExport = {
    allDB: undefined,
    CurrentTab: 'Export',

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

        $('#DBExport').on('click', '.toggle-group', function () {

            DBExport.CurrentTab = $(this).data('value');

            $("#dbexTabs").find("li").removeClass("active");
            $(this).parent().addClass("active");
            DBExport.showPreloader('#DBExport');
            DBExport.Show();

        });
        DBExport.showPreloader('#DBExport');
        DBExport.Show();
    },


    Show: async () => {

        let h = [];

        h.push('<div class="tabs dark-bg"><ul id="dbexTabs" class="horizontal">');
        h.push(`<li${DBExport.CurrentTab === 'Export' ? ' class="active"' : ''}><a class="toggle-group" data-value="Export"><span>${i18n('Boxes.DBExport.Export')}</span></a></li>`);
        h.push(`<li${DBExport.CurrentTab === 'Import' ? ' class="active"' : ''}><a class="toggle-group" data-value="Import"><span>${i18n('Boxes.DBExport.Import')}</span></a></li>`);
        h.push(`</ul></div>`);

        h.push('<div id="dbexport_wrapper">');
        h.push('</div>');

        $('#DBExportBody').html(h.join('')).promise().done(function () {

            switch (DBExport.CurrentTab)
            {
                case 'Export':
                    DBExport.ShowExportGroup();
                    break;
                case 'Import':
                    DBExport.ShowImportGroup();
                    break;
            }
        });
    },


    ShowExportGroup: async () => {

        let h = [];
        let DBInfo = await DBExport.GetDBInfo();
        h.push(`<table id="dbex_ExportTable" class="foe-table"><thead><th><input id="dbex_toggleCheckbox" type="checkbox" value="1" checked="checked" /></th><th>${i18n('Boxes.DBExport.Description')}</th><th>${i18n('Boxes.DBExport.Type')}</th><th>${i18n('Boxes.DBExport.Tables')}</th><th>${i18n('Boxes.DBExport.Records')}</th></thead><tbody>`);

        // Local Storage
        h.push(`<tr><td><input class="inpExport" type="checkbox" value="1"  data-type="localsettings" data-value="localsettings" checked="checked" /></td><td>${i18n('Boxes.DBExport.LocalSettings')}</td><td>local storage</td><td>0</td><td>${localStorage.length}</td></tr>`);

        // IndexDBs
        const databases = DBInfo;
        databases.forEach(item => {
            item = Object.values(item)[0];
            h.push(`<tr><td><input class="inpExport" type="checkbox" value="1" data-type="indexdb" data-value="${item.dbname}" checked="checked" /></td><td>${item.dbname}</td><td>indexDB</td><td>${item.tableCount}</td><td>${item.rowCount}</td></tr>`);
        });

        h.push(`</tbody></table>`);

        h.push(`<button class="btn btn-default" id="dbex_ExportSelection" href="#">${i18n('Boxes.DBExport.ExportData')}</button>`);

        $('#dbexport_wrapper').html(h.join('')).promise().done(function () {

            $('#dbex_ExportTable tbody tr').off('click').on('click', function (e) {
                var $cell = $(e.target).closest('td');
                if ($cell.index() > 0)
                {
                    let checkbox = $(this).find('input.inpExport');
                    if ($(checkbox).prop('checked')) { $(checkbox).prop('checked', false); }
                    else { $(checkbox).prop('checked', true); }
                }
            });

            $('#dbex_toggleCheckbox').off('click').on('click', function (e) {
                if (this.checked)
                {
                    $('#dbex_ExportTable').find('.inpExport').each(function () { //loop through each checkbox
                        $(this).prop('checked', true);
                    });
                } else
                {
                    $('#dbex_ExportTable').find('.inpExport').each(function () { //loop through each checkbox
                        $(this).prop('checked', false);
                    });
                }
            });

            $('#dbex_ExportSelection').off('click').on('click', async function () {
                let data = {};

                let indexdbnames = $("#DBExport .inpExport[data-type=indexdb]:checkbox:checked").map(function () {
                    return $(this).data('value');
                }).get();

                data.indexdb = indexdbnames.length ? indexdbnames : undefined;

                let localSettings = $("#DBExport .inpExport[data-type=localsettings]:checkbox:checked").map(function () {
                    return $(this).data('value');
                }).get();

                data.localStorage = localSettings.length ? true : false;

                if (!data.indexdb && !data.localStorage) 
                {
                    DBExport.hidePreloader();
                    return;
                }

                DBExport.showPreloader('#DBExport');
                DBExport.ExportSelection(data);

            });

            DBExport.hidePreloader();
        });

    },

    ShowImportGroup: async () => {
        let h = [];

        h.push(`<label for="dbex_fileupload" tabindex="1" role="button"><div id="dbex_dropzone">${i18n('Boxes.DBExport.ImportDescription')}</div></label>`);
        h.push(`<input type="file" name="file" id="dbex_fileupload"></input>`);

        h.push(`<div id="debex_import_wrapper"></div>`);

        $('#dbexport_wrapper').html(h.join('')).promise().done(function () {

            DBExport.hidePreloader();
            const dropZoneDiv = document.getElementById('dbex_dropzone');
            const fileUpload = document.getElementById('dbex_fileupload');
            let file = undefined;
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
                $("#debex_import_wrapper").html('');
                DBExport.showPreloader('#DBExport');

                // Pick the File from the drop event (a File is also a Blob):
                file = ev.dataTransfer.files[0];

                DBExport.UploadFile(file);
            }

            fileUpload.onchange = async ev => {
                ev.stopPropagation();
                ev.preventDefault();
                $("#debex_import_wrapper").html('');
                DBExport.showPreloader('#DBExport');
                file = fileUpload.files[0];
                DBExport.UploadFile(file);
            };
        });
    },


    UploadFile: async (file) => {
        try
        {
            let SuccessState = 1;
            if (!file || !file.name || !file.type || (file.type !== 'application/json' && file.type !== 'application/zip' && file.type !== 'application/x-zip-compressed'))
            {
                $("#debex_import_wrapper").html(`<p class="error">${i18n('Boxes.DBExport.ImportFileError')}</p>`);
                DBExport.hidePreloader();
                return;
            }
            let promises = [];

            switch (file.type)
            {
                case 'application/json':

                    $("#dbex-loading-data .message").html('<span class="progress">1 / 1</span>' +
                        '<div class="progressbar"><div class="state"></div></div>');

                    // check for localStorage
                    if (file.name.search('localStorage') == 4 || file.name.search('localStorage') == 5)
                    {
                        await DBExport.ImportLocalStorage(file, file.name);
                        $("#debex_import_wrapper").append(`<p class="success">${i18n('Boxes.DBExport.ImportSuccessful')}</p>`);
                        DBExport.hidePreloader();
                        break;
                    }

                    let World = file.name.slice(0, file.name.indexOf('_'));
                    let response = await DBExport.ImportDexieDB(file, World);

                    if (response < SuccessState) { SuccessState = response; }

                    let SuccessMessage = SuccessState === 1 ? i18n('Boxes.DBExport.ImportSuccessful') : (SuccessState === 0 ? i18n('Boxes.DBExport.ImportPartlySuccessful') : i18n('Boxes.DBExport.ImportFileError'));
                    $("#debex_import_wrapper").append(`<p class="success">${SuccessMessage}</p>` +
                        `<p><button onclick="location.reload();" class="btn-default">${i18n('Boxes.DBExport.ReloadPage')}</button></p>`);

                    DBExport.hidePreloader();
                    break;

                case 'application/zip':
                case 'application/x-zip-compressed':

                    await JSZip.loadAsync(file)
                        .then(function (zip) {
                            const exportCounter = Object.keys(zip.files).length;
                            let exportState = 0;
                            $("#dbex-loading-data .message").html('<span class="progress">' + exportState + ' / ' + exportCounter + '</span>' +
                                '<div class="progressbar"><div class="state"></div></div>');
                            zip.forEach(async function (relativePath, zipEntry) {

                                let response = undefined;
                                return Promise.all([
                                    promises.push(zip.file(zipEntry.name).async("blob").then(async function (blob) {

                                        if (zipEntry.name.search('localStorage') == 4 || zipEntry.name.search('localStorage') == 5)
                                        {
                                            $("#dbex-loading-data .message").html('<span class="progress">' + (++exportState) + ' / ' + exportCounter + '</span>' +
                                                '<div class="progressbar"><div class="state" style="width:50%;"></div></div>');
                                            response = await DBExport.ImportLocalStorage(blob, zipEntry.name);

                                        }
                                        else
                                        {
                                            $("#dbex-loading-data .message").html('<span class="progress">' + (++exportState) + ' / ' + exportCounter + '</span>' +
                                                '<div class="progressbar"><div class="state"></div></div>');
                                            let World = zipEntry.name.slice(0, zipEntry.name.indexOf('_'));
                                            response = await DBExport.ImportDexieDB(blob, World);
                                        }

                                        if (response < SuccessState)
                                        {
                                            SuccessState = response;
                                        }

                                    }))]
                                );
                            });

                        }, function (e) {
                            console.log(e);
                        });

                    Promise.all(promises).then(function () {
                        let SuccessMessage = SuccessState === 1 ? i18n('Boxes.DBExport.ImportSuccessful') : (SuccessState === 0 ? i18n('Boxes.DBExport.ImportPartlySuccessful') : i18n('Boxes.DBExport.ImportFileError'));
                        $("#debex_import_wrapper").append(`<p class="success">${SuccessMessage}</p>` +
                            `<p><button onclick="location.reload();" class="btn-default">${i18n('Boxes.DBExport.ReloadPage')}</button></p>`);
                        DBExport.hidePreloader();
                    });
                    break;
            }
        }
        catch (error)
        {
            console.error('' + error);
        }
    },


    ImportLocalStorage: async (blob, filename) => {

        const excludeKeys = ['current_world', 'current_player_name', 'current_player_id', 'current_guild_id'];
        let fileContent = await blob.text();
        let json = JSON.parse(fileContent);

        Object.keys(json).forEach(function (k) {
            if (!excludeKeys.includes(k) && k.indexOf("forgeofempires.com") === -1)
            {
                localStorage.setItem(k, json[k]);
            }
        });
        $("#debex_import_wrapper").append(`<p class="success">${filename} <span class="icon success"></span></p>`);
    },


    ImportDexieDB: async (blob, World) => {

        let DexieDB = new Dexie();
        const importMeta = await DexieDB.peek(blob);

        if (!importMeta || !importMeta.data)
        {
            $("#debex_import_wrapper").append(`<p class="error"><span class="icon error">X</span><span class="errmsg">${i18n('Boxes.DBExport.ImportFileError')}</span></p>`);
            return 0;
        }

        let dbName = importMeta.data.databaseName ? importMeta.data.databaseName : '';

        try
        {
            // check if DB has the right PlayerID and World
            let Filename = dbName.split(/_/);
            let ImportPlayerID = Array.isArray(Filename) ? parseInt(Filename.pop()) : undefined;

            if (ExtPlayerID !== ImportPlayerID)
            {
                $("#debex_import_wrapper").append(`<p class="error">${dbName} <span class="icon error">X</span><span class="errmsg">${i18n('Boxes.DBExport.WrongDBPlayerID')}</span></p>`);
                return 0;
            }

            if (ExtWorld !== World)
            {
                $("#debex_import_wrapper").append(`<p class="error">${dbName} <span class="icon error">X</span><span class="errmsg">${i18n('Boxes.DBExport.WrongDBWorld')}</span></p>`);
                return 0;
            }

            // Import File
            let importDB = await new Dexie(dbName);

            await importDB.delete();

            importDB = await Dexie.import(blob, {
                progressCallback
            });

            $("#debex_import_wrapper").append(`<p class="success">${dbName} <span class="icon success"></span></p>`);
            return 1;
        }
        catch (error)
        {
            $("#debex_import_wrapper").append(`<p class="error">${dbName} <span class="icon error">X</span><span class="errmsg">${i18n('Boxes.DBExport.ImportFileError')}</span></p>`);
            console.error('' + error);
            return 0;
        }
    },


    GetDBInfo: async () => {

        DBExport.allDB = await Dexie.getDatabaseNames();
        let DBInfo = [];

        await Promise.all(
            DBExport.allDB.map(async (dbname) => {
                let DexieDB = await new Dexie(dbname);

                await DexieDB.open();
                let tables = await Promise.all(DexieDB.tables.map(async table => ({
                    count: await table.count()
                })));

                let results = tables.reduce(function (res, obj) {
                    if (res[dbname] === undefined)
                    {
                        res[dbname] = {};
                        res[dbname].dbname = dbname;
                        res[dbname].tableCount = 0;
                        res[dbname].rowCount = 0;
                    }
                    res[dbname].tableCount += 1;
                    res[dbname].rowCount += obj.count;

                    return res;
                }, {});

                DBInfo.push(results);
            })
        );

        return DBInfo;
    },


    ExportSelection: async (data) => {

        let zip = new JSZip();
        let exportCounter = 0;
        let exportState = 0;
        let saveIndexDB = data.indexdb && data.indexdb.length ? true : false;
        let saveLocalStorage = data.localStorage === true ? true : false;

        if (!data || (!data.indexdb && !data.localStorage))
        {
            DBExport.hidePreloader();
            return;
        }

        exportCounter = parseInt(saveIndexDB ? data.indexdb.length : 0) + parseInt(saveLocalStorage ? 1 : 0);

        $("#dbex-loading-data .message").html('<span class="progress">' + exportState + ' / ' + exportCounter + '</span>' +
            '<div class="progressbar"><div class="state"></div></div>');

        if (data.localStorage === true)
        {
            let localStorageJSON = JSON.stringify(localStorage, null, 2);
            let localStorageBlob = new Blob([localStorageJSON], { type: "application/json" });
            $("#dbex-loading-data .message span.progress").html((++exportState) + ' / ' + exportCounter);
            if (exportCounter > 1)
            {
                zip.file(ExtWorld + '_localStorage_' + moment().format("YYYYMMDD-HHmmss") + ".json", localStorageBlob);
            }
            else
            {
                download(localStorageBlob, ExtWorld + '_localStorage_' + moment().format("YYMMDD-HHmm") + "_" + ExtPlayerID + ".json", "application/json");
            }

        }

        if (saveIndexDB)
        {

            for (let i in data.indexdb)
            {
                if (!data.indexdb.hasOwnProperty(i))
                {
                    continue;
                }

                const database = data.indexdb[i];
                let DexieDB = await new Dexie(database);
                await DexieDB.open();
                try
                {
                    const blob = await DexieDB.export({ prettyJson: true, progressCallback });
                    if (exportCounter > 1)
                    {
                        zip.file(ExtWorld + '_' + DexieDB.name + ".json", blob);
                    }
                    else
                    {
                        download(blob, ExtWorld + '_' + DexieDB.name + ".json", "application/json")
                    }
                    $("#dbex-loading-data .message span.progress").html((++exportState) + ' / ' + exportCounter);
                    await DexieDB.close();
                }
                catch (error)
                {
                    console.error('' + error);
                }
            }
        }
        $("#dbex-loading-data .message .progressbar").html(i18n('Boxes.DBExport.Compression'));
        if (exportCounter > 1)
        {
            zip.generateAsync({ type: "blob", compression: "DEFLATE" })
                .then(function (blob) {
                    download(blob, ExtWorld + "_foe_helper_export_" + moment().format("YYMMDD-HHmm") + "_" + ExtPlayerID + ".zip", "application/zip");
                    DBExport.hidePreloader();
                });
        }
        else
        {
            DBExport.hidePreloader();
        }
    },


    showPreloader: (id) => {

        if (!$('#dbex-loading-data').length)
        {
            $(id).append('<div id="dbex-loading-data"><div class="message"></div><div class="loadericon"></div></div>');
        }

    },


    hidePreloader: () => {

        $('#dbex-loading-data').fadeOut(600, function () {
            $(this).remove();
        });

    }
}