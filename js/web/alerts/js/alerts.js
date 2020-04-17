/**
 * Project  foe-chrome
 * Date     2020-03-27
 * License  MIT
 *
 * @author  Tomas Vorobjov <contact@tomasvorobjov.com>
 *
 */

/* core */
// TODO - add main menu icon (hourglass?)
// TODO - add alerts settings/options box
//      * alert/notification suggestions (e.g. when the user clicks on a sector in GBG, suggest to create an alert when
//           the sector unlocks (the unlock time data is available when gbg data is loaded)
// TODO - add a box to display a list of active (and inactive) alerts --- something similar to gbg stats for example
// TODO - create a "New Alert" box to create/add a new alert
//          - fields: recurring (every x hours), notify x minutes before
// TODO - create an "Edit Alert" box to edit/delete alerts

// TODO - Options:
//          - checkbox to enable creating a new alert when you bid on an item at the antiques dealer
//          - checkbox to enable creating a new alert for a plundered neighbor (e.g. from the plunderer box)

/* nice to have */

// TODO - main menu item should show the next alert timer (hh:mm)
// TODO - implement a keyboard shortcut (one which inno will hopefully never use in-game) to pre-fill the New Alert
//          time based on the most recent time display, e.g. antiques dealer, or when a gbg sector opens, or a
//          building collection timer expires, etc.
// TODO - Alerts set up for collection (on GB or other buildings) should reset when the building's resources

let AlertsDB = new Dexie('foe_helper_alerts_database');
AlertsDB.version(1).stores({
    // [id,expires,title,body,repeat,persistent,tag,vibrate,actions]
    alerts: '++id,expires,tag'
});
AlertsDB.open();
// persistent alerts will be stored only once and the expires time will be updated before garbage collection so that
// all expired alerts can be removed without having to use compound indexes or "compound where = collection filtering)
// e.g. where('expires').above(_current_timestamp_) and where('persistent').equals('1') as that is not supported by Dixie.

// xhr listener: store gbg sector unlock times
// xhr listener: antique dealer (get the auction timer)

const BattlegroundSectorNames = {
    0: {title: "A1:M", name: "Mati Tudokk"},
    1: {title: "B1:O", name: "Ofrus Remyr"},
    2: {title: "C1:N", name: "Niali Diath"},
    3: {title: "D1:B", name: "Brurat Andgiry"},
    4: {title: "A2:S", name: "Sladisk Icro"},
    5: {title: "A2:T", name: "Tevomospa"},
    6: {title: "B2:S", name: "Subeblic"},
    7: {title: "B2:T", name: "Taspac"},
    8: {title: "C2:S", name: "Shadsterning"},
    9: {title: "C2:T", name: "Tayencoria"},
    10: {title: "D2:S", name: "Slandmonii"},
    11: {title: "D2:T", name: "Tachmazer"},
    12: {title: "A3:V", name: "Vobolize"},
    13: {title: "A3:X", name: "Xemga"},
    14: {title: "A3:Y", name: "Yelili"},
    15: {title: "A3:Z", name: "Zamva"},
    16: {title: "B3:V", name: "Vishrain"},
    17: {title: "B3:X", name: "Xidorpupo"},
    18: {title: "B3:Y", name: "Yepadlic"},
    19: {title: "B3:Z", name: "Zilsier"},
    20: {title: "C3:V", name: "Vilipne"},
    21: {title: "C3:X", name: "Xistan"},
    22: {title: "C3:Y", name: "Yeraim"},
    23: {title: "C3:Z", name: "Zeaslo"},
    24: {title: "D3:V", name: "Verdebu"},
    25: {title: "D3:X", name: "Xiwait"},
    26: {title: "D3:Y", name: "Yerat"},
    27: {title: "D3:Z", name: "Zilgypt"},
    28: {title: "A4:A", name: "A"},
    29: {title: "A4:B", name: "Bangma Mynia"},
    30: {title: "A4:C", name: "Cuatishca"},
    31: {title: "A4:D", name: "Dilandmoor"},
    32: {title: "A4:E", name: "Eda Monwe"},
    33: {title: "A4:F", name: "Frimoandbada"},
    34: {title: "A4:G", name: "Gosolastan"},
    35: {title: "A4:H", name: "Hasaint"},
    36: {title: "B4:A", name: "Aguime"},
    37: {title: "B4:B", name: "Bliclatan"},
    38: {title: "B4:C", name: "Capepesk"},
    39: {title: "B4:D", name: "Dalomstates"},
    40: {title: "B4:E", name: "Engthio"},
    41: {title: "B4:F", name: "Fradistaro"},
    42: {title: "B4:G", name: "Goima"},
    43: {title: "B4:H", name: "Hranreka"},
    44: {title: "C4:A", name: "A"},
    45: {title: "C4:B", name: "Bangne Casau"},
    46: {title: "C4:C", name: "Cagalpo"},
    47: {title: "C4:D", name: "Denwana"},
    48: {title: "C4:E", name: "Eastkiabumi"},
    49: {title: "C4:F", name: "Francedian"},
    50: {title: "C4:G", name: "Guayla"},
    51: {title: "C4:H", name: "Hoguay"},
    52: {title: "D4:A", name: "Arasruhana"},
    53: {title: "D4:B", name: "Basainti"},
    54: {title: "D4:C", name: "Camehermenle"},
    55: {title: "D4:D", name: "Dabiala"},
    56: {title: "D4:E", name: "Enggreboka"},
    57: {title: "D4:F", name: "Finnited"},
    58: {title: "D4:G", name: "Guayre Bhugera"},
    59: {title: "D4:H", name: "Honbo"}
};

let Alerts = function(){

    let tmp = {};

    tmp.debug = true;
    tmp.log = function(o){ if (tmp.debug){ console.log(o); } };

    tmp.db = AlertsDB;
    tmp.data = {
        add: (alert) => {
            // lets be explicit about the fields we want to add
            return tmp.db.alerts.add({
                title: alert.title,
                body: alert.body,
                expires: alert.expires,
                repeat: alert.repeat,
                persistent: alert.persistent,
                tag: '',
                vibrate: false,
                actions: null
            });
        },
        get: (id) => {
            return tmp.db.alerts.where('id').equals(id).first();
        },
        next: () => {
            return tmp.db.alerts.where('expires').above(Date.now()).reverse().first();
        },
        update: (id, changes) => {
            return tmp.db.alerts.update( id, changes );
        }
    };
    tmp.model = {
        antique: {
            auction: null,
            exchange: null,
        },
        battlegrounds :{
            provinces : null
        },
        neighbors: {}
    },
    tmp.timer = {
        nextAlert: null,
        isUpdating: false,
        setNext: (alert) => {
            if ( ! alert ){ alert = null; }
            tmp.timer.nextAlert = alert;
        },
        update: (timestamp) => {

            // make sure that we don't run more than one update on the db
            // this could happen if the db transaction is taking too long and the tmp.timer.update is executed before
            // the last update finished
            if ( !tmp.timer.isUpdating ) {

                tmp.timer.isUpdating = true;

                // get the next notification timestamp
                // we don't want to run the query every update!
                if ( tmp.timer.nextAlert === null ) {
                    tmp.log('tmp.timer.update: requesting the next alert');
                    tmp.data.next().then( function ( result ) {
                        tmp.timer.setNext( result );
                        tmp.timer.isUpdating = false;
                        tmp.log('tmp.timer.update: the next alert is set');
                        tmp.log(tmp.timer.nextAlert);
                    } );
                }
                else {
                    let next = tmp.timer.nextAlert.expires;
                    tmp.log(timestamp, next);
                    if ( timestamp > next ) {
                        // show the notification
                        tmp.log('--- notification ---');
                        tmp.log(tmp.timer.nextAlert);
                        // if the alert has a repeat value set update the alert's expire as old expiration + the repeat value
                        if ( tmp.timer.nextAlert.repeat > -1 ) {

                            let changes = {};
                            tmp.data.update( tmp.timer.nextAlert.id, changes ).then( function ( updated ) {
                                tmp.timer.setNext( null );
                                tmp.timer.isUpdating = false;
                            } );
                        }
                        else {
                            // reset the next alert
                            tmp.timer.setNext( null );
                            tmp.timer.isUpdating = false;
                        }
                    }
                    else {
                        tmp.timer.isUpdating = false;
                    }
                }
            }

            // do the visual updates only iff the box is visible
            if ( $( '#Alerts' ).length > 0 ) {
                // tmp.log( t );
            }
        }
    },
    tmp.web = {
        body: {
            build: () => {

                tmp.web.body.tabs.clean();
                $( '#AlertsBody' ).empty();

                tmp.web.body.tabs.addHead( 'alerts-tab-list', i18n( 'Boxes.Alerts.Tab.List' ) );
                tmp.web.body.tabs.addHead( 'alerts-tab-new', i18n( 'Boxes.Alerts.Tab.New' ) );
                tmp.web.body.tabs.addHead( 'alerts-tab-preferences', i18n( 'Boxes.Alerts.Tab.Preferences' ) );

                tmp.web.body.tabs.addContent( 'alerts-tab-list', tmp.web.body.tabs.tabListContent() );
                tmp.web.body.tabs.addContent( 'alerts-tab-new', tmp.web.body.tabs.tabNewContent() );
                tmp.web.body.tabs.addContent( 'alerts-tab-preferences', tmp.web.body.tabs.tabPreferencesContent() );

                // compile it all into html and inject
                let html = [];

                html.push( '<div class="alerts-tabs tabs">' );
                html.push( tmp.web.body.tabs.renderHead() );
                html.push( tmp.web.body.tabs.renderContent() );
                html.push( '</div>' );


                $( '#AlertsBody' ).html( html.join( '' ) ).promise().done( function () {
                    $( '.alerts-tabs' ).tabslet( {active: 1} );

                    tmp.web.body.tabs.updateAlerts();

                    // disable keydown propagation from the form so that the canvas (the game) is not getting the
                    // keyboard shortcuts (otherwise, it's impossible to type into input/textarea without affecting the game)
                    $('#AlertsBody').find('input').on('keydown', function(e){e.stopPropagation(); });
                    $('#AlertsBody').find('textarea').on('keydown', function(e){e.stopPropagation(); });

                    $('#AlertsBody').find('#alert-presets').on('change', function(){
                        let value = parseInt( $(this).val() );
                        let title = $('#alert-presets option:selected').text();
                        tmp.web.forms.actions.preset.set(value, '#alert-datetime');
                        tmp.web.forms.actions.preset.setTitle(title, '#alert-title');
                    });

                    $('#AlertsBody').find('#alert-body').on('propertychange input', function(){
                        tmp.web.forms.aux.textareaUpdateCounter('#alert-body','#alert-body-counter');
                    });


                    tmp.web.forms.aux.textareaUpdateCounter('#alert-body','#alert-body-counter');

                    $('#AlertsBody').find('span.button-create-alert').on('click', function(){
                        tmp.web.forms.actions.create();
                    });

                    $('#AlertsBody').find('span.button-preview-alert').on('click', function(){
                        tmp.web.forms.actions.previewNew();
                    });

                    $('#AlertsBody').find('span.datetime-preset').on('click', function(){
                        let value = $(this).attr('data-time');
                        tmp.web.forms.actions.preset.add(value,'#alert-datetime');
                    });

                    $('#alert-datetime').on('change keyup paste', function(){
                        tmp.web.forms.actions.update();
                    });

                    tmp.web.forms.actions.init('#alert-datetime');

                });

                tmp.web.body.overlay.permissions.render();
            },
            overlay: {
                permissions: {
                    render: () => {

                        // remove an overlays currently present (if any)
                        $('#AlertsBody .no-permission').remove();

                        if ( ! NotificationManager.isEnabled ){

                            let html = '';

                            // if the notification permissions have never been given (permission === 'default')
                            if ( NotificationManager.canBeEnabled ){
                                // Enable notifications in your browser to use this feature.
                                html += '<p>' + i18n('Boxes.Alerts.Disabled.Default') + '</p>';
                                // Add a button to request notification permissions
                                html += '<p><span class="btn-default game-cursor notification-permissions">' + i18n('Boxes.Alerts.Button.Enable') + '</span></p>';

                                $('#AlertsBody').append($('<div />').addClass('no-permission text-center').html(html)).promise().done(function(){
                                    $('#AlertsBody').on('click', '.notification-permissions', function(){

                                        // request permissions and handle the user reply
                                        NotificationManager.enable().then( (result) => {
                                            tmp.web.body.overlay.permissions.render();
                                        });
                                    });
                                });
                            }
                            else {
                                // Notifications have been disabled. To enable notifications in your browser settings
                                // navigate to chrome://settings/content/notifications and then refresh this page.
                                html += '<p>' + i18n('Boxes.Alerts.Disabled.Denied') + '</p>';
                                html += '<p><span class="btn-default game-cursor notification-refresh">' + i18n('Boxes.Alerts.Button.Refresh') + '</span></p>';
                                $('#AlertsBody').append($('<div />').addClass('no-permission text-center').html(html)).promise().done(function(){
                                    $('#AlertsBody').on('click', '.notification-refresh', function(){
                                        // reload from cache (no need to refresh from the server = reload(true)
                                        window.location.reload(false);
                                    });
                                });
                            }
                        }
                    },
                },
            },
            tabs: {

                head: [],
                content: [],

                /**
                 * @param id
                 * @param label
                 */
                addHead: ( id, label ) => {
                    tmp.web.body.tabs.head.push(
                        `<li class="${id} long-tab game-cursor"><a href="#${id}" class="game-cursor">${label}</a></li>`
                    );
                },

                /**
                 * @param id
                 * @param content
                 */
                addContent: ( id, content ) => {
                    tmp.web.body.tabs.content.push( `<div id="${id}">${content}</div>` );
                },

                clean: () => {
                    tmp.web.body.tabs.head = [];
                    tmp.web.body.tabs.content = [];
                },
                renderHead: () => {
                    return '<ul class="horizontal">' + tmp.web.body.tabs.head.join( '' ) + '</ul>';
                },
                renderContent: () => {
                    return tmp.web.body.tabs.content.join( '' );
                },
                tabListContent: () => {

                    // list alerts
                    let html = `<table id="alerts-table" class="foe-table">
                    <thead>
                        <tr>
                            <th>Expiration</th><th class="column-200">Title</th>
                            <th>Repeat</th><th>Persistent</th>
                            <th>&nbsp;</th>
                         </tr>
                    </thead>
                    <tbody>`;

                    html += '</tbody></table>';

                    return html;
                },

                tabNewContent: () => {
                    let data = {
                        id: 0,
                        expires: Date.now() + 5000,
                        title: '',
                        body: '',
                        repeat: -1,
                        persistent: false,
                        tag: '',
                        action: 'create',
                        buttonText: 'Create'

                    };
                    return `<div class="box-inner">
                        <div class="box-inner-content">
                            <h3>Create a new alert</h3>
                            <div class="box-inner-form">
                                ${tmp.web.forms.render(data)}
                            </div>
                        </div>
                    </div>`;
                },

                tabPreferencesContent: () => {
                    return '<p>Preferences</p>';
                },
                updateAlerts: () => {
                    let html = '';
                    // let ts = moment().valueOf() + 5000;
                    let dt = moment();

                    const alerts = tmp.db.alerts.where('expires').above(0).reverse();
                    // tmp.db.alerts.where('expires').above(ts).each(function(alert){
                    alerts.each(function(alert){
                        let persist = ( alert.persistent ) ? ' checked="checked"' : '';
                        html += `<tr>
                            <td>${moment(alert.expires).from(dt)}</td>
                            <td class="column-200">${alert.title}</td>
                            <td>${alert.repeat}</td>
                            <td><input type="checkbox"${persist}></td>
                            <td class="text-right">
                                <span class="btn-default alert-button" data-id="${alert.id}" data-action="preview">preview</span>
                                <span class="btn-default alert-button" data-id="${alert.id}" data-action="edit">edit</span>
                                <span class="btn-default alert-button" data-id="${alert.id}" data-action="delete">delete</span>
                            </td>
                        </tr>`;
                    }).then( () => {
                        $( '#alerts-table tbody' ).empty().append( html ).promise().done( function () {

                            $('#alerts-table').find('span.alert-button').on('click', function(){
                                let id = $(this).data('id');
                                let action = $(this).data('action');
                                let p = tmp.data.get(id);
                                p.then( function(result){

                                    if ( action === 'preview' ){
                                        tmp.web.forms.actions.preview( result );
                                        return;
                                    }
                                    if ( action === 'edit' ){
                                        tmp.log(`--- edit (${id}) ---`);
                                        return;
                                    }
                                    if ( action === 'delete' ){
                                        tmp.log(`--- delete (${id}) ---`);

                                    }
                                })
                            });
                        } );
                    });
                }
            },
        },
        forms: {
            aux:{
                formatIsoDate: (moment) => {
                    return moment.toISOString(true).substring(0,19);
                },
                repeats: (repeat) => {
                    let repeats = {
                        '-1' : '',
                        '300' : '',
                        '900' : '',
                        '3600' : '',
                        '14400' : '',
                        '28800' : '',
                        '86400' : ''
                    };
                    repeats[ repeat + '' ] = ' checked="checked"';
                    return repeats;
                },
                textareaRoot: null,
                textareaCounter: null,
                textareaUpdateCounter: (textarea, counter) => {

                    if ( ! tmp.web.forms.aux.textareaRoot ){
                        tmp.web.forms.aux.textareaRoot = $(textarea);
                    }
                    if ( ! tmp.web.forms.aux.textareaCounter ){
                        tmp.web.forms.aux.textareaCounter = $(counter);
                    }

                    let root = tmp.web.forms.aux.textareaRoot;

                    let maxlength = root.prop('maxlength');
                    let value = root.val();
                    if ( value.length > maxlength ){
                        this.val( this.value.substring(0, maxlength) );
                    }
                    tmp.web.forms.aux.textareaCounter.text(`(${value.length}/${maxlength})`);
                }
            },
            actions: {
                create: () => {

                    if ( ! tmp.web.forms.actions.validate() ){
                        tmp.log('tmp.web.forms.actions.create failed validation');
                        return false;
                    }
                    let data = tmp.web.forms.data();

                    let alert = {
                        id: null,
                        title: data.title,
                        body: data.body,
                        expires: moment(data.datetime).valueOf(),
                        repeat: data.repeat,
                        persistent: data.persistent
                    };

                    // switch the list tab
                    tmp.data.add( alert ).then( function( result ){

                        tmp.web.body.tabs.updateAlerts();
                        $('.alerts-tab-list').trigger('click');

                    }).catch( function( error ){
                        tmp.log('Alerts.tmp.web.forms.actions.create error');
                        tmp.log(error);
                    });
                },
                init: (id) => {
                    tmp.web.forms.actions.preset.add(0,id);
                },
                /**
                 * @param value - the number of seconds (to add)
                 * @param target - the id (including #) of the target DOM element
                 */
                preset: {
                    add: (value, target) => {
                        let m = moment().add( value, 'seconds' );
                        // timezone corrected ISO string & remove the milliseconds + tz
                        let dt = tmp.web.forms.aux.formatIsoDate( m );
                        $( target ).val( dt ).trigger( 'change' );

                        // tmp.web.forms.actions.preset.set( m.valueOf() );
                    },
                    set: (value, target) => {
                        let m = moment(value);
                        // timezone corrected ISO string & remove the milliseconds + tz
                        let dt = tmp.web.forms.aux.formatIsoDate( m );
                        $( target ).val( dt ).trigger( 'change' );
                    },
                    setTitle: (value, target) => {
                        $( target ).val( value );
                    }
                },
                preview: ( data ) => {
                    const options = {
                        body: data.body,
                        dir: 'ltr',
                        icon: extUrl + 'images/app48.png',
                        renotify: true,
                        requireInteraction: data.persistent,
                        tag: 'FoE.Alerts.preview'
                    };
                    try {
                        new Notification( data.title, options );
                    }
                    catch (e){
                        tmp.log(e);
                    }
                },
                previewNew: () => {
                    let data = tmp.web.forms.data();
                    tmp.web.forms.actions.preview( data );
                },
                update: () => {
                    let data = tmp.web.forms.data();
                    let dt = moment(data.datetime);
                    let m = moment();
                    if ( dt >= m ) {
                        // TODO enable i18n
                        // Expires __time__ // e.g. Expires in 10 minutes
                        // $( '#alert-expires' ).text( i18n('Boxes.Alerts.Form.Expires', { time: dt.from( m ) } ) );
                        $( '#alert-expires' ).text( 'Expires ' + dt.from( m ) );
                    }
                    else {
                        // TODO enable i18n
                        // Expired __time__ // e.g. Expired 4 hours ago
                        // $( '#alert-expires' ).text( i18n('Boxes.Alerts.Form.Expired', { time: dt.from( m ) } ) );
                        $( '#alert-expires' ).text( 'Expired ' + dt.from( m ) );
                    }
                },
                validate: () => {
                    let data = tmp.web.forms.data();

                    if ( !data ){ return false; }

                    let input = $( '#alert-title' );
                    let label = input.siblings('label');
                    if ( !data.title ){
                        input.addClass('error-box');
                        label.addClass('error-text');
                        return false;
                    }
                    else {
                        input.removeClass('error-box');
                        label.removeClass('error-text');
                    }

                    return true;
                }
            },
            data: () => {
                return {
                    title: $( '#alert-title' ).val(),
                    body: $( '#alert-body' ).val(),
                    datetime: $( '#alert-datetime' ).val(),
                    repeat: $( 'input[name=alert-repeat]:checked', '#alert-form' ).val(),
                    persistent: $( 'input[name=alert-persistent]:checked', '#alert-form' ).val() === 'on'
                };
            },
            /**
             * The data object should include the following fields:
             *      data.id         = alert id (0 if creating a new alert)
             *      data.expires    = the expiration unix timestamp (Date.now() for new alert)
             *      data.title      = alert title
             *      data.body       = alert body
             *      data.repeat     = repeat (-1 or the number of seconds after which to repeat)
             *      data.persistent = true / false
             *      data.tag        = alert tag
             *      data.action     = (create | edit)
             *      data.buttonText = (Create | Edit)
             * @param data
             * @returns {string}
             */
            render: (data) => {

                let id = (data.id) ? data.id : 0;
                let datetime = tmp.web.forms.aux.formatIsoDate( moment(data.expires) );

                let repeats = tmp.web.forms.aux.repeats(data.repeat);

                let persistent_off = ' checked="checked"';
                let persistent_on = '';
                if ( data.persistent ){
                    persistent_on = ' checked="checked"';
                    persistent_off = '';
                }

                let antiqueOptions = '';
                if ( tmp.model.antique.auction ){
                    antiqueOptions += `<option value="${tmp.model.antique.auction}">Auction</option>`;
                }
                if ( tmp.model.antique.exchange ){
                    antiqueOptions += `<option value="${tmp.model.antique.exchange}">Exchange</option>`;
                }

                let battlegroundOptions = '';
                if ( tmp.model.battlegrounds.provinces ) {
                    tmp.model.battlegrounds.provinces.forEach( function ( province, id ) {
                        let value = province['lockedUntil'] * 1000;
                        // if the sector is currently taken
                        if ( ! isNaN( value ) ) {
                            let datetime = tmp.web.forms.aux.formatIsoDate( moment( value ) );
                            let text = `${province.title} (${datetime})`;
                            battlegroundOptions += `<option value="${value}">${text}</option>`;
                        }
                    });
                }
                return `<form id="alert-form">
                    <input type="hidden" id="alert-id" value="${id}"/>
                    <p class="full-width">
                        <label for="alert-title">Title</label>
                        <input type="text" id="alert-title" name="title" placeholder="Title" value="${data.title}">
                    </p>
                    <p class="full-width">
                        <label for="alert-body">Body</label>
                        <textarea id="alert-body" name="body" maxlength="176">${data.body}</textarea>
                    </p>
                    <p class="full-width text-right mt--10">
                        <small id="alert-body-counter"></small>
                    </p>
                    <p class="extra-vs-8">
                        <label for="alert-datetime">Date &amp; Time</label>
                        <input type="datetime-local" id="alert-datetime" name="alert-datetime" value="${datetime}" step="1">
                        <span id="alert-expires"></span>
                    <p>
                        <label for="alert-auto">Presets</label>
<!--                        <select id="alert-presets-categories">
                            <option value="">Antiques Dealer</option>
                            <option value="">Guild Battlegrounds</option>
                            <option value="">Neighborhood</option>
                        </select>
-->
                        <select id="alert-presets">
                            <option value="0" disabled selected>&nbsp;</option>
                            <optgroup label="Antiques Dealer">
                            ${antiqueOptions}
                            </optgroup>
                            <optgroup label="Battleground Provinces">
                            ${battlegroundOptions}
                            </optgroup>
                        </select>
                    </p>
                    
                    <p class="full-width text-right mt--10">
                        <span class="btn-default datetime-preset" data-time="60">1m</span>
                        <span class="btn-default datetime-preset" data-time="300">5m</span>
                        <span class="btn-default datetime-preset" data-time="900">15m</span>
                        <span class="btn-default datetime-preset" data-time="3600">1h</span>
                        <span class="btn-default datetime-preset" data-time="14400">4h</span>
                        <span class="btn-default datetime-preset" data-time="28800">8h</span>
                        <span class="btn-default datetime-preset" data-time="86400">1d</span>
                    </p>
                    
                    <p class="full-width radio-toolbar extra-vs-8">
                        Repeat
                        <input id="alert-repeat-never" type="radio" name="alert-repeat" value="-1"${repeats['-1']}>
                        <label for="alert-repeat-never">never</label>
                        or every
                        <input id="alert-repeat-5m" type="radio" name="alert-repeat" value="300"${repeats['300']}>
                        <label for="alert-repeat-5m">5m</label>
                        <input id="alert-repeat-15m" type="radio" name="alert-repeat" value="900"${repeats['900']}>
                        <label for="alert-repeat-15m">15m</label>
                        <input id="alert-repeat-1h" type="radio" name="alert-repeat" value="3600"${repeats['3600']}>
                        <label for="alert-repeat-1h">1h</label>
                        <input id="alert-repeat-4h" type="radio" name="alert-repeat" value="14400"${repeats['14400']}>
                        <label for="alert-repeat-4h">4h</label>
                        <input id="alert-repeat-8h" type="radio" name="alert-repeat" value="28800"${repeats['28800']}>
                        <label for="alert-repeat-8h">8h</label>
                        <input id="alert-repeat-1d" type="radio" name="alert-repeat" value="86400"${repeats['86400']}>
                        <label for="alert-repeat-1d">1d</label>
                    </p>
                    
                    <p class="full-width radio-toolbar">
                        Persistent
                        <input id="alert-persistent-off" type="radio" name="alert-persistent"${persistent_off} value="off">
                        <label for="alert-persistent-off">Off</label>
                        <input id="alert-persistent-on" type="radio" name="alert-persistent"${persistent_on} value="on">
                        <label for="alert-persistent-on">On</label>
                        <br><small>Should the notification remain open until the user dismisses or clicks the notification</small>
                    </p>
                    
                    <!--
                    <p class="full-width">
                        <label for="tag">Tag</label>
                        <input type="text" id="tag" name="tag" value="${data.tag}">
                        <small>Tags can be used to group notifications (a new notification with a given tag will replace an older notification with the same tag)</small>
                    </p>
                    -->
                    
                    <!-- left column -->
                    <p>&nbsp;</p>
                    <p class="text-right">
                        <span class="btn-default button-preview-alert">Preview</span>
                        <span class="btn-default button-${data.action}-alert">${data.buttonText}</span>
                     </p>
        
                </form>`;
            }
        },
        show: () => {

            if ( $( '#Alerts' ).length < 1 ) {

                // override the CSS already in DOM
                HTML.AddCssFile( 'alerts' );

                HTML.Box( {
                    id: 'Alerts',
                    title: i18n( 'Boxes.Alerts.Title' ),
                    auto_close: true,
                    dragdrop: true,
                    minimize: true
                } );
                tmp.web.body.build();

            } else {
                HTML.CloseOpenBox( 'Alerts' );
            }

        }
    };

    let pub = {
        init: () => {
            // TODO
            // refresh all expired alerts set to repeat before they are removed/garbage-collected

            TimeManager.subscribe( tmp.timer );
        },
        show: () => {
            tmp.web.show();
        },
        update: {
            data: {
                battlegrounds: (responseData) => {
                    if ( responseData && responseData.map && responseData.map.provinces ) {
                        let provinces = responseData.map.provinces;
                        // for some reason the returned json doesn't give province id for the 0th index sector
                        if ( ! provinces[0].id ){ provinces[0].id = 0; }
                        provinces.forEach( function( province, id ){
                            let sector = BattlegroundSectorNames[id];
                            province.title = sector.title;
                            province.name = sector.name;
                        });
                        tmp.model.battlegrounds.provinces = provinces;
                    }
                    else {
                        tmp.log('Alerts.update.data.battlegrounds - invalid data supplied');
                    }
                },
                timers: (responseData) => {
                    if ( responseData && responseData.forEach ){
                        responseData.forEach( function( item, index ){
                            if ( item && item.type ){
                                switch (item.type) {
                                    case 'antiquesExchange' : {
                                        tmp.model.antique.exchange = item.time * 1000;
                                        break;
                                    }
                                    case 'antiquesAuction' : {
                                        tmp.model.antique.auction = item.time * 1000;
                                        break;
                                    }
                                    case 'battlegroundsAttrition' : {
                                        // the battleground attrition reset timer
                                        break;
                                    }
                                }
                            }
                        });
                    }
                    else {
                        tmp.log('Alerts.update.data.timers - invalid data supplied');
                    }
                },
            },
        },
    };

    return pub;
}();

FoEproxy.addHandler('GuildBattlegroundService', 'getBattleground', (data, postData) => {
    Alerts.update.data.battlegrounds( data['responseData'] );
});
FoEproxy.addHandler('TimerService', 'getTimers', (data, postData) => {
    Alerts.update.data.timers( data['responseData'] );
});


let NotificationManager = {

    isEnabled: (Notification && Notification.permission === 'granted' ),
    canBeEnabled: null,

    init: ()=> {
        // Permission can be requested if and only if the original value equals to 'default' and the permission
        // has not been denied. If originally the (permission) value is default, then we request the permission,
        // the user denies it and then resets the browser's settings a page refresh is needed before permissions can be
        // requested again
        if( NotificationManager.canBeEnabled === null ){
            // set this only once at the beginning, i.e. before the user can change it
            NotificationManager.canBeEnabled = (Notification && Notification.permission === 'default');
        }
    },

    // TODO use Promise to implement notifications
    // https://codeburst.io/a-simple-guide-to-es6-promises-d71bacd2e13a
    // https://web-push-book.gauntface.com/demos/notification-examples/
    // https://web-push-book.gauntface.com/demos/notification-examples/notification-examples.js

    // TODO implement Promise timeout cancellation
    // Promise timeout cancellation:
    // https://stackoverflow.com/questions/25345701/how-to-cancel-timeout-inside-of-javascript-promise

    /**
     * Requests Notification permissions and return the Promise instance
     * @returns {Promise}
     *
     * @use:
     *
     * NotificationManager.enable().then( (result) => {
     *      if ( NotificationManager.isEnabled ){
     *          // do something
     *      }
     *      else {
     *          // do something else
     *
     *          // explain to the user how he/she can re-enable notifications, e.g.
      *         // "To (re)enable notifications in your browser navigate to chrome://settings/content/notifications
     *      }
     * }
     */
    enable: ()=> {

        if ( ! NotificationManager.canBeEnabled ){
            // throw an Error saying that permissions cannot be requested
            NotificationManager._log( 'Notification permissions cannot be requested. Reset the browser settings and refresh!' );
            return Promise.resolve( Notification.permission );
        }

        let promise = new Promise( (resolve, reject) => {
            const permissionPromise = Notification.requestPermission((result) => {
                NotificationManager.isEnabled = (result === 'granted');
                // Once the user grants or denies permissions, it is not longer possible to request permissions again
                // (until the page is refreshed) even if the browser settings are updated (permission reset to default),
                // the permission popup will not show until the next refresh/reload of the page
                // NotificationManager.canBeEnabled = (result === 'default');
                NotificationManager.canBeEnabled = false;
            });
            if (permissionPromise){
                permissionPromise.then(resolve, reject);
            }
        });
        return promise;
    },

    notify: (o,ms)=> {
        // if FoE is focused, don't show notifications, maybe instead post to the Infobox?
        // https://web-push-book.gauntface.com/demos/notification-examples/
        if ( o ) {
            new Notification( o.title, {
                icon: o.icon,
                body: o.body,
                tag: o.tag,
                vibrate: o.vibrate,
                actions: o.actions
            });
            NotificationManager._log('NotificationManager.notify:');
            NotificationManager._log(o);
        }
        else {
            // log
            NotificationManager._log('NotificationManager.notify: missing data');
        }
    },

    _log: (o)=> {
        // if at a certain debug level ?!
        console.log(o);
    }
};

NotificationManager.init();

/**
 * Observable pattern using subscribe/unsubscribe (instead of add/remove observer). The notify is private
 * and executes every second after TimeManager.start(). Subscribes should to implement 'update(unix timestamp)'
 */
let TimeManager = function(){

    // private
    let tmp = {
        interval: null,
        time: null,
        observers: [],
        /**
         * Returns true iff the given object is in the list of observers
         * @param o
         * @returns {boolean}
         */
        isSubscribed: (o)=> { return ( tmp.observers.filter(observer => observer === o).length == 1 ); },
        notify: (data) => {
            tmp.observers.forEach( observer => {
                if (observer.update){ observer.update(data); }
                else { /* throw and error */ }
            });
        }
    };
    // public
    let pub = {

        /**
         * Starts the "clock"
         */
        start: ()=> {
            pub.stop();
            tmp.interval = setInterval( function(){ tmp.notify( Date.now() ); }, 1000 );
        },

        /**
         * Stops the "clock"
         */
        stop: ()=> {
            if ( tmp.interval != null ){
                clearInterval( tmp.interval );
                tmp.interval = null;
            }
        },

        /**
         * Adds the provided object to the observers of this observable object
         * @param o
         */
        subscribe: (o)=> {
            if ( !tmp.isSubscribed(o) ){
                tmp.observers.push(o);
            }
        },

        /**
         * Removes the provided objects from the observers (if it is among them)
         * @param o
         */
        unsubscribe: (o)=> {
            tmp.observers = tmp.observers.filter(observer => observer !== o);
        },
    };

    return pub;

}();

class AlertsTimer {

    constructor(){}

    update(t) {
        // update alerts in the list
        // check if any notifications need to be send
        // re-enable expired alerts with enabled repeat
    }
}

// class Timer {
//     constructor(){}
//     update(t){ console.log(t); }
// }
// let timer = new Timer();
// TimeManager.subscribe(timer);
TimeManager.start();
Alerts.init();