/*
 * **************************************************************************************
 *
 * Dateiname:                 greatbuildings.js
 * Projekt:                   foe-chrome
 *
 * erstellt von:              Daniel Siekiera <daniel.siekiera@gmail.com>
 * erstellt am:	              26.04.20, 15:37 Uhr
 * zuletzt bearbeitet:       26.04.20, 15:32 Uhr
 *
 * Copyright 2020
 *
 * **************************************************************************************
 */

let GreatBuildings =
{
    Rewards: {
        0: [5, 10, 15, 20, 30, 35, 45, 50, 60, 65, 75, 85, 95, 100, 110, 120, 130, 140, 150, 155, 165, 175, 185, 195, 205, 215, 225, 235, 245, 255, 265, 275, 285, 300, 310, 320, 330, 340, 350, 365, 375, 385, 395, 405, 420, 430, 440, 450, 465, 475, 485, 500, 510, 520, 535, 545, 555, 570, 580, 590, 605, 615, 630, 640, 650, 665, 675, 690, 700, 715, 725, 735, 750, 760, 775, 785, 800, 810, 825, 835, 850, 860, 875, 890, 900, 915, 925, 940, 950, 965, 975, 990, 1005, 1015, 1030, 1040, 1055, 1070, 1080, 1095, 1110, 1120, 1135, 1150, 1160, 1175, 1190, 1200, 1215, 1230, 1240, 1255, 1270, 1280, 1295, 1310, 1325, 1335, 1350, 1365, 1380, 1390, 1405, 1420, 1430, 1445, 1460, 1475, 1490, 1500, 1515, 1530, 1545, 1555, 1570, 1585, 1600, 1615, 1630, 1640, 1655, 1670, 1685, 1700, 1710, 1725, 1740, 1755, 1770, 1785, 1800, 1815, 1825, 1840, 1855, 1870, 1885, 1900, 1915, 1930],
        2: [5, 10, 10, 15, 25, 30, 35, 40, 45, 55, 60, 65, 75, 80, 85, 95, 100, 110, 115, 125, 130, 140, 145, 155, 160, 170, 180, 185, 195, 200, 210, 220, 225, 235, 245, 250, 260, 270, 275, 285, 295, 300, 310, 320, 330, 340, 345, 355, 365, 375, 380, 390, 400, 410, 420, 430, 440, 445, 455, 465, 475, 485, 495, 505, 510, 520, 530, 540, 550, 560, 570, 580, 590, 600, 610, 620, 630, 640, 650, 660, 670, 680, 690, 700, 710, 720, 730, 740, 750, 760, 770, 780, 790, 800, 810, 820, 830, 840, 850, 860, 870, 880, 890, 905, 915, 925, 935, 945, 955, 965, 975, 985, 995, 1010, 1020, 1030, 1040, 1050, 1060, 1070, 1085, 1095, 1105, 1115, 1125, 1135, 1150, 1160, 1170, 1180, 1190, 1200, 1215, 1225, 1235, 1245, 1255, 1270, 1280, 1290, 1300, 1310, 1325, 1335, 1345, 1355, 1370, 1380, 1390, 1400, 1415, 1425, 1435, 1445, 1460, 1470, 1480, 1490, 1505, 1515, 1525, 1540, 1550, 1560, 1570, 1585, 1595, 1605, 1620, 1630, 1640, 1655, 1665, 1675, 1690, 1700, 1710, 1725, 1735, 1745, 1760, 1770, 1780, 1790],
        3: [5, 10, 15, 20, 25, 30, 40, 45, 50, 60, 65, 70, 80, 85, 95, 105, 110, 120, 125, 135, 145, 150, 160, 170, 175, 185, 195, 200, 210, 220, 230, 240, 245, 255, 265, 275, 285, 290, 300, 310, 320, 330, 340, 350, 360, 370, 380, 390, 400, 405, 415, 425, 435, 450, 455, 465, 475, 485, 495, 510, 520, 530, 540, 550, 560, 570, 580, 590, 600, 610, 620, 630, 645, 655, 665, 675, 685, 695, 705, 720, 730, 740, 750, 760, 775, 785, 795, 805, 815, 825, 840, 850, 860, 870, 885, 895, 905, 915, 930, 940, 950, 960, 975, 985, 995, 1010, 1020, 1030, 1040, 1055, 1065, 1075, 1090, 1100, 1110, 1125, 1135, 1145, 1160, 1170, 1180, 1195, 1205, 1215, 1230, 1240, 1250, 1265, 1275, 1285, 1300, 1310, 1325, 1335, 1345, 1360, 1370, 1385, 1395],
        4: [5, 10, 15, 20, 25, 35, 40, 50, 55, 65, 70, 80, 85, 95, 100, 110, 120, 130, 135, 145, 155, 165, 175, 180, 190, 200, 210, 220, 230, 240, 250, 255, 265, 275, 285, 295, 305, 315, 325, 335, 345, 360, 370, 380, 390, 400, 410, 420, 430, 440, 450, 465, 475, 485, 495, 505, 515, 525, 540, 550, 560, 570, 585, 595, 605, 615, 625, 640, 650, 660, 675, 685, 695, 705, 720, 730, 740, 755, 765, 775, 790, 800, 810, 825, 835, 850, 860, 875, 885, 895, 910, 920, 930, 945, 955, 970, 980, 995, 1005, 1015, 1030, 1040, 1055, 1065, 1080, 1090, 1105, 1115, 1130, 1140, 1155, 1165, 1180, 1190, 1205, 1215, 1230, 1240, 1255, 1265, 1280, 1290, 1305, 1320, 1330, 1345, 1355, 1370, 1380, 1395, 1405, 1420, 1435, 1445, 1460, 1475, 1485, 1500, 1510, 1525, 1540, 1550, 1565, 1575, 1590, 1605, 1615, 1630, 1645, 1655, 1670, 1685, 1695, 1710, 1725, 1735, 1750, 1765, 1775, 1790, 1805, 1820, 1830, 1845, 1855, 1870, 1885, 1900, 1910, 1925, 1940],
        5: [5, 10, 15, 20, 30, 35, 45, 50, 60, 65, 75, 85, 95, 100, 110, 120, 130, 140, 150, 155, 165, 175, 185, 195, 205, 215, 225, 235, 245, 255, 265, 275, 285, 300, 310, 320, 330, 340, 350, 365, 375, 385, 395, 405, 420, 430, 440, 450, 465, 475, 485, 500, 510, 520, 535, 545, 555, 570, 580, 590, 605, 615, 630, 640, 650, 665, 675, 690, 700, 715, 725, 735, 750, 760, 775, 785, 800, 810, 825, 835, 850, 860, 875, 890, 900, 915, 925, 940, 950, 965, 975, 990, 1005, 1015, 1030, 1040, 1055, 1070, 1080, 1095, 1110, 1120, 1135, 1150, 1160, 1175, 1190, 1200, 1215, 1230, 1240, 1255, 1270, 1280, 1295, 1310, 1325, 1335, 1350, 1365, 1380, 1390, 1405, 1420, 1430, 1445, 1460, 1475, 1490, 1500, 1515, 1530, 1545, 1555, 1570, 1585, 1600, 1615, 1630, 1640, 1655, 1670, 1685, 1700, 1710, 1725, 1740, 1755, 1770, 1785, 1800, 1815, 1825, 1840, 1855, 1870, 1885, 1900, 1915, 1930],
        6: [5, 10, 15, 25, 30, 40, 45, 55, 65, 70, 80, 90, 100, 110, 120, 125, 140, 150, 155, 170, 180, 190, 200, 210, 220, 230, 240, 250, 265, 275, 285, 295, 310, 320, 330, 340, 355, 365, 375, 390, 400, 410, 425, 435, 450, 460, 470, 485, 495, 510, 520, 535, 545, 560, 570, 585, 595, 610, 620, 635, 645, 660, 670, 685, 700, 710, 725, 735, 750, 765, 775, 790, 805, 815, 830, 845, 855, 870, 885, 895, 910, 925, 935, 950, 965, 980, 990, 1005, 1020, 1035, 1045, 1060, 1075, 1090, 1105, 1115, 1130, 1145, 1160, 1175, 1185, 1200, 1215, 1230, 1245, 1260, 1275, 1285, 1300, 1315, 1330, 1345, 1360, 1375, 1390, 1405, 1415, 1430, 1445, 1460, 1475, 1490, 1505, 1520, 1535, 1550, 1565, 1580, 1595, 1610, 1625, 1640, 1655, 1670, 1685, 1700, 1715, 1730, 1745, 1760, 1775, 1790, 1805, 1820, 1835, 1850, 1865, 1880, 1895, 1910, 1925, 1940, 1955, 1975, 1990, 2005, 2020, 2035, 2050, 2065, 2080, 2095, 2110, 2125, 2145, 2160, 2175, 2190, 2205, 2220],
        7: [5, 10, 15, 25, 35, 40, 50, 60, 65, 75, 85, 95, 105, 115, 125, 135, 145, 155, 170, 180, 190, 200, 210, 225, 235, 245, 260, 270, 280, 295, 305, 315, 330, 340, 350, 365, 375, 390, 400, 415, 425, 440, 450, 465, 480, 490, 505, 515, 530, 540, 555, 570, 580, 595, 610, 620, 635, 650, 665, 675, 690, 705, 715, 730, 745, 760, 775, 785, 800, 815, 830, 840, 855, 870, 885, 900, 915, 930, 940, 955, 970, 985, 1000, 1015, 1030, 1045, 1060, 1075, 1090, 1100, 1115, 1130, 1145, 1160, 1175, 1190, 1205, 1220, 1235, 1250, 1265, 1280, 1295, 1310, 1325, 1345, 1355, 1375, 1390, 1405, 1420, 1435, 1450, 1465, 1480, 1495, 1510, 1530, 1545, 1560],
        8: [10, 10, 20, 25, 35, 45, 50, 60, 70, 80, 90, 100, 115, 120, 135, 145, 155, 165, 180, 190, 200, 215, 225, 235, 250, 260, 275, 285, 300, 310, 325, 335, 350, 360, 375, 390, 400, 415, 425, 440, 455, 465, 480, 495, 505, 520, 535, 550, 560, 575, 590, 605, 620, 635, 645, 660, 675, 690, 705, 720, 735, 745, 760, 775, 790, 805, 820, 835, 850, 865, 880, 895, 910, 925, 940, 955, 970, 985, 1000, 1015, 1030, 1045, 1065, 1075, 1095, 1110, 1125, 1140, 1155, 1170, 1185, 1200, 1220, 1235, 1250, 1265, 1280, 1300, 1315, 1330, 1345, 1360, 1375, 1395, 1410, 1425, 1440, 1460, 1475, 1490, 1505, 1525, 1540, 1555],
        9: [10, 10, 20, 30, 35, 45, 55, 65, 75, 85, 95, 105, 120, 130, 140, 155, 165, 175, 190, 200, 215, 225, 240, 250, 265, 275, 290, 300, 315, 330, 340, 355, 370, 385, 395, 410, 425, 440, 450, 465, 480, 495, 510, 525, 535, 550, 565, 580, 595, 610, 625, 640, 655, 670, 685, 700, 715, 730, 745, 760, 775, 790, 805, 820, 835, 855, 870, 885, 900, 915, 930, 945, 965, 980, 995, 1010, 1025, 1045, 1060, 1075, 1090, 1110, 1125, 1140, 1160, 1175, 1190, 1205, 1225, 1240, 1255, 1275, 1290, 1305, 1325, 1340, 1355, 1375, 1390, 1410, 1425, 1440, 1460, 1475, 1490, 1510, 1525, 1545, 1560, 1580, 1595, 1615, 1630, 1650, 1665, 1685, 1700, 1715, 1735, 1755, 1770, 1790, 1805, 1825, 1840, 1860, 1875, 1895, 1915, 1930, 1950, 1965, 1985, 2000, 2020, 2040, 2055, 2075, 2095, 2110, 2130, 2145, 2165, 2185, 2200, 2220, 2240, 2255, 2275, 2295, 2310, 2330, 2350, 2365, 2385, 2405, 2420, 2440, 2460, 2480, 2495, 2515, 2535, 2555, 2570, 2590, 2610, 2630, 2645, 2665, 2685, 2705, 2720, 2740, 2760, 2780, 2800, 2815, 2835, 2855, 2875, 2895, 2910, 2930, 2950, 2970, 2990, 3010, 3030, 3045, 3065, 3085, 3105, 3125, 3145, 3165, 3180, 3200, 3220, 3240, 3260, 3280, 3300],
        10: [10, 10, 20, 30, 40, 50, 60, 70, 80, 90, 100, 115, 125, 135, 150, 160, 175, 185, 200, 210, 225, 240, 250, 265, 280, 290, 305, 320, 335, 345, 360, 375, 390, 405, 420, 430, 450, 460, 475, 490, 505, 520, 535, 550, 565, 580, 600, 615, 630, 645, 660, 675, 690, 705, 725, 740, 755, 770, 785, 800, 820, 835, 850, 870, 885, 900, 915, 935, 950, 965, 985, 1000, 1015, 1035, 1050, 1065, 1085, 1100, 1120, 1135, 1150, 1170, 1185, 1205, 1220, 1240, 1255, 1275, 1290, 1310, 1325, 1345, 1360, 1380, 1395, 1415, 1430, 1450, 1470, 1485, 1505, 1520, 1540, 1555, 1575, 1595, 1610, 1630, 1650, 1665, 1685, 1705, 1720, 1740, 1755, 1775, 1795, 1815, 1830, 1850, 1870, 1885, 1905, 1925, 1945, 1960, 1980],
        11: [10, 10, 20, 30, 40, 50, 60, 75, 85, 95, 110, 120, 130, 145, 155, 170, 185, 195, 210, 225, 235, 250, 265, 280, 295, 305, 320, 335, 350, 365, 380, 395, 410, 425, 440, 455, 470, 485, 500, 515, 535, 550, 565, 580, 595, 615, 630, 645, 660, 675, 695, 710, 725, 745, 760, 775, 795, 810, 830, 845, 860, 880, 895, 915, 930, 945, 965, 985, 1000, 1020, 1035, 1050, 1070, 1090, 1105, 1125, 1140, 1160, 1175, 1195, 1215, 1230, 1250, 1265, 1285, 1305, 1320, 1340, 1360, 1375, 1395, 1415, 1435, 1450, 1470, 1490, 1510, 1525, 1545, 1565, 1585, 1600, 1620, 1640, 1660, 1680, 1695, 1715, 1735, 1755, 1775, 1790, 1810, 1830, 1850, 1870, 1890, 1910, 1930, 1950, 1965, 1985, 2005, 2025, 2045, 2065, 2085, 2105, 2125, 2145, 2165, 2185, 2205, 2225, 2245, 2265, 2285, 2305, 2325, 2345, 2365, 2385, 2405, 2425, 2445, 2465, 2485, 2505, 2525, 2550, 2570, 2590],
        12: [10, 15, 20, 30, 40, 55, 65, 75, 85, 100, 115, 125, 140, 150, 165, 180, 190, 205, 220, 235, 250, 265, 280, 290, 305, 320, 335, 355, 365, 385, 400, 415, 430, 445, 460, 480, 495, 510, 525, 545, 560, 575, 590, 610, 625, 645, 660, 675, 695, 710, 730, 745, 765, 780, 800, 815, 835, 850, 870, 885, 905, 920, 940, 960, 975, 995, 1015, 1030, 1050, 1070, 1085, 1105, 1125, 1140, 1160, 1180, 1200, 1215, 1235, 1255, 1275, 1290, 1310, 1330, 1350, 1370, 1390, 1410, 1425, 1445, 1465, 1485, 1505, 1525, 1545, 1565, 1580, 1600, 1625, 1640, 1660, 1680, 1700, 1720, 1740, 1760, 1780, 1800, 1820, 1840, 1860, 1880, 1900, 1920, 1945, 1965, 1985, 2005, 2025, 2045, 2065, 2085, 2105, 2125, 2150, 2170, 2190, 2210, 2230, 2250, 2275, 2295, 2315, 2335, 2355, 2380],
        13: [10, 15, 20, 35, 45, 55, 65, 80, 90, 105, 120, 130, 145, 160, 175, 185, 200, 215, 230, 245, 260, 275, 290, 305, 320, 335, 355, 370, 385, 400, 420, 435, 450, 465, 485, 500, 515, 535, 550, 570, 585, 605, 620, 640, 655, 675, 690, 710, 730, 745, 765, 780, 800, 820, 835, 855, 875, 890, 910, 930, 945, 965, 985, 1005, 1025, 1040, 1060, 1080, 1100, 1120, 1140, 1155, 1175, 1195, 1215, 1235, 1255, 1275, 1295, 1315, 1335, 1355, 1375, 1395, 1415, 1435, 1455, 1475, 1495, 1515, 1535, 1555, 1575, 1595, 1615, 1640, 1660, 1680, 1700, 1720, 1740, 1760, 1780, 1805, 1825, 1845, 1865, 1885, 1910, 1930, 1950, 1970, 1990, 2015, 2035],
        14: [10, 15, 25, 35, 45, 60, 70, 85, 95, 110, 120, 135, 150, 165, 180, 195, 210, 225, 240, 255, 270, 290, 305, 320, 335, 355, 370, 385, 405, 420, 435, 455, 470, 490, 505, 525, 540, 560, 575, 595, 615, 630, 650, 670, 685, 705, 725, 740, 760, 780, 800, 815, 835, 855, 875, 895, 915, 930, 950, 970, 990, 1010, 1030, 1050, 1070, 1090, 1110, 1130, 1150, 1170, 1190, 1210, 1230, 1250, 1270, 1290, 1310, 1335, 1355, 1375, 1395, 1415, 1435, 1455, 1480, 1500, 1520, 1540, 1560, 1585, 1605, 1625, 1645, 1670, 1690, 1710, 1735, 1755, 1775, 1800, 1820, 1840, 1865, 1885, 1905, 1930, 1950, 1975, 1995, 2015, 2040, 2060, 2085, 2105, 2130, 2150, 2170, 2195, 2215, 2240, 2260, 2285, 2305, 2330, 2350, 2375, 2395, 2420, 2445, 2465, 2490, 2510, 2535, 2555, 2580, 2605, 2625, 2650, 2675, 2695, 2720, 2740, 2765, 2790, 2810, 2835, 2860, 2880, 2905, 2930, 2950, 2975, 3000, 3025, 3050, 3070, 3095, 3120, 3140, 3165, 3190, 3215, 3235, 3260, 3285, 3310, 3335, 3355, 3380, 3405, 3430, 3455, 3480, 3500, 3525, 3550, 3575, 3600, 3625, 3650, 3670, 3695, 3720, 3745, 3770, 3795, 3820, 3845, 3870, 3895, 3915],
        15: [10, 15, 25, 35, 45, 60, 75, 85, 100, 115, 130, 145, 160, 170, 190, 205, 220, 235, 250, 265, 285, 300, 315, 335, 350, 370, 385, 400, 420, 440, 455, 475, 490, 510, 525, 545, 565, 585, 600, 620, 640, 660, 675, 695, 715, 735, 755, 775, 795, 815, 830, 850, 870, 895, 910, 930, 950, 970, 995, 1015, 1035, 1055, 1075, 1095, 1115, 1135, 1155, 1180, 1200, 1220, 1240, 1260, 1285, 1305, 1325, 1350, 1370, 1390, 1410, 1435, 1455, 1475, 1500, 1520, 1545, 1565, 1585, 1610, 1630, 1650, 1675, 1695, 1720, 1740, 1765, 1785, 1810, 1830, 1855, 1875, 1900, 1920, 1945, 1965, 1990, 2015, 2035, 2060, 2080, 2105, 2125, 2150, 2175, 2195, 2220, 2245, 2265, 2290, 2315, 2335, 2360, 2385, 2405, 2430, 2455, 2480, 2500, 2525, 2550, 2575, 2595, 2620, 2645, 2670, 2690, 2715, 2740, 2765, 2790, 2815, 2835, 2860, 2885, 2910, 2935, 2960, 2985, 3010, 3030, 3055, 3080, 3105, 3130, 3155, 3180, 3205, 3230, 3255, 3280, 3305, 3330, 3355, 3380, 3405, 3430, 3455, 3480, 3505, 3530, 3555, 3580, 3605, 3630, 3655, 3680, 3705, 3730, 3755, 3780, 3805],
        16: [10, 15, 25, 35, 50, 65, 75, 90, 105, 120, 135, 150, 165, 180, 195, 210, 230, 245, 260, 280, 295, 310, 330, 350, 365, 385, 400, 420, 440, 455, 475, 495, 510, 530, 550, 570, 590, 605, 625, 645, 665, 685, 705, 725, 745, 765, 785, 805, 825, 845, 865, 890, 910, 930, 950, 970, 990, 1015, 1035, 1055, 1075, 1100, 1120, 1140, 1160, 1185, 1205, 1225, 1250, 1270, 1295, 1315, 1335, 1360, 1380, 1405, 1425, 1450, 1470, 1495, 1515, 1540, 1560, 1585, 1605, 1630, 1650, 1675, 1700, 1720, 1745, 1770, 1790, 1815, 1835, 1860, 1885, 1905, 1930, 1955, 1980, 2000, 2025, 2050, 2070, 2095, 2120, 2145, 2170, 2190, 2215, 2240, 2265, 2290, 2310, 2335, 2360, 2385, 2410, 2435, 2460, 2485, 2505, 2530, 2555, 2580, 2605, 2630, 2655, 2680, 2705, 2730, 2755, 2780, 2805, 2830, 2855],
        17: [10, 15, 25, 40, 50, 65, 80, 95, 110, 125, 140, 155, 170, 185, 205, 220, 235, 255, 270, 290, 305, 325, 345, 360, 380, 400, 415, 435, 455, 475, 495, 510, 530, 550, 570, 590, 610, 630, 650, 670, 690, 715, 735, 755, 775, 795, 815, 840, 860, 880, 900, 925, 945, 965, 990, 1010, 1030, 1055, 1075, 1095, 1120, 1140, 1165, 1185, 1210, 1230, 1255, 1275, 1300, 1320, 1345, 1365, 1390, 1415, 1435, 1460, 1485, 1505, 1530, 1555, 1575, 1600, 1625, 1645, 1670, 1695, 1720, 1745, 1765, 1790, 1815, 1840, 1860, 1885, 1910, 1935, 1960, 1985, 2010, 2030, 2055, 2080, 2105, 2130, 2155, 2180, 2205, 2230, 2255, 2280, 2305, 2330, 2355, 2380, 2405, 2430, 2455, 2480, 2505, 2530, 2555, 2580, 2610, 2635, 2660, 2685, 2710, 2735, 2760, 2785, 2815, 2840, 2865, 2890, 2915, 2945, 2970, 2995, 3020, 3050, 3075, 3100, 3125, 3155, 3180, 3205],
        18: [10, 15, 25, 40, 55, 70, 80, 95, 115, 125, 145, 160, 175, 195, 210, 230, 245, 265, 280, 300, 320, 335, 355, 375, 395, 415, 435, 455, 470, 490, 510, 535, 550, 575, 595, 615, 635, 655, 675, 700, 720, 740, 760, 785, 805, 825, 850, 870, 890, 915, 935, 960, 980, 1005, 1025, 1050, 1070, 1095, 1115, 1140, 1160, 1185, 1210, 1230, 1255, 1280, 1300, 1325, 1350, 1370, 1395, 1420, 1445, 1470, 1490, 1515, 1540, 1565, 1590, 1615, 1635, 1660, 1685, 1710, 1735, 1760, 1785, 1810, 1835, 1860, 1885, 1910, 1935, 1960, 1985, 2010, 2035, 2060, 2085, 2110, 2135, 2160, 2185, 2215, 2240, 2265, 2290, 2315, 2340, 2365, 2395, 2420],
        19: [10, 15, 30, 40, 55, 70, 85, 100, 115, 130, 150, 165, 185, 200, 220, 235, 255, 275, 295, 310, 330, 350, 370, 390, 410, 430, 450, 470, 490, 510, 530, 550, 575, 595, 615, 635, 660, 680, 700, 725, 745, 770, 790, 810, 835, 855, 880, 905, 925, 950, 970, 995, 1015, 1040, 1065, 1085, 1110, 1135, 1160, 1180, 1205, 1230, 1255, 1275, 1300, 1325, 1350, 1375, 1400, 1425, 1450, 1470, 1500, 1520, 1545, 1570, 1595, 1620, 1650, 1670, 1695, 1725, 1750, 1775, 1800, 1825, 1850, 1875, 1900, 1930, 1955, 1980, 2005, 2030, 2060, 2085, 2110, 2135, 2160, 2190, 2215, 2240, 2265, 2295, 2320, 2350, 2375, 2400, 2430, 2455, 2480, 2510, 2535, 2565, 2590, 2615, 2645, 2670, 2700, 2725, 2755, 2780],
    },

    GreatBuildingsData: [
        { 'ID': 'X_BronzeAge_Landmark1', 'GoodCosts': 0, 'GoodsProductions': [6, 7, 8, 9, 10, 11, 12, 13, 14, 15], GoodsIncrease: 1}, //Babel
        { 'ID': 'X_IronAge_Landmark2', 'GoodCosts': 0, 'GoodsProductions': [8, 9, 10, 12, 13, 14, 15, 17, 18, 19], GoodsIncrease: 1 }, //Lighthouse Alexandria
        { 'ID': 'X_EarlyMiddleAge_Landmark1', 'GoodCosts': 20, 'FPProductions': [1, 1, 2, 2, 3, 3, 4, 4, 5, 6] }, //Hagia 
        { 'ID': 'X_EarlyMiddleAge_Landmark3', 'GoodCosts': 20, 'GoodsProductions': [5, 5, 6, 7, 8, 8, 9, 10, 11, 12], GoodsIncrease: 1 }, //Galata
        { 'ID': 'X_HighMiddleAge_Landmark1', 'GoodCosts': 25, 'GoodsProductions': [10, 12, 13, 15, 17, 18, 20, 22, 24, 25], GoodsIncrease: 1 }, //St. Mark
        { 'ID': 'X_LateMiddleAge_Landmark3', 'GoodCosts': 30, 'FPProductions': [1, 1, 2, 2, 3, 3, 4, 4, 5, 6] }, //Castel del Monte
        { 'ID': 'X_ColonialAge_Landmark1', 'GoodCosts': 40, 'GoodsProductions': [7, 8, 9, 10, 11, 12, 13, 14, 16, 17], GoodsIncrease: 1 }, //Frauenkirche
        { 'ID': 'X_IndustrialAge_Landmark1', 'GoodCosts': 50, 'GoodsProductions': [11, 12, 14, 16, 18, 20, 21, 23, 25, 27], GoodsIncrease: 1 }, //Royal Albert
        { 'ID': 'X_PostModernEra_Landmark1', 'GoodCosts': 75, 'FPProductions': [2, 2, 3, 4, 5, 6, 6, 7, 8, 10] }, //Cape
        { 'ID': 'X_ContemporaryEra_Landmark2', 'GoodCosts': 100, 'FPProductions': [1, 1, 2, 2, 3, 3, 4, 4, 5, 6] }, //Inno Tower
        { 'ID': 'X_FutureEra_Landmark1', 'GoodCosts': 150, 'Rewards': [0.1, 0.12, 0.14, 0.17, 0.19, 0.22, 0.24, 0.26, 0.28, 0.31, 0.32, 0.33, 0.34, 0.35, 0.36, 0.37, 0.38, 0.39, 0.4, 0.41, 0.42, 0.43, 0.44, 0.45, 0.46, 0.47, 0.48, 0.49, 0.5, 0.51, 0.52, 0.53, 0.54, 0.55, 0.56, 0.57, 0.58, 0.59, 0.6, 0.61, 0.62, 0.63, 0.64, 0.65, 0.66, 0.67, 0.68, 0.69, 0.7, 0.71, 0.72, 0.73, 0.74, 0.75, 0.76, 0.77, 0.78, 0.79, 0.795, 0.8, 0.805, 0.81, 0.815, 0.82, 0.825, 0.83, 0.835, 0.84, 0.845, 0.85, 0.855, 0.86, 0.865, 0.87, 0.875, 0.88, 0.885, 0.89, 0.895, 0.9, 0.901, 0.902, 0.903, 0.904, 0.905, 0.906, 0.907, 0.908, 0.909, 0.91, 0.911, 0.912, 0.913, 0.914, 0.915, 0.916, 0.917, 0.918, 0.919, 0.92, 0.921, 0.922, 0.923, 0.924, 0.925, 0.926, 0.927, 0.928, 0.929, 0.93, 0.931, 0.932, 0.933, 0.934, 0.935, 0.936, 0.937, 0.938, 0.939, 0.94, 0.941, 0.942, 0.943, 0.944, 0.945, 0.946, 0.947, 0.948, 0.949, 0.95, 0.951, 0.952, 0.953, 0.954, 0.955, 0.956, 0.957, 0.958, 0.959, 0.96, 0.961, 0.962, 0.963, 0.964, 0.965, 0.966, 0.967, 0.968, 0.969, 0.97, 0.971, 0.972, 0.973, 0.974, 0.975, 0.976, 0.977, 0.978, 0.979, 0.98, 0.981, 0.982, 0.983, 0.984, 0.985, 0.986, 0.987, 0.988, 0.989, 0.99, 0.991, 0.992, 0.993, 0.994, 0.995, 0.996, 0.997, 0.998, 0.999, 1, 1] }, //Arche
        { 'ID': 'X_FutureEra_Landmark2', 'GoodCosts': 150, 'GoodsProductions': [13, 16, 18, 20, 22, 25, 27, 29, 31, 34], GoodsIncrease: 1 }, //Rainforest
        { 'ID': 'X_ArcticFuture_Landmark2', 'GoodCosts': 200, 'FPProductions': [2, 2, 3, 4, 5, 6, 6, 7, 8, 10] }, //Arctic Orangerie
        { 'ID': 'X_OceanicFuture_Landmark1', 'GoodCosts': 300, 'GoodsProductions': [20, 24, 28, 30, 34, 38, 42, 44, 48, 52], GoodsIncrease: 2 }, //Atlantis
        { 'ID': 'X_OceanicFuture_Landmark2', 'GoodCosts': 300, 'FPProductions': [1, 1, 3, 3, 4, 4, 5, 5, 6, 8] }, //Kraken
        { 'ID': 'X_OceanicFuture_Landmark3', 'GoodCosts': 300, 'Rewards': [0.17, 0.19, 0.21, 0.23, 0.25, 0.27, 0.29, 0.3, 0.31, 0.32, 0.33, 0.34, 0.35, 0.35, 0.36, 0.37, 0.38, 0.38, 0.39, 0.4, 0.4, 0.41, 0.42, 0.42, 0.43, 0.43, 0.44, 0.45, 0.45, 0.46, 0.47, 0.47, 0.48, 0.49, 0.49, 0.5, 0.5, 0.51, 0.52, 0.52, 0.53, 0.53, 0.54, 0.54, 0.55, 0.55, 0.56, 0.56, 0.57, 0.57, 0.58, 0.58, 0.59, 0.59, 0.6, 0.6, 0.61, 0.61, 0.61, 0.62, 0.62, 0.62, 0.63, 0.63, 0.64, 0.64, 0.64, 0.65, 0.65, 0.65, 0.65, 0.66, 0.66, 0.66, 0.67, 0.67, 0.67, 0.67, 0.68, 0.68, 0.68, 0.68, 0.69, 0.69, 0.69, 0.69, 0.69, 0.69, 0.7, 0.7, 0.7], Charges: [4, 4, 5, 5, 5, 5, 5, 5, 6, 6, 6, 6, 6, 6, 7, 7, 7, 7, 7, 8, 8, 8, 8, 8, 8, 9, 9, 9, 9, 9, 9, 10, 10, 10, 10, 10, 10, 11, 11, 11, 11, 11, 11, 11, 12, 12, 12, 12, 12, 12, 12, 12, 12, 13, 13, 13, 13, 13, 13, 13, 13, 13, 13, 13, 13, 13, 14, 14, 14, 14, 14, 14, 14, 14, 14, 14, 14, 14, 14, 14, 14, 14, 14, 14, 14, 14, 14, 14, 14, 14, 15] }, // Blue Galaxy
        { 'ID': 'X_VirtualFuture_Landmark2', 'GoodCosts': 500, 'Rewards': [0.28, 0.36, 0.44, 0.52, 0.75, 0.85, 0.95, 1.05, 1.15, 1.25, 1.281, 1.3125, 1.3435, 1.3745, 1.4055, 1.7232, 1.7598, 1.7958, 1.8318, 1.8672, 1.9026, 1.9368, 1.971, 2.0046, 2.0376, 2.07, 2.1018, 2.4885, 2.5242, 2.5585, 2.5928, 2.6257, 2.6586, 2.6901, 2.7202, 2.7503, 2.7797, 2.8077, 2.835, 2.8616, 3.3, 3.328, 3.3552, 3.3824, 3.408, 3.4328, 3.4568, 3.4792, 3.5016, 3.5232, 3.544, 3.564, 3.5824, 3.6008, 3.6184, 3.6352, 3.652, 4.1256, 4.1427, 4.1589, 4.1742, 4.1886, 4.203, 4.2165, 4.23, 4.2417, 4.2543, 4.2651, 4.2759, 4.2867, 4.2966, 4.3056, 4.3155, 4.3236, 4.3317, 4.3398, 4.3479, 4.3551, 4.3614, 4.3677, 4.374, 4.3803, 4.3857, 4.3011, 4.3965, 4.4019, 4.4064, 4.4109, 4.4154, 4.419, 4.914, 4.918, 4.922, 4.926, 4.93, 4.933, 4.936, 4.939, 4.942, 4.945, 4.948, 4.95, 4.953, 4.955, 4.957, 4.959, 4.961, 4.963, 4.965, 4.967, 4.968, 4.97, 4.971, 4.973, 4.974, 4.975, 4.976, 4.978, 4.979, 4.98, 4.981, 4.982, 4.982, 4.983, 4.984, 4.985, 4.986] }, //Himeji
        { 'ID': 'X_SpaceAgeMars_Landmark1', 'GoodCosts': 750, 'GoodsProductions': [5, 10, 15, 20, 25, 30, 35, 40, 45, 50], GoodsIncrease: 2.5 }, //Star Gazer
        { 'ID': 'X_SpaceAgeAsteroidBelt_Landmark1', 'GoodCosts': 1000, 'Rewards': [0.28, 0.36, 0.44, 0.52, 0.75, 0.85, 0.95, 1.05, 1.15, 1.25, 1.281, 1.3125, 1.3435, 1.3745, 1.4055, 1.7232, 1.7598, 1.7958, 1.8318, 1.8672, 1.9026, 1.9368, 1.971, 2.0046, 2.0376, 2.07, 2.1018, 2.4885, 2.5242, 2.5585, 2.5928, 2.6257, 2.6586, 2.6901, 2.7202, 2.7503, 2.7797, 2.8077, 2.835, 2.8616, 3.3, 3.328, 3.3552, 3.3824, 3.408, 3.4328, 3.4568, 3.4792, 3.5016, 3.5232, 3.544, 3.564, 3.5824, 3.6008, 3.6184, 3.6352, 3.652, 4.1256, 4.1427, 4.1589, 4.1742, 4.1886, 4.203, 4.2165, 4.23, 4.2417, 4.2543, 4.2651, 4.2759, 4.2867, 4.2966, 4.3056, 4.3155, 4.3236, 4.3317, 4.3398, 4.3479, 4.3551, 4.3614, 4.3677, 4.374, 4.3803, 4.3857, 4.3011, 4.3965, 4.4019, 4.4064, 4.4109, 4.4154, 4.419, 4.914, 4.918, 4.922, 4.926, 4.93, 4.933, 4.936, 4.939, 4.942, 4.945, 4.948, 4.95, 4.953, 4.955, 4.957, 4.959, 4.961, 4.963, 4.965, 4.967, 4.968, 4.97, 4.971, 4.973, 4.974, 4.975, 4.976, 4.978, 4.979, 4.98, 4.981, 4.982, 4.982, 4.983, 4.984, 4.985, 4.986] }, //Space Carrier
    ],

    BlueGalaxyStaticProductions: { // Durchschnitts FP pro Tag für großen Leuchtturm
        'R_MultiAge_SummerBonus19a': { FP: 0.2, Goods: 1 },
        'R_MultiAge_SummerBonus19b': { FP: 1.4, Goods: 2 },
        'R_MultiAge_SummerBonus19c': { FP: 2.75, Goods: 3.75 },
        'R_MultiAge_SummerBonus19d': { FP: 4, Goods: 5 },
        'R_MultiAge_SummerBonus19e': { FP: 6.1, Goods: 7.5 },
        'R_MultiAge_SummerBonus19f': { FP: 7.8, Goods: 10.5 },
        'R_MultiAge_SummerBonus19g': { FP: 10, Goods: 16 },
        'R_MultiAge_SummerBonus19h': { FP: 12.8, Goods: 20 },
    },

    ForderBonus: 90,
    RewardPerDay: 0,
    FPPerTile: 0.2,
    HideNewGBs: false,

    ShowGoods: false,
    GoodsValue0: 0.2,
    GoodsValue1: 0.15,
    GoodsValue3: 0.1,

    GreatBuildingEntityCache: null,
    FPRewards: 0,
    EventDict: {},
    GalaxyBuildings: [],
    DetailsVisible: {},

    /**
     * Zeigt die Box an oder schließt sie
     */
    Show: () => {
        if ($('#greatbuildings').length === 0) {

            let ForderBonus = localStorage.getItem('GreatBuildingsForderBonus');
            if (ForderBonus !== null) {
                GreatBuildings.ForderBonus = parseFloat(ForderBonus);
            }

            for (let i = 0; i < GreatBuildings.GreatBuildingsData.length; i++) {
                let GoodCosts = localStorage.getItem('GreatBuildingsGoodCosts' + i);
                if (GoodCosts !== null) {
                    GreatBuildings.GreatBuildingsData[i]['GoodCosts'] = parseFloat(GoodCosts);
                }
            }

            let FPPerTile = localStorage.getItem('GreatBuildingsFPPerTile');
            if (FPPerTile != null) {
                GreatBuildings.FPPerTile = parseFloat(FPPerTile);
            }

            let GoodsValue0 = localStorage.getItem('GreatBuildingsGoodsValue0');
            if (GoodsValue0 != null) {
                GreatBuildings.GoodsValue0 = parseFloat(GoodsValue0);
            }

            let GoodsValue1 = localStorage.getItem('GreatBuildingsGoodsValue1');
            if (GoodsValue1 != null) {
                GreatBuildings.GoodsValue1 = parseFloat(GoodsValue1);
            }

            let GoodsValue3 = localStorage.getItem('GreatBuildingsGoodsValue3');
            if (GoodsValue3 != null) {
                GreatBuildings.GoodsValue3 = parseFloat(GoodsValue3);
            }

            let ShowGoods = localStorage.getItem('GreatBuildingsShowGoods');
            if (ShowGoods != null) {
                GreatBuildings.ShowGoods = ShowGoods;
            }

            GreatBuildings.RewardPerDay = MainParser.round(GreatBuildings.FPRewards / 6);

            GreatBuildings.DetailsVisible = {};

            HTML.Box({
                id: 'greatbuildings',
                title: i18n('Boxes.GreatBuildings.Title'),
                ask: i18n('Boxes.GreatBuildings.HelpLink'),
                auto_close: true,
                dragdrop: true,
                minimize: true,
                resize: true
            });

            // CSS in den DOM prügeln
            HTML.AddCssFile('greatbuildings');

            $('#greatbuildings').on('click', '.hidenewgbs', function () {
                let $this = $(this),
                    id = $this.data('id'),
                    v = $this.prop('checked');

                GreatBuildings.HideNewGBs = v;

                GreatBuildings.CalcBody();
            });

            $('#greatbuildings').on('blur', '#costFactor', function () {
                GreatBuildings.ForderBonus = parseFloat($('#costFactor').val());
                if (isNaN(GreatBuildings.ForderBonus)) GreatBuildings.ForderBonus = 0;
                localStorage.setItem('GreatBuildingsForderBonus', GreatBuildings.ForderBonus);
                GreatBuildings.CalcBody();
            });

            $('#greatbuildings').on('blur', '#fpPerTile', function () {
                GreatBuildings.FPPerTile = parseFloat($('#fpPerTile').val());
                if (isNaN(GreatBuildings.FPPerTile)) GreatBuildings.FPPerTile = 0;
                localStorage.setItem('GreatBuildingsFPPerTile', GreatBuildings.FPPerTile);
                GreatBuildings.CalcBody();
            });

            $('#greatbuildings').on('blur', '#rewardPerDay', function () {
                GreatBuildings.RewardPerDay = parseFloat($('#rewardPerDay').val());
                if (isNaN(GreatBuildings.RewardPerDay)) GreatBuildings.RewardPerDay = 0;
                GreatBuildings.CalcBody();
            });

            $('#greatbuildings').on('click', '.showgoods', function () {
                let $this = $(this),
                    id = $this.data('id'),
                    v = $this.prop('checked');

                GreatBuildings.ShowGoods = v;
                localStorage.setItem('GreatBuildingsShowGoods', GreatBuildings.ShowGoods);

                GreatBuildings.CalcBody();
            });

            $('#greatbuildings').on('blur', '#goodsValue0', function () {
                GreatBuildings.GoodsValue0 = parseFloat($('#goodsValue0').val());
                if (isNaN(GreatBuildings.GoodsValue0)) GreatBuildings.GoodsValue0 = 0;
                localStorage.setItem('GreatBuildingsGoodsValue0', GreatBuildings.GoodsValue0);
                GreatBuildings.CalcBody();
            });

            $('#greatbuildings').on('blur', '#goodsValue1', function () {
                GreatBuildings.GoodsValue1 = parseFloat($('#goodsValue1').val());
                if (isNaN(GreatBuildings.GoodsValue1)) GreatBuildings.GoodsValue1 = 0;
                localStorage.setItem('GreatBuildingsGoodsValue1', GreatBuildings.GoodsValue1);
                GreatBuildings.CalcBody();
            });

            $('#greatbuildings').on('blur', '#goodsValue3', function () {
                GreatBuildings.GoodsValue3 = parseFloat($('#goodsValue3').val());
                if (isNaN(GreatBuildings.GoodsValue3)) GreatBuildings.GoodsValue3 = 0;
                localStorage.setItem('GreatBuildingsGoodsValue3', GreatBuildings.GoodsValue3);
                GreatBuildings.CalcBody();
            });

            for (let i = 0; i < GreatBuildings.GreatBuildingsData.length; i++) {
                $('#greatbuildings').on('blur', '#GreatBuildingsGoodCosts' + i, function () {
                    GreatBuildings.GreatBuildingsData[i].GoodCosts = parseFloat($('#GreatBuildingsGoodCosts' + i).val());
                    if (isNaN(GreatBuildings.GreatBuildingsData[i].GoodCosts)) GreatBuildings.GreatBuildingsData[i].GoodCosts = 0;
                    localStorage.setItem('GreatBuildingsGoodCosts' + i, GreatBuildings.GreatBuildingsData[i].GoodCosts);
                    GreatBuildings.CalcBody();
                });
            }

            // Weiter Level aufklappen
            $('#greatbuildings').on('click', '.btn-toggle-detail', function () {
                let Index = $(this).data('value');
                GreatBuildings.DetailsVisible[Index] = !GreatBuildings.DetailsVisible[Index];

                let ButtonText = (GreatBuildings.DetailsVisible[Index] ? '-' : '+');
                $(this).text(ButtonText);
                
                GreatBuildings.RefreshDetailsVisible(Index);                
            });

        } else {
            HTML.CloseOpenBox('greatbuildings');
        }

        GreatBuildings.CalcBody();       
    },


    CalcBody: () => {
        let h = [];
        h.push('<div class="text-center dark-bg header">');
        h.push('<strong class="title">' + i18n('Boxes.GreatBuildings.SuggestionTitle') + '</strong><br>');
        if (LastMapPlayerID !== ExtPlayerID) {
            h.push('<strong class="player-name"><span>' + PlayerDict[LastMapPlayerID]['PlayerName'] + '</span></strong>');
        }
        h.push('<br><strong>')
        h.push(i18n('Boxes.GreatBuildings.ArcBonus') + ' ');
        h.push('</strong><input type="number" id="costFactor" step="0.1" min="12" max="200" value="' + GreatBuildings.ForderBonus + '">% ');
        h.push('<br><br>')
        h.push('<input id="HideNewGBs" class="hidenewgbs game-cursor" ' + (GreatBuildings.HideNewGBs ? 'checked' : '') + ' type="checkbox">');
        h.push(i18n('Boxes.GreatBuildings.HideNewGBs'));
        h.push('<br>');
        h.push(i18n('Boxes.GreatBuildings.FPPerTile') + ' ');
        h.push('<input type="number" id="fpPerTile" step="0.01" min="0" max="1000" value="' + GreatBuildings.FPPerTile + '" title="' + HTML.i18nTooltip(i18n('Boxes.GreatBuildings.TTFPPerTile')) + '">');
        h.push('<br>');
        h.push(i18n('Boxes.GreatBuildings.RewardPerDay') + ' ');
        h.push('<input type="number" id="rewardPerDay" step="1" min="0" max="1000000" value="' + GreatBuildings.RewardPerDay + '" title="' + HTML.i18nTooltip(i18n('Boxes.GreatBuildings.TTRewardPerDay')) + '">');
        h.push('<br><br>');

        h.push('<input id="ShowGoods" class="showgoods game-cursor" ' + (GreatBuildings.ShowGoods ? 'checked' : '') + ' type="checkbox">');
        h.push(i18n('Boxes.GreatBuildings.ShowGoods'));
        h.push('<br>');

        if (GreatBuildings.ShowGoods) { //Güterwert - Boxen ausblenden, wenn Güter deaktiviert
            h.push(HTML.i18nReplacer(i18n('Boxes.GreatBuildings.GoodsValue'), { eraname: i18n('Eras.' + CurrentEraID) }) + ' ');
            h.push('<input type="number" id="goodsValue0" step="0.01" min="0" max="1000" value="' + GreatBuildings.GoodsValue0 + '" title="' + HTML.i18nTooltip(i18n('Boxes.GreatBuildings.TTGoodsValue')) + '">');
            if (GreatBuildings.GoodsValue0 > 0) {
                h.push('<small> (' + HTML.i18nReplacer(i18n('Boxes.GreatBuildings.GoodsPerFP'), { goods: Math.round(1 / GreatBuildings.GoodsValue0 * 100) / 100 }) + ')</small>')
            }
            h.push('<br>');

            if (CurrentEraID >= 3) { //Ab Eisenzeit => Star Gazer liefert Bronzezeitgüter
                h.push(HTML.i18nReplacer(i18n('Boxes.GreatBuildings.GoodsValue'), { eraname: i18n('Eras.' + (CurrentEraID - 1)) }) + ' ');
                h.push('<input type="number" id="goodsValue1" step="0.01" min="0" max="1000" value="' + GreatBuildings.GoodsValue1 + '" title="' + HTML.i18nTooltip(i18n('Boxes.GreatBuildings.TTGoodsValue')) + '">');
                if (GreatBuildings.GoodsValue1 > 0) {
                    h.push('<small> (' + HTML.i18nReplacer(i18n('Boxes.GreatBuildings.GoodsPerFP'), { goods: Math.round(1 / GreatBuildings.GoodsValue1 * 100) / 100 }) + ')</small>')
                }
                h.push('<br>');
            }

            if (CurrentEraID >= 10) { //Ab Moderne => Unveredelte Güter
                h.push(HTML.i18nReplacer(i18n('Boxes.GreatBuildings.GoodsValue'), { eraname: i18n('Eras.' + (CurrentEraID - 3)) }) + ' ');
                h.push('<input type="number" id="goodsValue3" step="0.01" min="0" max="1000" value="' + GreatBuildings.GoodsValue3 + '" title="' + HTML.i18nTooltip(i18n('Boxes.GreatBuildings.TTGoodsValue')) + '">');
                if (GreatBuildings.GoodsValue3 > 0) {
                    h.push('<small> (' + HTML.i18nReplacer(i18n('Boxes.GreatBuildings.GoodsPerFP'), { goods: Math.round(1 / GreatBuildings.GoodsValue3 * 100) / 100 }) + ')</small>')
                }
                h.push('<br>');
            }
        }

        h.push('<br>');
        h.push(i18n('Boxes.GreatBuildings.SuggestionDescription'));
        h.push('</div>');

        h.push('<table class="foe-table">');

        h.push('<thead>');
        h.push('<tr>');
        h.push('<th></th>');
        h.push('<th>' + i18n('Boxes.GreatBuildings.GreatBulding') + '</th>');
        h.push('<th>' + i18n('Boxes.GreatBuildings.Level') + '</th>');
        h.push('<th>' + i18n('Boxes.GreatBuildings.Costs') + '</th>');
        h.push('<th>' + i18n('Boxes.GreatBuildings.DailyFP') + '</th>');
        if (GreatBuildings.ShowGoods) h.push('<th>' + i18n('Boxes.GreatBuildings.DailyGoods') + '</th>');
        h.push('<th>' + i18n('Boxes.GreatBuildings.BreakEven') + '</th>');
        h.push('<th title="' + HTML.i18nTooltip(i18n('Boxes.GreatBuildings.TTGoodCostsColumn')) + '">' + i18n('Boxes.GreatBuildings.FPCostGoods') + '</th>');
        h.push('</tr>');
        h.push('</thead>');

        let CurrentCityMapData = (LastMapPlayerID === ExtPlayerID ? MainParser.CityMapData : MainParser.OtherPlayerCityMapData);

        let AllROIResults = [],
            IsNewGBs = [];
        
        for (let i = 0; i < GreatBuildings.GreatBuildingsData.length; i++) {
            let GBData = GreatBuildings.GreatBuildingsData[i];

            if (GBData.ID === 'X_OceanicFuture_Landmark3') {
                if (LastMapPlayerID == ExtPlayerID) {
                    GreatBuildings.RefreshGalaxyBuildings();
                }
                else { // Keine Galaxy für andere Spieler weil keine FP Daten vorhanden sind
                    continue;
                }
            }
                        
            let CityEntity = MainParser.CityEntities[GBData.ID];
            if (!CityEntity) continue; //Great building has been removed from the game => skip

            let OwnGB = Object.values(CurrentCityMapData).find(obj => (obj['cityentity_id'] === GBData.ID));;
            let EraName = GreatBuildings.GetEraName(CityEntity['asset_id']);
            let Era = Technologies.Eras[EraName];
            let DoubleCollection = (GBData.ID !== 'X_FutureEra_Landmark1');

            let NettoCosts = [];
            for (let j = 0; j < GreatBuildings.Rewards[Era].length; j++) {
                let P1 = GreatBuildings.Rewards[Era][j];
                P1 = (P1 !== undefined ? P1 : 0);

                let Maezen = GreatBuildings.GetMaezen(P1, GreatBuildings.ForderBonus);
                NettoCosts[j] = GreatBuildings.GetBruttoCosts(GBData.ID, j) - Maezen[0] - Maezen[1] - Maezen[2] - Maezen[3] - Maezen[4];
            }

            let FPProductions = [],
                GoodsProductions = [],
                GoodsValue = 0;
            for (let j = 0; j < GreatBuildings.Rewards[Era].length; j++) {
                FPProductions[j] = 0;
                GoodsProductions[j] = 0;

                if (GBData.ID === 'X_VirtualFuture_Landmark2' || GBData.ID === 'X_SpaceAgeAsteroidBelt_Landmark1') {
                    FPProductions[j] = GBData.Rewards[j] * 18.5;
                    GoodsProductions[j] = GBData.Rewards[j] * 34.5;
                }
                else if (GBData.ID === 'X_OceanicFuture_Landmark3') { //Blue Galaxy
                    FPProductions[j] = GBData.Rewards[j];
                    GoodsProductions[j] = GBData.Rewards[j];
                    GoodsValue = GreatBuildings.GoodsValue0;
                }
                else if (GBData.ID === 'X_FutureEra_Landmark1') { // Arche
                    let arc = 1 + MainParser.ArkBonus / 100;
                    FPProductions[j] = GBData.Rewards[j] * GreatBuildings.RewardPerDay / arc;
                }
                else {
                    if (GBData.FPProductions) {
                        if (j < 10) {
                            FPProductions[j] = GBData.FPProductions[j];
                        }
                        else {
                            FPProductions[j] = Math.floor(GBData.FPProductions[9] * (j + 1) / 10);
                        }
                    }

                    if (GBData.GoodsProductions) {
                        if (j < 10) {
                            GoodsProductions[j] = GBData.GoodsProductions[j];
                        }
                        else {
                            GoodsProductions[j] = Math.floor(GBData.GoodsProductions[9] + Math.ceil((j - 9) * GBData.GoodsIncrease));
                        }
                    }
                }

                if (GBData.ID === 'X_VirtualFuture_Landmark2' || GBData.ID === 'X_SpaceAgeAsteroidBelt_Landmark1' || GBData.ID === 'X_OceanicFuture_Landmark3') { // Himeji, Freighter, Galaxy
                    GoodsValue = GreatBuildings.GoodsValue0;
                }
                else if (GBData.ID === 'X_SpaceAgeMars_Landmark1') { //Star Gazer
                    GoodsValue = GreatBuildings.GoodsValue1;
                }
                else { //Standard goods production
                    if (CurrentEraID >= 10) { //ModernEra or higher => unrefined goods
                        GoodsValue = GreatBuildings.GoodsValue3;
                        GoodsProductions[j] *= 2;
                    }
                    else {
                        GoodsValue = GreatBuildings.GoodsValue0;
                    }
                }
            }

            if (!GreatBuildings.ShowGoods) GoodsValue = 0;

            let SkipGB = true;
            for (let j = 0; j < GreatBuildings.Rewards[Era].length; j++) { //Search for level with production
                if (FPProductions[j] + GoodsProductions[j] * GoodsValue > 0) {
                    SkipGB = false;
                    break;
                }
            }
            if (SkipGB) continue; //Nothing found => dont show GB

            let Charges = GBData.ID === 'X_OceanicFuture_Landmark3' ? GBData.Charges : undefined;

            let CurrentLevel = (OwnGB !== undefined ? OwnGB['level'] : -1);

            let Size = CityEntity['length'] * CityEntity['width'];
            let CurrentROIResult = GreatBuildings.GetROIValues(CurrentLevel, NettoCosts, FPProductions, GoodsProductions, GoodsValue, Size * GreatBuildings.FPPerTile, GBData.GoodCosts, DoubleCollection, Charges);
            let ROIResults = [CurrentROIResult];

            while (CurrentROIResult['BestLevel'] < NettoCosts.length - 1) {
                CurrentROIResult = GreatBuildings.GetROIValues(CurrentROIResult['BestLevel'] + 1, NettoCosts, FPProductions, GoodsProductions, GoodsValue, Size * GreatBuildings.FPPerTile, GBData.GoodCosts, DoubleCollection, Charges)
                if (CurrentROIResult.BestLevel) {
                    ROIResults.push(CurrentROIResult);
                }
            }

            AllROIResults[i] = ROIResults;
            IsNewGBs[i] = (CurrentLevel === -1);
        }

        let ROIResultMap = [];
        for (let i = 0; i < GreatBuildings.GreatBuildingsData.length; i++) {
            ROIResultMap[i] = { 'index': i, 'ROIResults': AllROIResults[i] };
        }

        ROIResultMap = ROIResultMap.sort(function (a, b) {
            if (!a['ROIResults'] || !a['ROIResults'][0]) return 999999;
            if (!b['ROIResults'] || !b['ROIResults'][0]) return -999999;

            let Levela = a['ROIResults'][0]['BestLevel'],
                Levelb = b['ROIResults'][0]['BestLevel'];

            if (Levela === undefined) return 999999;
            if (Levelb === undefined) return -999999;

            return a['ROIResults'][0]['ROIValues'][Levela]['ROI'] - b['ROIResults'][0]['ROIValues'][Levelb]['ROI'];
        });

        for (let i = 0; i < GreatBuildings.GreatBuildingsData.length; i++) {
            if (!ROIResultMap[i]['ROIResults'] || !ROIResultMap[i]['ROIResults'][0]) continue;

            let Index = ROIResultMap[i]['index'];
            let GBData = GreatBuildings.GreatBuildingsData[Index];
            let OwnGB = Object.values(CurrentCityMapData).find(obj => (obj['cityentity_id'] === GBData.ID));;
            let IsRandomFP = (GBData.ID === 'X_OceanicFuture_Landmark3' || GBData.ID === 'X_VirtualFuture_Landmark2' || GBData.ID === 'X_SpaceAgeAsteroidBelt_Landmark1');

            if (GreatBuildings.HideNewGBs && IsNewGBs[Index]) continue;

            for (let j = 0; j < AllROIResults[Index].length; j++) {
                let CurrentROIResult = AllROIResults[Index][j];

                if (j === 0) {
                    h.push('<tr class="gbmainrow" ' + (j > 0 ? 'data-value="' + Index + '"' : '') + '>');
                }
                else {
                    h.push('<tr class="gbdetailsrow" data-value="' + Index + '" ' + (j === 0 || GreatBuildings.DetailsVisible[Index] ? '' : 'style="display:none;"') + '>');
                }

                if (CurrentROIResult['BestLevel'] !== undefined) {
                    let CurrentLevel = Math.max(CurrentROIResult['CurrentLevel'], 0);
                    BestLevel = CurrentROIResult['BestLevel'];

                    if (j === 0) {
                        if (AllROIResults[Index].length >= 1) {
                            let ButtonText = (GreatBuildings.DetailsVisible[Index] ? '-' : '+');
                            h.push('<td><button class="btn btn-default btn-toggle-detail" data-value="' + Index + '">' + ButtonText + '</button></td>');
                        }
                        else {
                            h.push('<td></td>');
                        }
                    }
                    else {
                        h.push('<td></td>');
                    }

                    let Costs = CurrentROIResult['ROIValues'][BestLevel]['Costs'],
                        FPProduction = CurrentROIResult['ROIValues'][BestLevel]['FP'],
                        GoodsProduction = CurrentROIResult['ROIValues'][BestLevel]['Goods'],
                        GoodsValue = CurrentROIResult['GoodsValue'],
                        BreakEven = CurrentROIResult['ROIValues'][BestLevel]['ROI'],
                        BreakEvenString = (IsRandomFP ? 'Ø ' : '') + HTML.Format(MainParser.round(BreakEven)),
                        CostsTT = (IsNewGBs[Index] ? HTML.i18nReplacer(i18n('Boxes.GreatBuildings.NewGBCostsTT'), { 'goodcosts': CurrentROIResult['BuildCosts'] }) : ''),
                        FPProductionTT = (IsNewGBs[Index] ? HTML.i18nReplacer(i18n('Boxes.GreatBuildings.NewGBFPProductionTT'), { 'tiles': CurrentROIResult['BuildDailyCosts'] / GreatBuildings.FPPerTile, 'fppertile': GreatBuildings.FPPerTile, 'opcost': CurrentROIResult['BuildDailyCosts'] }) : '');

                    let BreakEvenTT;
                    if (GoodsProduction * GoodsValue !== 0) {
                        BreakEvenTT = HTML.i18nReplacer(i18n('Boxes.GreatBuildings.BreakEventTTGoods'), { 'days': Math.round(BreakEven), 'costs': HTML.Format(Math.round(Costs)), 'fpproduction': Math.round(FPProduction * 10) / 10, 'goodsproduction': Math.round(GoodsProduction * 10) / 10, 'goodsvalue': GoodsValue, 'goodsproductionvalue': Math.round(GoodsProduction * GoodsValue*10)/10 });
                    }
                    else {
                        BreakEvenTT = HTML.i18nReplacer(i18n('Boxes.GreatBuildings.BreakEventTT'), { 'days': Math.round(BreakEven), 'costs': HTML.Format(Math.round(Costs)), 'fpproduction': Math.round(FPProduction * 10) / 10 });
                    }

                    h.push('<td>' + MainParser.CityEntities[GBData.ID]['name'] + '</td>');
                    h.push('<td style="white-space:nowrap">' + CurrentLevel + ' &rarr; ' + (BestLevel + 1) + '</td>');
                    h.push('<td title="' + HTML.i18nTooltip(CostsTT) + '">' + HTML.Format(MainParser.round(Costs)) + '</td>');
                    h.push('<td title="' + HTML.i18nTooltip(FPProductionTT) + '">' + (IsRandomFP ? 'Ø ' : '') + HTML.Format(MainParser.round(FPProduction * 10) / 10) + '</td>');
                    if (GreatBuildings.ShowGoods) h.push('<td>' + (IsRandomFP ? 'Ø ' : '') + HTML.Format(MainParser.round(GoodsProduction * 10) / 10) + '</td>');
                    h.push('<td title="' + HTML.i18nTooltip(BreakEvenTT) + '"><strong class="text-bright">' + HTML.i18nReplacer(i18n('Boxes.GreatBuildings.BreakEvenUnit'), { 'days': BreakEvenString }) + '</strong></td>');
                }
                else { //LG zu hoch => Keine Daten mehr verfügbar oder Güterkosten zu hoch
                    h.push('<td></td>');
                    h.push('<td>' + MainParser.CityEntities[GBData.ID]['name'] + '</td>');
                    h.push('<td>-</td>');
                    h.push('<td>-</td>');
                    h.push('<td>-</td>');
                    if (GreatBuildings.ShowGoods) h.push('<td>-</td>');
                    h.push('<td>-</td>');
                }

                if (j === 0) {
                    if (IsNewGBs[Index]) {
                        h.push('<td><input title="' + HTML.i18nTooltip(i18n('Boxes.GreatBuildings.TTGoodCosts')) + '" type="number" id="GreatBuildingsGoodCosts' + Index + '" step="1" min="0" max="999999" value="' + GBData.GoodCosts + '"></td>');
                    }
                    else {
                        h.push('<td class="text-center">-</td>');
                    }
                }
                else { //j>0
                    h.push('<td></td>')
                }
                                
                h.push('</tr>');
            }
        }

        h.push('</table');

        $('#greatbuildingsBody').html(h.join(''));
    },


    RefreshGalaxyBuildings: () => {
        GreatBuildings.GalaxyBuildings = [];

        let CityMap = Object.values(MainParser.CityMapData);

        for (let i = 0; i < CityMap.length; i++) {
            let ID = CityMap[i]['id']
            EntityID = CityMap[i]['cityentity_id'],
                CityEntity = MainParser.CityEntities[EntityID];

            if (CityEntity['type'] === 'main_building' || CityEntity['type'] === 'greatbuilding') continue;

            if (GreatBuildings.BlueGalaxyStaticProductions[EntityID]) {
                GreatBuildings.GalaxyBuildings.push({ ID: ID, FP: GreatBuildings.BlueGalaxyStaticProductions[EntityID]['FP'], Goods: GreatBuildings.BlueGalaxyStaticProductions[EntityID]['Goods'] });
            }
            else {
                let Production = Productions.readType(CityMap[i]);
                let FP = 0,
                    GoodsSum = 0;

                if (Production['motivatedproducts']) {
                    FP = Production['motivatedproducts']['strategy_points'];
                    if (!FP) FP = 0;
                                        
                    for (j = 0; j < GoodsList.length; j++) {
                        let GoodID = GoodsList[j]['id'];
                        if (Production['motivatedproducts'][GoodID]) {
                            GoodsSum += Production['motivatedproducts'][GoodID];
                        }
                    }
                }
                
                if (FP > 0 || GoodsSum > 0) {
                    GreatBuildings.GalaxyBuildings.push({ ID: ID, FP: FP, Goods: GoodsSum });
                }
            }
        }

        GreatBuildings.GalaxyBuildings = GreatBuildings.GalaxyBuildings.sort(function (a, b) {
            return (b['FP'] + b['Goods'] * GreatBuildings.GoodsValue0) - (a['FP'] + a['Goods'] * GreatBuildings.GoodsValue0);
        });
    },


    GetGalaxyProduction: (FPProductions, Charges, Level, IsDoubleCollection) => {
        let StartIndex = 0;
        if (IsDoubleCollection && Level > 1) {
            StartIndex = Charges[Level - 1];
        }

        let FPSum = 0,
            GoodsSum = 0;
        for (let i = StartIndex; i < StartIndex + Charges[Level]; i++) {
            if (i >= GreatBuildings.GalaxyBuildings.length) break; // Nicht genug Gebäude vorhanden

            FPSum += GreatBuildings.GalaxyBuildings[i]['FP'];
            GoodsSum += GreatBuildings.GalaxyBuildings[i]['Goods'];
        }

        return { FP: FPProductions[Level] * FPSum, Goods: FPProductions[Level] * GoodsSum};
    },


    GetROIValues: (Level, NettoCosts, FPProductions, GoodsProductions, GoodsValue, BuildDailyCosts, BuildCosts, DoubleCollection, Charges) => {
        let Ret = { 'CurrentLevel': Level, 'BestLevel': undefined, ROIValues: [], GoodsValue: GoodsValue, BuildDailyCosts: BuildDailyCosts, BuildCosts: BuildCosts };

        let DoubleCollections = [];
        if (Charges) {

            for (let i = 0; i < 100; i++) {
                DoubleCollections[i] = GreatBuildings.GetGalaxyProduction(FPProductions, Charges, Level, true)['FP'];
                DoubleCollections[i] += GreatBuildings.GetGalaxyProduction(FPProductions, Charges, Level, true)['Goods'] * GoodsValue;
            }
        }

        let StartFPProduction = 0,
            StartGoodsProduction = 0,
            CurrentInvestment = 0;

        if (Level === -1) {
            StartFPProduction = BuildDailyCosts;
            CurrentInvestment = BuildCosts;
        }
        else if (Level > 0) {
            if (Charges) { // Blaue Galaxie
                StartFPProduction = GreatBuildings.GetGalaxyProduction(FPProductions, Charges, Level - 1, false)['FP'];
                StartGoodsProduction = GreatBuildings.GetGalaxyProduction(FPProductions, Charges, Level - 1, false)['Goods'];
            }
            else {
                StartFPProduction = FPProductions[Level - 1];
                StartGoodsProduction = GoodsProductions[Level - 1];
            }
        }

        let BestValue = 999999;
        for (let i = Math.max(Level, 0); i < NettoCosts.length; i++) {
            CurrentInvestment += NettoCosts[i];
            if (DoubleCollection) {
                if (Charges) { // Blaue Galaxie
                    CurrentInvestment -= GreatBuildings.GetGalaxyProduction(FPProductions, Charges, i, true)['FP'];
                    CurrentInvestment -= GreatBuildings.GetGalaxyProduction(FPProductions, Charges, i, true)['Goods'] * GoodsValue;
                }
                else {
                    CurrentInvestment -= FPProductions[i];
                    CurrentInvestment -= GoodsProductions[i] * GoodsValue;
                }
            }

            let CurrentFPProduction,
                CurrentGoodsProduction;
            if (Charges) { // Blaue Galaxie
                CurrentFPProduction = GreatBuildings.GetGalaxyProduction(FPProductions, Charges, i, false)['FP'];
                CurrentGoodsProduction = GreatBuildings.GetGalaxyProduction(FPProductions, Charges, i, false)['Goods'];
            }
            else {
                CurrentFPProduction = FPProductions[i];
                CurrentGoodsProduction = GoodsProductions[i];
            }

            Ret['ROIValues'][i] = { 'Costs': CurrentInvestment, 'FP': CurrentFPProduction - StartFPProduction, 'Goods': CurrentGoodsProduction - StartGoodsProduction, 'ROI': CurrentInvestment / ((CurrentFPProduction - StartFPProduction) + (CurrentGoodsProduction - StartGoodsProduction) * GoodsValue) };

            if (CurrentFPProduction + CurrentGoodsProduction * GoodsValue > StartFPProduction + StartGoodsProduction * GoodsValue) {
                if (Ret['ROIValues'][i]['ROI'] < BestValue) {
                    Ret['BestLevel'] = i;
                    BestValue = Ret['ROIValues'][i]['ROI'];
                }
            }
        }

        return Ret;
    },


    GetEraName: (EntityID) => {
        let UnderScorePos = EntityID.indexOf('_');
        let EraName = EntityID.substring(UnderScorePos + 1);

        UnderScorePos = EraName.indexOf('_');
        return EraName.substring(0, UnderScorePos);
    },


    GetBruttoCosts: (EntityID, Level) => {
        let CityEntity = MainParser.CityEntities[EntityID];

        if (Level < 10) {
            return CityEntity['strategy_points_for_upgrade'][Level];
        }
        else {
            return Math.ceil(CityEntity['strategy_points_for_upgrade'][9] * Math.pow(1.025, Level - 9));
        }
    },


    GetMaezen: (P1, ArcBoni) => {
        let Ret = [];

        let arcs = [];
        for (let i = 0; i < 5; i++) {
            if (ArcBoni.length) { //Array
                arcs[i] = 1 + (ArcBoni[i] / 100);
            }
            else {
                arcs[i] = 1 + (ArcBoni / 100);
            }
        }

        Ret[0] = P1;
        for (let i = 1; i < 5; i++) {
            Ret[i] = MainParser.round(Ret[i - 1] / (i + 1) / 5) * 5;
        }

        for (let i = 0; i < 5; i++) {
            Ret[i] = MainParser.round(Ret[i] * arcs[i]);
        }

        return Ret;
    },


    HandleEventPage: (Events) => {
        for (let i = 0; i < Events.length; i++) {
            let Event = Events[i];
            let ID = Event['id'];

            if (GreatBuildings.EventDict[ID]) continue; //Event schon behandelt
            GreatBuildings.EventDict[ID] = Event;

            if (Event['type'] !== 'great_building_contribution') continue;

            if (!GreatBuildings.GreatBuildingEntityCache) {
                GreatBuildings.GreatBuildingEntityCache = Object.values(MainParser.CityEntities).filter(obj => (obj['strategy_points_for_upgrade'] !== undefined));
            }

            let Entity = GreatBuildings.GreatBuildingEntityCache.find(obj => (obj['name'] === Event['great_building_name']))
            if (!Entity) continue;

            let EraName = GreatBuildings.GetEraName(Entity['asset_id']),
                Era = Technologies.Eras[EraName],
                Rank = Event['rank'],
                Level = Event['level'] - 1,
                Reward = GreatBuildings.Rewards[Era][Level];

            if (Rank > 5) continue;

            let Maezen = GreatBuildings.GetMaezen(Reward, MainParser.ArkBonus);
            let FPReward = Maezen[Rank - 1];

            GreatBuildings.FPRewards += FPReward;
        }
    },

    RefreshDetailsVisible: (Index) => {
        $('#greatbuildings tr.gbdetailsrow').each(function () {
            let Data = $(this).data()['value'];
            if (Data !== Index) return;

            if (GreatBuildings.DetailsVisible[Index]) {
                $(this).show();
            }
            else {
                $(this).hide();
            }
        });
    },
};