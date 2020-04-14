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
// TODO remove these tests
AlertsDB.on('populate', function(){
    let now = new Date().valueOf();
    AlertsDB.alerts.add({expires: ( now + 10*1000 ), title: 'Alert #1', repeat: 0, persistent: 0, tag: '', body: 'Lorem ipsum dolor sit amet, consectetur adipiscing elit.', vibrate: 0, actions: null});
    AlertsDB.alerts.add({expires: ( now + 60*1000 ), title: 'Alert #2', repeat: 0, persistent: 0, tag: '', body: 'Maecenas ut nisi non turpis tincidunt auctor.', vibrate: 0, actions: null});
    AlertsDB.alerts.add({expires: ( now + 300*1000 ), title: 'Alert #3', repeat: 0, persistent: 0, tag: '', body: 'Duis non lectus risus.', vibrate: 0, actions: null});
    AlertsDB.alerts.add({expires: ( now + 3600*1000 ), title: 'Alert #4', repeat: 0, persistent: 0, tag: '', body: 'Fusce dictum tempor lorem, sed luctus odio', vibrate: 0, actions: null});
});
AlertsDB.open();
// persistent alerts will be stored only once and the expires time will be updated before garbage collection so that
// all expired alerts can be removed without having to use compound indexes or "compound where = collection filtering)
// e.g. where('expires').above(_current_timestamp_) and where('persistent').equals('1') as that is not supported by Dixie.

// xhr listener: store gbg sector unlock times
// xhr listener: antique dealer (get the auction timer)

let Alerts = function(){

    let tmp = {};
    tmp.db = AlertsDB;
    tmp.data = {
        add: (options) => {

        }
    };
    tmp.web = {
        body: {
            build: () => {

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

                    // disable keydown propagation from the form so that the canvas (the game) is not getting the
                    // keyboard shortcuts (otherwise, it's impossible to type into input/textarea without affecting the game)
                    $('#AlertsBody').find('input').on('keydown', function(e){e.stopPropagation(); });

                    $('#AlertsBody').find('span.button-create-alert').on('click', function(){
                        tmp.web.forms.create();
                    });

                    $('#AlertsBody').find('span.button-preview-alert').on('click', function(){
                        tmp.web.forms.preview();
                    });

                    $('#AlertsBody').find('span.datetime-preset').on('click', function(){
                        var value = $(this).attr('data-time');
                        tmp.web.forms.addPreset(value,'#alert-datetime');
                    });

                    $('#alert-datetime').on('change keyup paste', function(){
                        tmp.web.forms.update();
                    });

                    tmp.web.forms.initTime('#alert-datetime');

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
                            };
                        };
                    },
                },
            },
            tabs: {
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

                renderHead: () => {
                    return '<ul class="horizontal">' + tmp.web.body.tabs.head.join( '' ) + '</ul>';
                },
                renderContent: () => {
                    return tmp.web.body.tabs.content.join( '' );
                },

                head: [],
                content: [],

                tabListContent: () => {

                    // list alerts
                    let html = `<table id="alerts-table" class="foe-table">
                    <thead>
                        <tr>
                            <th>Expires</th><th colspan="4">Title</th><th>Countdown</th><th>Preview</th>
                            <th>&nbsp;</th><th>Edit</th>
                         </tr>
                    </thead>
                    <tbody>`;

                    // let ts = moment().valueOf() + 5000;
                    // tmp.db.alerts.where('expires').above(ts).each(function(alert){
                    tmp.db.alerts.where('expires').above(0).each(function(alert){
                        let html = `<tr>
                            <td>${alert.expires}</td>
                            <td colspan="4">${alert.title}</td>
                            <td>countdown</td><td>preview</td>
                            <td><div title="Persistent"><input type="checkbox" checked="checked"></div></td>
                            <td><button>edit</button></td>
                            </tr>`;
                        $('#alerts-table tbody').append(html);
                    });
                    html += '</tbody></table>';

                    return html;
                },

                tabNewContent: () => {
                    return `<div class="box-inner">
                        <div class="box-inner-content">
                            <h3>Create a new alert</h3>
                            <div class="box-inner-form">
                                <form id="alert-form">
                                    <p class="full-width">
                                        <label for="alert-title">Title</label>
                                        <input type="text" id="alert-title" name="title" placeholder="Title">
                                    </p>
                                        
                                    <p class="extra-vs-8">
                                        <label for="alert-datetime">Date &amp; Time</label>
                                        <input type="datetime-local" id="alert-datetime" name="alert-datetime" value="2020-04-10T16:00" step="1">
                                        <span id="alert-expires"></span>
                                    <p>
                                        <label for="alert-auto">Presets</label>
                                        <select id="alert-auto">
                                            <option value="">Antiques Dealer</option>
                                            <option value="">Guild Battlegrounds</option>
                                            <option value="">Neighborhood</option>
                                        </select>
                                        <select>
                                            <option value="">A1:M</option>
                                            <option value="">B1:O</option>
                                            <option value="">C1:N</option>
                                            <option value="">D1:B</option>
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
                                        <input id="alert-repeat-never" type="radio" name="alert-repeat" value="-1" checked="checked">
                                        <label for="alert-repeat-never">never</label>
                                        or every
                                        <input id="alert-repeat-5m" type="radio" name="alert-repeat" value="300">
                                        <label for="alert-repeat-5m">5m</label>
                                        <input id="alert-repeat-15m" type="radio" name="alert-repeat" value="900">
                                        <label for="alert-repeat-15m">15m</label>
                                        <input id="alert-repeat-1h" type="radio" name="alert-repeat" value="3600">
                                        <label for="alert-repeat-1h">1h</label>
                                        <input id="alert-repeat-4h" type="radio" name="alert-repeat" value="14400">
                                        <label for="alert-repeat-4h">4h</label>
                                        <input id="alert-repeat-8h" type="radio" name="alert-repeat" value="28800">
                                        <label for="alert-repeat-8h">8h</label>
                                        <input id="alert-repeat-1d" type="radio" name="alert-repeat" value="86400">
                                        <label for="alert-repeat-1d">1d</label>
                                    </p>
                                    
                                    <p class="full-width radio-toolbar">
                                        Persistent
                                        <input id="alert-persistent-off" type="radio" name="alert-persistent" checked="checked" value="off">
                                        <label for="alert-persistent-off">Off</label>
                                        <input id="alert-persistent-on" type="radio" name="alert-persistent" value="on">
                                        <label for="alert-persistent-on">On</label>
                                        <br><small>Should the notification remain open until the user dismisses or clicks the notification</small>
                                    </p>
                                    
                                    <!--
                                    <p class="full-width">
                                        <label for="tag">Tag</label>
                                        <input type="text" id="tag" name="tag">
                                        <small>Tags can be used to group notifications (a new notification with a given tag will replace an older notification with the same tag)</small>
                                    </p>
                                    -->
                                    
                                    <!-- left column -->
                                    <p>&nbsp;</p>
                                    <p class="text-right">
                                        <span class="btn-default button-preview-alert">Preview</span>
                                        <span class="btn-default button-create-alert">Create</span>
                                     </p>
                        
                                </form>
                            </div>
                        </div>
                    </div>`;
                },

                tabPreferencesContent: () => {
                    return '<p>Preferences</p>';
                }
            },
        },
        forms: {
            data: () => {
                return {
                    title: $( '#alert-title' ).val(),
                    datetime: $( '#alert-datetime' ).val(),
                    repeat: $( 'input[name=alert-repeat]:checked', '#alert-form' ).val(),
                    persistent: $( 'input[name=alert-persistent]:checked', '#alert-form' ).val() === 'on'
                };
            },
            /**
             * @param value - the number of seconds (to add)
             * @param target - the id (including #) of the target DOM element
             */
            addPreset: (value,target) => {
                let m = moment().add( value, 'seconds');
                // timezone corrected ISO string & remove the milliseconds + tz
                let dt = m.toISOString(true).substring(0,19);
                $(target).val( dt ).trigger('change');
            },
            create: () => {
                let data = tmp.web.forms.data();

                let options = {
                    id: null,
                    title: data.title,
                    expires: moment(data.datetime).valueOf(),
                    description: data.description,
                    repeat: data.repeat,
                    persistent: data.persistent
                }

                console.log(options);

                // switch the list tab
                $('.alerts-tab-list').trigger('click');
            },
            initTime: (id) => {
                tmp.web.forms.addPreset(0,id);
            },
            preview: () => {
                let data = tmp.web.forms.data();
                const options = {
                    body: 'Alert body',
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
                    console.log(e);
                }
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
        init: ()=> {
            // _Alerts.init();
            tmp.web.show();
        }
    };

    return pub;
}();



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

class Timer {
    constructor(){}
    update(t){ console.log(t); }
}
let timer = new Timer();
TimeManager.subscribe(timer);
// TimeManager.start();