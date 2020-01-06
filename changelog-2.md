##Changelog - Chrome Extension

##### 2.3.15

**New**
- Guild battles:
    - [#206] (https://github.com/dsiekiera/foe-helfer-extension/issues/206) - Save the snapshot

**Update**

- Productions:
    - [#140] (https://github.com/dsiekiera/foe-helfer-extension/issues/140) - added population and satisfaction
     
- Negotiations:
    - [#215] (https://github.com/dsiekiera/foe-helfer-extension/issues/215) - Default priority of Mars goods reduced
     
- Own contribution calculator:
    - [#263] (https://github.com/dsiekiera/foe-helfer-extension/issues/263) - activated percent button is highlighted

- Outpost:
    - [#136] (https://github.com/dsiekiera/foe-helfer-extension/issues/136) - Extensions can be planned and total costs are listed
    - [#240] (https://github.com/dsiekiera/foe-helfer-extension/issues/240) - The cost of the next expansion is displayed, current coin production per 4 hours is displayed

- Menu:
    - [#196] (https://github.com/dsiekiera/foe-helfer-extension/issues/196) - The menu bar is now dynamically adjusted in height depending on the resolution

**BugFix**

- Productions:
    - [#173] (https://github.com/dsiekiera/foe-helfer-extension/issues/173) - Boost due to angry / enthusiastic population added, supply boosts to non-production buildings corrected
    - [#269] (https://github.com/dsiekiera/foe-helfer-extension/issues/269) - Correct map is loaded by clicking on the eye (building location)
    - [#246] (https://github.com/dsiekiera/foe-helfer-extension/issues/246) - Fixed an error in the goods overview of the good "packaging".

- Negotiations:
    - [#268] (https://github.com/dsiekiera/foe-helfer-extension/issues/268) - Fixed an error in the detection of the 4th round in the GEX when the tavern badge was deactivated
    - [#215] (https://github.com/dsiekiera/foe-helfer-extension/issues/215) - Fixed an error in determining the current stock level when the outpost module was deactivated

- Own contribution calculator:
    - [#248] (https://github.com/dsiekiera/foe-helfer-extension/issues/248) - Wrong name with multiple accounts per browser

- Info box:
    - [#207] (https://github.com/dsiekiera/foe-helfer-extension/issues/207) - Own name no longer appears
    - [#262] (https://github.com/dsiekiera/foe-helfer-extension/issues/262) - better function for updating the news headlines
    - [#281] (https://github.com/dsiekiera/foe-helfer-extension/issues/281) - hung up when changing into guild battles

---

##### 2.3.14

**New**
- Extension:
    - Spanish added

- Map of the continents:
    - If you visit a province, all freight costs for this province are displayed on request - thanks to [Th3C0D3R] (https://github.com/Th3C0D3R)


**Update**
- EA calculator:
    - the FP up to level of the LG are now displayed [#205] (https://github.com/dsiekiera/foe-helfer-extension/issues/205)
    - It is now possible to use the EA calculator for levels that have already been completed, scroll backwards in the LG

- Product overview:
    - The total of the goods is grouped according to ages [#228] (https://github.com/dsiekiera/foe-helfer-extension/issues/228)
    - With the eye icon your own building can be shown on the map [#154] (https://github.com/dsiekiera/foe-helfer-extension/issues/154)
    - "Daily FP" and all bonuses from ambassadors are inserted and displayed in the town hall [#175] (https://github.com/dsiekiera/foe-helfer-extension/issues/175)

- Negotiators:
    - Optimized freight costs
    - The average freight costs for the rest of the negotiation are now displayed
    - Warning messages when the stock of goods becomes scarce
    - Mouseover over icons (top row) shows inventory

**BugFix**

- Army overview:
    - Errors occurred when removing units from the attack or defense
    - If there was no Alcatraz, an error occurred

- Info box:
    - With LevelUp messages instead of the level “unknown” [thanks to Thomas (via mail)]


---

#####v2.3.13
**New**
- Negotiation Assistant:
    - proposes matching goods through calculated algorithms for each round [#183](https://github.com/dsiekiera/foe-helfer-extension/issues/183)
    - recognizes the tavern's 4 moves and calculates the possibilities of the combinations accordingly

**Update**
- Harvest-Helper:
    - CityMap and building list close when leaving the neighbor [forum](https://forum.foe-rechner.de/d/11-wunsche-zur-plunderanzeige)

**BugFix**
- Guild LiveChat:
    - Token added [#198](https://github.com/dsiekiera/foe-helfer-extension/issues/198)

---

#####v2.3.12.5
**BugFix**
- Army overview:
    - If a Boost LG was missing, the box was not loaded [#185](https://github.com/dsiekiera/foe-helfer-extension/issues/185)
    - Fixes turned "if", Thanks to [Th3C0D3R](https://github.com/Th3C0D3R)

**Update**
- Extension:
    - Harvester closes when returning to his own city [#178](https://github.com/dsiekiera/foe-helfer-extension/issues/178)
    - Fixed "Transparent" box [#188](https://github.com/dsiekiera/foe-helfer-extension/issues/188)

---

#####v2.3.12.4
**New**
- Researches:
    - Apply all goods / FP / storage costs until the end of the current or the selected age
- Armies (BETA):
    - Shows all available units clearly with attack and defense values

**Update**
- Settings:
    - In the settings box (InGame) you can now choose your own language [#177](https://github.com/dsiekiera/foe-helfer-extension/issues/177)
    - Styling revised

**BugFix**
- Outpost:
    - Fixed incomplete goods display when first starting the extension or fixed the change of outpost [#163](https://github.com/dsiekiera/foe-helfer-extension/issues/163)

- Harvest-Helper:
    - Not all buildings have been shown [#159](https://github.com/dsiekiera/foe-helfer-extension/issues/159)

- Settings:
    - fixed moved background graphics

---

#####v2.3.12.3
**Bugfix**
- Extension:
    - Speaker Icon later
    - optical adjustments to the own contribution calculator
    
---

#####v2.3.12.2
- Extension:
    - Fixed speech recognition for changelog
    - Redefined API endpoints, data such as LGs of Gildies, own data, GEX, etc. are now transmitted cleanly [#67](https://github.com/dsiekiera/foe-helfer-extension/issues/67)
    - Missing translations added
    - Fixed a speaker icon

---

#####v2.3.12.1
**Update**
- Extension:
    - Boxes can no longer be pushed "too high" [#129](https://github.com/dsiekiera/foe-helfer-extension/issues/129) [#145](https://github.com/dsiekiera/foe-helper-extension/issues/145)

- Product overview:
    - Shows which buildings would also produce FPs => Possible high-level production (especially SdWs)
    - Boost added to supplies

---

#####v2.3.12

**BugFix**
- Cost calculator:
    - Name was not always recognized
    - Bug fixed [#133](https://github.com/dsiekiera/foe-helfer-extension/issues/133)
    - Missing translation added

- LG Investments:
    - Timeout set [#134](https://github.com/dsiekiera/foe-helfer-extension/issues/134)

**Update**
- Cost calculator:
    - LG Overview: Tooltip for explanation, better detection
    - If level is not open or street is missing, an overlay will appear

- own contribution calculator:
    - completely revised
        - Any number of external players / snipers are respected [#47](https://github.com/dsiekiera/foe-helfer-extension/issues/47) [#72](https://github.com/dsiekiera/foe -helfer-extension/issues/72) [#113](https://github.com/dsiekiera/foe-helfer-extension/issues/113) [#139](https://github.com/dsiekiera/foe-helfer-extension/issues/139) [#143](https://github.com/dsiekiera/foe-helfer-extension/issues/143)
        - Real-time update
        - Individual percentages per place adjustable

- Settings:
    - new menu item => "Reset Box Coordinates"
    
---

#####v2.3.11.2 

**BugFix**
- Extension:
    - Translations corrected (English, French)

---

#####v2.3.11.1 

**Update**
    - Head overworked
    
**BugFix**
- Extension:
    - Translations completed (English, French)

---

#####v2.3.11
**Update**
- Cost calculator:
    - already scans in the overview whether there are buildings in which you could invest and mekrt this
    - Remaining FP display until leveling
    - Additional buttons for percentages are arranged correctly

- Info box:
    - Filter for selectively displaying messages [#121](https://github.com/dsiekiera/foe-helfer-extension/issues/121)
    - Added "empty box" button
    - If desired, a sound can be activated to hear a sound when changing the tab
    
- Product overview:
    - Town Hall removed from the coin boost calculation [#122](https://github.com/dsiekiera/foe-helfer-extension/issues/122)
    - Sticky table headers (stay up when scrolling)
    - Fixed tab icons due to an Inno-update
    - Sorts of the first 4 tabs improved

---

#####v2.3.10.2

**Bugfix**
- Outpost:
Fixed display of goods for all outposts [#108](https://github.com/dsiekiera/foe-helfer-extension/issues/108) [#110](https://github.com/dsiekiera/foe-helper-extension/issues/110)
- Formatting by language fixed

- Website:
    - Mopping activities are clean again [#119](https://github.com/dsiekiera/foe-helfer-extension/issues/119)

---

#####v2.3.10.1

**Bugfix**
- Extension:
    - Game update from Inno loads the whole game faster, extension adjusted accordingly [#116](https://github.com/dsiekiera/foe-helfer-extension/issues/116#issuecomment-537002900)

- Product overview:
    - wrong language adapted at relative time
    
- Koster calculator:
    - Reduced "flicker" before the calculation
