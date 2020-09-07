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
        0: [5, 10, 15, 20, 30, 35, 45, 50, 60, 65, 75, 85, 95, 100, 110, 120, 130, 140, 150, 155, 165, 175, 185, 195, 205, 215, 225, 235, 245, 255, 265, 275, 285, 300, 310, 320, 330, 340, 350, 365, 375, 385, 395, 405, 420, 430, 440, 450, 465, 475, 485, 500, 510, 520, 535, 545, 555, 570, 580, 590, 605, 615, 630, 640, 650, 665, 675, 690, 700, 715, 725, 735, 750, 760, 775, 785, 800, 810, 825, 835, 850, 860, 875, 890, 900, 915, 925, 940, 950, 965, 975, 990, 1005, 1015, 1030, 1040, 1055, 1070, 1080, 1095, 1110, 1120, 1135, 1150, 1160, 1175, 1190, 1200, 1215, 1230, 1240, 1255, 1270, 1280, 1295, 1310, 1325, 1335, 1350],
        2: [5, 10, 10, 15, 25, 30, 35, 40, 45, 55, 60, 65, 75, 80, 85, 95, 100, 110, 115, 125, 130, 140, 145, 155, 160, 170, 180, 185, 195, 200, 210, 220, 225, 235, 245, 250, 260, 270, 275, 285, 295, 300, 310, 320, 330, 340, 345, 355, 365, 375, 380, 390, 400, 410, 420, 430, 440, 445, 455, 465, 475, 485, 495, 505, 510, 520, 530, 540, 550, 560, 570, 580, 590, 600, 610, 620, 630, 640, 650, 660, 670, 680, 690, 700, 710, 720, 730, 740, 750, 760, 770, 780, 790, 800, 810, 820, 830, 840, 850, 860, 870, 880, 890, 905, 915, 925, 935, 945, 955, 965, 975, 985, 995, 1010, 1020, 1030, 1040, 1050, 1060, 1070, 1085, 1095, 1105, 1115, 1125, 1135, 1150, 1160, 1170, 1180, 1190, 1200, 1215, 1225, 1235, 1245, 1255, 1270, 1280, 1290, 1300, 1310, 1325, 1335, 1345, 1355, 1370, 1380, 1390, 1400, 1415, 1425, 1435, 1445, 1460, 1470, 1480, 1490, 1505],
        3: [5, 10, 15, 20, 25, 30, 40, 45, 50, 60, 65, 70, 80, 85, 95, 105, 110, 120, 125, 135, 145, 150, 160, 170, 175, 185, 195, 200, 210, 220, 230, 240, 245, 255, 265, 275, 285, 290, 300, 310, 320, 330, 340, 350, 360, 370, 380, 390, 400, 405, 415, 425, 435, 450, 455, 465, 475, 485, 495, 510, 520, 530, 540, 550, 560, 570, 580, 590, 600, 610, 620, 630, 645, 655, 665, 675, 685, 695, 705, 720, 730, 740, 750, 760, 775, 785, 795, 805, 815, 825, 840, 850, 860, 870, 885, 895, 905, 915, 930, 940, 950, 960, 975, 985, 995, 1010, 1020, 1030, 1040, 1055, 1065, 1075, 1090, 1100, 1110, 1125, 1135, 1145, 1160, 1170, 1180, 1195, 1205, 1215],
        4: [5, 10, 15, 20, 25, 35, 40, 50, 55, 65, 70, 80, 85, 95, 100, 110, 120, 130, 135, 145, 155, 165, 175, 180, 190, 200, 210, 220, 230, 240, 250, 255, 265, 275, 285, 295, 305, 315, 325, 335, 345, 360, 370, 380, 390, 400, 410, 420, 430, 440, 450, 465, 475, 485, 495, 505, 515, 525, 540, 550, 560, 570, 585, 595, 605, 615, 625, 640, 650, 660, 675, 685, 695, 705, 720, 730, 740, 755, 765, 775, 790, 800, 810, 825, 835, 850, 860, 875, 885, 895, 910, 920, 930, 945, 955, 970, 980, 995, 1005, 1015, 1030, 1040, 1055, 1065, 1080, 1090, 1105, 1115, 1130, 1140, 1155, 1165, 1180, 1190, 1205, 1215, 1230, 1240, 1255, 1265, 1280, 1290, 1305, 1320, 1330, 1345, 1355, 1370, 1380, 1395, 1405, 1420, 1435, 1445, 1460, 1475, 1485, 1500, 1510, 1525, 1540, 1550, 1565, 1575, 1590, 1605, 1615],
        5: [5, 10, 15, 20, 30, 35, 45, 50, 60, 65, 75, 85, 95, 100, 110, 120, 130, 140, 150, 155, 165, 175, 185, 195, 205, 215, 225, 235, 245, 255, 265, 275, 285, 300, 310, 320, 330, 340, 350, 365, 375, 385, 395, 405, 420, 430, 440, 450, 465, 475, 485, 500, 510, 520, 535, 545, 555, 570, 580, 590, 605, 615, 630, 640, 650, 665, 675, 690, 700, 715, 725, 735, 750, 760, 775, 785, 800, 810, 825, 835, 850, 860, 875, 890, 900, 915, 925, 940, 950, 965, 975, 990, 1005, 1015, 1030, 1040, 1055, 1070, 1080, 1095, 1110, 1120, 1135, 1150, 1160, 1175, 1190, 1200, 1215, 1230, 1240, 1255, 1270, 1280, 1295, 1310, 1325, 1335, 1350],
        6: [5, 10, 15, 25, 30, 40, 45, 55, 65, 70, 80, 90, 100, 110, 120, 125, 140, 150, 155, 170, 180, 190, 200, 210, 220, 230, 240, 250, 265, 275, 285, 295, 310, 320, 330, 340, 355, 365, 375, 390, 400, 410, 425, 435, 450, 460, 470, 485, 495, 510, 520, 535, 545, 560, 570, 585, 595, 610, 620, 635, 645, 660, 670, 685, 700, 710, 725, 735, 750, 765, 775, 790, 805, 815, 830, 845, 855, 870, 885, 895, 910, 925, 935, 950, 965, 980, 990, 1005, 1020, 1035, 1045, 1060, 1075, 1090, 1105, 1115, 1130, 1145, 1160, 1175, 1185, 1200, 1215, 1230, 1245, 1260, 1275, 1285, 1300, 1315, 1330, 1345, 1360, 1375, 1390, 1405, 1415, 1430, 1445, 1460, 1475, 1490, 1505, 1520, 1535, 1550, 1565, 1580, 1595, 1610, 1625, 1640, 1655, 1670, 1685, 1700, 1715, 1730, 1745, 1760, 1775, 1790, 1805, 1820, 1835, 1850, 1865, 1880, 1895, 1910],
        7: [5, 10, 15, 25, 35, 40, 50, 60, 65, 75, 85, 95, 105, 115, 125, 135, 145, 155, 170, 180, 190, 200, 210, 225, 235, 245, 260, 270, 280, 295, 305, 315, 330, 340, 350, 365, 375, 390, 400, 415, 425, 440, 450, 465, 480, 490, 505, 515, 530, 540, 555, 570, 580, 595, 610, 620, 635, 650, 665, 675, 690, 705, 715, 730, 745, 760, 775, 785, 800, 815, 830, 840, 855, 870, 885, 900, 915, 930, 940, 955, 970, 985, 1000, 1015, 1030, 1045, 1060, 1075, 1090, 1100, 1115, 1130, 1145, 1160, 1175, 1190, 1205, 1220, 1235, 1250, 1265, 1280, 1295, 1310, 1325, 1345, 1355, 1375, 1390, 1405, 1420],
        8: [10, 10, 20, 25, 35, 45, 50, 60, 70, 80, 90, 100, 115, 120, 135, 145, 155, 165, 180, 190, 200, 215, 225, 235, 250, 260, 275, 285, 300, 310, 325, 335, 350, 360, 375, 390, 400, 415, 425, 440, 455, 465, 480, 495, 505, 520, 535, 550, 560, 575, 590, 605, 620, 635, 645, 660, 675, 690, 705, 720, 735, 745, 760, 775, 790, 805, 820, 835, 850, 865, 880, 895, 910, 925, 940, 955, 970, 985, 1000, 1015, 1030, 1045, 1065, 1075, 1095, 1110, 1125, 1140, 1155, 1170, 1185, 1200, 1220, 1235, 1250, 1265, 1280, 1300, 1315, 1330, 1345, 1360, 1375, 1395, 1410, 1425, 1440],
        9: [10, 10, 20, 30, 35, 45, 55, 65, 75, 85, 95, 105, 120, 130, 140, 155, 165, 175, 190, 200, 215, 225, 240, 250, 265, 275, 290, 300, 315, 330, 340, 355, 370, 385, 395, 410, 425, 440, 450, 465, 480, 495, 510, 525, 535, 550, 565, 580, 595, 610, 625, 640, 655, 670, 685, 700, 715, 730, 745, 760, 775, 790, 805, 820, 835, 855, 870, 885, 900, 915, 930, 945, 965, 980, 995, 1010, 1025, 1045, 1060, 1075, 1090, 1110, 1125, 1140, 1160, 1175, 1190, 1205, 1225, 1240, 1255, 1275, 1290, 1305, 1325, 1340, 1355, 1375, 1390, 1410, 1425, 1440, 1460, 1475, 1490, 1510, 1525, 1545, 1560, 1580, 1595, 1615, 1630, 1650, 1665, 1685, 1700, 1715, 1735, 1755, 1770, 1790, 1805, 1825, 1840, 1860, 1875, 1895, 1915, 1930, 1950, 1965, 1985, 2000, 2020, 2040, 2055, 2075, 2095, 2110, 2130, 2145, 2165, 2185, 2200, 2220, 2240, 2255, 2275, 2295, 2310, 2330, 2350, 2365, 2385, 2405, 2420, 2440, 2460, 2480, 2495, 2515, 2535, 2555, 2570, 2590, 2610, 2630, 2645, 2665, 2685, 2705, 2720, 2740, 2760, 2780, 2800, 2815, 2835, 2855],
        10: [10, 10, 20, 30, 40, 50, 60, 70, 80, 90, 100, 115, 125, 135, 150, 160, 175, 185, 200, 210, 225, 240, 250, 265, 280, 290, 305, 320, 335, 345, 360, 375, 390, 405, 420, 430, 450, 460, 475, 490, 505, 520, 535, 550, 565, 580, 600, 615, 630, 645, 660, 675, 690, 705, 725, 740, 755, 770, 785, 800, 820, 835, 850, 870, 885, 900, 915, 935, 950, 965, 985, 1000, 1015, 1035, 1050, 1065, 1085, 1100, 1120, 1135, 1150, 1170, 1185, 1205, 1220, 1240, 1255, 1275, 1290, 1310, 1325, 1345, 1360, 1380, 1395, 1415, 1430, 1450, 1470, 1485, 1505, 1520, 1540, 1555, 1575, 1595, 1610, 1630, 1650, 1665],
        11: [10, 10, 20, 30, 40, 50, 60, 75, 85, 95, 110, 120, 130, 145, 155, 170, 185, 195, 210, 225, 235, 250, 265, 280, 295, 305, 320, 335, 350, 365, 380, 395, 410, 425, 440, 455, 470, 485, 500, 515, 535, 550, 565, 580, 595, 615, 630, 645, 660, 675, 695, 710, 725, 745, 760, 775, 795, 810, 830, 845, 860, 880, 895, 915, 930, 945, 965, 985, 1000, 1020, 1035, 1050, 1070, 1090, 1105, 1125, 1140, 1160, 1175, 1195, 1215, 1230, 1250, 1265, 1285, 1305, 1320, 1340, 1360, 1375, 1395, 1415, 1435, 1450, 1470, 1490, 1510, 1525, 1545, 1565, 1585, 1600, 1620, 1640, 1660, 1680, 1695, 1715, 1735, 1755, 1775, 1790, 1810, 1830, 1850, 1870, 1890, 1910, 1930, 1950, 1965, 1985, 2005, 2025, 2045, 2065, 2085, 2105, 2125, 2145, 2165, 2185, 2205, 2225, 2245, 2265, 2285, 2305],
        12: [10, 15, 20, 30, 40, 55, 65, 75, 85, 100, 115, 125, 140, 150, 165, 180, 190, 205, 220, 235, 250, 265, 280, 290, 305, 320, 335, 355, 365, 385, 400, 415, 430, 445, 460, 480, 495, 510, 525, 545, 560, 575, 590, 610, 625, 645, 660, 675, 695, 710, 730, 745, 765, 780, 800, 815, 835, 850, 870, 885, 905, 920, 940, 960, 975, 995, 1015, 1030, 1050, 1070, 1085, 1105, 1125, 1140, 1160, 1180, 1200, 1215, 1235, 1255, 1275, 1290, 1310, 1330, 1350, 1370, 1390, 1410, 1425, 1445, 1465, 1485, 1505, 1525, 1545, 1565, 1580, 1600, 1625, 1640, 1660, 1680, 1700, 1720, 1740, 1760, 1780, 1800, 1820, 1840, 1860, 1880, 1900, 1920, 1945, 1965, 1985, 2005, 2025, 2045, 2065, 2085, 2105, 2125, 2150, 2170, 2190, 2210],
        13: [10, 15, 20, 35, 45, 55, 65, 80, 90, 105, 120, 130, 145, 160, 175, 185, 200, 215, 230, 245, 260, 275, 290, 305, 320, 335, 355, 370, 385, 400, 420, 435, 450, 465, 485, 500, 515, 535, 550, 570, 585, 605, 620, 640, 655, 675, 690, 710, 730, 745, 765, 780, 800, 820, 835, 855, 875, 890, 910, 930, 945, 965, 985, 1005, 1025, 1040, 1060, 1080, 1100, 1120, 1140, 1155, 1175, 1195, 1215, 1235, 1255, 1275, 1295, 1315, 1335, 1355, 1375, 1395, 1415, 1435, 1455, 1475, 1495, 1515, 1535, 1555, 1575, 1595, 1615, 1640, 1660, 1680, 1700, 1720, 1740, 1760, 1780, 1805],
        14: [10, 15, 25, 35, 45, 60, 70, 85, 95, 110, 120, 135, 150, 165, 180, 195, 210, 225, 240, 255, 270, 290, 305, 320, 335, 355, 370, 385, 405, 420, 435, 455, 470, 490, 505, 525, 540, 560, 575, 595, 615, 630, 650, 670, 685, 705, 725, 740, 760, 780, 800, 815, 835, 855, 875, 895, 915, 930, 950, 970, 990, 1010, 1030, 1050, 1070, 1090, 1110, 1130, 1150, 1170, 1190, 1210, 1230, 1250, 1270, 1290, 1310, 1335, 1355, 1375, 1395, 1415, 1435, 1455, 1480, 1500, 1520, 1540, 1560, 1585, 1605, 1625, 1645, 1670, 1690, 1710, 1735, 1755, 1775, 1800, 1820, 1840, 1865, 1885, 1905, 1930, 1950, 1975, 1995, 2015, 2040, 2060, 2085, 2105, 2130, 2150, 2170, 2195, 2215, 2240, 2260, 2285, 2305, 2330, 2350, 2375, 2395, 2420, 2445, 2465, 2490, 2510, 2535, 2555, 2580, 2605, 2625, 2650, 2675, 2695, 2720, 2740, 2765, 2790, 2810, 2835, 2860, 2880, 2905, 2930, 2950, 2975, 3000, 3025, 3050, 3070, 3095, 3120, 3140, 3165, 3190, 3215, 3235, 3260, 3285, 3310, 3335, 3355, 3380, 3405, 3430, 3455, 3480, 3500, 3525, 3550, 3575, 3600, 3625, 3650, 3670],
        15: [10, 15, 25, 35, 45, 60, 75, 85, 100, 115, 130, 145, 160, 170, 190, 205, 220, 235, 250, 265, 285, 300, 315, 335, 350, 370, 385, 400, 420, 440, 455, 475, 490, 510, 525, 545, 565, 585, 600, 620, 640, 660, 675, 695, 715, 735, 755, 775, 795, 815, 830, 850, 870, 895, 910, 930, 950, 970, 995, 1015, 1035, 1055, 1075, 1095, 1115, 1135, 1155, 1180, 1200, 1220, 1240, 1260, 1285, 1305, 1325, 1350, 1370, 1390, 1410, 1435, 1455, 1475, 1500, 1520, 1545, 1565, 1585, 1610, 1630, 1650, 1675, 1695, 1720, 1740, 1765, 1785, 1810, 1830, 1855, 1875, 1900, 1920, 1945, 1965, 1990, 2015, 2035, 2060, 2080, 2105, 2125, 2150, 2175, 2195, 2220, 2245, 2265, 2290, 2315, 2335, 2360, 2385, 2405, 2430, 2455, 2480, 2500, 2525, 2550, 2575, 2595, 2620, 2645, 2670, 2690, 2715, 2740, 2765, 2790, 2815, 2835, 2860, 2885, 2910, 2935, 2960, 2985, 3010, 3030, 3055, 3080, 3105, 3130, 3155, 3180, 3205],
        16: [10, 15, 25, 35, 50, 65, 75, 90, 105, 120, 135, 150, 165, 180, 195, 210, 230, 245, 260, 280, 295, 310, 330, 350, 365, 385, 400, 420, 440, 455, 475, 495, 510, 530, 550, 570, 590, 605, 625, 645, 665, 685, 705, 725, 745, 765, 785, 805, 825, 845, 865, 890, 910, 930, 950, 970, 990, 1015, 1035, 1055, 1075, 1100, 1120, 1140, 1160, 1185, 1205, 1225, 1250, 1270, 1295, 1315, 1335, 1360, 1380, 1405, 1425, 1450, 1470, 1495, 1515, 1540, 1560, 1585, 1605, 1630, 1650, 1675, 1700, 1720, 1745, 1770, 1790, 1815, 1835, 1860, 1885, 1905, 1930, 1955, 1980, 2000, 2025, 2050, 2070, 2095, 2120, 2145, 2170, 2190, 2215, 2240, 2265, 2290, 2310, 2335],
        17: [10, 15, 25, 40, 50, 65, 80, 95, 110, 125, 140, 155, 170, 185, 205, 220, 235, 255, 270, 290, 305, 325, 345, 360, 380, 400, 415, 435, 455, 475, 495, 510, 530, 550, 570, 590, 610, 630, 650, 670, 690, 715, 735, 755, 775, 795, 815, 840, 860, 880, 900, 925, 945, 965, 990, 1010, 1030, 1055, 1075, 1095, 1120, 1140, 1165, 1185, 1210, 1230, 1255, 1275, 1300, 1320, 1345, 1365, 1390, 1415, 1435, 1460, 1485, 1505, 1530, 1555, 1575, 1600, 1625, 1645, 1670, 1695, 1720, 1745, 1765, 1790, 1815, 1840, 1860, 1885, 1910, 1935, 1960, 1985, 2010, 2030, 2055, 2080, 2105, 2130, 2155, 2180, 2205, 2230, 2255, 2280, 2305, 2330, 2355, 2380, 2405, 2430, 2455, 2480, 2505, 2530, 2555, 2580, 2610, 2635, 2660, 2685, 2710],
        18: [10, 15, 25, 40, 55, 70, 80, 95, 115, 125, 145, 160, 175, 195, 210, 230, 245, 265, 280, 300, 320, 335, 355, 375, 395, 415, 435, 455, 470, 490, 510, 535, 550, 575, 595, 615, 635, 655, 675, 700, 720, 740, 760, 785, 805, 825, 850, 870, 890, 915, 935, 960, 980, 1005, 1025, 1050, 1070, 1095, 1115, 1140, 1160, 1185, 1210, 1230, 1255, 1280, 1300, 1325, 1350, 1370, 1395, 1420, 1445, 1470, 1490, 1515, 1540, 1565, 1590, 1615, 1635, 1660, 1685, 1710, 1735, 1760, 1785, 1810, 1835, 1860, 1885, 1910, 1935, 1960, 1985, 2010, 2035, 2060, 2085, 2110, 2135, 2160, 2185, 2215, 2240, 2265],
        19: [10, 15, 30, 40, 55, 70, 85, 100, 115, 130, 150, 165, 185, 200, 220, 235, 255, 275, 295, 310, 330, 350, 370, 390, 410, 430, 450, 470, 490, 510, 530, 550, 575, 595, 615, 635, 660, 680, 700, 725, 745, 770, 790, 810, 835, 855, 880, 905, 925, 950, 970, 995, 1015, 1040, 1065, 1085, 1110, 1135, 1160, 1180, 1205, 1230, 1255, 1275, 1300, 1325, 1350, 1375, 1400, 1425, 1450, 1470, 1500, 1520, 1545, 1570, 1595, 1620, 1650, 1670, 1685],
    },

    FPGreatBuildings: [
        { 'ID': 'X_EarlyMiddleAge_Landmark1', 'GoodCosts': 20, 'Productions': [1, 1, 2, 2, 3, 3, 4, 4, 5, 6] }, //Hagia 
        { 'ID': 'X_LateMiddleAge_Landmark3', 'GoodCosts': 30, 'Productions': [1, 1, 2, 2, 3, 3, 4, 4, 5, 6] }, //Castel del Monte
        { 'ID': 'X_PostModernEra_Landmark1', 'GoodCosts': 75, 'Productions': [2, 2, 3, 4, 5, 6, 6, 7, 8, 10] }, //Cape
        { 'ID': 'X_ContemporaryEra_Landmark2', 'GoodCosts': 100, 'Productions': [1, 1, 2, 2, 3, 3, 4, 4, 5, 6] }, //Inno Tower
        { 'ID': 'X_FutureEra_Landmark1', 'GoodCosts': 150, 'Productions': [0.1, 0.12, 0.14, 0.17, 0.19, 0.22, 0.24, 0.26, 0.28, 0.31, 0.32, 0.33, 0.34, 0.35, 0.36, 0.37, 0.38, 0.39, 0.4, 0.41, 0.42, 0.43, 0.44, 0.45, 0.46, 0.47, 0.48, 0.49, 0.5, 0.51, 0.52, 0.53, 0.54, 0.55, 0.56, 0.57, 0.58, 0.59, 0.6, 0.61, 0.62, 0.63, 0.64, 0.65, 0.66, 0.67, 0.68, 0.69, 0.7, 0.71, 0.72, 0.73, 0.74, 0.75, 0.76, 0.77, 0.78, 0.79, 0.795, 0.8, 0.805, 0.81, 0.815, 0.82, 0.825, 0.83, 0.835, 0.84, 0.845, 0.85, 0.855, 0.86, 0.865, 0.87, 0.875, 0.88, 0.885, 0.89, 0.895, 0.9, 0.901, 0.902, 0.903, 0.904, 0.905, 0.906, 0.907, 0.908, 0.909, 0.91, 0.911, 0.912, 0.913, 0.914, 0.915, 0.916, 0.917, 0.918, 0.919, 0.92, 0.921, 0.922, 0.923, 0.924, 0.925, 0.926, 0.927, 0.928, 0.929, 0.93, 0.931, 0.932, 0.933, 0.934, 0.935, 0.936, 0.937, 0.938, 0.939, 0.94, 0.941, 0.942, 0.943, 0.944, 0.945, 0.946, 0.947, 0.948, 0.949, 0.95, 0.951, 0.952, 0.953, 0.954, 0.955, 0.956, 0.957, 0.958, 0.959, 0.96, 0.961, 0.962, 0.963, 0.964, 0.965, 0.966, 0.967, 0.968, 0.969, 0.97, 0.971, 0.972, 0.973, 0.974, 0.975, 0.976, 0.977, 0.978, 0.979, 0.98, 0.981, 0.982, 0.983, 0.984, 0.985, 0.986, 0.987, 0.988, 0.989, 0.99, 0.991, 0.992, 0.993, 0.994, 0.995, 0.996, 0.997, 0.998, 0.999, 1, 1] }, //Arche
        { 'ID': 'X_ArcticFuture_Landmark2', 'GoodCosts': 200, 'Productions': [2, 2, 3, 4, 5, 6, 6, 7, 8, 10] }, //Arctic Orangerie
        { 'ID': 'X_OceanicFuture_Landmark2', 'GoodCosts': 300, 'Productions': [1, 1, 3, 3, 4, 4, 5, 5, 6, 8] }, //Kraken
        { 'ID': 'X_VirtualFuture_Landmark2', 'GoodCosts': 500, 'Productions': [5.18, 6.66, 8.14, 9.62, 13.875, 15.725, 17.575, 19.425, 21.275, 23.125, 23.6985, 24.28125, 24.85475, 25.42825, 26.00175, 31.8792, 32.5563, 33.2223, 33.8883, 34.5432, 35.1981, 35.8308, 36.4635, 37.0851, 37.6956, 38.295, 38.8833, 46.03725, 46.6977, 47.33225, 47.9668, 48.57545, 49.1841, 49.76685, 50.3237, 50.88055, 51.42445, 51.94245, 52.4475, 52.9396, 61.05, 61.568, 62.0712, 62.5744, 63.048, 63.5068, 63.9508, 64.3652, 64.7796, 65.1792, 65.564, 65.934, 66.2744, 66.6148, 66.9404, 67.2512, 67.562, 76.3236, 76.63995, 76.93965, 77.2227, 77.4891, 77.7555, 78.00525, 78.255, 78.47145, 78.70455, 78.90435, 79.10415, 79.30395, 79.4871, 79.6536, 79.83675, 79.9866, 80.13645, 80.2863, 80.43615, 80.56935, 80.6859, 80.80245, 80.919, 81.03555, 81.13545, 79.57035, 81.33525, 81.43515, 81.5184, 81.60165, 81.6849, 81.7515, 90.909, 90.983, 91.057, 91.131, 91.205, 91.2605, 91.316, 91.3715, 91.427, 91.4825, 91.538, 91.575, 91.6305, 91.6675, 91.7045, 91.7415, 91.7785, 91.8155, 91.8525, 91.8895, 91.908, 91.945, 91.9635, 92.0005, 92.019, 92.0375, 92.056, 92.093, 92.1115, 92.13, 92.1485, 92.167, 92.167, 92.1855, 92.204, 92.2225, 92.241] }, //Himeji
        { 'ID': 'X_SpaceAgeAsteroidBelt_Landmark1', 'GoodCosts': 1000, 'Productions': [5.18, 6.66, 8.14, 9.62, 13.875, 15.725, 17.575, 19.425, 21.275, 23.125, 23.6985, 24.28125, 24.85475, 25.42825, 26.00175, 31.8792, 32.5563, 33.2223, 33.8883, 34.5432, 35.1981, 35.8308, 36.4635, 37.0851, 37.6956, 38.295, 38.8833, 46.03725, 46.6977, 47.33225, 47.9668, 48.57545, 49.1841, 49.76685, 50.3237, 50.88055, 51.42445, 51.94245, 52.4475, 52.9396, 61.05, 61.568, 62.0712, 62.5744, 63.048, 63.5068, 63.9508, 64.3652, 64.7796, 65.1792, 65.564, 65.934, 66.2744, 66.6148, 66.9404, 67.2512, 67.562, 76.3236, 76.63995, 76.93965, 77.2227, 77.4891, 77.7555, 78.00525, 78.255, 78.47145, 78.70455, 78.90435, 79.10415, 79.30395, 79.4871, 79.6536, 79.83675, 79.9866, 80.13645, 80.2863, 80.43615, 80.56935, 80.6859, 80.80245, 80.919, 81.03555, 81.13545, 79.57035, 81.33525, 81.43515, 81.5184, 81.60165, 81.6849, 81.7515, 90.909, 90.983, 91.057, 91.131, 91.205, 91.2605, 91.316, 91.3715, 91.427, 91.4825, 91.538, 91.575, 91.6305, 91.6675, 91.7045, 91.7415, 91.7785, 91.8155, 91.8525, 91.8895, 91.908, 91.945, 91.9635, 92.0005, 92.019, 92.0375, 92.056, 92.093, 92.1115, 92.13, 92.1485, 92.167, 92.167, 92.1855, 92.204, 92.2225, 92.241] }, //Space Carrier
        { 'ID': 'X_OceanicFuture_Landmark3', 'GoodCosts': 300, 'Productions': [0.17, 0.19, 0.21, 0.23, 0.25, 0.27, 0.29, 0.3, 0.31, 0.32, 0.33, 0.34, 0.35, 0.35, 0.36, 0.37, 0.38, 0.38, 0.39, 0.4, 0.4, 0.41, 0.42, 0.42, 0.43, 0.43, 0.44, 0.45, 0.45, 0.46, 0.47, 0.47, 0.48, 0.49, 0.49, 0.5, 0.5, 0.51, 0.52, 0.52, 0.53, 0.53, 0.54, 0.54, 0.55, 0.55, 0.56, 0.56, 0.57, 0.57, 0.58, 0.58, 0.59, 0.59, 0.6, 0.6, 0.61, 0.61, 0.61, 0.62, 0.62, 0.62, 0.63, 0.63, 0.64, 0.64, 0.64, 0.65, 0.65, 0.65, 0.65, 0.66, 0.66, 0.66, 0.67, 0.67, 0.67, 0.67, 0.68, 0.68, 0.68, 0.68, 0.69, 0.69, 0.69, 0.69, 0.69, 0.69, 0.7, 0.7, 0.7], Charges: [4, 4, 5, 5, 5, 5, 5, 5, 6, 6, 6, 6, 6, 6, 7, 7, 7, 7, 7, 8, 8, 8, 8, 8, 8, 9, 9, 9, 9, 9, 9, 10, 10, 10, 10, 10, 10, 11, 11, 11, 11, 11, 11, 11, 12, 12, 12, 12, 12, 12, 12, 12, 12, 13, 13, 13, 13, 13, 13, 13, 13, 13, 13, 13, 13, 13, 14, 14, 14, 14, 14, 14, 14, 14, 14, 14, 14, 14, 14, 14, 14, 14, 14, 14, 14, 14, 14, 14, 14, 14, 15]}, // Blue Galaxy
    ],

    BlueGalaxyStaticFPs: { // Durchschnitts FP pro Tag für großen Leuchtturm
        'R_MultiAge_SummerBonus19a': 0.2,
        'R_MultiAge_SummerBonus19b': 1.4,
        'R_MultiAge_SummerBonus19c': 2.75,
        'R_MultiAge_SummerBonus19d': 4,
        'R_MultiAge_SummerBonus19e': 6.1,
        'R_MultiAge_SummerBonus19f': 7.8,
        'R_MultiAge_SummerBonus19g': 10,
        'R_MultiAge_SummerBonus19h': 12.8,
    },

    ForderBonus: 90,
    RewardPerDay: 0,
    FPPerTile: 0.2,
    HideNewGBs: false,

    GreatBuildingEntityCache: null,
    FPRewards: 0,
    EventDict: {},
    FPBuildings: [],
    
	/**
	 * Zeigt die Box an oder schließt sie
	 */
    Show: () => {
        if ($('#greatbuildings').length === 0) {

            let ForderBonus = localStorage.getItem('GreatBuildingsForderBonus');
            if (ForderBonus !== null) {
                GreatBuildings.ForderBonus = parseFloat(ForderBonus);
            }

            for (let i = 0; i < GreatBuildings.FPGreatBuildings.length; i++) {
                let GoodCosts = localStorage.getItem('GreatBuildingsGoodCosts' + i);
                if (GoodCosts !== null) {
                    GreatBuildings.FPGreatBuildings[i]['GoodCosts'] = parseFloat(GoodCosts);
                }
            }

            let FPPerTile = localStorage.getItem('GreatBuildingsFPPerTile');
            if (FPPerTile != null) {
                GreatBuildings.FPPerTile = parseFloat(FPPerTile);
            }

            GreatBuildings.RewardPerDay = Math.round(GreatBuildings.FPRewards / 6);

            HTML.Box({
                id: 'greatbuildings',
                title: i18n('Boxes.GreatBuildings.Title'),
                ask: i18n('Boxes.GreatBuildings.HelpLink'),
                auto_close: true,
                dragdrop: true,
                minimize: true
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

            for (let i = 0; i < GreatBuildings.FPGreatBuildings.length; i++) {
                $('#greatbuildings').on('blur', '#GreatBuildingsGoodCosts' + i, function () {
                    GreatBuildings.FPGreatBuildings[i].GoodCosts = parseFloat($('#GreatBuildingsGoodCosts' + i).val());
                    if (isNaN(GreatBuildings.FPGreatBuildings[i].GoodCosts)) GreatBuildings.FPGreatBuildings[i].GoodCosts = 0;
                    localStorage.setItem('GreatBuildingsGoodCosts' + i, GreatBuildings.FPGreatBuildings[i].GoodCosts);
                    GreatBuildings.CalcBody();
                });
            }

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
        h.push('<br>')
        h.push(i18n('Boxes.GreatBuildings.ArcBonus') + ' ');
        h.push('<input type="number" id="costFactor" step="0.1" min="12" max="200" value="' + GreatBuildings.ForderBonus + '">% ');
        h.push('<br><br>')
        h.push('<input id="HideNewGBs" class="hidenewgbs game-cursor" ' + (GreatBuildings.HideNewGBs ? 'checked' : '') + ' type="checkbox">');
        h.push(i18n('Boxes.GreatBuildings.HideNewGBs'));
        h.push('<br>');
        h.push(i18n('Boxes.GreatBuildings.FPPerTile') + ' ');
        h.push('<input type="number" id="fpPerTile" step="0.01" min="0" max="1000" value="' + GreatBuildings.FPPerTile + '" title="' + i18n('Boxes.GreatBuildings.TTFPPerTile') + '">');
        h.push('<br>');
        h.push(i18n('Boxes.GreatBuildings.RewardPerDay') + ' ');
        h.push('<input type="number" id="rewardPerDay" step="1" min="0" max="1000000" value="' + GreatBuildings.RewardPerDay + '" title="' + i18n('Boxes.GreatBuildings.TTRewardPerDay') + '">');
        h.push('<br><br>');
        h.push(i18n('Boxes.GreatBuildings.SuggestionDescription'));
        h.push('</div>');
    
        h.push('<table class="foe-table">');

        h.push('<thead>' +
            '<tr>' +
                '<th>' + i18n('Boxes.GreatBuildings.GreatBulding') + '</th>' +
                '<th>' + i18n('Boxes.GreatBuildings.Level') + '</th>' +
                '<th>' + i18n('Boxes.GreatBuildings.Cost') + '</th>' +
                '<th>' + i18n('Boxes.GreatBuildings.DailyFP') + '</th>' +
                '<th>' + i18n('Boxes.GreatBuildings.CostPerDailyFP') + '</th>' +
                '<th title="' + i18n('Boxes.GreatBuildings.TTGoodCostsColumn') + '">' + i18n('Boxes.GreatBuildings.FPCostGoods') + '</th>' +
            '</tr>' +
        '</thead>');

        let CurrentCityMapData = (LastMapPlayerID === ExtPlayerID ? MainParser.CityMapData : MainParser.OtherPlayerCityMapData);

        let ROIResults = [],
            ROIResults2 = [],
            ShowGoodCosts = [];

        for (let i = 0; i < GreatBuildings.FPGreatBuildings.length; i++) {
            if (GreatBuildings.FPGreatBuildings[i].ID === 'X_OceanicFuture_Landmark3') {
                if (LastMapPlayerID == ExtPlayerID) {
                    GreatBuildings.RefreshFPBuildings();
                }
                else { // Keine Galaxy für andere Spieler weil keine FP Daten vorhanden sind
                    continue;
                }                                  
            }

            let CityEntity = MainParser.CityEntities[GreatBuildings.FPGreatBuildings[i].ID];
            let OwnGB = Object.values(CurrentCityMapData).find(obj => (obj['cityentity_id'] === GreatBuildings.FPGreatBuildings[i].ID));;          
            let EraName = GreatBuildings.GetEraName(CityEntity['asset_id']);
            let Era = Technologies.Eras[EraName];
            let DoubleCollection = (GreatBuildings.FPGreatBuildings[i].ID !== 'X_FutureEra_Landmark1');

            let NettoCosts = [];
            for (let j = 0; j < GreatBuildings.Rewards[Era].length; j++) {
                let P1 = GreatBuildings.Rewards[Era][j];
                P1 = (P1 !== undefined ? P1 : 0);

                let Maezen = GreatBuildings.GetMaezen(P1, GreatBuildings.ForderBonus);
                NettoCosts[j] = GreatBuildings.GetBruttoCosts(GreatBuildings.FPGreatBuildings[i].ID, j) - Maezen[0] - Maezen[1] - Maezen[2] - Maezen[3] - Maezen[4];
            }

            let Productions = [];
            for (let j = 0; j < GreatBuildings.Rewards[Era].length; j++) {
                if (GreatBuildings.FPGreatBuildings[i].Productions.length > 10 || j < 10) {
                    if (GreatBuildings.FPGreatBuildings[i].ID === 'X_FutureEra_Landmark1') { // Arche
                        let arc = 1 + MainParser.ArkBonus / 100;
                        Productions[j] = GreatBuildings.FPGreatBuildings[i].Productions[j] * GreatBuildings.RewardPerDay / arc;
                    }
                    else {
                        Productions[j] = GreatBuildings.FPGreatBuildings[i].Productions[j];
                    }
                }
                else {
                    Productions[j] = Math.floor(GreatBuildings.FPGreatBuildings[i].Productions[9] * (j + 1) / 10);
                }
            }

            let Charges = GreatBuildings.FPGreatBuildings[i].ID === 'X_OceanicFuture_Landmark3' ? GreatBuildings.FPGreatBuildings[i].Charges : undefined;

            let CurrentLevel = (OwnGB !== undefined ? OwnGB['level'] : -1);

            let Size = CityEntity['length'] * CityEntity['width'];
            let ROIResult = GreatBuildings.GetROIValues(CurrentLevel, NettoCosts, Productions, Size * GreatBuildings.FPPerTile, GreatBuildings.FPGreatBuildings[i].GoodCosts, DoubleCollection, Charges);    

            let ROIResult2;
            if (ROIResult['BestLevel'] < 10) {
                ROIResult2 = ROIResult;
                while (ROIResult2['BestLevel'] < 10) {
                    ROIResult2 = GreatBuildings.GetROIValues(ROIResult2['BestLevel'] + 1, NettoCosts, Productions, Size * GreatBuildings.FPPerTile, GreatBuildings.FPGreatBuildings[i].GoodCostsm, DoubleCollection, Charges);
                }
            }
            else {
                ROIResult2 = undefined;
            }

            ROIResults[i] = ROIResult;
            ROIResults2[i] = ROIResult2;
            ShowGoodCosts[i] = CurrentLevel === -1;
        }

        let ROIResultMap = [];
        for(let i = 0; i < GreatBuildings.FPGreatBuildings.length; i++) {
            ROIResultMap[i] = { 'index': i, 'ROIResults': ROIResults[i] };
        }

        ROIResultMap = ROIResultMap.sort(function (a, b) {
            if (a['ROIResults'] === undefined) return 999999;
            if (b['ROIResults'] === undefined) return -999999;

            let Levela = a['ROIResults']['BestLevel'],
                Levelb = b['ROIResults']['BestLevel'];

            if (Levela === undefined) return 999999;
            if (Levelb === undefined) return -999999;

            return a['ROIResults']['ROIValues'][Levela]['ROI'] - b['ROIResults']['ROIValues'][Levelb]['ROI'];
        });

        for (let i = 0; i < GreatBuildings.FPGreatBuildings.length; i++) {
            if (!ROIResultMap[i]['ROIResults']) continue;

            let Index = ROIResultMap[i]['index'];            
            let OwnGB = Object.values(CurrentCityMapData).find(obj => (obj['cityentity_id'] === GreatBuildings.FPGreatBuildings[Index].ID));;   
            let CurrentLevel = (OwnGB && OwnGB['level'] ? OwnGB['level'] : 0);
            let IsRandomFP = (GreatBuildings.FPGreatBuildings[Index].ID === 'X_VirtualFuture_Landmark2' || GreatBuildings.FPGreatBuildings[Index].ID === 'X_SpaceAgeAsteroidBelt_Landmark1');

            if (GreatBuildings.HideNewGBs && ShowGoodCosts[Index]) continue;

            h.push('<tr>');
            h.push('<td>' + MainParser.CityEntities[GreatBuildings.FPGreatBuildings[Index].ID]['name'] + '</td>');
            if (ROIResults[Index]['BestLevel'] !== undefined) {
                let BestLevel = ROIResults[Index]['BestLevel'];

                h.push('<td style="white-space:nowrap">' + CurrentLevel + ' &rarr; ' + (BestLevel + 1) + '</td>');
                h.push('<td>' + HTML.Format(Math.round(ROIResults[Index]['ROIValues'][BestLevel]['Cost'])) + '</td>');               
                h.push('<td>' + (IsRandomFP ? 'Ø ' : '') + HTML.Format(Math.round(ROIResults[Index]['ROIValues'][BestLevel]['FP'])) + '</td>');
                h.push('<td><strong class="text-bright">' + (IsRandomFP ? 'Ø ' : '') + HTML.Format(Math.round(ROIResults[Index]['ROIValues'][BestLevel]['ROI'])) + '</strong></td>');
            }
            else { //LG zu hoch => Keine Daten mehr verfügbar oder Güterkosten zu hoch
                h.push('<td>-</td>');
                h.push('<td>-</td>');
                h.push('<td>-</td>');
                h.push('<td>-</td>');
            }
            if (ShowGoodCosts[Index]) {
                h.push('<td><input title="' + i18n('Boxes.GreatBuildings.TTGoodCosts') + '" type="number" id="GreatBuildingsGoodCosts' + Index + '" step="1" min="0" max="999999" value="' + GreatBuildings.FPGreatBuildings[Index].GoodCosts + '"></td>');
            }
            else {
                h.push('<td class="text-center">-</td>');
            }
            h.push('</tr>');

            if (ROIResults2[Index] !== undefined && ROIResults2[Index]['BestLevel'] !== undefined) {
                let BestLevel = ROIResults2[Index]['BestLevel'];

                h.push('<tr>');
                h.push('<td class="text-right">' + i18n('Boxes.GreatBuildings.Suggestion2') + ':</td>');
                h.push('<td>' + CurrentLevel + ' &rarr; ' + (BestLevel + 1) + '</td>');
                h.push('<td>' + HTML.Format(Math.round(ROIResults[Index]['ROIValues'][BestLevel]['Cost'])) + '</td>');
                h.push('<td>' + (IsRandomFP ? 'Ø ' : '') + HTML.Format(Math.round(ROIResults[Index]['ROIValues'][BestLevel]['FP'])) + '</td>');
                h.push('<td><strong class="text-bright">' + (IsRandomFP ? 'Ø ' : '') + HTML.Format(Math.round(ROIResults[Index]['ROIValues'][BestLevel]['ROI'])) + '</strong></td>');
                h.push('<td class="text-center">-</td>');
                h.push('</tr>');
            }
        }
                       
        h.push('</table');

        $('#greatbuildingsBody').html(h.join(''));
    },


    RefreshFPBuildings: () => {
        GreatBuildings.FPBuildings = [];

        let CityMap = Object.values(MainParser.CityMapData);

        for (let i = 0; i < CityMap.length; i++) {
            let ID = CityMap[i]['id']
            EntityID = CityMap[i]['cityentity_id'],
                CityEntity = MainParser.CityEntities[EntityID];

            if (CityEntity['type'] === 'main_building' || CityEntity['type'] === 'greatbuilding') continue;

            if (GreatBuildings.BlueGalaxyStaticFPs[EntityID]) {
                GreatBuildings.FPBuildings.push({ ID: ID, FP: GreatBuildings.BlueGalaxyStaticFPs[EntityID] });
            }
            else {
                let Production = Productions.readType(CityMap[i]);
                if (Production['motivatedproducts'] && Production['motivatedproducts']['strategy_points']) {
                    let FP = Production['motivatedproducts']['strategy_points'];
                    GreatBuildings.FPBuildings.push({ ID: ID, FP: FP });
                }
            }
        }

        GreatBuildings.FPBuildings = GreatBuildings.FPBuildings.sort(function (a, b) {
            return b['FP'] - a['FP'];
        });
    },


    GetGalaxyProduction: (Productions, Charges, Level, IsDoubleCollection) => {
        let StartIndex = 0;
        if (IsDoubleCollection && Level > 1) {
            StartIndex = Charges[Level - 1];
        }

        let FPSum = 0;
        for (let i = StartIndex; i < StartIndex + Charges[Level]; i++) {
            if (i >= GreatBuildings.FPBuildings.length) break; // Nicht genug Gebäude vorhanden

            FPSum += GreatBuildings.FPBuildings[i]['FP'];
        }

        return Productions[Level] * FPSum;
    },


    GetROIValues: (Level, NettoCosts, Productions, BuildDailyCosts, BuildCosts, DoubleCollection, Charges) => {
        let Ret = { 'BestLevel': undefined, ROIValues: [] };

        let DoubleCollections = [];
        if (Charges) {
          
            for (let i = 0; i < 100; i++) {
                DoubleCollections[i] = GreatBuildings.GetGalaxyProduction(Productions, Charges, Level, true);
            }
        }

        let StartProduction = 0,
            CurrentInvestment=0;

        if (Level === -1) {
            StartProduction = BuildDailyCosts;
            CurrentInvestment = BuildCosts;
        }
        else if (Level > 0) {
            if (Charges) { // Blaue Galaxie
                 StartProduction = GreatBuildings.GetGalaxyProduction(Productions, Charges, Level, false);
            }
            else {
                StartProduction = Productions[Level - 1];
            }
        }

        let BestValue = 999999;
        for (let i = Math.max(Level, 0); i < NettoCosts.length; i++) {
            CurrentInvestment += NettoCosts[i];
            if (DoubleCollection) {
                if (Charges) { // Blaue Galaxie
                    CurrentInvestment -= GreatBuildings.GetGalaxyProduction(Productions, Charges, i, true);
                }
                else {
                    CurrentInvestment -= Productions[i];
                }
            }

            let CurrentProduction;
            if (Charges) { // Blaue Galaxie
                CurrentProduction = GreatBuildings.GetGalaxyProduction(Productions, Charges, i, false);
            }
            else {
                CurrentProduction = Productions[i];
            }

            Ret['ROIValues'][i] = { 'Cost': CurrentInvestment, 'FP': CurrentProduction - StartProduction, 'ROI': CurrentInvestment / (CurrentProduction - StartProduction) };

            if (CurrentProduction > StartProduction) {
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
            Ret[i] = Math.round(Ret[i - 1] / (i + 1) / 5) * 5;
        }

        for (let i = 0; i < 5; i++) {
            Ret[i] = Math.round(Ret[i] * arcs[i]);
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
            let FPReward = Maezen[Rank-1];

            GreatBuildings.FPRewards += FPReward;
        }
    },
};