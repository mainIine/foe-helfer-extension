/*
 * **************************************************************************************
 * Copyright (C) 2021 FoE-Helper team - All Rights Reserved
 * You may use, distribute and modify this code under the
 * terms of the AGPL license.
 *
 * See file LICENSE.md or go to
 * https://github.com/mainIine/foe-helfer-extension/blob/master/LICENSE.md
 * for full license details.
 *
 * **************************************************************************************
 */

let CloseBox = {

    Excludes: {
        BackgroundInfo: { name: i18n('Boxes.Infobox.Title'), inj: 'infobox' },
        LiveGildFighting: { name: i18n('Menu.Gildfight.Title'), inj: 'guildfights' }
    },

    Settings: {
        ButtonSize: 60,
        Excludes: [],
        BoxAlignment: 0,
        HideAllButton: 1,
        CloseAllButton: 1
    },


    InitSettings: () => {

        let Settings = JSON.parse(localStorage.getItem('CloseBoxSettings'));

        if (!Settings)
        {
            return;
        }

        CloseBox.Settings.ButtonSize = (Settings.ButtonSize !== undefined) ? Settings.ButtonSize : CloseBox.Settings.ButtonSize;
        CloseBox.Settings.Excludes = (Settings.Excludes !== undefined) ? Settings.Excludes : CloseBox.Settings.Excludes;
        CloseBox.Settings.HideAllButton = (Settings.HideAllButton !== undefined) ? Settings.HideAllButton : CloseBox.Settings.HideAllButton;
        CloseBox.Settings.CloseAllButton = (Settings.CloseAllButton !== undefined) ? Settings.CloseAllButton : CloseBox.Settings.CloseAllButton;
        CloseBox.Settings.BoxAlignment = (Settings.BoxAlignment !== undefined) ? Settings.BoxAlignment : CloseBox.Settings.BoxAlignment;
    },


    BuildBox: () => {
        if ($('#CloseBox').length === 0)
        {
            HTML.Box({
                id: 'CloseBox',
                title: i18n('Boxes.CloseBox.Title'),
                auto_close: false,
                dragdrop: true,
                resize: false,
                minimize: false,
                settings: 'CloseBox.CloseBoxSettings()'
            });

            HTML.AddCssFile('closebox');
        }

        CloseBox.Show();
    },


    Show: () => {

        CloseBox.InitSettings();

        let h = [];
        let bs = CloseBox.Settings.ButtonSize;
        let align = CloseBox.Settings.BoxAlignment === 1 ? ' vertical' : ' horizontal';

        if (CloseBox.Settings.HideAllButton === 1)
        {
            h.push(`<button style="width: ${bs}px; height: ${bs}px; font-size: ${Math.round(bs / 2)}px;" id="cb-hide-all-windows" class="btn btn-default btn-green closebox${align}">&#128065</button>`);
        }

        if (CloseBox.Settings.CloseAllButton === 1)
        {
            h.push(`<button style="width: ${bs}px; height: ${bs}px; font-size: ${Math.round(bs / 2)}px;" id="cb-close-all-windows" class="btn btn-default closebox${align}">X</button>`);
        }

        $('#CloseBoxBody').html(h.join('')).promise().done(function () {

            let self = $('#CloseBox');

            $("#cb-close-all-windows").on('click', function () {

                let openBoxes = $('.window-box');

                $.each(openBoxes, function () {
                    let box = $(this);
                    if (box.attr('id') !== self.attr('id') && !CloseBox.Settings.Excludes.includes(box.attr('id')))
                    {
                        box.remove();
                    }
                });
            });

            $("#cb-hide-all-windows").on('click', function (e) {
                e.stopPropagation();

                let bt = $(this);

                if (bt.hasClass("invisible"))
                {
                    bt.removeClass("invisible btn-delete").addClass("btn-green");
                    $(".window-box, #foe-helper-hud").show();
                }
                else
                {
                    bt.removeClass("btn-green").addClass("invisible btn-delete");
                    let openBoxes = $(".window-box, #foe-helper-hud");

                    $.each(openBoxes, function () {
                        let box = $(this);
                        if (box.attr('id') !== self.attr('id'))
                        {
                            box.hide();
                        }
                    });
                }
            });

        });
    },


    CloseBoxSettings: () => {
        let c = [];
        let ButtonSizes = [40, 45, 50, 55, 60, 65, 70];
        let Settings = CloseBox.Settings;
        let Excludes = CloseBox.Excludes;

        c.push(`<p class="text-left"><span class="settingtitle">${i18n('Boxes.CloseBox.View')}</span>`);
        c.push(`<input id="cb_close_all_button" name="closeallbutton" value="1" type="checkbox" ${(Settings.CloseAllButton === 1) ? ' checked="checked"' : ''} /> <label for="cb_close_all_button"><i>${i18n('Boxes.CloseBox.CloseAllButton')}</i></label></p>`);
        c.push(`<input id="cb_hide_all_button" name="hideallbutton" value="1" type="checkbox" ${(Settings.HideAllButton === 1) ? ' checked="checked"' : ''} /> <label for="cb_hide_all_button"><i>${i18n('Boxes.CloseBox.HideAllButton')}</i></label></p>`);
        c.push(`<p>${i18n('Boxes.CloseBox.ButtonSize')} <select id="cb_buttonsize" name="buttonsize">`);
        for (let k in ButtonSizes)
        {
            c.push(`<option value="${ButtonSizes[k]}" ${Settings.ButtonSize === ButtonSizes[k] ? ' selected="selected"' : ''}>${k * 1 + 1}</option>`);
        }

        c.push(`</select></p>`);
        c.push(`<p>${i18n('Boxes.CloseBox.BoxAlignment')} <select id="cb_boxalignment" name="boxalignment">`);
        c.push(`<option value="0" ${Settings.BoxAlignment === 0 ? ' selected="selected"' : ''}>${i18n('Boxes.CloseBox.Horizontal')}</option>`);
        c.push(`<option value="1" ${Settings.BoxAlignment === 1 ? ' selected="selected"' : ''}>${i18n('Boxes.CloseBox.Vertical')}</option>`);

        c.push(`</select></p>`);
        c.push(`<p class="text-left"><span class="settingtitle">${i18n('Boxes.CloseBox.ExcludeFromClosing')}</span>`);

        for (let k in Excludes)
        {
            if (!Excludes.hasOwnProperty(k)) { continue; }

            c.push(`<input id="cb_exc_${k}" class="cb_exludes" name="excludes[]" value="${k}" type="checkbox" ${(Settings.Excludes.includes(k)) ? ' checked="checked"' : ''} /> <label for="cb_exc_${k}"><i>${Excludes[k].name}</i></label><br />`);

        }

        c.push(`<hr><p><button id="save-GexStat-settings" class="btn btn-default" style="width:100%" onclick="CloseBox.SaveSettings()">${i18n('Boxes.General.Save')}</button></p>`);
        
        $('#CloseBoxSettingsBox').html(c.join(''));

    },


    SaveSettings: () => {

        let bs = parseInt($('#cb_buttonsize').val());
        CloseBox.Settings.ButtonSize = bs;
        CloseBox.Settings.Excludes = [];
        CloseBox.Settings.HideAllButton = $("#cb_hide_all_button").is(':checked') ? 1 : 0;
        CloseBox.Settings.CloseAllButton = $("#cb_close_all_button").is(':checked') ? 1 : 0;
        CloseBox.Settings.BoxAlignment = parseInt($('#cb_boxalignment').val());
        if (!CloseBox.Settings.HideAllButton && !CloseBox.Settings.CloseAllButton)
        {
            CloseBox.Settings.CloseAllButton = 1;
        }

        $("#CloseBoxSettingsBox input.cb_exludes:checked").each(function () {
            CloseBox.Settings.Excludes.push($(this).val());
        });

        localStorage.setItem('CloseBoxSettings', JSON.stringify(CloseBox.Settings));

        $(`#CloseBoxSettingsBox`).fadeToggle('fast', function () {
            $(this).remove();
            CloseBox.Show();
        });
    }
}