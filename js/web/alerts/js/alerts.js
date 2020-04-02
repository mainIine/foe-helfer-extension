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

    /* stores alerts data */
    Model: {
        // stores the user's alerts
        Alerts: {},
        Battleground: {
            // stores the unlocks times of gbg sectors
            Sectors: {

            }
        },
        // for user defined timers
        User: {

        }
    },
    // pack the model data to save storage
    _pack: ()=> {},
    // unpack stored data into the model
    _unpack: ()=> {},


    init: ()=> {},

    GetAlerts: ()=> {},
    SetAlerts: ()=> {},

    Show: ()=> {},

    ShowAlertSuggestion: ()=> {
        // if option is enabled
            // show an alert suggestion box with a pre-filled timer
    }

};