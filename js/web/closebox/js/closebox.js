/*
 * **************************************************************************************
 * Copyright (C) 2026 FoE-Helper team - All Rights Reserved
 * You may use, distribute and modify this code under the
 * terms of the AGPL license.
 *
 * See file LICENSE.md or go to
 * https://github.com/mainIine/foe-helfer-extension/blob/master/LICENSE.md
 * for full license details.
 *
 * **************************************************************************************
 */

// AutoHide feature: Battle
FoEproxy.addHandler('BattlefieldService', 'all', (data, postData) => {

    const requestMethod = data.requestMethod;
    const d = data.responseData;

    switch (requestMethod)
    {
        case 'startByBattleType':
            if (!d.isAutoBattle && CloseBox.Settings.AutoHideOnBattle)
            {
                CloseBox.HideAllBoxes();
            }
            break;
        case 'submitMove':
            if (d.winnerBit && CloseBox.Settings.AutoHideOnBattle)
            {
                CloseBox.ShowAllBoxes();
            }
            break;
        case 'surrender':
            if (d.surrenderBit && CloseBox.Settings.AutoHideOnBattle)
            {
                CloseBox.ShowAllBoxes();
            }
            break;
    }

});

/**
 * @type {{ShowAllBoxes: CloseBox.ShowAllBoxes, CloseAllBoxes: CloseBox.CloseAllBoxes, SaveSettings: CloseBox.SaveSettings, InitSettings: CloseBox.InitSettings, HideAllBoxes: CloseBox.HideAllBoxes, Show: CloseBox.Show, Excludes: {BackgroundInfo: {inj: string, name: *}, LiveGildFighting: {inj: string, name: *}}, Settings: {ButtonSize: number, AutoHideOnBattle: boolean, Excludes: *[], BoxAlignment: number, HideAllButton: boolean, CloseAllButton: boolean}, BuildBox: CloseBox.BuildBox, CloseBoxSettings: CloseBox.CloseBoxSettings}}
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
        HideAllButton: true,
        CloseAllButton: true,
        AutoHideOnBattle: false
    },


    InitSettings: () => {

        let Settings = JSON.parse(localStorage.getItem('CloseBoxSettings'));

        if (!Settings)
        {
            return;
        }

        for (const k in Settings)
        {
            if (!Settings.hasOwnProperty(k) ||
                !CloseBox.Settings.hasOwnProperty(k)) { continue; }

            CloseBox.Settings[k] = Settings[k];
        }
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

        if (CloseBox.Settings.HideAllButton)
        {
            h.push(`<button style="width: ${bs}px; height: ${bs}px; font-size: ${Math.round(bs / 2)}px;" id="cb-hide-all-windows" class="btn btn-green closebox${align}">&#128065</button>`);
        }

        if (CloseBox.Settings.CloseAllButton)
        {
            h.push(`<button style="width: ${bs}px; height: ${bs}px; font-size: ${Math.round(bs / 2)}px;" id="cb-close-all-windows" class="btn closebox${align}">X</button>`);
        }

        $('#CloseBoxBody').html(h.join('')).promise().done(function () {

            $("#cb-close-all-windows").on('click', function () {

                CloseBox.CloseAllBoxes();
            });

            $("#cb-hide-all-windows").on('click', function (e) {
                e.stopPropagation();

                let bt = $(this);

                if (bt.hasClass("invisible"))
                {
                    CloseBox.ShowAllBoxes();
                }
                else
                {
                    CloseBox.HideAllBoxes();
                }
            });

        });
    },

    HideAllBoxes: () => {

        $("#cb-hide-all-windows").removeClass("btn-green").addClass("invisible btn-delete");
        let openBoxes = $(".window-box, #foe-helper-hud, .helper-blocker");

        $.each(openBoxes, function () {

            let box = $(this);
            if (box.attr('id') !== 'CloseBox')
            {
                box.hide();
            }
        });

    },


    ShowAllBoxes: () => {

        $("#cb-hide-all-windows").removeClass("invisible btn-delete").addClass("btn-green");
        $(".window-box, #foe-helper-hud, .helper-blocker").show();
        $("#TooltipContainer").hide();
        
    },


    CloseAllBoxes: () => {

        let openBoxes = $('.window-box, .helper-blocker');

        $.each(openBoxes, function () {
            let box = $(this);
            if (box.attr('id') !== 'CloseBox' && box.attr('id') !== 'TooltipContainer' && !CloseBox.Settings.Excludes.includes(box.attr('id')))
            {
                box.remove();
            }
        });
    },


    CloseBoxSettings: () => {
        let c = [];
        const ButtonSizes = [40, 45, 50, 55, 60, 65, 70];
        const Settings = CloseBox.Settings;
        const Excludes = CloseBox.Excludes;

        c.push(`<p class="text-left"><span class="settingtitle">${i18n('Boxes.CloseBox.View')}</span>`);
        c.push(`<input id="cb_close_all_button" name="closeallbutton" value="1" type="checkbox" ${(Settings.CloseAllButton) ? ' checked="checked"' : ''} /> <label for="cb_close_all_button"><i>${i18n('Boxes.CloseBox.CloseAllButton')}</i></label></p>`);
        c.push(`<input id="cb_hide_all_button" name="hideallbutton" value="1" type="checkbox" ${(Settings.HideAllButton) ? ' checked="checked"' : ''} /> <label for="cb_hide_all_button"><i>${i18n('Boxes.CloseBox.HideAllButton')}</i></label></p>`);
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
        c.push(`<p class="text-left"><span class="settingtitle">${i18n('Boxes.CloseBox.Automation')}</span>`);
        c.push(`<input id="cb_auto_hide_on_battle" name="autohideonbattle" value="1" type="checkbox" ${(Settings.AutoHideOnBattle) ? ' checked="checked"' : ''} /> <label for="cb_auto_hide_on_battle"><i>${i18n('Boxes.CloseBox.AutoHideOnBattle')}</i></label></p>`);
        c.push(`<hr><p><button id="save-GexStat-settings" class="btn" style="width:100%" onclick="CloseBox.SaveSettings()">${i18n('Boxes.General.Save')}</button></p>`);

        $('#CloseBoxSettingsBox').html(c.join(''));

    },


    SaveSettings: () => {

        CloseBox.Settings.ButtonSize = parseInt($('#cb_buttonsize').val());
        CloseBox.Settings.Excludes = [];
        CloseBox.Settings.HideAllButton = !!$("#cb_hide_all_button").is(':checked');
        CloseBox.Settings.CloseAllButton = !!$("#cb_close_all_button").is(':checked');
        CloseBox.Settings.BoxAlignment = parseInt($('#cb_boxalignment').val());
        CloseBox.Settings.AutoHideOnBattle = !!$("#cb_auto_hide_on_battle").is(':checked');

        if (!CloseBox.Settings.HideAllButton && !CloseBox.Settings.CloseAllButton)
        {
            CloseBox.Settings.CloseAllButton = true;
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