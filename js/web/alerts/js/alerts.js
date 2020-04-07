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

        Alerts.SetTabs('alerts-tab-list', i18n('Boxes.Alerts.Tab.List'));
        Alerts.SetTabs('alerts-tab-preferences', i18n('Boxes.Alerts.Tab.Preferences'));

        let html = '<table class="foe-table">';

        html += '<thead><tr><th>Expires</th><th colspan="4">Title</th></tr></thead>';
        html += '<tbody>';

        for( let id in Alerts.Model.Alerts ){
            let alert = Alerts.Model.Alerts[id];
            html += '<tr><td>' + alert.expires + '</td><td colspan="4">' + alert.title + '</td></tr>';
        }
        html += '</tbody></table>';

        Alerts.SetTabContent('alerts-tab-list', html );
        Alerts.SetTabContent('alerts-tab-preferences', '<p>preferences</p>' );

        let h = [];

        h.push('<div class="alerts-tabs tabs">');
        h.push( Alerts.GetTabs() );
        h.push( Alerts.GetTabContent() );
        h.push('</div>');


        $('#AlertsBody').html( h.join('') ).promise().done(function(){
            $('.alerts-tabs').tabslet({active: 1});
        });
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