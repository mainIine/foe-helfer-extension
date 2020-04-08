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

/* nice to have */

// TODO - main menu item should show the next alert timer (hh:mm)
// TODO - implement a keyboard shortcut (one which inno will hopefully never use in-game) to pre-fill the New Alert
//          time based on the most recent time display, e.g. antiques dealer, or when a gbg sector opens, or a
//          building collection timer expires, etc.
// TODO - Alerts set up for collection (on GB or other buildings) should reset when the building's resources



// xhr listener: store gbg sector unlock times
// xhr listener: antique dealer (get the auction timer)

let Alerts = {

    Preferences: {
        permission: ( Notification ) ? Notification.permission : null,
        Enabled : {
            status: true,
            title : i18n('Alerts.Preferences.Enabled.Title'),
            desc : i18n('Alerts.Preferences.Enabled.Desc')
        },

        // display a desktop notification when a new in-game message arrives
        // the message thread name can be used as a notification tag c
        TrackNewMessages: {},
        // please note that this will work ONLY when the Guild Battleground section of the game is open
        // ; this might be problematic when GBG fails to sync
        TrackGuildBattlegroundActions: {},
        TrackTrades: {},
        TrackAntiquesDealer: {}, // might not be possible outside of the antique dealer screen = useless

        // show a notification when a sector unlocks
        // track all, track only 1's, 2's, 3's, 4's (sector based on the distance from the center)
        TrackGuildBattlegroundSectors: {}
    },

    /* stores alerts data */
    Model: {
        // stores the user's alerts
        Alerts: {
            "id-1": { expires: 1586260800, title: 'Alert #1', description: 'Description of alert #1'},
            "id-2": { expires: 1586283130, title: 'Alert #2', description: 'Suspendisse ac urna id eros consequat egestas ut in mi.'},
            "id-3": { expires: 1586304000, title: 'Alert #3', description: 'Nulla molestie in orci vitae lobortis'},
            "id-4": { expires: 1586495160, title: 'Alert #4', description: 'Integer ut enim elit.'},
        },
        Battleground: {
            // stores the unlocks times of gbg sectors
            Sectors: {

            }
        },
        // for user defined timers
        User: {

        }
    },


    // Tabs
    Tabs: [],
    TabsContent: [],


    init: ()=> {
        Alerts.Show();
        // if (!Notification){
        //     alert('Desktop notifications not available in your browser. Try Chromium.');
        //     return;
        // }
        // if (Notification.permission !== 'granted'){
        //     Notification.requestPermission();
        // }
        // else {
        //     NotificationManager.notify({
        //         title: 'Title',
        //         icon: 'http://cdn.sstatic.net/stackexchange/img/logos/so/so-icon.png',
        //         body: 'Testing the NotificationManager'
        //     });
        // }
    },

    BuildBody: ()=> {

        Alerts.Tabs = [];
        Alerts.TabsContent = [];

        Alerts.SetTabs('alerts-tab-new', i18n('Boxes.Alerts.Tab.New'));
        Alerts.SetTabs('alerts-tab-list', i18n('Boxes.Alerts.Tab.List'));
        Alerts.SetTabs('alerts-tab-preferences', i18n('Boxes.Alerts.Tab.Preferences'));

        // form to create/add a new alert
        // show preferences
        Alerts.SetTabContent('alerts-tab-new', '<p>Add a new alert</p>' );

        // list alerts
        let html = '<table class="foe-table">';

        html += '<thead><tr><th>Expires</th><th colspan="4">Title</th><th>Countdown</th><th>Preview</th>';
        html += '<th>&nbsp;</th><th>Edit</th></tr></thead>';
        html += '<tbody>';

        for( let id in Alerts.Model.Alerts ){
            let alert = Alerts.Model.Alerts[id];
            html += '<tr>';
            html += '<td>' + alert.expires + '</td>';
            html += '<td colspan="4">' + alert.title + '</td>';
            html += '<td>countdown</td><td>preview</td>';
            html += '<td><div title="Persistent"><input type="checkbox" checked="checked"></div></td>';
            html += '<td><button>edit</button></td>'
            html += '</tr>';
        }
        html += '</tbody></table>';

        Alerts.SetTabContent('alerts-tab-list', html );

        // show preferences
        Alerts.SetTabContent('alerts-tab-preferences', '<p>preferences</p>' );

        // compile it all into html and inject
        let h = [];

        h.push('<div class="alerts-tabs tabs">');
        h.push( Alerts.GetTabs() );
        h.push( Alerts.GetTabContent() );
        h.push('</div>');


        $('#AlertsBody').html( h.join('') ).promise().done(function(){
            $('.alerts-tabs').tabslet({active: 1});
        });

        $('#AlertsBody').append($('<div />').addClass('no-permission').attr('data-text', i18n('Boxes.Alerts.Disabled.Default')));

        // handle Notification permissions
        if ( ! NotificationManager.isEnabled ){

            // if the notification permissions have never been given (permission === 'default')
            if ( Notification.permission === 'default' ){
                // Enable notifications in your browser to use this feature.
                $('#AlertsBody').append($('<div />').addClass('no-permission').attr('data-text', i18n('Boxes.Alerts.Disabled.Default')));
            }

            // if the notification permissions have been denied before (permission === 'denied')
            if ( Notification.permission === 'denied' ){
                // Notifications are disabled. You can enable notifications in your browser settings navigate to: chrome://settings/content/notifications
                $('#AlertsBody').append($('<div />').addClass('no-permission').attr('data-text', i18n('Boxes.Alerts.Disabled.Denied')));
            }

        }
    },

    /**
     * @param id
     * @param label
     */
    SetTabs: (id, label)=>{ Alerts.Tabs.push('<li class="' + id + ' long-tab game-cursor"><a href="#' + id + '" class="game-cursor">' + label + '</a></li>');},
    /**
     * @returns {string}
     */
    GetTabs: ()=> { return '<ul class="horizontal">' + Alerts.Tabs.join('') + '</ul>'; },
    /**
     * @param id
     * @param content
     */
    SetTabContent: (id,content)=>{ Alerts.TabsContent.push('<div id="' + id + '">' + content + '</div>'); },
    /**
     * @returns {string}
     */
    GetTabContent: ()=>{ return Alerts.TabsContent.join(''); },

    Show: ()=> {

        if( $('#Alerts').length < 1 ){

            // override the CSS already in DOM
            HTML.AddCssFile('alerts');

            HTML.Box({
                id: 'Alerts',
                title: i18n('Boxes.Alerts.Title'),
                auto_close: true,
                dragdrop: true,
                minimize: true
            });

        } else {
            HTML.CloseOpenBox('Alerts');
        }

        Alerts.BuildBody();
    },



    ShowAlertSuggestion: ()=> {
        // if option is enabled
            // show an alert suggestion box with a pre-filled timer
    }

};

let NotificationManager = {

    isEnabled: (Notification && Notification.permission === 'granted' ),

    init: ()=> {

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

        let promise = new Promise( (resolve, reject) => {
            const permissionPromise = Notification.requestPermission((result) => {
                m.isEnabled = (result === 'granted');
            });
            if (permissionPromise){
                permissionPromise.then(resolve);
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
}

/**
 * Observable pattern using subscribe/unsubscribe (instead of add/remove observer). The notify is private
 * and executes every second after TimeManager.start(). Subscribes should to implement 'update(unix timestamp)'
 */
let TimeManager = function(){

    // private
    let tmp = {
        interval: null,
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
            stop();
            tmp.interval = setInterval( function(){ tmp.notify( new Date().getTime() ); }, 1000 );
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

class AlertTimer {

    constructor(date){
        this.expires = ( date.getTime() / 1000 ) >> 0;
    }

    update(t) {
        // The time difference between when the alert expires and the current time (as a unix timestamp) in seconds
        // with the decimal part removed (that's what the >> 0 does)
        let dt = ( this.expires - t/1000 ) >> 0;
    }
}