"use strict";

const KNOWN_NAMES = ["angiang", "bariavungtau", "bacgiang", "backan", "baclieu", "bacninh", "bentre", "binhdinh", "binhduong", "binhphuoc", "binhthuan", "camau", "cantho", "caobang", "danang", "daklak", "daknong", "dienbien", "dongnai", "dongthap", "gialai", "hagiang", "hanam", "hanoi", "hatinh", "haiduong", "haiphong", "haugiang", "hoabinh", "hungyen", "khanhhoa", "kiengiang", "kontum", "laichau", "lamdong", "langson", "laocai", "longan", "namdinh", "nghean", "ninhbinh", "ninhthuan", "phutho", "phuyen", "quangbinh", "quangnam", "quangngai", "quangninh", "quangtri", "soctrang", "sonla", "tayninh", "thaibinh", "thainguyen", "thanhhoa", "thuathienhue", "tiengiang", "tphochiminh", "travinh", "tuyenquang", "vinhlong", "vinhphuc", "yenbai"];

function simplify(text) {
    // remove accent and non-alphanumeric from name to help with misspelled name
    // and simplify data entry
    // e.g. Hoà Bình and hòa binh will be the same
    return text.toLowerCase()
        .replace(/[áàảãạâấầẩẫậăắằẳẵặ]/g, 'a')
        .replace(/[óòỏõọôốồổỗộơớờởỡợ]/g, 'o')
        .replace(/[éèẻẽẹêếềểễệ]/g, 'e')
        .replace(/[úùủũụưứừửữự]/g, 'u')
        .replace(/[íìỉĩị]/g, 'i')
        .replace(/[ýỳỷỹỵ]/g, 'y')
        .replace(/[đð]/g, 'd')
        .replace(/\W/g, '')
}

const vegaOpts = {
    defaultStyle: true,
    renderer: 'svg',
    actions: false,
    scaleFactor: 2,
    tooltip: {theme: 'custom'}
};

const app = new Vue({
    el: '#app',
    data: {
        title: '',
        legendTitle: '',
        inputData: '',
        inputValueThresholds: '',
        valueType: 'nominal',
        valueFormat: ',d',
        valueTransform: '',
        colorScheme: 'category10',
        showBorders: false,
        showLegend: true,
    },
    computed: {
        parsedData: function () {

            // rudimentary detection for CSV vs TSV input
            const commaCount = (this.inputData.match(/,/g) || []).length;
            const tabCount = (this.inputData.match(/\t/g) || []).length;
            const parseFn = tabCount >= commaCount ? d3.tsvParseRows : d3.csvParseRows;

            const fixVnNumberFormat = s => s.replace(/\./g, '').replace(/,/, '.');

            return parseFn(this.inputData, (row) => ({
                // lowercase and remove accent to help with misspelled province names
                province: row[0],
                value: row[1] ? (row[1].match(/(\d+\.)*\d+,\d+/) ? fixVnNumberFormat(row[1]) : row[1]) : row[1]
            }));
        },
        normalizedData: function () {
            return this.parsedData.map(r => ({province: simplify(r['province']), value: r['value']}));
        },
        knownNames: function () {
            let names = {};
            KNOWN_NAMES.forEach(name => names[name] = true);
            return names;
        },
        unmatchedNames: function () {
            return this.parsedData
                .map(r => r.province)
                .filter(name => !(simplify(name) in this.knownNames))
                .filter(name => name.trim() !== '');
        },
        valueThresholds: function () {
            if (this.inputValueThresholds) {
                return this.inputValueThresholds.split(',').map(x => parseFloat(x));
            }
        },
        tooltipExp: function () {
            const tooltipExp = 'datum.id + ": " +';
            if (this.valueType === 'quantitative') {
                return tooltipExp + 'format(datum.value, "' + this.valueFormat + '")';
            }
            return tooltipExp + 'datum.value';
        },
        transformSpec: function () {
            return [
                {
                    lookup: "properties.cname",
                    from: {
                        data: {
                            name: 'inputData'
                        },
                        key: 'province',
                        fields: ['value']
                    },
                    as: 'value',
                    'default': 'N/A'
                },
                {
                    calculate: this.valueTransform || "datum.value",
                    as: 'value'
                },
                {
                    calculate: this.tooltipExp,
                    as: "tip"
                }
            ];
        },
        encodingSpec: function () {
            return {
                fill: this.fillEncodingSpec,
                stroke: this.strokeEncodingSpec,
                opacity: {
                    condition: {
                        selection: "hover",
                        value: 0.6
                    },
                    value: 1
                },
                tooltip: {
                    field: 'tip',
                    type: 'nominal'
                }
            }
        },
        strokeEncodingSpec: function () {
            if (this.showBorders) {
                return {value: '#aaa'};
            }
            const spec = Object.assign({}, this.fillEncodingSpec);
            spec.legend = null;
            return spec;
        },
        fillEncodingSpec: function () {
            return {
                field: 'value',
                type: this.valueType,
                scale: {
                    type: this.valueThresholds ? "threshold" : undefined,
                    domain: this.valueThresholds ? this.valueThresholds : undefined,
                    range: Array.isArray(this.colorScheme) ? this.colorScheme : undefined,
                    scheme: typeof this.colorScheme === "string" ? this.colorScheme : undefined
                },
                legend: this.legendSpec
            }
        },
        legendSpec: function () {
            if (!this.showLegend) {
                return null;
            }
            return {
                title: this.legendTitle,
                titleFont: "'Fira Sans Extra Condensed', 'Helvetica Neue', sans-serif",
                titleFontWeight: 'normal',
                format: this.valueFormat,
                gradientLength: this.mapWidth / 3,
                offset: -this.mapWidth / 3,
                padding: 50,
                gradientThickness: 8,
                labelFont: "'Fira Sans Extra Condensed', 'Helvetica Neue', sans-serif",
                labelFontSize: 11,
                labelOffset: 8
            }
        },
        mapWidth: function () {
            if (window.innerWidth < 700) {
                return window.innerWidth * 0.8;
            }
            return window.innerWidth * 0.5;
        },
        vegaLiteSpec: function () {
            return {
                $schema: 'https://vega.github.io/schema/vega-lite/v3.json',
                title: {
                    text: this.title,
                    font: "'Fira Sans Extra Condensed', 'Helvetica Neue', sans-serif",
                    fontSize: 26,
                    fontWeight: 'normal',
                    offset: 20,
                },
                width: this.mapWidth,
                height: this.mapWidth,
                config: {
                    padding: 20,
                    view: {
                        strokeWidth: 0
                    },
                },
                selection: {
                    hover: {
                        type: "multi",
                        on: "mouseover",
                        empty: "none"
                    }
                },
                data: {
                    name: 'mapData',
                    //url: 'https://thisisbinh.me/vn-provinces.json',
                    url: 'vn-provinces-topo.json',
                    format: {
                        type: "topojson",
                        feature: "provinces"
                    }
                },
                mark: "geoshape",
                transform: this.transformSpec,
                encoding: this.encodingSpec
            }
        }
    },
    mounted: function () {
        this.tryLoadStateFromURL();
        this.redraw = vega.debounce(500, this._redraw);
        this.redraw();
    },
    methods: {
        _redraw: function () {
            vegaEmbed("#map", this.vegaLiteSpec, vegaOpts).then(res => {
                const changeset = vega.changeset().remove(() => true).insert(this.normalizedData);
                res.view.change('inputData', changeset).run();
                this.view = res.view;
            });
        },
        tryLoadStateFromURL: function () {
            const fragment = window.location.hash;
            if (fragment.length) {
                const compressedState = fragment.slice(1);
                const stateString = LZString.decompressFromEncodedURIComponent(compressedState);
                if (stateString) {
                    try {
                        const state = JSON.parse(stateString);
                        for (let prop in state) {
                            if (state.hasOwnProperty(prop)) {
                                this[prop] = state[prop];
                            }
                        }
                    } catch (err) {
                        console.log(err);
                    }
                }
            }
        },
        generateShareLink: function () {
            const state = JSON.stringify(this.$data);
            const currentUrl = new URL(window.location);
            currentUrl.hash = LZString.compressToEncodedURIComponent(state);
            return currentUrl.toString();
        },
        inferValueType: function () {
            const isDefinedValue = r => r['value'] !== undefined && r['value'] !== null && r['value'] !== 'N/A';

            const data = this.view.data('mapData');
            const definedValues = data.filter(isDefinedValue);
            const allNumbers = definedValues.every(r => !isNaN(r['value']));
            const isEmpty = definedValues.length === 0;

            if (isEmpty || !allNumbers || (allNumbers && definedValues.length < 10)) {
                if (this.valueType !== 'nominal') {
                    // only update value type and color scheme if changed
                    this.valueType = 'nominal';
                    this.colorScheme = 'category10';
                }
            } else if (allNumbers) {
                if (this.valueType !== 'quantitative') {
                    this.valueType = 'quantitative';
                    this.colorScheme = 'viridis';
                }
            }
        },
        saveAsPng: function () {
            const scaleFactor = 2000/this.mapWidth;
            this.view.toImageURL('png', scaleFactor).then(function (url) {
                const link = document.createElement('a');
                link.setAttribute('href', url);
                link.setAttribute('target', '_blank');
                link.setAttribute('download', 'ban-do.png');
                link.dispatchEvent(new MouseEvent('click'));
            }).catch(function (error) {
                /* error handling */
            });
        }
    },
    watch: {
        vegaLiteSpec: function () {
            this.redraw();
        },
        normalizedData: function (records) {
            if (!this.view) {
                return;
            }
            const changeset = vega.changeset().remove(() => true).insert(this.normalizedData);
            this.view.change('inputData', changeset).run();
            this.inferValueType();
        }
    }
});

$(() => {
    function showTooltip(e, text) {
        const btn = $(e.trigger);
        btn.attr('title', text)
            .tooltip('show')
            .on('hidden.bs.tooltip', () => {
                btn.tooltip('dispose')
                    .attr('title', '')
            });
    }

    // init clipboard js for a single button
    new ClipboardJS('#copyBtn').on('success', (e) => {
        e.clearSelection();
        showTooltip(e, 'Đã chép vào clipboard');
    }).on('error', (e) => {
        showTooltip(e, 'Nhấn "Ctrl + C" để chép vào clipboard');
    });

    $('#shareLinkModal').on('show.bs.modal', () => {
        $('#shareLink').val(app.generateShareLink());
    });
});

