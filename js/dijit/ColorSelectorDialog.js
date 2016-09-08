define([
  "dojo/_base/declare",
  "dijit/ConfirmDialog",
  "dojo/_base/lang",
  "dojo/_base/array",
  "dojo/on",
  "dojo/dom",
  "dojo/dom-attr",
  "dojo/dom-style",
  "dojo/dom-class",
  "put-selector/put",
  "dojo/store/Memory",
  "dojo/store/Observable",
  "dgrid/OnDemandList",
  "dgrid/OnDemandGrid",
  "dgrid/Selection",
  "dgrid/editor",
  "dgrid/extensions/DijitRegistry",
  "dojo/_base/Color",
  "dojo/colors",
  "dojox/color",
  "dojox/color/Palette",
  "dijit/ColorPalette",
  "dojox/widget/ColorPicker",
  "dijit/layout/BorderContainer",
  "dijit/layout/TabContainer",
  "dijit/layout/ContentPane"
], function (declare, ConfirmDialog,
             lang, array, on, dom, domAttr, domStyle, domClass,
             put, Memory, Observable, OnDemandList, OnDemandGrid, Selection, editor, DijitRegistry,
             Color, colors, ColorX, Palette, ColorPalette, ColorPicker,
             BorderContainer, TabContainer, ContentPane) {

  /**
   * COLOR SELECTOR DIALOG
   */
  var ColorSelectorDialog = declare(ConfirmDialog, {

    declaredClass: "ColorSelectorDialog",
    baseClass: "colorSelectorDlg",

    title: "Color Selector",

    variationsList: ["HSL Saturation", "HSL Brighter / Darker", "HSV Saturation", "HSV Brighter / Darker"],

    // "splitComplementary",
    colorTheoryList: ["analogous", "monochromatic", "triadic", "complementary", "compound", "shades"],

    /**
     *
     * @param config
     */
    constructor: function (config) {
      declare.safeMixin(this, config);
    },

    /**
     *
     */
    postCreate: function () {
      this.inherited(arguments);

      // SELECTED COLOR //
      var selectedColorPane = put(this.actionBarNode, "span.selected-color-pane");
      this.sourceColorNode = this._createColorNode(selectedColorPane, "#FF0000", ".selected-color-node", true, true);
      this.selectedColorNode = this._createColorNode(selectedColorPane, "#FF0000", ".selected-color-node", true);


      // MAIN CONTAINER //
      var colorSelectorMainContainer = new BorderContainer({
        className: this.baseClass + "-selector-container"
      }, put(this.containerNode, "div"));


      // TAB CONTAINER //
      var colorSelectorTabContainer = new TabContainer({
        className: this.baseClass + "-selector-tab-container",
        region: "center",
        splitter: true
      }, put(colorSelectorMainContainer.containerNode, "div"));


      // CUSTOM COLORS //
      this.customColorPicker = new ColorPicker({ className: this.baseClass + "-colors-custom", liveUpdate: true });
      this.customColorPicker.on("change", lang.hitch(this, function (customColor) {
        this._updateColorNode(this.selectedColorNode, customColor.toUpperCase());
      }));
      // CUSTOM CONTAINER //
      var customColorsPane = new ContentPane({
        title: "Custom",
        className: this.baseClass + "-selector-custom-container",
        region: "right",
        content: this.customColorPicker
      }, put(colorSelectorMainContainer.containerNode, "div"));

      //
      // BASEMAP COLORS //
      //
      var basemapColorsPane = new ContentPane({
        title: "Basemap"
      });
      this.colorSelectorBasemapColorList = new (declare([OnDemandList, Selection, DijitRegistry]))({
        className: "dgrid-autoheight",
        noDataMessage: "No Colors",
        selectionMode: "single",
        sort: "luminosity",
        renderRow: lang.hitch(this, function (colorItem) {
          var colorNode = this._createColorNode(put("div"), colorItem.color, ".selectable.pallet-node.small");
          on(colorNode, "click", lang.hitch(this, function (evt) {
            this.customColorPicker.setColor(colorItem.color, true);
          }));
          return colorNode;
        })
      }, put(basemapColorsPane.containerNode, "div"));
      this.colorSelectorBasemapColorList.startup();
      colorSelectorTabContainer.addChild(basemapColorsPane);

      //
      // PREDEFINED COLORS //
      //
      var predefinedColorPalette = new ColorPalette({ className: this.baseClass + "-colors-predefined" });
      predefinedColorPalette.on("change", lang.hitch(this, function (predefinedColor) {
        this.customColorPicker.setColor(predefinedColor.toUpperCase(), true);
      }));
      var predefinedColorsPane = new ContentPane({
        title: "Predefined",
        content: predefinedColorPalette
      });
      colorSelectorTabContainer.addChild(predefinedColorsPane);

      //
      // COLOR LIST //
      //
      var ColorList = declare([OnDemandList, Selection, DijitRegistry], {
        sort: "luminosity",
        selectionMode: "single",
        renderRow: lang.hitch(this, function (colorItem) {
          var colorNode = this._createColorNode(put("div"), colorItem.color, ".selectable.pallet-node.small");
          on(colorNode, "click", lang.hitch(this, function (evt) {
            this.customColorPicker.setColor(colorItem.color, true);
          }));
          return colorNode;
        })
      });

      //
      // VARIATIONS FROM SOURCE COLORS //
      //
      var variationsColorsPane = new ContentPane({
        title: "Variations"
      });
      colorSelectorTabContainer.addChild(variationsColorsPane);

      this.variationsColorLists = {};
      array.forEach(this.variationsList, lang.hitch(this, function (variation) {

        var variationsListNode = put(variationsColorsPane.containerNode, "div.variations-node", variation);
        var variationsColorList = new ColorList({
          className: "dgrid-autoheight",
          query: { type: variation }
        }, put(variationsListNode, "div.variations-grid div"));
        variationsColorList.startup();

        this.variationsColorLists[variation] = variationsColorList;
      }));

      //
      // PALETTES FROM SOURCE COLORS //
      //
      var palettesColorsPane = new ContentPane({
        title: "Palettes"
      });
      colorSelectorTabContainer.addChild(palettesColorsPane);

      this.paletteColorLists = {};
      array.forEach(this.colorTheoryList, lang.hitch(this, function (colorTheory) {

        var paletteListNode = put(palettesColorsPane.containerNode, "div.variations-node", colorTheory.toUpperCase());
        var paletteColorList = new ColorList({
          className: "dgrid-autoheight",
          sort: "index",
          query: { type: colorTheory }
        }, put(paletteListNode, "div.variations-grid div"));
        paletteColorList.startup();

        this.paletteColorLists[colorTheory] = paletteColorList;
      }));

    },

    /**
     *
     * @param parent
     * @param colorText
     * @param classNames
     * @param addColorName
     * @param addBefore
     * @returns {*}
     * @private
     */
    _createColorNode: function (parent, colorText, classNames, addColorName, addBefore) {
      var colorNode = put(parent, "span.color-node" + (classNames || ""), { title: colorText });
      if(addColorName) {
        if(addBefore) {
          colorNode.nameNode = put(colorNode, "-span.color-name-node", colorText);
        } else {
          colorNode.nameNode = put(parent, "span.color-name-node", colorText);
        }
      }

      domAttr.set(colorNode, "data-color", colorText);
      domStyle.set(colorNode, "backgroundColor", colorText);

      return colorNode;
    },

    /**
     *
     * @param colorNode
     * @param colorText
     * @private
     */
    _updateColorNode: function (colorNode, colorText) {

      if(colorNode.nameNode) {
        colorNode.nameNode.innerHTML = colorText;
      }

      domAttr.set(colorNode, "title", colorText);
      domAttr.set(colorNode, "data-color", colorText);
      domStyle.set(colorNode, "backgroundColor", colorText);
    },


    /**
     *
     * @param basemapColorsStore
     */
    setBasemapColorStore: function (basemapColorsStore) {
      this.colorSelectorBasemapColorList.set("store", basemapColorsStore);
    },

    /**
     * SET COLOR
     *
     * @param sourceColor
     * @param targetColor
     */
    setColors: function (sourceColor, targetColor) {
      this.customColorPicker.setColor(targetColor, true);
      this._updateColorNode(this.sourceColorNode, sourceColor.toUpperCase());
      this._setVariationsColors(sourceColor);
      this._setPaletteColors(sourceColor);
    },

    /**
     *
     * @returns {string}
     */
    getSelectedColor: function () {
      return domAttr.get(this.selectedColorNode, "data-color").toUpperCase();
    },

    /**
     * SET PALETTE COLORS
     *  - https://dojotoolkit.org/reference-guide/1.10/dojox/color/Palette.html
     *
     * @param sourceColor
     * @private
     */
    _setPaletteColors: function (sourceColor) {

      var paletteColors = [];
      array.forEach(this.colorTheoryList, lang.hitch(this, function (colorTheory) {
        var colorPalette = Palette.generate(sourceColor, colorTheory);
        array.forEach(colorPalette.colors, lang.hitch(this, function (paletteColor, colorIndex) {
          var paletteColorHex = paletteColor.toHex().toUpperCase();
          paletteColors.push({ id: paletteColorHex, color: paletteColorHex, luminosity: paletteColor.toHsl().l, type: colorTheory, index: colorIndex });
        }));
      }));

      var colorPaletteStore = new Memory({ data: paletteColors });

      array.forEach(this.colorTheoryList, lang.hitch(this, function (colorTheory) {
        this.paletteColorLists[colorTheory].set("store", colorPaletteStore);
      }));
    },

    /**
     * SET VARIATIONS COLORS
     *  - Adapted from http://www.w3schools.com/tags/ref_colorpicker.asp
     *
     * @param sourceColor
     * @private
     */
    _setVariationsColors: function (sourceColor) {

      var colorHSL = new Color(sourceColor).toHsl();
      var colorHSV = new Color(sourceColor).toHsv();
      var variationsColors = [];
      for (var index = 0; index <= 100; index += 10) {

        // HSL Saturation //
        var variationHSLSat = ColorX.fromHsl(colorHSL.h, index, colorHSL.l);
        var variationHSLSatHex = variationHSLSat.toHex().toUpperCase();
        variationsColors.push({ id: variationHSLSatHex, color: variationHSLSatHex, luminosity: colorHSL.l, type: "HSL Saturation" });

        // HSL Brighter / Darker //
        var variationHSLVal = ColorX.fromHsl(colorHSL.h, colorHSL.s, index);
        var variationHSLValHex = variationHSLVal.toHex().toUpperCase();
        variationsColors.push({ id: variationHSLValHex, color: variationHSLValHex, luminosity: index, type: "HSL Brighter / Darker" });

        // HSV Saturation //
        var variationHSVSat = ColorX.fromHsv(colorHSV.h, index, colorHSV.v);
        var variationHSVSatHex = variationHSVSat.toHex().toUpperCase();
        variationsColors.push({ id: variationHSVSatHex, color: variationHSVSatHex, luminosity: variationHSVSat.toHsl().l, type: "HSV Saturation" });

        // HSV Brighter / Darker //
        var variationHSVVal = ColorX.fromHsv(colorHSV.h, colorHSV.s, index);
        var variationHSVValHex = variationHSVVal.toHex().toUpperCase();
        variationsColors.push({ id: variationHSVValHex, color: variationHSVValHex, luminosity: variationHSVVal.toHsl().l, type: "HSV Brighter / Darker" });
      }

      var variationsStore = new Memory({ data: variationsColors });

      array.forEach(this.variationsList, lang.hitch(this, function (variation) {
        this.variationsColorLists[variation].set("store", variationsStore);
      }));
    }

  });

  // VERSION //
  ColorSelectorDialog.version = "0.0.1";

  return ColorSelectorDialog;
});