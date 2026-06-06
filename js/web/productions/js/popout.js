function initPopout() {
    let era = CurrentEra;

    // copy of all relevant eventhandlers below

    SaveSettings=(x)=>{
        Productions.efficiencySettings[x] = $('#'+x).is(':checked')
        if (x === "inventorybuildingscore")
            Productions.efficiencySettings[x] = parseFloat($('#'+x).val())/100
        localStorage.setItem("Productions.efficiencySettings",JSON.stringify(Productions.efficiencySettings))
        if (x === "inventorybuildingscore") return;

        if ($('#'+x).is(':checked')) {
            $("#ProductionsRatingBody").addClass(x);
        } else {
            $("#ProductionsRatingBody").removeClass(x);
        }
    }

    $('.TSinactive').removeClass('TSinactive');
    const refreshPresetSelect = () => {
        Productions.Rating.ensurePresets();
        $('#ratingPresetSelect').html(Productions.Rating.getPresetOptions());
    };
    $('#ratingPresetSelect li:not(.duplicate)').on('click', function () {
        const presetId = $(this).data('id');
        if (!presetId) return;
        Productions.Rating.setActivePreset(presetId);
        Productions.CalcRatingBody();
    });
    $('#ratingPresetDuplicate').on('click', () => {
        const preset = Productions.Rating.getActivePreset();
        if (!preset) return;
        const newId = Productions.Rating.createPreset(preset.data);
        Productions.Rating.setActivePreset(newId);
        Productions.Rating.savePresets();
        Productions.CalcRatingBody();
    });
    $('.ratingPresetDelete').on('click', () => {
        const preset = Productions.Rating.getActivePreset();
        if (!preset) return;
        if (!window.confirm(i18n('Boxes.ProductionsRating.PresetConfirmDelete'))) return;
        const activeId = Productions.Rating.Presets?.activePresetId;
        Productions.Rating.deletePreset(activeId);
        Productions.Rating.savePresets();
        Productions.Rating.load();
        Productions.CalcRatingBody();
    });
    $('#ratingPresetReset').on('click', () => {
        if (!window.confirm(i18n('Boxes.ProductionsRating.PresetConfirmReset'))) return;
        Productions.Rating.resetActivePreset();
        Productions.Rating.save();
        Productions.CalcRatingBody();
    });
    $('#ratingPresetExport').on('click', () => {
        Productions.Rating.exportPresets();
    });
    $('#ratingPresetImport').on('click', () => {
        $('#ratingPresetImportFile').trigger('click');
    });
    $('#ratingPresetImportFile').on('change', function () {
        const file = this.files?.[0];
        this.value = '';
        Productions.Rating.importPresets(file);
    });

    $('#tilevalues, label[tilevalues]').on('click', function () {
        SaveSettings("tilevalues")
    });

    $('#showitems, label[showitems]').on('click', function () {
        SaveSettings("showitems")
    });

    $('#showhighlighted, label[showhighlighted]').on('click', function () {
        SaveSettings("showhighlighted")
    });

    $('#gBs, label[gBs]').on('click', function () {
        SaveSettings("gBs")
    });

    $('#showLimited, label[limited]').on('click', function () {
        SaveSettings("showLimited")
    });

    $('#inventorybuildings, label[inventorybuildings]').on('click', function () {
        SaveSettings("inventorybuildings")
    });

    $('.show-all').on('click', function () {
        Productions.ShowSearchOnMap($(this).attr('data-name'))
    });

    $('.ratinglist tr').on('click', function () {
        $(this).toggleClass('highlighted')
    });

    $('#addMetaBuilding').on('click', function () {
        $('#ProductionsRatingBody .overlay').show()
    })

    // closing "add building" screen
    $('.closeMetaBuilding').on('click', function () {
        $(this).parent('.overlay').hide()

        marked = []
        $(".ratingtable .highlighted td:nth-child(2)").each((x, el) => {
            marked.push(el.dataset.text)
        })
        search = new RegExp($('#efficiencyBuildingFilter').val(), "i")
        Productions.CalcRatingBody();
        setTimeout(() => {
            $(".ratingtable td:nth-child(2)").each((x, el) => {
                if (marked.includes(el.dataset.text)) {
                    el.parentElement.classList.add("highlighted")
                }
            })
            $('#efficiencyBuildingFilter').val(search.source === "(?:)" ? "" : search.source)
            $('#efficiencyBuildingFilter').trigger("input")
        }, 500)
    })

    if (Productions.efficiencySettings.tilevalues !== $('#tilevalues').is(':checked')) $('#tilevalues').trigger("click")
    if (Productions.efficiencySettings.showitems !== $('#showitems').is(':checked')) $('#showitems').trigger("click")
    if (Productions.efficiencySettings.showhighlighted !== $('#showhighlighted').is(':checked')) $('#showhighlighted').trigger("click")
    if (Productions.efficiencySettings.inventorybuildings !== $('#inventorybuildings').is(':checked')) $('#inventorybuildings').trigger("click")
    if (Productions.efficiencySettings.gBs !== $('#gBs').is(':checked')) $('#gBs').trigger("click")
    if (Productions.efficiencySettings.showLimited !== $('#showLimited').is(':checked')) $('#showLimited').trigger("click")

    $('#findMetaBuilding').on('input', function () {
        let regEx = new RegExp($(this).val(), "i");
        filterMeta(regEx)
    });
    let filterMeta = (regEx) => {
        $('#ProductionsRatingBody .overlay .results').html("");

        let foundBuildings = Object.values(Productions.AdditionalSpecialBuildings).filter(x => regEx.test(x.filter)).sort((a, b) => (((a.selected !== b.selected) ? (a.selected ? -2 : 2) : 0) + (a.name > b.name ? 1 : -1)))

        for (building of foundBuildings) {
            $('#ProductionsRatingBody .overlay .results').append(`<li data-meta_id="${building.id}" data-era="${(era === "AllAge" ? "" : era)}" data-callback_tt="Tooltips.buildingTT" class="helperTT${building.selected ? " selected" : ""}">${building.name}</li>`)
        }
    }
    filterMeta(/./)
    $('#ProductionsRatingBody .overlay .results').on("click", "li", (e) => {
        let id = e.target.dataset.meta_id
        Productions.AdditionalSpecialBuildings[id].selected = !Productions.AdditionalSpecialBuildings[id].selected
        e.target.classList.toggle("selected")
    })
    $('#ProductionsRatingBody .overlay .selectMetaBuildings').on("click", (e) => {
        let li = $('#ProductionsRatingBody .overlay .results li');
        for (let item of li) {
            item.classList.toggle("selected");
            let id = item.dataset.meta_id;
            Productions.AdditionalSpecialBuildings[id].selected = !Productions.AdditionalSpecialBuildings[id].selected
        }
    })

    $('#ProductionsRatingSettings input[type=checkbox]').on('click', function () {
        let elem = $(this)
        let isChecked = elem.prop('checked')
        let type = elem.attr('id').replace('Enabled-', '')

        elem.parent().children('input[type=number]').toggleClass('hidden')

        Productions.Rating.Data[type].active = isChecked
        Productions.calculateFSP(type, 0)

        if (isChecked) {
            Productions.CalcRatingBody();
        }
        Productions.Rating.save()
    });

    $('#showallies, label[allies]').on('click', function () {
        SaveSettings("showallies");
        Productions.CalcRatingBody();
    });

    // settings: change any number
    $('#ProductionsRatingSettings input[type=number]').on('blur', function () {
        let elem = $(this);
        let type = elem.attr('id').replace('ProdPerTile-', '');
        Productions.Rating.Data[type].perTile = parseFloat(elem.val()) || 0;
        Productions.calculateFSP(type, Productions.Rating.Data[type].perTile)
        Productions.Rating.save();
    });

    // result: search function
    $('#efficiencyBuildingFilter').on('input', e => {
        let filter = $('#efficiencyBuildingFilter').val();
        Productions.RatingSearchTerm = filter;
        let regEx = new RegExp(filter, "i");

        $('.ratinglist tr td:nth-child(2)').each((x, y) => {
            if (filter !== "" && regEx.test($(y).text())) {
                y.parentElement.classList.add('highlighted2')
            } else {
                y.parentElement.classList.remove('highlighted2')
            }
        });
    });
    // settings: show FSP calculator
    $("#ShowFSPCalculator").on('click', e => {
        if ($("#FSPCalculator").length === 1) {
            $("#FSPCalculator").remove()
            return
        }
        h = `<div id="FSPCalculator" class="dark-bg p5"><h2>${i18n("Boxes.ProductionsRating.TitleFSPCalculator")}</h2><div class="cats flex-between my-5 p5">`
        for (let x of Productions.FSPqualifiedResources) {
            h += `<div><span class="resicon ${x}"></span> <input type="number" step="1" min="0" max="1000000" class="${x} no-grow" value="${Productions.Rating.Data.fsp[x] || ""}"></div>`
        }
        h += "</div>"
        $(h).insertAfter($("li.fsp")).promise().done(() => {
            $("#FSPCalculator input").on('input', e => {
                type = e.target.classList[0]
                Productions.Rating.Data.fsp[type] = Number(e.target.value || 0) || 0
                Productions.calculateFSP()
            })
        })
    })

    $('#buildingsize').on('click', e => {
        e.stopPropagation();
        $('#buildingsize').toggleClass('active');
    });

    // result: building size filter
    $('#buildingsize li').on('click', e => {
        e.stopPropagation();
        let filter = parseInt(e.target.getAttribute('data-value'));
        e.target.classList.toggle('selected');

        if (Productions.RatingFilteredSizes.includes(filter)) {
            let index = Productions.RatingFilteredSizes.indexOf(filter);
            Productions.RatingFilteredSizes.splice(index, 1);
        }
        else {
            Productions.RatingFilteredSizes.push(filter);
        }

        $('.ratinglist tr').addClass('hidden');
        if (isNaN(parseInt(filter)) || Productions.RatingFilteredSizes.length === 0) {
            $('.ratinglist tr').removeClass('hidden');
            return;
        }
        $('.ratinglist tr').each((i, elem) => {
            let size = Array.from(elem.classList).find(x => x.includes('size'));
            if (size) {
                for (let filteredSize of Productions.RatingFilteredSizes) {
                    if ("size" + filteredSize === size) {
                        elem.classList.remove('hidden');
                        return;
                    }
                }
            }
        });
    });

    // change minimum score for inventory buildings
    $('#inventorybuildingscore').on('blur', e => {
        SaveSettings("inventorybuildingscore");
        Productions.CalcRatingBody();
    });

    $('#ProductionsRatingBody [data-original-title]').tooltip({ container: "#game_body", html: true });

    $('.sortable-table').tableSorter();

    $('.reset-button').on('click', function () {
        if (window.confirm(i18n('Boxes.ProductionsRating.ConfirmReset'))) {
            Productions.Rating.resetActivePreset();
            Productions.Rating.save();
        }
    });

    helper.preloader.hide('#ProductionsRating');
    //$('#ProductionsRatingBody').fadeIn(501);

    if (Productions.RatingSearchTerm !== "") {
        $('#efficiencyBuildingFilter').trigger('input');
    }

    if (Productions.RatingFilteredSizes.length > 0) {
        $('.ratinglist tr').addClass('hidden');
        $('.ratinglist tr').each((i, elem) => {
            let size = Array.from(elem.classList).find(x => x.includes('size'));
            if (size) {
                for (let filteredSize of Productions.RatingFilteredSizes) {
                    if ("size" + filteredSize === size) {
                        elem.classList.remove('hidden');
                        return;
                    }
                }
            }
        });
    }
}
window.opener.popoutReady();