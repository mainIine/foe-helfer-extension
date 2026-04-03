'use strict';

window.PlannerApp = window.PlannerApp || {};

(function (app) {
    const state = app.state;
    const SIZE = 30;

    function tileKey(x, y) {
        return x + ',' + y;
    }

    function canvasToTileX(x) {
        return Math.round(x / SIZE);
    }

    function canvasToTileY(y) {
        return Math.round(y / SIZE);
    }

    function getBuildingTileRect(building, x = building.x, y = building.y) {
        return {
            x: canvasToTileX(x),
            y: canvasToTileY(y),
            w: Math.round(building.width / SIZE),
            h: Math.round(building.height / SIZE)
        };
    }

    function rebuildOccupiedTiles() {
        state.occupiedTiles.clear();

        for (const building of state.mapBuildings) {
            addBuildingToOccupiedTiles(building);
        }
    }

    function addBuildingToOccupiedTiles(building) {
        const rect = getBuildingTileRect(building);

        for (let ty = rect.y; ty < rect.y + rect.h; ty++) {
            for (let tx = rect.x; tx < rect.x + rect.w; tx++) {
                state.occupiedTiles.set(tileKey(tx, ty), building);
            }
        }
    }

    function removeBuildingFromOccupiedTiles(building) {
        const rect = getBuildingTileRect(building);

        for (let ty = rect.y; ty < rect.y + rect.h; ty++) {
            for (let tx = rect.x; tx < rect.x + rect.w; tx++) {
                const key = tileKey(tx, ty);
                if (state.occupiedTiles.get(key) === building) {
                    state.occupiedTiles.delete(key);
                }
            }
        }
    }

    function snapToGrid(v) {
        return Math.round(v / SIZE) * SIZE;
    }

    function canPlaceAt(building, newX, newY) {
      const rect = getBuildingTileRect(building, newX, newY);

      for (let ty = rect.y; ty < rect.y + rect.h; ty++) {
          for (let tx = rect.x; tx < rect.x + rect.w; tx++) {
              const occupant = state.occupiedTiles.get(tileKey(tx, ty));
              if (occupant && occupant !== building) {
                  return false;
              }
          }
      }

      return true;
  }

    function hitTestBuilding(pointX, pointY) {
        for (let i = state.mapBuildings.length - 1; i >= 0; i--) {
            const b = state.mapBuildings[i];
            if (b.meta.type === 'street') continue;

            if (
                pointX >= b.x && pointX <= b.x + b.width &&
                pointY >= b.y && pointY <= b.y + b.height
            ) {
                return b;
            }
        }
        return null;
    }

    function isTileOccupiedByNonStreet(tx, ty) {
        const occupant = state.occupiedTiles.get(tileKey(tx, ty));
        return !!(occupant && occupant.meta.type !== 'street');
    }

    function getStraightLineTiles(startTile, endTile) {
        if (!startTile || !endTile) return [];

        const dx = endTile.x - startTile.x;
        const dy = endTile.y - startTile.y;

        // force straight line only
        if (Math.abs(dx) >= Math.abs(dy)) {
            const step = dx >= 0 ? 1 : -1;
            const tiles = [];
            for (let x = startTile.x; x !== endTile.x + step; x += step) {
                tiles.push({ x, y: startTile.y });
            }
            return tiles;
        } else {
            const step = dy >= 0 ? 1 : -1;
            const tiles = [];
            for (let y = startTile.y; y !== endTile.y + step; y += step) {
                tiles.push({ x: startTile.x, y });
            }
            return tiles;
        }
    }

    function worldToTile(pointX, pointY) {
        return {
            x: Math.floor(pointX / SIZE),
            y: Math.floor(pointY / SIZE)
        };
    }

    app.SIZE = SIZE;
    app.tileKey = tileKey;
    app.canvasToTileX = canvasToTileX;
    app.canvasToTileY = canvasToTileY;
    app.getBuildingTileRect = getBuildingTileRect;
    app.rebuildOccupiedTiles = rebuildOccupiedTiles;
    app.addBuildingToOccupiedTiles = addBuildingToOccupiedTiles;
    app.removeBuildingFromOccupiedTiles = removeBuildingFromOccupiedTiles;
    app.snapToGrid = snapToGrid;
    app.canPlaceAt = canPlaceAt;
    app.hitTestBuilding = hitTestBuilding;
    app.isTileOccupiedByNonStreet = isTileOccupiedByNonStreet;
    app.getStraightLineTiles = getStraightLineTiles;
    app.worldToTile = worldToTile;
})(window.PlannerApp);