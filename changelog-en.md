## Changelog - Extension

##### 3.9.0.0

**New**
- In reconstruction mode a building list, sortable by building size is offered
- GE-Results: Menu icon now shows the current number of attempts
- Tooltips: some modules now show the building information as a tooltip:
	- Effiziency module - in the "add building" dialogue
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
	- Fragment amount was not korrekt for some buildings
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

---

##### 2.12.2.0

**Update**
- Discord webhooks:
	- Copy button added
	- Maximum height for many entries added
	- test button integrated
	- any number of webhook urls can be stored
    - new functions will follow...

**BugFix**
- note function:
	- Box was not displayed because of a faulty avatar on the left side

---

##### 2.12.1.1

**Update**
- Discord Webhooks:
  - en/de Help links added

**BugFix**
- Discord Webhooks:
	- Now visible for all players
	- Entries were not displayed after saving

---

##### 2.12.1.0

**New**
- Discord Webhooks:
	- (currently only) for the guild battles an event can be triggered which can send a message to the channel - WebHook of a Discord server at the first attack on a sector
    - more events could follow if there is a need

**Update**
- enhancement:
	- future-proof image links for possible changes of the Inno-Hosting policies (timestamp)

**BugFix**
- Battle Assist:
	- [#2522](https://github.com/mainIine/foe-helfer-extension/issues/2522) the position of the "Higher Era Unit Lost"-Warning has been corrected in the case that the PVP tournament was not running (Sunday Evening - Monday morning)

---

###### 2.12.0.1

**BugFix**
- GvG map & log:
	- Special characters in GvG box - fixed

- Translations:
	- hu.json fixed

---

##### 2.12.0.0

**New**
- Friends comparison in conversations:
	- compares your friends list with selected conversation's participants
		- open the module via the menu
		- open the group info of the conversation you are interested in

- Auctions:
	- when active, this calculates an auction bid based on a given sequence and the current bid and places it in the clipboard
	- you have to paste the calculated bid into the bidding field manually
	- you may activate this feature and edit the bidding sequence in the Settings under "Boxes"

**Update**
- Motivate/Polish Helper:
	- if a player cannot be attacked, this is now indicated in the Era column

**BugFix**
- Extension:
	- [#2515](https://github.com/mainIine/foe-helfer-extension/issues/2515) Constant bug in development log - Cosmetic fix

- GvG Map & Log:
	- [#2526](https://github.com/mainIine/foe-helfer-extension/issues/2526) Special characters in GvG box - fixed

##### 2.11.0.0

**New**
- GB FP double payment
	- can be activated in the box settings by giving a value greater 0
		- when active, the input field and pay button will be blocked after every FP payment for the given value in seconds
		- this may prevent double FP payments in cases in which the server is slow with a response and the input field seemed to not have reacted on the mouse click

**BugFix**
- Recurring Quests
	- The menu entry is now displayed correctly and the module is now properly accessible

---

##### 2.10.0.0

**New**
- Recurring Quests
	- This module shows for which of the recurring quests the Helper is sure that player has already received diamonds.
		- if it shows a "✓", you already got diamonds for that quest
		- if it shows a "?", the helper has not seen you getting diamonds or medals for that quest - you may have gotten them on a different device, before installing the helper, or before activation of this feature though

**BugFix**
- GB Calculator
	- [#2491](https://github.com/mainIine/foe-helfer-extension/issues/2491) "P(XX)" Setting was not saved/set properly.

- Aztecs Minigame Helper
	- [#1489](https://github.com/mainIine/foe-helfer-extension/issues/2489) Box would not show.

---

##### 2.9.3.0

**Update**
- Music module:
	- Now includes track for the fellowship event

- Incidents:
    - [#2466](https://github.com/mainIine/foe-helfer-extension/issues/2466) Graphics for the ad chest and the fellowship event's special incident added

- Building kits module:
	- Newest event buildings added

- FP Collector:
	- Fellowship event added

- GB Calculator:
	- New option "Save Donation Factor per Conversation".
		- Calculator will now detect if the great building has been open via the context menu in an open conversation (for example a 1.95 group).
		- When selecting a different donation factor (1.9, 1.92, 1.95 etc.) this value will per stored per conversation.
	- So after some time:
		- If you open a GB in the 1.9 group it will preselect 90% when opening the GB
		- If you open a GB in the 1.95 group it will preselect 95% when opening the GB

**BugFix**
- City Overview:
    - [#2470](https://github.com/mainIine/foe-helfer-extension/issues/2470) Some new expansion areas were not properly mapped
    - [#2465](https://github.com/mainIine/foe-helfer-extension/issues/2465) City map did not show decorations

- FP Collector:
	- [#2469](https://github.com/mainIine/foe-helfer-extension/issues/2469) blue galaxy rewards were not tracked anymore

- Production Overview:
	- Some minor fixes to accommodate newer building's specificities
	- FP-Boost (upcoming summer event) now included in calculations

---

##### 2.9.2.0

- Production overview:
	- [#2449](https://github.com/mainIine/foe-helfer-extension/issues/2449) [#2452](https://github.com/mainIine/foe-helfer-extension/issues/2452) Production overview did not open

- Statistics module:
	- [#2453](https://github.com/mainIine/foe-helfer-extension/issues/2453) DNA (Special Good) was not recognised

- Own contribution calculator:
	- [#2454](https://github.com/mainIine/foe-helfer-extension/issues/2454) As of version 2.9.1.0, the Own Share Calculator crashed if the format was saved per Legendary Building and the new "Danger" option was selected for one of the buildings at the same time.

---

##### 2.9.1.0

**Update**
- Own contribution calculator:
	- Data for the A.I. added => Powerlevel-Overview

- Units:
	- PvP slots are also output, graphics can be scaled in size

**BugFix**
- Production overview:
	- [#2199](https://github.com/mainIine/foe-helfer-extension/issues/2199) Correct age is now displayed
	- [#2222](https://github.com/mainIine/foe-helfer-extension/issues/2222) [#2233](https://github.com/mainIine/foe-helfer-extension/issues/2233) [#2236](https://github.com/mainIine/foe-helfer-extension/issues/2236) [#2290](https://github.com/mainIine/foe-helfer-extension/issues/2290) [#2403](https://github.com/mainIine/foe-helfer-extension/issues/2403) "Golden fields" are now correctly recognised
	- [#2290](https://github.com/mainIine/foe-helfer-extension/issues/2290) Percentages of the castle were not respected

- Guild battles:
	- [#2244](https://github.com/mainIine/foe-helfer-extension/issues/2244) added missing translations

- Efficiency calculation:
	- [#2282](https://github.com/mainIine/foe-helfer-extension/issues/2282) non-motivated shrines are detected
	- [#2405](https://github.com/mainIine/foe-helfer-extension/issues/2405) "Stage of the Ages" was not recognised

- Bonus hud:
	- [#2409](https://github.com/mainIine/foe-helfer-extension/issues/2409) Graphics were not displayed

- Notes:
	- [#2419](https://github.com/mainIine/foe-helfer-extension/issues/2419) Groups could not be renamed

- Settings:
	- [#2421](https://github.com/mainIine/foe-helfer-extension/issues/2421) removed double entry for "own contribution calculator".

- LB Investments:
	- [#2431](https://github.com/mainIine/foe-helfer-extension/issues/2431) Goods production for higher levels of Star Gazer was too high

---


##### 2.9.0.0

**New**
- Aztecs Minigame Helper
	- Shows you the probabilities of the goods on the hidden fields

**Update**
- New Age - Space Travel: Jupiter Moon:
	- The new goods have been added

- Beta Mode:
	- Has been removed, is now offered in an [extra extension](https://github.com/mainIine/foe-helfer-extension/archive/refs/heads/betaLoader.zip)

- Guild Battles:
	- New schematic maps
	- New settings for countdowns: show all countdowns, also show countdowns of own sectors

- Own share calculator:
	- [#2367](https://github.com/mainIine/foe-helfer-extension/issues/2367) more option added - places can be output without the leading "P" as well

- Menu:
	- [#2363](https://github.com/mainIine/foe-helfer-extension/issues/2363) If the window is too small, the box menu is automatically activated so that you can still access the helper
	- Positioning of the lower menu for FoE+ slightly adjusted

- Settings:
	- Most settings can now be found in the respective window

**BugFix**

- Menu:
	- [#2364](https://github.com/mainIine/foe-helfer-extension/issues/2364) Small windows now have scrollbars again

- Menu box (ReSize):
	- Can be dragged very small again

- Production Overview:
	- [#2393](https://github.com/mainIine/foe-helfer-extension/issues/2393) Golden fields were not recognized

- Bonus HUD:
	- Is now always displayed

- Guild Battles:
	- [#2379](https://github.com/mainIine/foe-helfer-extension/issues/2379) within a session the last open tab is remembered

- Stats:
	- [#2388](https://github.com/mainIine/foe-helfer-extension/issues/2388) fixed wrong links to goods

---

##### 2.8.0.0

**New**
- Beta-Mode:
	- in the settings you can now choose to use the current beta version of Github instead of the installed one.
	- When using this mode, there may be more bugs - please report bugs on [Discord](https://discord.gg/uQY7rqDJ7z) or on [Github](https://github.com/mainIine/foe-helfer-extension/issues)!

**Update**
- St. Patrick's Box:
	- the target level for the upgrade costs can now be determined by yourself
	- A time estimate is now given for collection tasks

- Guild Battles:
	- Waterfall map added
	- Unlock times of sectors are now shown on the map

- Boxes and menu:
	- updated design, less graphics more pure CSS

**BugFix**
- St.Patrick's Box:
	- [#2341](https://github.com/mainIine/foe-helfer-extension/issues/2341) [#2348](https://github.com/mainIine/foe-helfer-extension/issues/2348) there was no reset of buildings when starting the next city
	- calculation of time to reach 8.4Q for the next city was not correct


- Events:
	- [#2340](https://github.com/mainIine/foe-helfer-extension/issues/2340) the "zero" is now hidden again when there are no events


---

##### 2.7.0.0

**New**
- Music Module:
	- [#2335](https://github.com/mainIine/foe-helfer-extension/issues/2335) [Info](https://github.com/mainIine/foe-helfer-extension/issues/2335)
		- You can choose whether titles linked to an epoch may be played in your city or in the colony:
			- Nu current epoch (only titles linked to the current epoch will be played).
			- up to current epoch (only titles linked to the current or an earlier epoch are played)
			- ignore era (all titles can be played)
			- You can choose whether visiting the tavern, the PvP arena or opening the event window should trigger the associated title
			- You can choose whether the titles of other settlements can be played in settlements (e.g. Egypt can be played in Aztecs if selected below).

**Update**
- St.Patricks Box:
  - The box can now be resized
  
- Hidden incidents:
	- there now is a setting to exclude relics from the incident count

**BugFix**
- Alarms:
	- [#2332](https://github.com/mainIine/foe-helfer-extension/issues/2332) The alarm overview did not open.

- Guild Battles:
	- The overview box of the provinces could not be opened.

---

##### 2.6.0.1

**Update**
- Scout Info:
	- With a MouseOver the age in which a province is open is displayed

**BugFix**
- Scout Info:
	- [#2326](https://github.com/mainIine/foe-helfer-extension/issues/2326) [#2327](https://github.com/mainIine/foe-helfer-extension/issues/2327) With some players the game could crash completely

- Outposts:
	- the run-count and the 4x bonus were not processed correctly for the endless runs

---

##### 2.6.0.0

**New**
- St. Pattrick [#2309](https://github.com/mainIine/foe-helfer-extension/issues/2309):
	- Calculates the hourly production rates for each of the stations, and highlights the bottleneck
	- Calculates the amount of clovers needed to bring a building to the next threshold, and gives a time estimate for producing the needed amount at the current production rate
	- names the next 6 tasks to be done
	- gives a time estimate for the "next city" based on the current production rate

- Scout Info [#2311](https://github.com/mainIine/foe-helfer-extension/issues/2311):
	- Added an info box for the scout. When the map is opened (regardless of which map the scout is currently on), it provides information about
		- Provinces that are ready to be taken (green)
		- cost and scouting time for provinces that can be scouted at the moment
		- time remaining for current scouting

**Update**
- Investment overview:
	- [#2247](https://github.com/mainIine/foe-helfer-extension/issues/2247) Added links to player profile on scoredb.io.

- FP collections:
	- Formatting for larger values integrated

- Events:
	- [#2314](https://github.com/mainIine/foe-helfer-extension/issues/2314) hidden rewards now show relics and shards from the Flying Island

- City overview:
	- [#2231](https://github.com/mainIine/foe-helfer-extension/issues/2294) [#2294](https://github.com/mainIine/foe-helfer-extension/issues/2310) color legend integrated - thanks to [stebach](https://github.com/stebach)
	- [#2312](https://github.com/mainIine/foe-helfer-extension/issues/2312) Search field for finding buildings integrated
	- [#2313](https://github.com/mainIine/foe-helfer-extension/issues/2313) When highlighting old buildings, they are now categorized in 4 different colors

- Kits:
	- [#2308](https://github.com/mainIine/foe-helfer-extension/issues/2308) Revised and reorganized, shows all parts of a kit + link to wiki - thanks to [oesi03](https://github.com/oesi03)

- Stats module:
	- [#2315](https://github.com/mainIine/foe-helfer-extension/issues/2315) Delta chart is now a bar chart

- Guild overview:
	- [#2316](https://github.com/mainIine/foe-helfer-extension/issues/2316) additional number of guild members in the guild estates

- Outposts:
	- [#2317](https://github.com/mainIine/foe-helfer-extension/issues/2317) goods overview now provides a cost estimate that shows the x4 bonus in a mouseover

**BugFix**
- Guild members overview:
	- [#2224](https://github.com/mainIine/foe-helfer-extension/issues/2224) Fixed incorrect level value when exporting guild buildings.

- Infobox:
	- [#2241](https://github.com/mainIine/foe-helfer-extension/issues/2241) Timestamp was assigned differently when reopening the box
	- [#2238](https://github.com/mainIine/foe-helfer-extension/issues/2238) No progress indicator for the X1X sector

- Production overview:
	- [#2276](https://github.com/mainIine/foe-helfer-extension/issues/2276) [#2282](https://github.com/mainIine/foe-helfer-extension/issues/2282) Unmotivated buildings are no longer displayed in the production overview

- Map of continents:
	- [#2273](https://github.com/mainIine/foe-helfer-extension/issues/2273) [#2274](https://github.com/mainIine/foe-helfer-extension/issues/2274) Continental map overview shows all provinces as conquered
	
---

##### 2.5.10.2

**BugFix**
- Guild members overview:
	- [#2224](https://github.com/mainIine/foe-helfer-extension/issues/2224) Fixed incorrect level value on guild building export.

**Update**
- Investment overview:
	- [#2247](https://github.com/mainIine/foe-helfer-extension/issues/2247) Links added to the player profile on scoredb.io

- FP collections:
	- Formatting for larger values integrated

---

##### 2.5.10.1

**Update**
- Guild Battles:
- [#2230](https://github.com/mainIine/foe-helfer-extension/issues/2230) New provinces added

---

##### 2.5.10.0

**New**
- Castle System:
	- [#2190](https://github.com/mainIine/foe-helfer-extension/issues/2190) Castle System Wizard:
		- Overview of the progress of the daily/weekly targets for obtaining castle points.
		- Log about all received castle points of the last days

**Update**
- hidden events:
	- [#2184](https://github.com/mainIine/foe-helfer-extension/issues/2184) The box now closes automatically when all hidden events have been collected

- guild members overview:
	- [#2211](https://github.com/mainIine/foe-helfer-extension/issues/2211) timestamp in filename when exporting data
	- [#2212](https://github.com/mainIine/foe-helfer-extension/issues/2212) for certain buildings (e.g. hall of fame) the produced guild power was calculated incorrectly

- i18n:
	- [#2208](https://github.com/mainIine/foe-helfer-extension/issues/2208) Missing translations added

- Close All Box:
	- Added option to automatically hide all FoE helper windows when entering a fight in the box settings.

**BugFix**
- Guild members overview:
	- [#2180](https://github.com/mainIine/foe-helfer-extension/issues/2180) Added golden fields to the overview of guild goods producing buildings.
	- [#2204](https://github.com/mainIine/foe-helfer-extension/issues/2204) Erroneous increase of guild goods/power when expanding a member's detail view multiple times

- City overview:
	- [#2200](https://github.com/mainIine/foe-helfer-extension/issues/2200) removed wrong background image

- Production overview:
	- [#2187](https://github.com/mainIine/foe-helfer-extension/issues/2187) Golden fields were not recognised
	- [#2188](https://github.com/mainIine/foe-helfer-extension/issues/2187) points of the city hall were not recognised

---

##### 2.5.9.3

**Neu**
- Close all Box:
	-[#2044](https://github.com/mainIine/foe-helfer-extension/issues/2044) Floating box to hide and close all FoE helper windows
		- can be activated in the FoE Helper settings under Boxes -> Close all Box

**BugFix**
- Menu:
	-[2172](https://github.com/mainIine/foe-helfer-extension/issues/2172) The tooltip warnings were permanently displayed even if the conditions were fulfilled.

**Update**
- Guild Battle Box:
	-[#2170](https://github.com/mainIine/foe-helfer-extension/issues/2170) Improvement of the snapshot feature:
		- Chronological storage of the individual Guild Battlegrounds rounds.
		- Each snapshot within the currently running Guild Battlegrounds round, with the respective increases of the members, is saved. With the start of a new Guild Battlegrounds round, the saved snapshots of the previous round will be deleted.
		- Filter function for saved snapshots (player and date)
	-[#2176](https://github.com/mainIine/foe-helfer-extension/issues/2176) Added filter to show only members with a changed progress.

- Guild members overview:
	-[#2164](https://github.com/mainIine/foe-helfer-extension/issues/2164) Show 0 values for Gex/GG in guild member statistic
		- Optionally via the settings menu of the box, the entries of the individual players can now also be displayed, in which the player had no participation in GE or GBG
	-[#2165](https://github.com/mainIine/foe-helfer-extension/issues/2165) Date format GE/GBG in the guild member statistic
		- The date format of Gex/GG participations can now be changed from calendar week to start date, end date or calendar week.
	- [#2174](https://github.com/mainIine/foe-helfer-extension/issues/2174):
		- In the member list and the era overview it is now possible to display/expand all details with one click.

- Investment overview:
	-[#2173](https://github.com/mainIine/foe-helfer-extension/issues/2173) The total profit of medals is displayed in the investment overview if the column medals is selected in the box settings

---

##### 2.5.9.2

**Update**
- Guild members overview:
	- [#2137](https://github.com/mainIine/foe-helfer-extension/issues/2137):
		- Won fights of members can be displayed in the overview (can be activated in the settings of the guild member overview).
		- Won battles and whether the player is still an active member of the guild have been included in the export.

- Investment overview:
	- [#2141](https://github.com/mainIine/foe-helfer-extension/issues/2141): Display of a column with the date of the last payment into the LG.

- EA Calculator:
	- [#2142](https://github.com/mainIine/foe-helfer-extension/issues/2142) Changed logic of how settings are saved in EA Calculator.
	  Note: These changes mean that some settings (e.g. Copy Format) have to be reset to default settings once after the update.

- Moppelassistent:
	- [#2148](https://github.com/mainIine/foe-helfer-extension/issues/2148) Added player activity icons that show if the player has not been logged in for more than 2 (yellow) or 7 (red) days (works for friends and guild members if you have at least leader rights)

- Production overview:
	- Bonuses and daily reward box of the castle system added

- Blue Galaxy Helper:
	- [#2103](https://github.com/mainIine/foe-helfer-extension/issues/2103) If auto-open is enabled, the box will also close automatically at the end of all attempts.

**BugFix
- Guild Member Overview:
	- [#2117](https://github.com/mainIine/foe-helfer-extension/issues/2117) Display of GEX calendar week is now the beginning of the GEX and not the end anymore
	- [#2128](https://github.com/mainIine/foe-helfer-extension/issues/2128) Overview no longer opens automatically and inactivities were no longer taken over due to changed permission values by Inno

- Export of settings and data
	- [#2119](https://github.com/mainIine/foe-helfer-extension/issues/2119) Fixed world-specific error when importing local settings.

- Investment overview:
	- [#2138](https://github.com/mainIine/foe-helfer-extension/issues/2138) [2134](https://github.com/mainIine/foe-helfer-extension/issues/2134) Investment list is now correctly updated when there are no more investments.

- Production overview, city overview, building efficiency rating
	- [#2122](https://github.com/mainIine/foe-helfer-extension/issues/2122) Fixed crash caused by new event building "Golden Crops" (Herbes event) on beta server.

- LG Investments
	- [#2116](https://github.com/mainIine/foe-helfer-extension/issues/2116) Goods production of the Atlantis Museum corrected

- Outpost
	- [#2147](https://github.com/mainIine/foe-helfer-extension/issues/2147) Moghul Empire: Name of first building corrected from "Avenue" to "Water Canal

- Guild Battle Box:
	- [#2150](https://github.com/mainIine/foe-helfer-extension/issues/2150) Fixed incorrect character encoding on export.

---


##### 2.5.9.1

**Update**
- Blue Galaxy:
    - [#1984](https://github.com/mainIine/foe-helfer-extension/issues/1984) The number of remaining recharges is now shown in the menu icon

- EA Calculator:
    - [#1888](https://github.com/mainIine/foe-helfer-extension/issues/1888) Own share can now also be added to the copystring

**BugFix**
- Extension:
    - [#1547](https://github.com/mainIine/foe-helfer-extension/issues/1547) Some boxes were not closed on second click into menu

- GEX results:
    - Saved settings were reset to default after reloading the game.

- GvG approvals:
    - [#2104](https://github.com/mainIine/foe-helfer-extension/issues/2104) Counters were reset after reloading the game. Does not happen anymore.

- Guild members overview:
    - [#2108](https://github.com/mainIine/foe-helfer-extension/issues/2108) Invalid scoredb link for some players in the "legendary buildings" tab.

- Menu:
    - [#1537](https://github.com/mainIine/foe-helfer-extension/issues/1537) Some boxes could not be closed by a 2nd click of the menu icon

- Infoboard:
    - [#2097](https://github.com/mainIine/foe-helfer-extension/issues/2097) The player name was not displayed correctly when being outbid in an auction

- Production overview/efficiency rating:
    - [#2094](https://github.com/mainIine/foe-helfer-extension/issues/2094) Wrong values of stock/coin production when opening the production overview several times.
    - [#2099](https://github.com/mainIine/foe-helfer-extension/issues/2099) Invalid values of goods production for buildings producing guild goods
    - [#2110](https://github.com/mainIine/foe-helfer-extension/issues/2110) Invalid values for goods production if a production option is currently active <> 24h

---

##### 2.5.9

**New**
- GEX Results
    - the results of the guild expeditions are stored chronologically each week (ranking and member participation). Visiting the participation overview and opening the guild ranking list is necessary to update the data.
    - Graphical representation of the progress of the guild expeditions (points, encounters, members (total), participants, rank)
    - Export of the results (ranking list and member participation) to CSV / JSON

- Export of settings and data
    - The entire configuration of the FOE Helper as well as all locally saved databases can now be saved in the settings under Import/Export and restored on another PC or browser.

- Building Efficiency Rating
    - Tool to find buildings that are no longer efficient. The player determines which yield per field he wants. The tool indicates which buildings achieve this yield and which do not.

- Links to the player profile on scoredb.io
    - [#149](https://github.com/mainIine/foe-helfer-extension/issues/149) Player names in Foe Helper are replaced by links to the player's profile on the scoredb.io site (can be activated or deactivated in the settings menu)

**Update
- Guild members overview
    - [#2033](https://github.com/mainIine/foe-helfer-extension/issues/2033) LG list of all guild members
      Filterable list of the LG of all guild members with the current level, unlocked levels, invested FP and required FP to level up.

- LG Investments
    - [#1550](https://github.com/mainIine/foe-helfer-extension/issues/1550) Option to consider bonuses for the attacking army.
    - Support for relic temple and flying island.

- Production overview:
    - [#2060](https://github.com/mainIine/foe-helfer-extension/issues/2060) It is now shown for all resources like forgen points additionally the maximum production when everything is motivated/polished

- Own share calculator:
    - [#2045](https://github.com/mainIine/foe-helfer-extension/issues/2045) The buttons "Copy" and "Remember" are now also available in the main window if a place is safe. The default settings for copying are used.
    - Display which legendary buildings have already been bookmarked
    - After memorising a building, the current list is now also copied to the clipboard.
    - [#2046](https://github.com/mainIine/foe-helfer-extension/issues/2046) Places that do not yield FP as a patron reward are suggested with 1FP.
    - In the copy box, the option "All + empty" has been replaced with the option "Auto + not safe". This copies all places that are not yet occupied

- Misc:
    - [#1965](https://github.com/mainIine/foe-helfer-extension/issues/1965) Added global setting to disable all sound effects in Foe Helper.
    - [#2064](https://github.com/mainIine/foe-helfer-extension/issues/2064) For long tables the header was fixed when scrolling down now

**BugFix**
- Guild members overview
    - [#2085](https://github.com/mainIine/foe-helfer-extension/issues/2085) Wrong display of age for guild goods producing buildings
    - [#2086](https://github.com/mainIine/foe-helfer-extension/issues/2086) Guild goods/power producing buildings were sometimes not displayed in the detail view

- Own share calculator:
    - [#2052](https://github.com/mainIine/foe-helfer-extension/issues/2052) Multiple memorisation of the same legendary building could result in duplicate lines
    - [#2075](https://github.com/mainIine/foe-helfer-extension/issues/2075) Depositing into legendary buildings that have already been leveled could display invalid values

- FP collections:
    - [#2089](https://github.com/mainIine/foe-helfer-extension/issues/2089) In the date selection dialogue the year 1912 was selected if the language of the foe helper was set to Dutch

- Investment overview:
    - [#2035](https://github.com/mainIine/foe-helfer-extension/issues/2035) Winnings/medals/blueprints were not updated immediately after leveling your own ark.
    - Hidden LG were shown again after leveling the own ark although no investment took place.

- Production overview:
    - [#2062](https://github.com/mainIine/foe-helfer-extension/issues/2062) Goods production: Added warning message if Venus outpost has not been visited yet (like Mars and Asteroids).
    - [#2058](https://github.com/mainIine/foe-helfer-extension/issues/2058) Invalid values could be displayed when upgrading roads.
    - [#2090](https://github.com/mainIine/foe-helfer-extension/issues/2090) Changed rounding of size values to 1 digit, as the value also contains the average road demand.

- LG investments:
    - [#2029](https://github.com/mainIine/foe-helfer-extension/issues/2029) Consider goods could not be permanently deactivated

- Market filter:
    - [#2084](https://github.com/mainIine/foe-helfer-extension/issues/2084) Corrected wrong information in the "Page" column of the "Advantageous" filter for own offers

- Infobox:
    - [#1907](https://github.com/mainIine/foe-helfer-extension/issues/1907) [#2065](https://github.com/mainIine/foe-helfer-extension/issues/2065) Sometimes wrong FP values could be displayed in the infobox when levelling LGs.

- CityMap:
    - [#1986](https://github.com/mainIine/foe-helfer-extension/issues/1986) Display of total and free area for foreign cities hidden, because the unlocked extensions are only known for the own city

- Events:
    - [#1991](https://github.com/mainIine/foe-helfer-extension/issues/1991) Added shards of the flying island

- Outposts:
    - [#2067](https://github.com/mainIine/foe-helfer-extension/issues/2067) Calculation of the required loot for Egyptians faulty

---

##### 2.5.8

**New**

- GvG Map & Protocol (BETA):
    - GvG Map: Shows all guilds that are currently represented on a map (also those that are only besieging). The sectors show more details when clicked. These details are updated when a map is reloaded.
    - Edit map: When you click on Edit, you can select a guild from the list (or none at all via the white button at the top) and then assign the sectors to the desired guild. The guild list will be updated accordingly.
    - GvG Protocol: Records all actions that happen on a GvG map while you are viewing it.
    - GvG Log Filter: Can filter the log by all characters it contains.
- GVG shares:
    - [#1781](https://github.com/mainIine/foe-helfer-extension/issues/1781) Number of your sector releases since the last accounting.

**Update**
- Extension:
    - [#692](https://github.com/mainIine/foe-helfer-extension/issues/692) [#1975](https://github.com/mainIine/foe-helfer-extension/issues/1975) Export options for various boxes of the helper. (The tables for "Market", "Technologies" and "MoppelHelper" can now be exported to CSV. More will be added in future updates)
- Guild member statistics:
    - [#1949](https://github.com/mainIine/foe-helfer-extension/issues/1949) [#1924](https://github.com/mainIine/foe-helfer-extension/issues/1924) Export function for each tab of the statistics.
    - Detail view of all guild buildings (revisit of all guild members recommended for correct display).
- Investment overview:
    - [#1990](https://github.com/mainIine/foe-helfer-extension/issues/1990) Display of medals and blueprints selectable via box menu.
- Statistics:
    - Flying island rewards are now recorded.
    - Events are now recorded.
    - Once there, rewards from the PvP arena will also be recorded.
- FP collections:
    - You can now select a time period. Thanks to Likeke181.
- LB recharges/quests:
    - Tooltips have been added to the icons.

**BugFix**
- Extension:
    - [#2022](https://github.com/mainIine/foe-helfer-extension/issues/2022) Typo in German translation ("Himej" >> "Himeji").
- Menu:
    - [#1928](https://github.com/mainIine/foe-helfer-extension/issues/1928) Bug in CSS code destroyed tooltip.
- Settings:
    - [#1999](https://github.com/mainIine/foe-helfer-extension/issues/1999) [#2000](https://github.com/mainIine/foe-helfer-extension/issues/2000) In the helper's settings menu, the view was wrong when selecting menu icons in a certain view
- Guild Member Statistics:
    - Guild power calculation was inaccurate in certain cases.
- FP collections:
    - Sometimes FP from other sources were added to events.
- Infoboard:
    - The "ping" always came even though filtered for a specific content. This is now fixed
- BonusBar:
    - [#1989](https://github.com/mainIine/foe-helfer-extension/issues/1989) Outpost quests are counted at quest icon of the BonusBar
- Own share calculator:
    - [#1994](https://github.com/mainIine/foe-helfer-extension/issues/1994) Scrolling back levels will now show the level correctly
    - [#2004](https://github.com/mainIine/foe-helfer-extension/issues/2004) Level 52 was missing
- Production overview:
    - [#2026](https://github.com/mainIine/foe-helfer-extension/issues/2026) FP production of airship was not counted if not motivated

---

##### 2.5.7.1

**BugFix**

- Extension:
	- Firefox BugFix
	- [#1970](https://github.com/mainIine/foe-helfer-extension/issues/1970) Menu Setting > Content; hidden icons were shown twice after opening several times.
	- Menu tool tip for guild statistics was missing

- Quest border:
	- date = null BugFix, counts correctly now.

--

##### 2.5.7.0

**New**
- Guild members statistics:
	- Display detailed information of guild members:
		- Ages
		- GEX/GG Participations
		- Number of messages in the guild forum
		- Guild goods producing buildings
		- Inactivity history (only with guild founder/leader rights)
	- Overview of all guild goods producing buildings of the guild members
	- Overview of available guild goods

- Quest Completion Info:
	- [#1915](https://github.com/mainIine/foe-helfer-extension/issues/1915) Quest completion notification in guild battles.
		- makes a sound when a quest is completed

- Quest Boundary:
	- [#1960](https://github.com/mainIine/foe-helfer-extension/issues/1960) Shows a small counter how many quests can still be skipped for this day.
		- Is disabled by default (Settings > Boxes > 2k quest limit)

- Export function for tables:
	- [#692](https://github.com/mainIine/foe-helfer-extension/issues/692) The tables in the modules "Marketfilter", "Technologies" and "Moppelassistent" can now be exported as .csv or .json file using the cogwheel icon

**Update**
- Proportionate share calculator:
	- [#1923](https://github.com/mainIine/foe-helfer-extension/issues/1923) Automatic update when leveling foreign LGs.
		- If a foreign LG is currently open in the EA calculator and this is leveled, the display is now automatically updated.

- Menu:
	- It is now possible to define which icons should be displayed in the menu via the settings; "Settings > Extensions > Menu Content".

**Bugfix**

- Building Kits:
	- Can be called up again as usual

- EA/Cost Calculator:
	- [#1921](https://github.com/mainIine/foe-helfer-extension/issues/1921) [#1958](https://github.com/mainIine/foe-helfer-extension/issues/1958) "Flying Island" added

- Guild member statistics:
	- [#1938](https://github.com/mainIine/foe-helfer-extension/issues/1938) Updated now the members who left the guild

- Infobox:
	- [#1941](https://github.com/mainIine/foe-helfer-extension/issues/1941) if there was a "<" or ">" in the title of a thread, there was an incorrect display
	  

- EA/Cost Calculator:
	- [#1921](https://github.com/mainIine/foe-helfer-extension/issues/1921) [#1958](https://github.com/mainIine/foe-helfer-extension/issues/1958) "Flying Island" added

- Guild member statistics:
	- [#1938](https://github.com/mainIine/foe-helfer-extension/issues/1938) Updated now the members who left the guild

- Infobox:
	- [#1941](https://github.com/mainIine/foe-helfer-extension/issues/1941) if there was a "<" or ">" in the title of a thread, there was an incorrect display
	  

---

##### 2.5.6.3

**Update**
- Investment overview:
    - [#1871](https://github.com/mainIine/foe-helfer-extension/issues/1871) No more data is sent to foe-rechner.de

- Research Cost Calculator:
    - [#1897](https://github.com/mainIine/foe-helfer-extension/issues/1897) As of this update, the Age of Venus is correctly recognised.

- Guild Battles:
    - We have rewritten the view of the guild battles box, for clarity

- Moppelassistent:
    - [#1912](https://github.com/mainIine/foe-helfer-extension/issues/1912) The sorting of names didn't work properly, it works now

- LG Investments:
    - Option to take goods production into account

- Bonus Bar:
    - [#1915](https://github.com/mainIine/foe-helfer-extension/issues/1915) Bonus Bar now also shows completed quests

**BugFix**
- Extension:
    - [#1892](https://github.com/mainIine/foe-helfer-extension/issues/1892) A double quote could destroy a tooltip

- Negotiation Wizard:
    - [#1879](https://github.com/mainIine/foe-helfer-extension/issues/1879) Sometimes the number of moves was not detected correctly, this has been fixed.

- Own contribution calculator:
    - [#1891](https://github.com/mainIine/foe-helfer-extension/issues/1891) Done own share was calculated wrong if deleted player had deposited something

- Building kits:
    - [#1910](https://github.com/mainIine/foe-helfer-extension/issues/1910) The number is now calculated correctly

---


##### 2.5.6.2

**Update**
- Production Overview:
    - [#1668](https://github.com/mainIine/foe-helfer-extension/issues/1668) Attack and Defence have been added as new tabs.

- Guild Battles:
    - improved view if province has no owner yet

- Investments:
    - [#1853](https://github.com/mainIine/foe-helfer-extension/issues/1853) Investments can be ignored - and squares can be shown as "safe" only

**BugFix**
- Menu:
    - [#1861](https://github.com/mainIine/foe-helfer-extension/issues/1861) Due to a case sensitive bug, the alert icon could not be moved, or disappeared

- Alerts:
    - [#1848](https://github.com/mainIine/foe-helfer-extension/issues/1848) Firefox bug: alert could not be created

- Investments:
    - [#1854](https://github.com/mainIine/foe-helfer-extension/issues/1854) Wrong sorting of entry time for investments corrected

---


##### 2.5.6.1

**Update**
- Extension:
    - many translations/corrections from [i18n.foe-helper.com](https://i18n.foe-helper.com) integrated [#1849](https://github.com/mainIine/foe-helfer-extension/issues/1849)

- Investments:
    - From now on, unprofitable LBs can be hidden and removed from the calculation

**BugFix**
- Alerts:
    - [#1841](https://github.com/mainIine/foe-helfer-extension/issues/1841) the icon of the alert module could not be moved or just disappeared

- Marketplace filter:
    - [#1847](https://github.com/mainIine/foe-helfer-extension/issues/1847) the default filters were gone and the box was empty at startup

---

##### 2.5.6.0
**New**
- Alerts:
	- Create alerts with your desired time, as many as you want. You have almost unlimited setting options:
		- exact time via date picker
		- repeatable alerts also with predefined intervals
		- recognises provinces and their locks and can create them as alarms, also directly from the new guildgefecth tool
		- recognises the offer in the antique dealer and can create an alarm from it
		- the alert appears on the Windows desktop


- Guild Battles Overview: _thanks to [vegaz337](https://github.com/vegaz337) for the template_
	- In addition to the player progress box, there is now a box (in the menu) that shows all progress of the contested provinces in real time.
	- a second tab shows in real time when adjacent sectors of your guild will lose their lock soon
	- by clicking on the small map marker in the upper right corner of the box, a mini-map appears which is also updated in real time

**Update**
- investments: _thanks to [danielvoigt01](https://github.com/danielvoigt01) for the template_
	- The small box now contains all your investments in detail and shows you every single progress
	- You can see at a glance which LG you have invested in further
	- The box can now also be called up from the menu at any time

- Statistics:
	- [#1799](https://github.com/mainIine/foe-helfer-extension/issues/1799) The table below the graphic can now be copied and pasted

**BugFix**
- Cost calculator:
	- [#1793](https://github.com/mainIine/foe-helfer-extension/issues/1793) A loop quest of the Artic Future (Donate 200 FP) was not recognised correctly

- Research cost calculator:
	- [#1749](https://github.com/mainIine/foe-helfer-extension/issues/1749) Box has become resizeable and scrollable

- Toast messages (notifications):
	- [#1772](https://github.com/mainIine/foe-helfer-extension/issues/1772) have become more intelleigent. Münupositions on the right and at the bottom are recognised

- City overview:
	- [#1774](https://github.com/mainIine/foe-helfer-extension/issues/1774) Transmission box to foe-rechner.de no longer disappeared

---

##### 2.5.5.1

**Bugfix**
- Guild Battle Box:
	- [#1779](https://github.com/mainIine/foe-helfer-extension/issues/1779) with the export function of the overview came a he small bug that did not show the difference between the snapshots anymore

---

##### 2.5.5.0

**Update**
- Cost calculator:
	- Table headings partly replaced by icons, translations are much too long in some languages.

- Own contribution calculator:
	- [#1507](https://github.com/mainIine/foe-helfer-extension/issues/1507) Table headings partly replaced by icons, translations are much too long in some languages

- Guild Battle Box:
	- Table headings partly swapped by icons, translations are way too long in some languages

**Bugfix**
- Extension:
	- [#1770](https://github.com/mainIine/foe-helfer-extension/issues/1770) on the beta the player avatars were not loaded correctly, we have already fixed this as a precautionary measure

---

##### 2.5.4.4
**New**
- Trade blocker:
	- If desired, a small box in the map of continents overlays the "Negotiate" button to avoid accidentally pressing it

**Update**
- Extension:
	- more modern design for the boxes
	- new modern buttons for the boxes integrated
	- various translations integrated

- FP Collector:
	- Graphics added (current/upcoming events)

- Cost calculator:
	- Settings button added in the box, values of the arch subsidy can now be set.

- Own contribution calculator:
	- Settings button added in the box, values of the arch subsidy can now be set.

**Bugfix**
- Research costs:
	- [#1754](https://github.com/mainIine/foe-helfer-extension/issues/1754) Values were no longer displayed

---


##### 2.5.4.3

**Update**
- Production overview:
	- [#1647](https://github.com/mainIine/foe-helfer-extension/issues/1647) [#1662](https://github.com/mainIine/foe-helfer-extension/issues/1662) From now on you can see what is ready and can be harvested in green colour in the top right corner of each tab

**Bugfix**
- Extension:
	- Compatibility with older browsers restored

- Marketplace Filter:
	- [#1723](https://github.com/mainIine/foe-helfer-extension/issues/1723) The content of the marketplace filter was not displayed, Goes now again

- Production overview:
	- [#1726](https://github.com/mainIine/foe-helfer-extension/issues/1726) Event buildings that are not connected to a road still produce population, this has been fixed

---

##### 2.5.4.2

**Update**
- Production overview:
	- Alcatraz added to the overview for "units"

- FP Collector:
	- Arrows added to show that you can expand the entries

- Infobox:
	- [#1704](https://github.com/mainIine/foe-helfer-extension/issues/1704) Can now be loaded with the game start if desired => "Settings > Boxes > Infobox".
	- [#1416](https://github.com/mainIine/foe-helfer-extension/issues/1416) Can be limited to one length from now on => "Settings > Boxes > Infobox News" to spare the browser with very many entries
	- The entries of the infobox are saved if it is only closed and opened again


**Bugfix**
- Extension:
	- [#1720](https://github.com/mainIine/foe-helfer-extension/issues/1720) Filter in Moppelassistent reacts wrong if infobox is open
	- [#1707](https://github.com/mainIine/foe-helfer-extension/issues/1707) Some messages were not displayed

- Menu box:
	- [#1717](https://github.com/mainIine/foe-helfer-extension/issues/1717) When the box is on top of the border, the tooltips disappeared outside the visible area

- Production overview:
	- [#1709](https://github.com/mainIine/foe-helfer-extension/issues/1709) The box became too long, it is now scrollable again

- Infobox:
	- [#1694](https://github.com/mainIine/foe-helfer-extension/issues/1694) Fixed wrong translation in filter "GvG" => "GG"
	- The message filter is now case-insensitive (case is ignored)

- Moppelhelfer:
	- [#1658](https://github.com/mainIine/foe-helfer-extension/issues/1658) Date detection for CZ fixed

---

##### 2.5.4.1

**Bugfix**
- Menu:
	- [#1701](https://github.com/mainIine/foe-helfer-extension/issues/1701) [#1702](https://github.com/mainIine/foe-helfer-extension/issues/1702) in older browsers the helper could not be loaded

- Production overview:
	- [#1696](https://github.com/mainIine/foe-helfer-extension/issues/1696) In some browsers the table was not wide enough

- Extension:
	- [#1699](https://github.com/mainIine/foe-helfer-extension/issues/1699) Notifications were displayed despite deactivation

---

##### 2.5.4.0

**New**
- Menu:
	- [#1664](https://github.com/mainIine/foe-helfer-extension/issues/1664) [#1665](https://github.com/mainIine/foe-helfer-extension/issues/1665) There are now 3 menu variants (right, bottom and box).
	- Selectable via "Settings > General > Change Menu".
	- Redesign (smaller, new graphics) of the bottom and box variant for more space

- Extension:
	- Notifications can now be switched off via "Settings > General > Notification".
	- The notifications can appear at different positions "Settings > General > Notification positions".

**Update**
- City overview:
	- [#1659](https://github.com/mainIine/foe-helfer-extension/issues/1659) Translations for the statistics have been added

- Blue Galaxy Helper:
	- [#1653](https://github.com/mainIine/foe-helfer-extension/issues/1653) can now weight by goods. If you only want to weight by FP, change the value to "0" (zero).

- Production overview:
	- [#1646](https://github.com/mainIine/foe-helfer-extension/issues/1646) now updates when harvest is collected with diamonds

- Infobox:
	- [#1552](https://github.com/mainIine/foe-helfer-extension/issues/1552) from now on you can search for a text in the filter

- Extension:
	- many translations from [i18n.foe-helper.com](http://i18n.foe-helper.com/projects/foe-helper/extension/) have been integrated. Help us to integrate even more translations and register yourself

**Bugfix**
- FP Collector:
	- [#1690](https://github.com/mainIine/foe-helfer-extension/issues/1690) the collector did not count all duplications
	- [#1693](https://github.com/mainIine/foe-helfer-extension/issues/1693) fixed translation error

- Extension:
	- [#1687](https://github.com/mainIine/foe-helfer-extension/issues/1687) in Firefox not all translations were loaded

- Menu:
	- [#1681](https://github.com/mainIine/foe-helfer-extension/issues/1681) the drag&drop was too sensitive and always gave the message "The new menu order has been saved", we have changed that


---

##### 2.5.3.2

**BugFix**
- FP Collector:
	- A small bug prevented the menu button

---

##### 2.5.3.2

**BugFix**
- FP Collector:
	- A small bug prevented the menu button

---


##### 2.5.3.1

**New**

- FP Collector:
	- Collects by day and by type all FPs you collect in the whole game to create a complete overview of your "by the way" FPs

**Update**

- Menu:
	- [#1661](https://github.com/mainIine/foe-helfer-extension/issues/1661) [#1657](https://github.com/mainIine/foe-helfer-extension/issues/1657) Because of the new dynamic menu, the helper's menu moves to the bottom

- Motivation Helper:
	- The values can be sorted via the tab head
	- Filter for various events [#1652](https://github.com/mainIine/foe-helfer-extension/issues/1652)
	- Coloured values for better differentiation

**BugFix**

- Event helper:
	- [#1655](https://github.com/mainIine/foe-helfer-extension/issues/1655) Incorrect recognition of the daily price Football Event 2021

---

##### 2.5.3.0

**New**

- Blue Galaxy helpers:
	- If activated in "Settings > Boxes > Blue Galaxy" (default "on"), clicking on the harvestable Blue Galaxy will open a box that shows the FP strongest doublable buildings with the correct number of trials

- Motivation helper ****BETA****:
	- If activated in "Settings > Boxes > Motivations" (default = "on") all events in the town hall are noted down and can be opened by clicking on the button in the menu.
	  If a tab is crossed out, please click on the tabs of the game below accordingly.

**Update**
- extension:
	- Icons revised

- Own contribution calculator:
	- [#1638](https://github.com/mainIine/foe-helfer-extension/issues/1638) Copy overlay centred and new checkbox integrated

- Combat assistant:
	- [#903](https://github.com/mainIine/foe-helfer-extension/issues/903) The warning window can now be disabled in the settings

- Product overview:
	- [#1629](https://github.com/mainIine/foe-helfer-extension/issues/1629) Another tab shows how many units are produced in non military buildings

**Bugfix**
- Extension:
	- [#1649](https://github.com/mainIine/foe-helfer-extension/issues/1649) Innogames has changed something in the code that had broken the menu

- Product overview:
	- [#1640](https://github.com/mainIine/foe-helfer-extension/issues/1640) Produced FP of the statue of honour were not shown

---

##### 2.5.2.9

**Bugfix**

- Extension:
	- small bug when addressing the API

---

##### 2.5.2.8

**Bugfix**

- Cost calculator:
	- when opening another LG the box closed

---

##### 2.5.2.7

**Update**
- Research costs:
	- [#1622](https://github.com/mainIine/foe-helfer-extension/issues/1622) The window can now be resized individually

- Cost calculator:
	- [#1590](https://github.com/mainIine/foe-helfer-extension/issues/1590) The User Box closes the second click in the menu

**Bugfix**
- Notes:
	- [#1627](https://github.com/mainIine/foe-helfer-extension/issues/1627) No new page could be created

- Cost calculator:
	- [#1619](https://github.com/mainIine/foe-helfer-extension/issues/1619) Rounding errors for some arch factors fixed

---

##### 2.5.2.6

**Update**
- Extension:
	- many translations imported from [i18n.foe-helper.com](https://i18n.foe-helper.com)

**Bugfix**
- Motivieren/Polishing adapted, API redesigned

---

##### 2.5.2.5

**Update**
- Extension:
	- many translations imported from [i18n.foe-helper.com](https://i18n.foe-helper.com)

- Notes:
	- the last tab is "remembered" when new pages are created

**Bugfix**
- Visual corrections to the negotiation assistant

---

##### 2.5.2.4

**BugFix**
- negotiation assistants:
	- red frame fixed when selecting a good incorrectly

- Battle Assistant:
	- The window when losing a unit from the next Era can now be clicked away "normally

---

##### 2.5.2.3

**Update**
- Motivate/Polish:
	- Transmission to foe-rechner.de revised

---

##### 2.5.2.2

**Update**
- Event/Step calculator:
	- [#1592](https://github.com/mainIine/foe-helfer-extension/issues/1592) Added setting to disable the Box

- Battle Assistant:
	- From now on a warning is also given when a rare unit of the next Era has died => possibility to heal

**BugFix**
- Own contribution calculator:
	- [#1586](https://github.com/mainIine/foe-helfer-extension/issues/1586) When changing archefactor or external values, the EA calculator jumped back to the current level if scrolling to a higher level was done
	- [#1588](https://github.com/mainIine/foe-helfer-extension/issues/1588) EA Calculator does not load or update when external columns are filled

- Legendary buildings:
	- [#1587](https://github.com/mainIine/foe-helfer-extension/issues/1587) LG-Investitionen Innovation Tower had slipped below level 10

- Forge points bars:
	- [#1589](https://github.com/mainIine/foe-helfer-extension/issues/1589) FP counter in GG did not count up

- Notes:
	- Missing "save" button added

---

##### 2.5.2.1

**New**
- Guild chat:
	- revised and with different "rooms"

**Update**
- Tavern badge:
	- removed because it was copied by Inno

- Cost calculator:
	- [#1504](https://github.com/mainIine/foe-helfer-extension/issues/1504) Redesign of the "Copy" function, Scheme is now adjustable by yourself

- Legendary buildings:
	- [#1518](https://github.com/mainIine/foe-helfer-extension/issues/1518) the required space factor can now be changed
	- [#1574](https://github.com/mainIine/foe-helfer-extension/issues/1574) Added support for blue galaxy

- infobox:
	- [#1542](https://github.com/mainIine/foe-helfer-extension/issues/1542) "Welcome text" can be removed with "Empty box

**BugFix**
- statistics:
	- [#1522](https://github.com/mainIine/foe-helfer-extension/issues/1522) [#1568](https://github.com/mainIine/foe-helfer-extension/issues/1568) when changing between outpost and town there was a kink in the statistics

- Marketplace Filter:
	- [#1541](https://github.com/mainIine/foe-helfer-extension/issues/1541) If you opened the filter manually, it was not opened
	- [#1543](https://github.com/mainIine/foe-helfer-extension/issues/1543) "fair with low stock" was corrected

- Guild fights:
	- [#1547](https://github.com/mainIine/foe-helfer-extension/issues/1547) Table header has been revised

- Legendary buildings:
	- [#1567](https://github.com/mainIine/foe-helfer-extension/issues/1567) LG were hidden permanently if the cost of goods was too high

---

##### 2.5.2.0

**New **
- Guild cashbox export:
	- [#670](https://github.com/mainIine/foe-helfer-extension/issues/670) [#926](https://github.com/mainIine/foe-helfer-extension/issues/926) [#1042](https://github.com/mainIine/foe-helfer-extension/issues/1042) click through all pages until the desired date, then export an CSV; you can create an Excel Pivot Table from this; adjustable in the settings

- Marketplace Filter:
	- when entering the marketplace, a window opens in which all entries can be filtered as desired, the page number immediately shows where in the game the offer can be found afterwards; adjustable in the settings

**Update**
- Legendary buildings:
	- [#1501](https://github.com/mainIine/foe-helfer-extension/issues/1501) can be calculated for a friend/guild member after a visit

- Infobox:
	- [#1509](https://github.com/mainIine/foe-helfer-extension/issues/1509) [#1515](https://github.com/mainIine/foe-helfer-extension/issues/1515) Style revised, adapted for the new version (active on the beta)

- Extension:
	- [#1514](https://github.com/mainIine/foe-helfer-extension/issues/1514) Boxes can be brought into the foreground by clicking on them

- Event/step calculator:
	- [#1532](https://github.com/mainIine/foe-helfer-extension/issues/1532) from now on ingredients of the autumn event are also recognized correctly

**BugFix**
- Infobox:
	- [#1439](https://github.com/mainIine/foe-helfer-extension/issues/1439) quadruple entries fixed

- Cost calculator:
	- [#1503](https://github.com/mainIine/foe-helfer-extension/issues/1503) Wrong color in the difference column led to irrations

- Infobox:
	- [#1506](https://github.com/mainIine/foe-helfer-extension/issues/1506) if a province was captured in the GG this message is displayed twice with another event
	- [#1520](https://github.com/mainIine/foe-helfer-extension/issues/1520) deleting a building on the GG Map created an empty entry

- Legendary buildings:
	- [#1525](https://github.com/mainIine/foe-helfer-extension/issues/1525) if you set the cost to 0 the LG disappeared

- Production overview:
	- [#1528](https://github.com/mainIine/foe-helfer-extension/issues/1528) Boosts from St. Mark's. lighthouse etc. were ignored when sending to foe-rechner.de

---

##### 2.5.1.0

**New**
- Own contribution calculator:
	- Power levels added:
		- a new button, bottom right, starts this function in an extra box
		- Levels up to > 100 Available
		- Buildings with double harvests are considered

**Update**
- Notes:
	- [#1300](https://github.com/mainIine/foe-helfer-extension/issues/1300) Notes are saved when closing the box

- Settings:
	- [#1413](https://github.com/mainIine/foe-helfer-extension/issues/1413) Moved buttons from menu to new settings box

- Production overview:
	- [#1424](https://github.com/mainIine/foe-helfer-extension/issues/1424) Bonus from ambassadors and guild bonuses didn't show up at city hall when returning

- Costcalculator:
	- [#1433](https://github.com/mainIine/foe-helfer-extension/issues/1433) correct formatting added

- City map:
	- [#1438](https://github.com/mainIine/foe-helfer-extension/issues/1438) on the map the ages are shown by mouseover

**BugFix**
- Infobox:
	- [#1375](https://github.com/mainIine/foe-helfer-extension/issues/1375) double entries fixed

- Statistics:
	- [#917](https://github.com/mainIine/foe-helfer-extension/issues/917) "since Tuesday" fixed

- Translations:
	- [#924](https://github.com/mainIine/foe-helfer-extension/issues/924) String fixed

- Events:
	- [#1321](https://github.com/mainIine/foe-helfer-extension/issues/1324) Counter in menu now counts correctly

- Production overview:
	- [#1343](https://github.com/mainIine/foe-helfer-extension/issues/1343) Productions could appear twice

- Own contribution calculator:
	- [#1378](https://github.com/mainIine/foe-helfer-extension/issues/1378) when opening other LGs the own player name was displayed

- Notes:
	- [#1454](https://github.com/mainIine/foe-helfer-extension/issues/1454) Content displayed too wide

- Costcalculator:
	- [#1471](https://github.com/mainIine/foe-helfer-extension/issues/1471) Tooltip sometimes hangs
	- [#1495](https://github.com/mainIine/foe-helfer-extension/issues/1495) Colors of the level warning adapted

---


##### 2.5.0.1

**Update**
- Cost Accountant:
	- [#550](https://github.com/mainIine/foe-helfer-extension/issues/550) 80% button added

**BugFix**

- Own contribution calculator:
	- [#1317](https://github.com/mainIine/foe-helfer-extension/issues/1317) Sound when switching a repeatable "output X FP" quest does not play reliably
	- [#1318](https://github.com/mainIine/foe-helfer-extension/issues/1318) Sound in the cost calculator comes in Bronze Age until FMA also at the quest "explore 2 technologies

- hidden events:
	- [#1295](https://github.com/mainIine/foe-helfer-extension/issues/1295) blue counter icon prevented click
	- [#1314](https://github.com/mainIine/foe-helfer-extension/issues/1314) duplicate streets were not displayed

- Legendary buildings:
	- [#1305](https://github.com/mainIine/foe-helfer-extension/issues/1305) the input of FP costs disappeared into another field
	- [#1315](https://github.com/mainIine/foe-helfer-extension/issues/1315) Error when one of the FP producing LG is above lvl100 or higher

- Negotiating assistant:
	- [#1342](https://github.com/mainIine/foe-helfer-extension/issues/1342) on the beta server you could start the assistant in the GG manually (Inno Games doesn't want to do that)

---

##### 2.5.0.0

**New**
- Boost box:
	- a small box that is displayed in the GEX, GG, GvG and the neighbors shows how many attempts remain for spoils of war or changes

- Legendary buildings:
	- this box calculates which FP producing building would be the next cheapest

- Notes:
	- Groups and sorts notes of all kinds. This function works with the server and is device independent.

**Update**
- According to Inno's wishes we have removed or modified the following elements: [https://foe-rechner.de/news/changes-to-the-foe-helper](https://foe-rechner.de/news/changes-to-the-foe-helper)
	- Snipe column in the cost calculator removed
	- PvP activities removed
	- "Looting assistance" + attack and defense values removed
	- Event-Quest will only be linked
	- Negotiation assistants are hidden in the guild battles
	- Hidden events are displayed without expiration date

- Hidden rewards:
	- a counter shows how many events are still somewhere on the map

- Production overview:
	- [#1185](https://github.com/mainIine/foe-helfer-extension/issues/1185) Age is also output
	- Guild power as new tab available
	- [#1205](https://github.com/mainIine/foe-helfer-extension/issues/1205) Sorting function for goods

- Cost caclculator:
	- [#1168](https://github.com/mainIine/foe-helfer-extension/issues/1186) new checkbox "All", so all places 1-5 are displayed without dependencies

- Settings:
	- [#1169](https://github.com/mainIine/foe-helfer-extension/issues/1189) Firefox: Settings menu sporadically shows no translated texts


**BugFixes**
- Cost caclculator:
	- [#1153](https://github.com/mainIine/foe-helfer-extension/issues/1153) already deposited FP were not recognized correctly

- Tavernbadge:
	- [#1182](https://github.com/mainIine/foe-helfer-extension/issues/1182) Counter for 4th try is wrong, times are taken over from now on

- CityMap (internal):
	- [#1184](https://github.com/mainIine/foe-helfer-extension/issues/1184) Incorrect display of free space
	- [#1204](https://github.com/mainIine/foe-helfer-extension/issues/1204) Transmission box is no longer displayed in the neighbourhood

- Product overview:
	- [#1201](https://github.com/mainIine/foe-helfer-extension/issues/1201) Street with "satisfaction" are no longer calculated with street binding
