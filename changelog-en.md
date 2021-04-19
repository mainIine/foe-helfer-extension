## Changelog - Extension

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

- GVG releases:
	- [#1781](https://github.com/mainIine/foe-helfer-extension/issues/1781) Shows how many releases you yourself have already made in the GvG since settlement (8pm).

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
    - [#1871](https://github.com/dsiekiera/foe-helfer-extension/issues/1871) No more data is sent to foe-rechner.de

- Research Cost Calculator:
    - [#1897](https://github.com/dsiekiera/foe-helfer-extension/issues/1897) As of this update, the Age of Venus is correctly recognised.

- Guild Battles:
    - We have rewritten the view of the guild battles box, for clarity

- Moppelassistent:
    - [#1912](https://github.com/dsiekiera/foe-helfer-extension/issues/1912) The sorting of names didn't work properly, it works now

- LG Investments:
    - Option to take goods production into account

- Bonus Bar:
    - [#1915](https://github.com/dsiekiera/foe-helfer-extension/issues/1915) Bonus Bar now also shows completed quests

**BugFix**
- Extension:
    - [#1892](https://github.com/dsiekiera/foe-helfer-extension/issues/1892) A double quote could destroy a tooltip

- Negotiation Wizard:
    - [#1879](https://github.com/dsiekiera/foe-helfer-extension/issues/1879) Sometimes the number of moves was not detected correctly, this has been fixed.

- Own contribution calculator:
    - [#1891](https://github.com/dsiekiera/foe-helfer-extension/issues/1891) Done own share was calculated wrong if deleted player had deposited something

- Building kits:
    - [#1910](https://github.com/dsiekiera/foe-helfer-extension/issues/1910) The number is now calculated correctly

---


##### 2.5.6.2

**Update**
- Production Overview:
    - [#1668](https://github.com/dsiekiera/foe-helfer-extension/issues/1668) Attack and Defence have been added as new tabs.

- Guild Battles:
    - improved view if province has no owner yet

- Investments:
    - [#1853](https://github.com/dsiekiera/foe-helfer-extension/issues/1853) Investments can be ignored - and squares can be shown as "safe" only

**BugFix**
- Menu:
    - [#1861](https://github.com/dsiekiera/foe-helfer-extension/issues/1861) Due to a case sensitive bug, the alert icon could not be moved, or disappeared

- Alerts:
    - [#1848](https://github.com/dsiekiera/foe-helfer-extension/issues/1848) Firefox bug: alert could not be created

- Investments:
    - [#1854](https://github.com/dsiekiera/foe-helfer-extension/issues/1854) Wrong sorting of entry time for investments corrected

---


##### 2.5.6.1

**Update**
- Extension:
    - many translations/corrections from [i18n.foe-helper.com](https://i18n.foe-helper.com) integrated [#1849](https://github.com/dsiekiera/foe-helfer-extension/issues/1849)

- Investments:
    - From now on, unprofitable LBs can be hidden and removed from the calculation

**BugFix**
- Alerts:
    - [#1841](https://github.com/dsiekiera/foe-helfer-extension/issues/1841) the icon of the alert module could not be moved or just disappeared

- Marketplace filter:
    - [#1847](https://github.com/dsiekiera/foe-helfer-extension/issues/1847) the default filters were gone and the box was empty at startup

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
	- [#1799](https://github.com/dsiekiera/foe-helfer-extension/issues/1799) The table below the graphic can now be copied and pasted

**BugFix**
- Cost calculator:
	- [#1793](https://github.com/dsiekiera/foe-helfer-extension/issues/1793) A loop quest of the Artic Future (Donate 200 FP) was not recognised correctly

- Research cost calculator:
	- [#1749](https://github.com/dsiekiera/foe-helfer-extension/issues/1749) Box has become resizeable and scrollable

- Toast messages (notifications):
	- [#1772](https://github.com/dsiekiera/foe-helfer-extension/issues/1772) have become more intelleigent. Münupositions on the right and at the bottom are recognised

- City overview:
	- [#1774](https://github.com/dsiekiera/foe-helfer-extension/issues/1774) Transmission box to foe-rechner.de no longer disappeared

---

##### 2.5.5.1

**Bugfix**
- Guild Battle Box:
	- [#1779](https://github.com/dsiekiera/foe-helfer-extension/issues/1779) with the export function of the overview came a he small bug that did not show the difference between the snapshots anymore

---

##### 2.5.5.0

**Update**
- Cost calculator:
	- Table headings partly replaced by icons, translations are much too long in some languages.

- Own contribution calculator:
	- [#1507](https://github.com/dsiekiera/foe-helfer-extension/issues/1507) Table headings partly replaced by icons, translations are much too long in some languages

- Guild Battle Box:
	- Table headings partly swapped by icons, translations are way too long in some languages

**Bugfix**
- Extension:
	- [#1770](https://github.com/dsiekiera/foe-helfer-extension/issues/1770) on the beta the player avatars were not loaded correctly, we have already fixed this as a precautionary measure

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
	- [#1754](https://github.com/dsiekiera/foe-helfer-extension/issues/1754) Values were no longer displayed

---


##### 2.5.4.3

**Update**
- Production overview:
	- [#1647](https://github.com/dsiekiera/foe-helfer-extension/issues/1647) [#1662](https://github.com/dsiekiera/foe-helfer-extension/issues/1662) From now on you can see what is ready and can be harvested in green colour in the top right corner of each tab

**Bugfix**
- Extension:
	- Compatibility with older browsers restored

- Marketplace Filter:
	- [#1723](https://github.com/dsiekiera/foe-helfer-extension/issues/1723) The content of the marketplace filter was not displayed, Goes now again

- Production overview:
	- [#1726](https://github.com/dsiekiera/foe-helfer-extension/issues/1726) Event buildings that are not connected to a road still produce population, this has been fixed

---

##### 2.5.4.2

**Update**
- Production overview:
	- Alcatraz added to the overview for "units"

- FP Collector:
	- Arrows added to show that you can expand the entries

- Infobox:
	- [#1704](https://github.com/dsiekiera/foe-helfer-extension/issues/1704) Can now be loaded with the game start if desired => "Settings > Boxes > Infobox".
	- [#1416](https://github.com/dsiekiera/foe-helfer-extension/issues/1416) Can be limited to one length from now on => "Settings > Boxes > Infobox News" to spare the browser with very many entries
	- The entries of the infobox are saved if it is only closed and opened again


**Bugfix**
- Extension:
	- [#1720](https://github.com/dsiekiera/foe-helfer-extension/issues/1720) Filter in Moppelassistent reacts wrong if infobox is open
	- [#1707](https://github.com/dsiekiera/foe-helfer-extension/issues/1707) Some messages were not displayed

- Menu box:
	- [#1717](https://github.com/dsiekiera/foe-helfer-extension/issues/1717) When the box is on top of the border, the tooltips disappeared outside the visible area

- Production overview:
	- [#1709](https://github.com/dsiekiera/foe-helfer-extension/issues/1709) The box became too long, it is now scrollable again

- Infobox:
	- [#1694](https://github.com/dsiekiera/foe-helfer-extension/issues/1694) Fixed wrong translation in filter "GvG" => "GG"
	- The message filter is now case-insensitive (case is ignored)

- Moppelhelfer:
	- [#1658](https://github.com/dsiekiera/foe-helfer-extension/issues/1658) Date detection for CZ fixed

---

##### 2.5.4.1

**Bugfix**
- Menu:
	- [#1701](https://github.com/dsiekiera/foe-helfer-extension/issues/1701) [#1702](https://github.com/dsiekiera/foe-helfer-extension/issues/1702) in older browsers the helper could not be loaded

- Production overview:
	- [#1696](https://github.com/dsiekiera/foe-helfer-extension/issues/1696) In some browsers the table was not wide enough

- Extension:
	- [#1699](https://github.com/dsiekiera/foe-helfer-extension/issues/1699) Notifications were displayed despite deactivation

---

##### 2.5.4.0

**New**
- Menu:
	- [#1664](https://github.com/dsiekiera/foe-helfer-extension/issues/1664) [#1665](https://github.com/dsiekiera/foe-helfer-extension/issues/1665) There are now 3 menu variants (right, bottom and box).
	- Selectable via "Settings > General > Change Menu".
	- Redesign (smaller, new graphics) of the bottom and box variant for more space

- Extension:
	- Notifications can now be switched off via "Settings > General > Notification".
	- The notifications can appear at different positions "Settings > General > Notification positions".

**Update**
- City overview:
	- [#1659](https://github.com/dsiekiera/foe-helfer-extension/issues/1659) Translations for the statistics have been added

- Blue Galaxy Helper:
	- [#1653](https://github.com/dsiekiera/foe-helfer-extension/issues/1653) can now weight by goods. If you only want to weight by FP, change the value to "0" (zero).

- Production overview:
	- [#1646](https://github.com/dsiekiera/foe-helfer-extension/issues/1646) now updates when harvest is collected with diamonds

- Infobox:
	- [#1552](https://github.com/dsiekiera/foe-helfer-extension/issues/1552) from now on you can search for a text in the filter

- Extension:
	- many translations from [i18n.foe-helper.com](http://i18n.foe-helper.com/projects/foe-helper/extension/) have been integrated. Help us to integrate even more translations and register yourself

**Bugfix**
- FP Collector:
	- [#1690](https://github.com/dsiekiera/foe-helfer-extension/issues/1690) the collector did not count all duplications
	- [#1693](https://github.com/dsiekiera/foe-helfer-extension/issues/1693) fixed translation error

- Extension:
	- [#1687](https://github.com/dsiekiera/foe-helfer-extension/issues/1687) in Firefox not all translations were loaded

- Menu:
	- [#1681](https://github.com/dsiekiera/foe-helfer-extension/issues/1681) the drag&drop was too sensitive and always gave the message "The new menu order has been saved", we have changed that


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
	- [#1661](https://github.com/dsiekiera/foe-helfer-extension/issues/1661) [#1657](https://github.com/dsiekiera/foe-helfer-extension/issues/1657) Because of the new dynamic menu, the helper's menu moves to the bottom

- Motivation Helper:
	- The values can be sorted via the tab head
	- Filter for various events [#1652](https://github.com/dsiekiera/foe-helfer-extension/issues/1652)
	- Coloured values for better differentiation

**BugFix**

- Event helper:
	- [#1655](https://github.com/dsiekiera/foe-helfer-extension/issues/1655) Incorrect recognition of the daily price Football Event 2021

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
	- [#1638](https://github.com/dsiekiera/foe-helfer-extension/issues/1638) Copy overlay centred and new checkbox integrated

- Combat assistant:
	- [#903](https://github.com/dsiekiera/foe-helfer-extension/issues/903) The warning window can now be disabled in the settings

- Product overview:
	- [#1629](https://github.com/dsiekiera/foe-helfer-extension/issues/1629) Another tab shows how many units are produced in non military buildings

**Bugfix**
- Extension:
	- [#1649](https://github.com/dsiekiera/foe-helfer-extension/issues/1649) Innogames has changed something in the code that had broken the menu

- Product overview:
	- [#1640](https://github.com/dsiekiera/foe-helfer-extension/issues/1640) Produced FP of the statue of honour were not shown

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
	- [#1622](https://github.com/dsiekiera/foe-helfer-extension/issues/1622) The window can now be resized individually

- Cost calculator:
	- [#1590](https://github.com/dsiekiera/foe-helfer-extension/issues/1590) The User Box closes the second click in the menu

**Bugfix**
- Notes:
	- [#1627](https://github.com/dsiekiera/foe-helfer-extension/issues/1627) No new page could be created

- Cost calculator:
	- [#1619](https://github.com/dsiekiera/foe-helfer-extension/issues/1619) Rounding errors for some arch factors fixed

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
	- [#1592](https://github.com/dsiekiera/foe-helfer-extension/issues/1592) Added setting to disable the Box

- Battle Assistant:
	- From now on a warning is also given when a rare unit of the next Era has died => possibility to heal

**BugFix**
- Own contribution calculator:
	- [#1586](https://github.com/dsiekiera/foe-helfer-extension/issues/1586) When changing archefactor or external values, the EA calculator jumped back to the current level if scrolling to a higher level was done
	- [#1588](https://github.com/dsiekiera/foe-helfer-extension/issues/1588) EA Calculator does not load or update when external columns are filled

- Legendary buildings:
	- [#1587](https://github.com/dsiekiera/foe-helfer-extension/issues/1587) LG-Investitionen Innovation Tower had slipped below level 10

- Forge points bars:
	- [#1589](https://github.com/dsiekiera/foe-helfer-extension/issues/1589) FP counter in GG did not count up

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
	- [#1504](https://github.com/dsiekiera/foe-helfer-extension/issues/1504) Redesign of the "Copy" function, Scheme is now adjustable by yourself

- Legendary buildings:
	- [#1518](https://github.com/dsiekiera/foe-helfer-extension/issues/1518) the required space factor can now be changed
	- [#1574](https://github.com/dsiekiera/foe-helfer-extension/issues/1574) Added support for blue galaxy

- infobox:
	- [#1542](https://github.com/dsiekiera/foe-helfer-extension/issues/1542) "Welcome text" can be removed with "Empty box

**BugFix**
- statistics:
	- [#1522](https://github.com/dsiekiera/foe-helfer-extension/issues/1522) [#1568](https://github.com/dsiekiera/foe-helfer-extension/issues/1568) when changing between outpost and town there was a kink in the statistics

- Marketplace Filter:
	- [#1541](https://github.com/dsiekiera/foe-helfer-extension/issues/1541) If you opened the filter manually, it was not opened
	- [#1543](https://github.com/dsiekiera/foe-helfer-extension/issues/1543) "fair with low stock" was corrected

- Guild fights:
	- [#1547](https://github.com/dsiekiera/foe-helfer-extension/issues/1547) Table header has been revised

- Legendary buildings:
	- [#1567](https://github.com/dsiekiera/foe-helfer-extension/issues/1567) LG were hidden permanently if the cost of goods was too high

---

##### 2.5.2.0

**New **
- Guild cashbox export:
	- [#670](https://github.com/dsiekiera/foe-helfer-extension/issues/670) [#926](https://github.com/dsiekiera/foe-helfer-extension/issues/926) [#1042](https://github.com/dsiekiera/foe-helfer-extension/issues/1042) click through all pages until the desired date, then export an CSV; you can create an Excel Pivot Table from this; adjustable in the settings

- Marketplace Filter:
	- when entering the marketplace, a window opens in which all entries can be filtered as desired, the page number immediately shows where in the game the offer can be found afterwards; adjustable in the settings

**Update**
- Legendary buildings:
	- [#1501](https://github.com/dsiekiera/foe-helfer-extension/issues/1501) can be calculated for a friend/guild member after a visit

- Infobox:
	- [#1509](https://github.com/dsiekiera/foe-helfer-extension/issues/1509) [#1515](https://github.com/dsiekiera/foe-helfer-extension/issues/1515) Style revised, adapted for the new version (active on the beta)

- Extension:
	- [#1514](https://github.com/dsiekiera/foe-helfer-extension/issues/1514) Boxes can be brought into the foreground by clicking on them

- Event/step calculator:
	- [#1532](https://github.com/dsiekiera/foe-helfer-extension/issues/1532) from now on ingredients of the autumn event are also recognized correctly

**BugFix**
- Infobox:
	- [#1439](https://github.com/dsiekiera/foe-helfer-extension/issues/1439) quadruple entries fixed

- Cost calculator:
	- [#1503](https://github.com/dsiekiera/foe-helfer-extension/issues/1503) Wrong color in the difference column led to irrations

- Infobox:
	- [#1506](https://github.com/dsiekiera/foe-helfer-extension/issues/1506) if a province was captured in the GG this message is displayed twice with another event
	- [#1520](https://github.com/dsiekiera/foe-helfer-extension/issues/1520) deleting a building on the GG Map created an empty entry

- Legendary buildings:
	- [#1525](https://github.com/dsiekiera/foe-helfer-extension/issues/1525) if you set the cost to 0 the LG disappeared

- Production overview:
	- [#1528](https://github.com/dsiekiera/foe-helfer-extension/issues/1528) Boosts from St. Mark's. lighthouse etc. were ignored when sending to foe-rechner.de

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
	- [#1300](https://github.com/dsiekiera/foe-helfer-extension/issues/1300) Notes are saved when closing the box

- Settings:
	- [#1413](https://github.com/dsiekiera/foe-helfer-extension/issues/1413) Moved buttons from menu to new settings box

- Production overview:
	- [#1424](https://github.com/dsiekiera/foe-helfer-extension/issues/1424) Bonus from ambassadors and guild bonuses didn't show up at city hall when returning

- Costcalculator:
	- [#1433](https://github.com/dsiekiera/foe-helfer-extension/issues/1433) correct formatting added

- City map:
	- [#1438](https://github.com/dsiekiera/foe-helfer-extension/issues/1438) on the map the ages are shown by mouseover

**BugFix**
- Infobox:
	- [#1375](https://github.com/dsiekiera/foe-helfer-extension/issues/1375) double entries fixed

- Statistics:
	- [#917](https://github.com/dsiekiera/foe-helfer-extension/issues/917) "since Tuesday" fixed

- Translations:
	- [#924](https://github.com/dsiekiera/foe-helfer-extension/issues/924) String fixed

- Events:
	- [#1321](https://github.com/dsiekiera/foe-helfer-extension/issues/1324) Counter in menu now counts correctly

- Production overview:
	- [#1343](https://github.com/dsiekiera/foe-helfer-extension/issues/1343) Productions could appear twice

- Own contribution calculator:
	- [#1378](https://github.com/dsiekiera/foe-helfer-extension/issues/1378) when opening other LGs the own player name was displayed

- Notes:
	- [#1454](https://github.com/dsiekiera/foe-helfer-extension/issues/1454) Content displayed too wide

- Costcalculator:
	- [#1471](https://github.com/dsiekiera/foe-helfer-extension/issues/1471) Tooltip sometimes hangs
	- [#1495](https://github.com/dsiekiera/foe-helfer-extension/issues/1495) Colors of the level warning adapted

---


##### 2.5.0.1

**Update**
- Cost Accountant:
	- [#550](https://github.com/dsiekiera/foe-helfer-extension/issues/550) 80% button added

**BugFix**

- Own contribution calculator:
	- [#1317](https://github.com/dsiekiera/foe-helfer-extension/issues/1317) Sound when switching a repeatable "output X FP" quest does not play reliably
	- [#1318](https://github.com/dsiekiera/foe-helfer-extension/issues/1318) Sound in the cost calculator comes in Bronze Age until FMA also at the quest "explore 2 technologies

- hidden events:
	- [#1295](https://github.com/dsiekiera/foe-helfer-extension/issues/1295) blue counter icon prevented click
	- [#1314](https://github.com/dsiekiera/foe-helfer-extension/issues/1314) duplicate streets were not displayed

- Legendary buildings:
	- [#1305](https://github.com/dsiekiera/foe-helfer-extension/issues/1305) the input of FP costs disappeared into another field
	- [#1315](https://github.com/dsiekiera/foe-helfer-extension/issues/1315) Error when one of the FP producing LG is above lvl100 or higher

- Negotiating assistant:
	- [#1342](https://github.com/dsiekiera/foe-helfer-extension/issues/1342) on the beta server you could start the assistant in the GG manually (Inno Games doesn't want to do that)

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
	- [#1185](https://github.com/dsiekiera/foe-helfer-extension/issues/1185) Age is also output
	- Guild power as new tab available
	- [#1205](https://github.com/dsiekiera/foe-helfer-extension/issues/1205) Sorting function for goods

- Cost caclculator:
	- [#1168](https://github.com/dsiekiera/foe-helfer-extension/issues/1186) new checkbox "All", so all places 1-5 are displayed without dependencies

- Settings:
	- [#1169](https://github.com/dsiekiera/foe-helfer-extension/issues/1189) Firefox: Settings menu sporadically shows no translated texts


**BugFixes**
- Cost caclculator:
	- [#1153](https://github.com/dsiekiera/foe-helfer-extension/issues/1153) already deposited FP were not recognized correctly

- Tavernbadge:
	- [#1182](https://github.com/dsiekiera/foe-helfer-extension/issues/1182) Counter for 4th try is wrong, times are taken over from now on

- CityMap (internal):
	- [#1184](https://github.com/dsiekiera/foe-helfer-extension/issues/1184) Incorrect display of free space
	- [#1204](https://github.com/dsiekiera/foe-helfer-extension/issues/1204) Transmission box is no longer displayed in the neighbourhood

- Product overview:
	- [#1201](https://github.com/dsiekiera/foe-helfer-extension/issues/1201) Street with "satisfaction" are no longer calculated with street binding
