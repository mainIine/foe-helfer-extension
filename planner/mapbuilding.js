'use strict';

window.PlannerApp = window.PlannerApp || {};

(function (app) {
    const SIZE = 30;
    const FONT_SIZE = 15;
    const FONT = FONT_SIZE + 'px Arial';

    function getMetaSize(meta) {
        return {
            width: meta.width ?? meta.components?.AllAge?.placement?.size?.x ?? 1,
            height: meta.length ?? meta.components?.AllAge?.placement?.size?.y ?? 1
        };
    }

    class MapBuilding {
        constructor(data, meta) {
            this.data = data;
            this.meta = meta;
            this.name = meta.name;

            this.x = (data.x * SIZE) || 0;
            this.y = (data.y * SIZE) || 0;

            const dims = getMetaSize(meta);
            this.width = SIZE * dims.width;
            this.height = SIZE * dims.height;

            this.isSelected = false;
            this.isActive = false;

            this.streetReq = this.setNeedsStreet();
            this.fill = this.setFillColor();
            this.stroke = this.setStrokeColor();
            this.hasLabel = !(this.meta.type === 'street' || this.height === SIZE || this.width === SIZE);
        }

        setNeedsStreet() {
            let needsStreet = this.meta.requirements?.street_connection_level;

            if (needsStreet === undefined) {
                if (Array.isArray(this.meta.abilities)) {
                    for (const ability of this.meta.abilities) {
                        if (ability?.__class__ === 'StreetConnectionRequirementComponent') {
                            needsStreet = 1;
                            break;
                        }
                    }
                }

                const req = this.meta.components?.AllAge?.streetConnectionRequirement;
                if (req !== undefined) needsStreet = req.requiredLevel;
            }

            return (needsStreet === undefined ? 0 : needsStreet);
        }

        setFillColor() {
            let color = '#888';

            if (this.meta.type === 'main_building') color = '#ffb300';
            else if (this.meta.type === 'military') color = '#fff';
            else if (this.meta.type === 'greatbuilding') color = '#e6542f';
            else if (this.meta.type === 'residential') color = '#7abaff';
            else if (this.meta.type === 'production') color = '#416dff';

            if (this.streetReq === 0) color = '#793bc9';
            return color;
        }

        setStrokeColor() {
            let color = '#888';

            if (this.meta.type === 'main_building') color = '#ffb300';
            else if (this.meta.type === 'greatbuilding') color = '#af3d2b';
            else if (this.meta.type === 'residential') color = '#219eff';
            else if (this.meta.type === 'production') color = '#2732ff';

            if (this.streetReq === 0) color = '#3d2783';
            return color;
        }

        draw(context) {
            context.fillStyle = this.isSelected ? '#cfe5f0' : this.isActive ? '#66c440' : this.fill;
            context.strokeStyle = this.isSelected ? '#2a4670' : this.stroke;

            context.fillRect(this.x, this.y, this.width, this.height);
            context.lineWidth = 2;
            context.strokeRect(this.x, this.y, this.width, this.height);

            this.drawName(context);
        }

        drawName(context) {
            if (!this.hasLabel) return;

            context.fillStyle = '#000';
            context.font = this.isSelected ? ('bold ' + FONT) : FONT;

            const text = context.measureText(this.name);
            let sizeOffset = FONT_SIZE + Math.ceil(FONT_SIZE * 0.4);

            if (text.width < this.width) {
                context.fillText(this.name, this.x + this.width / 2, this.y + this.height / 2 - Math.ceil(FONT_SIZE * 0.3));
                sizeOffset = FONT_SIZE - 2;
            } else if (this.height > SIZE && this.width > SIZE) {
                const ratio = Math.ceil(text.width / (this.width - 30));
                let textStart = 0;
                let textEnd = Math.ceil(this.name.length / ratio);

                context.fillText(this.name.slice(textStart, textEnd), this.x + this.width / 2, this.y + this.height / 2 - Math.ceil(FONT_SIZE * 0.9));
                textStart = textEnd;
                textEnd = Math.ceil(this.name.length / ratio) + textStart;
                const more = (textEnd >= this.name.length) ? '' : '…';
                context.fillText(this.name.slice(textStart, textEnd) + more, this.x + this.width / 2, this.y + this.height / 2 + Math.ceil(FONT_SIZE * 0.2));
            }

            const totalSize = (this.height / SIZE) + 'x' + (this.width / SIZE);
            context.font = '12px Arial';
            context.fillText(totalSize, this.x + this.width / 2, this.y + this.height / 2 + sizeOffset);

            context.font = FONT;
        }
    }

    app.getMetaSize = getMetaSize;
    app.MapBuilding = MapBuilding;
})(window.PlannerApp);