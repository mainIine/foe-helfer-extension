## Changelog - Extension


##### 4.1.1.0

**Update**
- Efficiency: You can now evaluate buildings without the ally boosts
- Productions: Added a list for special productions
- Settings: Removed some "open automatically" settings if they are already available in the modules windows settings
- QI city: The title changes with the difficulty level now

**Bugfix**
- Copy city data: data format was slightly off by accident, works like before now
- Allies: 
	- The sums weren't correct and boosts were *slightly* off after leveling allies
	- A freshly assembled Ally was listed twice, when the amount of fragments was exactly 0 after assembly
	- the Box did not close when already open upon menu click
- Productions: Rattlebone Raveyards goods productions weren't calculated correctly


##### 4.1.0.0

**New**
- Collect-All-Blocker: used 5 diamonds to collect and the FP bar was already full? Activate the new blocker in the settings and have it never happen again
- Reconstruction mode: there is now a map that updates live. You can access it via a button in the reconstruction list

**Update**
- City Map: 
	- Sidebar stats have been reworked: more interesting facts about buildings in the city were added
	- Available area for other players cities has been added
- Profile: 
	- QI capacity added
	- The mini icon on the top left corner blocked the ingame research button, so it was moved a bit
	- Main part can now be selected and copied, so you can share your most impartant stats ingame more easily
- Changed menu icon for sets and chains
- Allies: added sums at the bottom of the list
- GBG List: added seconds to the "in" column
- Reworked the window setting UI a tiny bit
- Removed the recurring FP quest sound setting from the calculators. Let us know if you want them back on discord, please

**Bugfix**
- Productions: Guild goods for LB were sometimes too high, because we added guild goods boost to them
- QI Map: Sums weren't rounded correctly
- Increased QI max capacity to 200,000
- Profile: goods of other players were worng when you weren't in the same age


---

##### 4.0.2.0

**Update**
- Efficiency: 
	- Changed default values
	- When the option "show ascended/limited buildings" is active, lines with such buildings in your city will not show the inventory checkmark anymore
- Ally Boosts: Adapted to changed data transmission

**Bugfix**
- Efficiency Settings: Reset to default-button was broken
- Productions: Item tab would not open if you had new train pieces producing mass self-aid kits fragments
- decayed buildings were not checked on game start (zz1)
- legacy browsers could not load the helper anymore

---

##### 4.0.1.0

**Bugfix**
- GBG
	- as the server time is not transmitted consistently, server offset can now be set manually
- General
	- further improvements for loading behavior
	
---

##### 4.0.0.0

**Update**
- General
	- Improved loading behavior of the Helper
- QI Map
	- Added number of expansions
	- Added townhall production
	- Highlight for productions to finish soon changed
- GBG
 	- Unlock times are now converted to server time when copied
	- To also display the unlock-times in server time, check the settings
- Player Links
	- you can now select between foestats.com and scoredb.io in the main settings 
- Shop Assistant
	- Column "Missing" now always gives the amount until the next complete set
- Settlements
	- Added goods for pirate settlement 
- Player profiles:
	- Now available for other players: visit them and click in the top left corner

**Bugfix**
- Shop Assistant
	- Alert for old shop versions was not pruned correctly
- QI Action Calculation
	- Capacity Boost was not applied correctly
- Efficiency
	- Did not show properly when only a single type of boost (attack or defense) was selected

---

##### 3.13.1.0

**Update**

- General
	- Adjusted helper to match the game's new loading behavior
	- Made Some HUD elements "non-selectable"
	- Added handling for chain buildings with special production
- Power Leveling
	- Added many new levels for the Atomium
- FP Collector
	- Added translations
- Efficiency Overview
	- Adjusted styling in the search
- Shop Assistant
	- Added filter for shop currencies – to ignore a currency, simply click on it
	- Removed the "Full" column – this value is now shown when hovering over the "Missing" column
	- Added "Max" column – shows how much can be purchased with the available currency
	- When hovering over the "Max" column, the "All" value is displayed – indicating how much currency is needed to buy out the entire stock
	- Added tooltip for allies
- QI City Overview
	- Added highlight for euphoria level
	- Added highlight for buildings that will soon be ready for harvest
- FP Bar
	- Adjusted position in GE to match the changed game UI
- Menu
	- Added entries for the shop assist and the allies overview

**Bugfix**
- Efficiency Overview
	- QI goods evaluation did not work
- Negotiation Window
	- Closed when a tavern update occurred
- City Overview
	- Corrected the order of dimensions in the tooltip
	- QI: fixed sum calculation
---

##### 3.13.0.0
**New**
- GE Goods Use
	- A threshold can be given
	- If upon opening the GE unlock dialogue the percentual goods use is higher than the threshold, a box is generated listing the percentual goods use in relation to the treasury stock.
	- Activate in settings!

**Update**
- Efficiency
	- Added filters for GBs and limited buildings
- Citymap
	- Added building list to outposts and settlements
	- adapted to upcoming changes to QI
- Shop Assist
	- Added rarity of offer
	- Added current stock of shop ressources
	- When no favourites are selected yet, the favourites filter is deactivated
- Blue Galaxy
	- Now accounts for large FP Packages
- Building Tooltip
	- if fragments are produced the amount of needed fragments is now displayed as well
- GBG Building Recommendation
	- now closes automatically when battle/negotiation is started

**Bugfix**
- OwnPart Calculator
	- Reverted a calculation change

---

##### 3.12.0.1

**Update**
- Shop Assist
	- added unlock condition "Offers of rarity X accepted."

**Bugfix**
- Efficiency Overview
	- Fixed boosts

---

##### 3.12.0.0
**New**
- Shop Assist
	- can be activated in settings
	- lists, how much of the offer already is in inventory
	- lists, how many fragments are needed to complete an item and how much that would cost
	- items can be set as favourites and the view can be limited to the favourites
	- locked offers can be hidden from the list
	- an alert can be set for offers - it will go off when enough currency is available to buy the offer

**Update** 
- Helper design was reworked in some places 
	- boxes are now limited in size to browser window size

- Efficiency overview
	- processing of chain buildings adapted to updated data structure
	- added QI bonuses
	- inventory items will not be displayed when opening the efficiency overview for another player's city

- Profile
	- added guild goods boost
	- profil theme can be changed by clicking the avatar
	- added menu entry to display the profile

- Idle Game
	- updated processing to changed data structure

- Settings
	- Event Assistants can now be de-/activated separately

- Units module
	- reactivated

- Army Advice
	- can now be used as well in PvP Arena 

**Bugfix**
- Popgame
	- Adapted to changed Event Window

- Efficiency Overview
	- corrected goods assessment

---

##### 3.11.7.0

**Update**
- Efficiency Overview:
	- in the production /tile settings, hovering on the input field will now provide a tooltip with comparison values from your city
		- highest value
		- fifth-highest value
		- top 10%
		- Note: is a production more important than others, the entered value should correspond to the lowest of the given values or an even lower one. Is a production not as important to you, the entered value should correspond to the highest value or an even higher one.
	- added calculator for determining the production/tile value for "finish special production" fragments
		- click on the Abakus/Calculator-Icon in the FSP row opens the calculator
		- here you can enter the expected production collected per use of an FSP (production of the building, the FSP is used on doesn't forget the BG-factor if applicable)
		- the calculator determines the production/tile value for the FSP depending on the corresponding production/tile values of the respective resources

- Building tooltips:
	- it now shows for limited buildings, what the efficiency of the decayed building will be
	- it now shows for building that can be upgraded to limited/ascended buildings what the efficiency of the limited building will be
	- it now shows what kits are needed for the building
	- Chain buildings with Era-dependent values are now properly evaluated

- QI action points calculator:
	- capacity increase should now be handled 

- Guild member overview:
	- added guild goods production to export

**Removed**
- Units-Modul

- Marketplace-Offers
	- functionality was transferred to the Market-Overview

**BugFix**
- Efficiency Overview: Sorting by value/tile was broken, and we fixed a small display issue in the table head

---

##### 3.11.6.0

**Update**
- Efficiency Overview:
	- If the option "Inventory" is active, now also assemble Buildings will be listed. The tooltip for the inventory icon of the respective building will show:
	- how many buildings of this type could be placed, which upgrades are necessary for that and which upgrade paths are available? Therein the following will be considered:
		- complete buildings in inventory
		- buildings in the city that may be improved by using items (kits) from inventory
		- inventory items that can be assembled to a complete building
		- fragments that may be assembled
	- ascended buildings will additionally be listed in their non-ascended form
	- how many ascended kits are in store for that building
	- if there is a higher level building, it is shown what is required to get there
	- building size filter: added multi select

- Kits
	- reduced to sets and chains

**Removed**
- Boost-Inventory
	- was replaced by the above-mentioned change to the efficiency overview

**BugFix**

- Efficiency Overview:
	- Changes in the settings values were not applied immediately
---

##### 3.11.5.0

**Update**
- Manifest file corrected

- Guild treasury
	- Spelling mistake fixed

---

##### 3.11.4.0

**Update**
- Resource Management adapted to changed server transmission

---

##### 3.11.3.0

**Update**
- Negotiation assistant
	- adapted to the changed server transmission schedule

---

##### 3.11.2.0

**Removed**
- Chest selection assistant (No Event really needs it anymore)

**Update**
- Negotiation assistant
	- now supports 5 turns

- Player Profile
	- more data was added

- Rewards stream
	- now also in GE

- Boxes
	- GBG province list is not closed automatically anymore
	- added setting to disable automatic box closing

- Recurring Quests (diamond checklist)
	- State (?/✓) can now be toggled by long click (5 sec)
	- shortening of the quest texts will now happen dynamically depending on available space

- Efficiency Rating:
	- Some boosts are now shown as one value. They are still calculated seperately, the score did not change. We just need more space to add more stats to evaluate.
	- Added QI Actions to the evaluation

- City Overview:
	- You can now highlight less efficient buildings
	- The tooltip was exchanged for the one showing all building information

**BugFix**
- Recurring Quests (diamond checklist)
	- counter in menu was shown when starting the game even if it was 0 or the setting was disabled
- Treasury Export
	- year was parsed incorrectly in some languages (4025 instead of 2025)

---

##### 3.11.1.0

**New**
- GBG Rewards stream
	- above the rewards bar the actually received reward is displayed

**Update**
- Boxes now close automatically when entering a game feature the box is not intended for

**BugFix**
- Scroll bars appeared, when a Box crossed window borders
- boxes could not be moved when opened for the first time
- Menu stays in boxed mode after window resize

---

##### 3.11.0.0

**New**
- Player Profile
	- After opening the profile, an icon to show the player profile will appear next to your city name 
- Settings
	- Disable QI and GBG pop ups
- Ally Overview
	- Opens when entering the "Historical Allies" building
	- Displays a list of your Allies and your buildings with rooms - empty rooms and unassigned allies will show up in the top
- QI-Action Points Calculator
	- In QI, at the right end of the action points bar, am hour glass is displayed
	- The tooltip of the hourglass displays the time, when the bar is expected to be full

**Update**
- Efficiency
	- Added buildings from your inventory (not all of them just yet)
	- Added a building size filter
- Own Part Calculator
	- Added a setting to open automatically
	- Added setting to disable most features that are hardly used
- FoE Helper Version updates no longer open a new browser tab with the changelog
- Production overview (units)
	- added icon to indicate next era units
- Box positions are now saved in relation to the center of the page instead of the top left corner

**BugFix**
- Fixed overlaps in some places
- Fixed date parsing for the treasury export

##### 3.10.1.0

**Update**
- Tooltip
	- added 'Unique Building' trait

**BugFix**
- Alerts still did not work
- Efficiency 
	- fix count for buildings with allies
- Market Overview
	- filter overlapped by table header
- Treasury
	- export did not parse date correctly
- Blue Galaxy and Building Efficiency
	- sometimes Boxes did not open or were empty (still under Observation if the fix worked)
- Tooltip
	- "motivate"/"polish" traits were mixed up for buildings of the new generation

##### 3.10.0.1

**BugFix**
- Alerts did not work

##### 3.10.0.0

**New**
- QI Progress Overview added (opens automatically when opening the QI player ranking)
- Item Sources: Production Overview for Items/Fragments now offers an option to display a list of buildings that produce a certain item (even if not currently build)
- Production Overview: Added Tables for resources boosts (FP, coins, supplies)
- Efficiency rating: Added FSP Fragments to the evaluation
- City Overview: Highlight option for ascendable and decayed buildings
- Repeat Building Selection:
	- !!! ATTENTION !!! Although the feature was green-lit by Inno, it might happen that the bot detection triggers. Use at your own risk!!!
	- Can be activated in the settings
	- When a building is built from the build menu or placed from the reconstruction storage, the same building is selected again automatically.

**Update**
- Tooltip: made design similar to original FoE tooltips
- Building Efficiency: 
	- Added building tooltips
	- Results will now be shown first
	- Item list hidden to make the table less crowded
- Menu: Moved it back to the right (default was bottom), because of a game update and y'all do not look at settings
- GBG: 
	- Added symbols for the battle type (red/blue) to the countdown list
	- Added attack colors to the map
	- Added map view to highlight attack colors better
- GBG active players:
	- removed the module on Innos request

**BugFix**
- Tooltip: 
	- Some browsers did not use the correct design
	- Did sometimes not vanish when a box was closed
- Reconstruction List: 
	- Set a default height
	- Moving buildings reduced counter
- Building Efficiency:
	- Other players ratings were based on your age instead of theirs

##### 3.9.0.0

**New**
- In reconstruction mode a building list, sortable by building size is offered
- GE-Results: Menu icon now shows the current number of attempts
- Tooltips: some modules now show the building information as a tooltip:
	- Efficiency module - in the "add building" dialogue
	- Boost Inventory
	- Reconstruction size-list
	- let us know on discord where else you would like to see that info

**Update**
- Statistics: Dark Matter added to Special Goods
- Changed settings entry "Load current beta"

**BugFix**
- Building efficiency: 
	- Broke for some players due to a game update
	- Same buildings with/without allies were not counted correctly
- Porduction Overview:
	- Fragment amount was not correct for some buildings
	- Not all buildings were listed in fragments overview

##### 3.8.1.0

**New**
- Production Overview:
	- Added QI productions and boosts view
	- Added setting for times: relative time, AM/PM, 24 hour clock
	- Merged Collection and Done column: when a production is ready, done will be shown, otherwise the selected time will be visible

**Update**
- Idle Game Mechanic:
	- The cost reduction to finish a round is now pulled from the game data and should auto-update with changes
- Great Biuldings Calculator - powerlevel values added for SASH levels 1-68

**BugFix**
- Production Overview was broken after a game update
- Production Overview did not show the Space Carrier
- Negotiations: Goods were not shown if you had an old operation system
- GB Investments: Fixed the window. BG is still missing, but you should level it to 91 anyways
- Castle System: Window was broken after a game update

##### 3.8.0.0

**New**
- Production Overview Update:
	- Bugfixes, added missing buildings
	- Removed some information to improve readability
	- Overhauled goods view
	- Added all fragments and items incl. sum accross all building
	- Added filter
	- Categorized army boosts
	- Added sum table for unit production according to unit types

- Buildings Efficiency Rating Update:
	- New Categories
	- New overview with more details
	- New: Search and filter for easier comparison
	- New: Show values per tile
	- New: Add any building to the list for comparison

- Boost-Inventory
	- Lists all Buildings in your Inventory that provide boosts (e.g. for battle)
	- Fragmented buildings are not considered!!

- Active Members of other Guilds
	- When within 5 minutes, the same guild (HQ in GBG) is inspected twice and at least one member of that guild was active, a list of the active guild members is displayed

**Update**
- Battle-Assist:
	- There will be no warning message anymore, if higher age units die in battle as they can now be revived in the hospital

- Kits:
	- Added Efficiency Score of the respective buildings

- Technologies:
	- Added Space Age Space Hub assets

- Settings:
	- Reorganized the menu
	- Bigger and moveable window

- QI City Map:
	- Buildings are now grouped by type
	- Coin, supply and quantum action boosts from your main city are now included - thx Juber!

**BugFix**
- Boxes:
	- can not be draged anymore when the mouse is on of the buttons of the box

##### 3.7.0.0

**New**
- added potion overview icon in the top right corner to
	- display the runtime of the potion with the shortest runtime left (potions are ignored when not relevant for currently selected game feature)
	- display all currently active potions upon mouse over
	- display inventory stock of all potions upon mouse over

**Update**
- Kits updated till Fall Event 2024

- Mergergame updated for Care Event

---

##### 3.6.5.0

**New**
- Summer Event:
	- Added a list of currently hidden rewards to the event chest helper

**Update**
- City Map:
	- Added QI Action Points in production overview when in QI Settlement
	- Added highlighting for buildings without street requirements for all players

- Cultural Settlements Overview:
	- Changed to 5-hour production cycle

- Close/hide all buttons now also close/hide minigame blockers

- Blue Galaxy:
	- Current era goods and other goods are now handled separately

- Kits:
	- Updated 'til Summer Event 2024
	- Images are now lazy-loaded to improve loading time
	- Ascended upgrades added to overview

- Limited buildings expired warning:
	- Now with a setting to ignore selected buildings after they expire

- Statistics:
	- Incidents and shards are now properly tracked again

**BugFix**
- GBG Building Recommendation:
	- Some combinations were ignored in 3-slot provinces

- (QI) pass rewards were not processed correctly if more than one was collected at once

- City Map:
	- certain buildings caused the city map to not load properly

- FP Collection:
	- QI rewards were way too high

- Recurring quest list did not show proper images

---

##### 3.6.4.0

**Update**
- Website Communication:
	- Transmitting data (Notes + City planner) to the website now needs a token
	- the token will be generated on the website after registration and needs to be entered in the helper settings

- City Overview:
	- in QI gives a production overview
- Cardgame:
	- the low health blocker now closes together with the helper box
- Kits:
	- Favourites can be selected and filtered for

**BugFix**
- Statistics:
	- some goods rewards were not combined

---

##### 3.6.3.0

**Update**
- City Overview:
	- new: City Overview for Settlements, Space Colonies and Quantum Incursions
- Card Game:
	- adapted to History 2024 changes
- Quests:
	- when a rival quest is done, a sound will alert the player of that (can be deactivated in the settings)
- FP Collector:
	- added sources "QI and "Event pass"
- Statistics:
	- added rewards from QI
	- goods rewards and units rewards will now be grouped instead of beeing listed individually for every type
- Settlements:
	- added images for polynesia
- GvG:
	removed the module	
- FP Bar:
	- moved it to the left in QI
	- now also shows in the main city when more than 999 FP in bar
- GBG Building suggestion:
	- removed some suggestions
	- added some highlighting
- Music:
	- added new tracks (polynesia and history)
	- removed category GvG
- Kits:
	- added items up to history event 2024
	- added a way to make items favourites and a highlight Option for that
- idle-game:
	- now has a separate timer for 6.3Q (25% Discount)
- Battle Advisor:
	- updated styling

**BugFix**
- St Patrick:
	- it was possible that the strategy could not be edited
- Titan GBs:
	- some boosts were wrong
- Kits:
	- wrong image data was used in some cases
- Production:
	- townhall space requirement assumed the needs for a road
- Battle Advisor:
	- corrected army images for QI
- Merger-Game:
	- corrected key values
- Recurring Quests (diamonds tracker):
	- it was possible for 1 or 2 quests of the previous era to show up in the next era - this should no longer happen as soon as the player enters the next era

---

##### 3.6.2.0

**Update**
- Mergergame:
	- adapted to event changes

- Kits/Sets Module:
	- now shows the amount of items needed for a full building

**BugFix**
- Settlements:
	- fix 4x chance for first run

- Statistics:
	- improved datepicker (thanks Linnun!)

---

##### 3.6.1.1

**BugFix**
- FP Bar:
	- The animation of the full FP bar lead to issues for many users, we removed it

---

##### 3.6.1.0

**Update**
- FP-Bar:
	- new design

- Kits/Sets:
	- new design
	- League rewards are now listed
	- added new buildings (up to Anniversary 2024)

- Mergergame (Anniversary-Event):
	- prepared for Changes
	- removed simulation and expected rewards

- Blue Galaxy:
	- sorting is now saved
	- sorting may be switched between combined value and individual values (FP/Goods/Guild-Goods/Fragments)

- Efficiency:
	- Values 0 and below are now also shown

- Gild Member Overview
	- Guild-goods production of certain buildings added

- GB Calculator:
	- New settings: deactivate BP and medals

**BugFix**
- GB Calculator:
	- Settings are nor saved/evaluated properly

---

##### 3.5.0.2

**BugFix**
- Export-Function:
	- Typo in code fixed

---

##### 3.5.0.1
**Update**
- City Map
	- Better visibility for highlighted buildings 
	- Added highlighting for buildings that do not require streets
    - Added a global sorting layout

**BugFix**
- BG Helper:
	- List did not always refresh

---

##### 3.5.0.0
**New**
- PvP Arena Protocol (Dank an dersiedler1)
	- no need to click though protocol pages
	- categorized protocol entries
	- can be activated in the settings to pop-up when opening the Arena

- Army Advisor
	- was added some time ago, but never was mentioned in a changelog
	- activate in the settings
	- tracks the most recent battles
	- gives a pop-up whenever a battle was unfavourable to the player (e.g. lost two or more units)
	- player can set advice for specific opponent armies and bonuses that will then be shown in the army selection dialogue

**Update**
- Blue Galaxy:
	- now always available
	- included fragments and guildgoods in list
	- reworked the building production evaluation (e.g. added Aegean Resort)

- Popgame:
	- adjusted layout for next Event

- Building Efficiency:
	- now lists GBs

- GB Tracker:
	- updated to accomodate changed serverdata

- GB/Own Part Calculator:
	- added player activity indicator

**BugFix**
- Moppelhelper:
	- fix era sorting 

- GBG
	- some own provinces were not shown in the "locked" list

---
##### 3.4.0.0
**New**
- GBG Buildings optimizer:
	- provides a list of suitable combinations of province buildings that have the least impact on treasury

**Update**
- Card Game:
	- couple data collection added (teeth spent in run, current level, current health, keys gotten)

- GBG contribution table:
	- added Attrition Column

**BugFix**
- GBG province list and map:
	- code adapted to changed data structure received from server (thanks Arklur!)

---

##### 3.3.0.0
**New**
- Card Game (Halloween Event):
	- provides a table of the remaining cards
	- warns, when continuing would be the end of the round

---

##### 3.2.9.0
**Update**
- Sets/Kits:
	- added buildings until Halloween 2023
	
- General:
	- when a limited building expires, an Alert is triggert

---

##### 3.2.8.0
**Update**
- Productions (cutesy of bencptest/apophis):
	- added fragments tab - all fragments are shown here that are currently produced (non-motivated producitons are ignored)

- Idle Game:
	- when the market (festival or banquet) is bottlenecked by the other buildings, hovering over the time for producing the upgrade costs will now give a time assuming no bottlenecks (i.e. for cases when there is a backlog at the intermediate storage sites)

- Popgame:
	- changes in regards to fall event

**BugFix**
- Idle Game:
	- it was possible that times like "1h:60min" were given - this is now corrected

---

##### 3.2.7.0
**Update**
- Recurring Quests
	- it can now be switched between displaying the title and tasks of the quests (click the shuffle arrows in the column header)

**BugFix**
- Fixed small bugs (mainly Titan related)

---

##### 3.2.6.0

**Update**
- GvG Overview: you can now click on the button in the GvG Overview to see the realtime GvG power of all guilds including their ranking on all maps. Please visit all maps once to load the power data from each map.

- Merger Game:
	- added a daily overview - you can switch between current game status and daily status by clicking the second column head
	- fixed blocker position
	- An optioon was added to set a specific reset cost to be used instead of the correct one 
		- you should enter the average of the epected reset costs here (e.g.: 3 games per day --> 20, 4 games per day --> 35)
		- this should help to improve the efficiency evaluation as they are not influenced by the reset costs anymore

- Wildlife Preview --> Popgame Preview
	- made some preparations for the Fall event

- Kits/Sets
	- added some missing pieces

**BugFix**
- Discord Invite links were broken, so we replaced them
- 
---
##### 3.2.5.0

**Update**
- Space Age Titan:
	- updated various components to accomodate for SAT

- Castle System:
	- updated display for GE5

- Building Kits:
	- updated possible contents

- Idle Game:
	- added condition type W(ait till task is active or completed):
		- similar to type T, but also completes when the task is active
		- e.g.: "await task 100 upgrades #W-26"

- Merger Game:
	- now compatible with the Soccer Event
	- the table now shows the number of free pieces in the top row
	- in column "Sim" it can be seen how much progress/players/keys can be reached with the current configuration and how efficient that is
	- In the column "next Spawn" it is shown, how much progress/players/keys can be generated by spawning an extra piece and how efficient that would be: Min - Max (Average)

**BugFix**
- Production Overview:
	- FP Boost was applied to Great Buildings
  
- Idle Game:
	- setting timers now works properly - limited to times below 24 hours

---
##### 3.2.4.0

**Update**
- Idle Game:
	- now also works with Fellowship event
	- added Strategy-Tasklist 
		- if you like mooing cats strategy guides, this will help you to implement them without the need to permanently check the guide from another source
		- the guide tasks can be added manually within the dialogue body and will be saved independently for every variation of run through. Format:
			- ...Description Text...#condition1#condition2#condition3
			- there can be arbitrarily many conditions per task
			- Condition types: L(evel) M(anager) T(ask)
			- Building types: T(ransport - Ship, Carriage), F(estival), 1, 2, 3, 4, 5 (Workshops 1-5)
			- e.g.:
				- Festival Manager 3 + Ship Manager 3  #MT-3#MF-3
				- Hats Manager 3, Level 10  #M1-3#L1-10
				- Wait for 50B Flowers#T-67
			- the conditions are optional and only needed if you want the helper to automatically check the tasks when they are done
			- tasks can be checked and unchecked manually

- Production Overview and Production Efficiency:
	- the new combination boosts (attack+defense) and the FP boost are now properly processed

- GB Tracker
	- can now be minimized

- Guild Battegrounds
	- when in the province overview no line is selected, there now will be a "select all" button

- Mo/Po helper
	- column "guild" added
	- columns guild, era and points can now be selected to be shown/hidden

- power leveling
	- a start level can now be selected

- compare friends with threads
	- now display the player activity

**BugFix**
- Recurring quests (diamonds tracker)
	- the quest list now properly resets when changing Era

- Guild Expedition Stats
	- fixed occasionally shown NaN in member Stats
	- corrected participation % for GE since addition for GE5
	- correct icon for GE5

---

##### 3.2.3.0

**Update**
- Infobox:
	- it can now be configured that instead of the full GBG Province name only the shortname is displayed

**BugFix**
- external images:
	- when the game file was not in cache, it could happen that images from Innogames were not loaded properly
  
- GB-Calculator:
	- if the Infobox was open before the GB Calculator, it could happen that by clicking the filter in the Infobox, the settings of the GB Calculator were opened
---

##### 3.2.2.0

**Update**
- Merger Game:
	- The parameter determining the color of the efficiency may now be changed in the settings
		- Progress per key (Key value): A key is worth about this much progress (from buying chests - default: 1.3)
		- Target Progress: this far you want to get into the grand prizes (default: 3750 for the golden kit)
		- Available Currency/Energy: this much Energy is available during the whole event (default: 11000 - 10500 for Quests and about  500 from incidents)
			- if you buy currency, you should add that amount here
		- Efficiency is red when 5% below the target value
		- Efficiency is green when 15% above the target value
		- Efficiency is yellow when just about enough to reach the target progress
	- when pointing at the Efficiency, a Tooltip will show, how much total progress is possible with that efficiency value (current progress not taken into account)
	- when pointing at the used energy, a Tooltip will show, how much progress you should make on the current board in relation to the spent energy to reach the target
	- if you do (not) want the reset-blocker to vanish when the box is minimized, this can now be configured

- Statistics:
	- rewards may now be filtered by their name

- Negotiation Assistant:
	- Tooltip added for the keyboard hint

- Sets and Kits:
	- added missing pieces

- Boxes:
	- may no longer be resized beyond the window borders

**BugFix**
- Quest counter:
	- [#2541](https://github.com/mainIine/foe-helfer-extension/issues/2541) if multiple recurring quests were abondoned in quick succession, only one was counted

---

##### 3.2.1.0

**Update**
- Merger Game:
	- changes values (Inno Update) - should now be more robust against future changes

- FP-Collector:
	- added Anniversary-Event
	
---

##### 3.2.0.0

**New**
- Merger Game (Anniversary Event Mini game)
	- gives an overview about the key pieces present on the board

**Update**
- Music-Modul:
	- added new Track (will be available on live latest with the anniversary event, currently only available on beta)

- Event cost calculator:
	- second cost column added to the right side of table 
	- highlighting of the most efficient option now also is in the respective cost column

- Kits:
	- The list may now be filtered - for name of item or set

**BugFix**
- General:
	- Player-Portraits were not loaded when modules were opened too soon after loading the game

---

##### 3.1.0.1

**Update**
- Player-ID added to the export of:
	- GE Data
	- BGB Data
	- Guild-member-Data

**BugFix**
- Alerts:
	- Alerts were deleted prematurely

- General:
	- Changelogs were not opened anymore after an update was installed

---

##### 3.1.0.0

**New**
- GB Tracker:
	- helps you find specific GBs - e.g. for BP hunting
	- while you click through the GB ranking or view GB Lists of other Players (e.g. neighbours, friends, guild) the tracker will record all GB that match your criteria
	- choose the desired GB, enter a level range you are interested in and go hunting
	- "resetting" will clear the list and reset the filter

**Update**
- GB Calculator:
	- new formatting

- GvG:
	- Costs for the next siege have been added to the list
	- Ranking bonus for the first three guilds on a map has been added

**BugFix**
- Menu:
	- tooltips could be left behind when the menu mode was force-changed due to zooming or the like

- StPatrick:
	- did not update anymore properly

- GBG:
	- X1 (and A1 on the volcano map) was not tracked properly

---

##### 3.0.0.1

**BugFix**
- Statistics:
	- Script was not always included locally, this is now changed

---

##### 3.0.0.0

**New**
- Extension:
	- Compatibility created for new Manifest V3 requirements for Chromium browsers, Firefox will follow only in Q1 2023
	- several CSS adjustments

**Update**
- Discord Webhooks:
	- Copy button added
	- maximum height for many entries added
	- test button integrated
	- as many webhook urls as you like can be added
	- new functions will follow...

**BugFix**
- Note function:
	- Box was not displayed because of a faulty avatar on the left side
