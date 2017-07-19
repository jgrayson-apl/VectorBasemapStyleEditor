/*global define,document */
/*jslint sloppy:true,nomen:true */
/*
 | Copyright 2014 Esri
 |
 | Licensed under the Apache License, Version 2.0 (the "License");
 | you may not use this file except in compliance with the License.
 | You may obtain a copy of the License at
 |
 |    http://www.apache.org/licenses/LICENSE-2.0
 |
 | Unless required by applicable law or agreed to in writing, software
 | distributed under the License is distributed on an "AS IS" BASIS,
 | WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 | See the License for the specific language governing permissions and
 | limitations under the License.
 */
define([
  "dojo/_base/declare",
  "dojo/_base/lang",
  "dojo/_base/array",
  "dojo/_base/Color",
  "dojo/colors",
  "dojo/query",
  "dojo/json",
  "dojo/Deferred",
  "dojo/promise/all",
  "dojo/on",
  "dojo/dom",
  "dojo/dom-attr",
  "dojo/dom-style",
  "dojo/dom-class",
  "put-selector/put",
  "esri/arcgis/utils",
  "esri/arcgis/Portal",
  "esri/urlUtils",
  "esri/request",
  "esri/map",
  "esri/IdentityManager",
  "esri/dijit/HomeButton",
  "esri/dijit/Search",
  "esri/layers/VectorTileLayer",
  "dojo/store/Memory",
  "dojo/store/Observable",
  "dgrid/OnDemandList",
  "dgrid/OnDemandGrid",
  "dgrid/Selection",
  "dgrid/editor",
  "dgrid/extensions/DijitRegistry",
  "dijit/registry",
  "dijit/ConfirmDialog",
  "dijit/form/ValidationTextBox",
  "dijit/form/CheckBox",
  "dijit/form/Select",
  "dijit/Tooltip",
  "application/dijit/UniqueComboBox",
  "dojox/form/HorizontalRangeSlider",
  "esri/undoManager",
  "application/Operations/ApplyStyle",
  "application/dijit/ColorSelectorDialog",
  "application/jsoneditor-master/dist/jsoneditor"
], function (declare, lang, array, Color, colors, query, json, Deferred, all, on, dom, domAttr, domStyle, domClass, put,
             arcgisUtils, arcgisPortal, urlUtils, esriRequest, Map, IdentityManager, HomeButton, Search, VectorTileLayer,
             Memory, Observable, OnDemandList, OnDemandGrid, Selection, editor, DijitRegistry,
             registry, ConfirmDialog, ValidationTextBox, CheckBox, Select, Tooltip, UniqueComboBox,
             HorizontalRangeSlider, UndoManager, ApplyStyle, ColorSelectorDialog, JSONEditor) {

  /**
   *
   * TODO: USE dojo/_base/Color(...) FROM THE VERY START FOR ALL COLOR ISSUES INSTEAD OF ASSUMING HEX VALUES...
   *
   *   From: https://www.mapbox.com/mapbox-gl-style-spec/#types-color
   *   TODO: does dojo/_base/Color(...) work correctly for all these possible color values?
   *
   *       "#ff0"
   *       "#ffff00"
   *       "rgb(255, 255, 0)"
   *       "rgba(255, 255, 0, 1)"
   *       "hsl(100, 50%, 50%)"
   *       "hsla(100, 50%, 50%, 1)"
   *       "yellow"
   *
   *       background-color
   *       fill-color
   *       fill-outline-color
   *       line-color
   *       icon-color
   *       icon-halo-color
   *       text-color
   *       text-halo-color
   *       circle-color
   */


  /**
   * MAIN APPLICATION
   */
  var MainApp = declare(null, {

    // HEX COLOR REGEXP //
    //https://jex.im/regulex/#!embed=false&flags=i&re=%23[0-9a-f]{6}|%23[0-9a-f]{3}
    hexColorRegEx: /#[0-9a-f]{6}|#[0-9a-f]{3}/ig,

    // ZOOM RANGE //
    zoomRange: {
      min: 0,
      max: 20,
      count: 21
    },

    // STYLE LAYER TYPES //
    styleLayerTypes: [
      "background",
      "fill",
      "line",
      "symbol",
      "raster",
      "circle"
    ],

    // LAYOUT VISIBILITY //
    LAYOUT_VISIBILITY: {
      NONE: "none",
      VISIBLE: "visible"
    },

    // PAINT COLOR TYPES //
    paintColorTypes: [
      "background-color",
      "fill-color",
      "fill-outline-color",
      "line-color",
      "icon-color",
      "icon-halo-color",
      "text-color",
      "text-halo-color",
      "circle-color"
    ],

    /**
     * CONSTRUCTOR
     *
     * @param config
     */
    constructor: function (config) {
      declare.safeMixin(this, config);
    },

    /**
     * STARTUP
     */
    startup: function () {

      /* SIGN OUT
       this.portal.signOut();
       IdentityManager.destroyCredentials();
       window.location.reload();
       */

      // PORTAL //
      this.portal = new arcgisPortal.Portal(this.sharinghost);
      this.portal.on("load", function () {
        // SIGN IN //
        this.portal.signIn().then(function (loggedInUser) {

          // PORTAL ONLY SUPPORTS HTTPS //
          var notSecure = /http:/i;
          if(this.portal.allSSL && notSecure.test(window.location.protocol)) {
            alert("Your ArcGIS.com organization requires all traffic be secure.  Please sign in again after we restart this app...");
            // FORCE HTTPS //
            window.location = window.location.href.replace(notSecure, "https:");
          }

          // WELCOME DIALOG CONTENT //
          var welcomeContent = put("div");

          // WARNING //
          //put(welcomeContent, "div", { innerHTML: "<strong>W A R N I N G</strong>: this application is going through some updates and may not work as expected." });
          //put(welcomeContent, "br");

          // DEPLOYMENT //
          put(welcomeContent, "div", "DEPLOYMENT");
          var deploymentList = put(welcomeContent, "ol.welcome-content");
          put(deploymentList, "li", "Get copy of this application from GitHub and deploy to a web accessible location");
          put(deploymentList, "li", "Create a new web application item in your Org pointing to your application");
          put(deploymentList, "li", "Register the new web application item and make note of the App ID");
          put(deploymentList, "li", "In ../config/default.js change the oauthappid to the above App ID");

          // DETAILS //
          put(welcomeContent, "div", "DETAILS");
          var detailsList = put(welcomeContent, "ul.welcome-content");
          put(detailsList, "li", "Always make a backup copy of the item before using this app");
          put(detailsList, "li", "The user experience is focused on color replacement");
          put(detailsList, "li", "Edit style json directly by clicking on 'id' cell. Warning: use caution!");

          // VERSION //
          put(welcomeContent, "div", "VERSION - " + MainApp.version);
          var versionList = put(welcomeContent, "ul.welcome-content");
          put(versionList, "li", "JS API 3.21");
          put(versionList, "li", "The 'Pick Color' tool has been added back to UI");
          put(versionList, "li", "The ‘Pick Color’ tool only works on locations where styles don’t have opacity");
          put(versionList, "li", "The 'Find Similar' option will try to find the 'nearest' color when the exact color is not found");

          // WELCOME DIALOG //
          var welcomeDlg = new ConfirmDialog({
            title: MainApp.appName,
            closable: false,
            content: welcomeContent
          });
          domClass.add(welcomeDlg.cancelButton.domNode, "dijitHidden");
          welcomeDlg.show();

          // SET PORTAL USER //
          this.portalUser = loggedInUser;

          // UPDATE USER INFO //
          this.updateUserInfo();

          // CREATE JSON EDITOR //
          this.initializeJsonEditor();

          // INITIALIZE GRIDS //
          this.initializeGrids();

          // GET VECTOR TILE ITEM LIST //
          this.initializeBasemapItemList();

          // GET DEFAULT ITEMS //
          this.initializeCopyDefaultEsriItem();

          // INITIALIZE COLOR SELECTION DIALOG //
          this.initializeColorSelectDialog();

          // INITIALIZE LAYER TYPE SELECT //
          this.initStyleLayerTypesSelect();

          // INITIALIZE FIND AND REPLACE NODES //
          this.initializeFindReplace();

          // UNDO MANAGER //
          this.initializeUndoManager();

          // SAVE BASEMAP STYLE //
          registry.byId("update-btn").on("click", this.saveStyleChangesToUserItem.bind(this));

          // CLEAR DISPLAY MESSAGE //
          MainApp.displayMessage();
        }.bind(this), MainApp.displayMessage);
      }.bind(this));

    },

    /**
     * UPDATE USER INFORMATION - FULL NAME AND THUMBNAIL
     */
    updateUserInfo: function () {
      var portalUserNode = dom.byId("portaluser-section");
      if(this.portalUser) {
        put(portalUserNode, "tr td $ <td img.user-thumb", this.portalUser.fullName, { src: this.portalUser.thumbnailUrl });
      } else {
        portalUserNode.innerHTML = "";
      }
    },

    /**
     * INITIALIZE THE VARIOUS GRIDS AND LISTS USED IN THE APP
     */
    initializeGrids: function () {


      // =========================================================================================== //

      // ITEM LIST //
      this.userBasemapsItemsList = new (declare([OnDemandGrid, Selection, DijitRegistry]))({
        bufferRows: 300,
        sort: [{ attribute: "title", descending: false }],
        noDataMessage: "No Items",
        selectionMode: "single",
        columns: [
          {
            label: "Title",
            field: "title",
            renderCell: function (item, value, node, options) {
              var titleNode = put("div.basemap-item-title");
              var titleLabelNode = put(titleNode, "span", value);
              titleLabelNode.title = item.id;

              var detailsNode = put(titleNode, "span.basemap-item-action", "details");
              on(detailsNode, "click", function (evt) {
                evt.stopPropagation();
                var detailsUrlTemplate = (item.owner === this.portalUser.username) ? "{0}//{1}.{2}/home/item.html?id={4}" : "{0}//{3}/home/item.html?id={4}";
                var agsDetailsUrl = lang.replace(detailsUrlTemplate, [document.location.protocol, this.portalUser.portal.urlKey, this.portalUser.portal.customBaseUrl, this.portalUser.portal.portalHostname, item.id]);
                window.open(agsDetailsUrl);
              }.bind(this));

              return titleNode;
            }.bind(this)
          },
          {
            label: "Owner",
            field: "owner"
          },
          {
            label: "Access",
            field: "access"
          }
        ]
      }, dom.byId("item-list-node"));
      this.userBasemapsItemsList.startup();

      // ROW CLICK //
      this.userBasemapsItemsList.on("dgrid-select", function (evt) {
        var item = evt.rows[0].data;
        registry.byId("update-btn").set("disabled", (item.owner != this.portalUser.username));
        this.itemSelected(item);
      }.bind(this));


      // =========================================================================================== //

      // STYLE LAYER LIST //
      var StyleLayersList = declare([OnDemandGrid, Selection, editor, DijitRegistry], { keepScrollPosition: true });

      // =========================================================================================== //


      // FILTER TEXTBOX //
      this.filterInput = registry.byId("filter-input");
      this.filterInput.on("change", function (evt) {
        this.sourceLayerList.set("value", null);
        this.styleLayersList.refresh();
      }.bind(this));

      // SOURCE-LAYER COMBOBOX FILTER //
      this.sourceLayerList = new UniqueComboBox({
        style: "width:250px;",
        placeHolder: 'select source-layer',
        searchAttr: "source-layer",
        intermediateChanges: true,
        fetchProperties: { sort: [{ attribute: "source-layer", descending: false }] }
      }, dom.byId("source-layer-combo"));
      this.sourceLayerList.startup();
      this.sourceLayerList.on("change", function (evt) {
        this.filterInput.set("value", null);
        this.styleLayersList.refresh();
      }.bind(this));

      // USE CURRENT ZOOM FILTER //
      registry.byId("current-zoom-chk").on("change", function (evt) {
        this.styleLayersList.refresh();
      }.bind(this));

      // STYLE LAYERS LIST //
      this.styleLayersList = new StyleLayersList({
        sort: [{ attribute: "source-layer", descending: false }, { attribute: "minzoom", descending: false }],
        noDataMessage: "No Styles",
        selectionMode: "none",
        columns: this.getStyleColumns(true),
        query: this.searchBySourceLayers.bind(this)
      }, put(dom.byId("full-list-node"), "div"));
      this.styleLayersList.startup();
      this.styleLayersList.on(".dgrid-cell.field-id:click", this.idCellClick.bind(this, this.styleLayersList));
      this.styleLayersList.on(".dgrid-cell.field-zoom:mouseover", this.zoomCellOver.bind(this, this.styleLayersList));
      this.styleLayersList.on(".dgrid-cell.field-zoom:mouseout", this.zoomCellOut.bind(this, this.styleLayersList));

      // CLEAR FILTERS //
      on(dom.byId("clear-source-layer-filter"), "click", function (evt) {
        registry.byId("current-zoom-chk").set("checked", false);
        this.sourceLayerList.set("value", null);
        this.filterInput.set("value", null);
      }.bind(this));


      // =========================================================================================== //


      // COLOR FIND/REPLACE RESULTS LIST //
      this.searchResultsList = new StyleLayersList({
        noDataMessage: "No Styles",
        columns: this.getStyleColumns(),
        query: this.searchByColorAndType.bind(this),
        sort: [{ attribute: "source-layer", descending: false }, { attribute: "minzoom", descending: false }]
      }, put(dom.byId("search-results-node"), "div.style-layer-list"));
      this.searchResultsList.startup();
      this.searchResultsList.on(".dgrid-cell.field-id:click", this.idCellClick.bind(this, this.searchResultsList));
      this.searchResultsList.on(".dgrid-cell.field-zoom:mouseover", this.zoomCellOver.bind(this, this.searchResultsList));
      this.searchResultsList.on(".dgrid-cell.field-zoom:mouseout", this.zoomCellOut.bind(this, this.searchResultsList));

      // =========================================================================================== //


      // BASEMAP COLOR PALETTE LIST //
      this.basemapColorList = new (declare([OnDemandList, DijitRegistry]))({
        sort: "luminosity",
        noDataMessage: "No Colors",
        renderRow: function (colorItem) {
          var colorNode = this._createColorNode(put("div"), colorItem.color, ".selectable.pallet-node");
          on(colorNode, "click", function (evt) {
            this.setColorSearch(colorItem.color);
          }.bind(this));
          return colorNode;
        }.bind(this)
      }, put(dom.byId("color-pallet-node"), "div"));
      this.basemapColorList.startup();


      // =========================================================================================== //

      // SET VISIBILITY //
      on(dom.byId("select-all-filter"), "click", this._setVisibility.bind(this, true));
      on(dom.byId("select-none-filter"), "click", this._setVisibility.bind(this, false));

    },

    /**
     * UPDATE ITEM VISIBILITY BASED ON LIST QUERY
     *
     * @param isVisible
     * @private
     */
    _setVisibility: function (isVisible) {

      var searchItems = this.styleLayersStore.query(this.styleLayersList.query);
      var visibilityUpdates = array.map(searchItems, function (otherItem) {
        return this._updateItemVisibility(otherItem, isVisible);
      }.bind(this));
      all(visibilityUpdates).then(function () {
        this.applyBasemapStyle("Batch Visibility Update");
      }.bind(this), console.warn);

    },

    /**
     *
     * @param list
     * @param evt
     */
    zoomCellOver: function (list, evt) {
      var cell = list.cell(evt);
      if(cell.row) {
        var item = cell.row.data;
        var zoomLevelInfos = {
          min: parseInt(item.minzoom || this.zoomRange.min, 10),
          max: parseInt(item.maxzoom || this.zoomRange.max, 10)
        };
        Tooltip.show(lang.replace('<div style="width:120px;">Zoom Levels: {min} to {max}</div>', zoomLevelInfos), cell.element);
      }
    },

    /**
     *
     * @param list
     * @param evt
     */
    zoomCellOut: function (list, evt) {
      Tooltip.hide(list.cell(evt).element);
    },

    /**
     * EDIT STYLE JSON DIRECTLY
     *
     * @param list
     * @param evt
     */
    idCellClick: function (list, evt) {
      var cell = list.cell(evt);
      var field = cell.column.field;
      if(field === "id") {
        this.editStyleLayerJson(cell.row.data);
      }
    },

    /**
     *  CREATE STYLE LAYER TYPE STORE AND LIST
     */
    initStyleLayerTypesSelect: function () {

      this.styleLayerTypesStore = new Memory({
        data: array.map(this.styleLayerTypes, function (styleLayerType) {
          return { id: styleLayerType, name: styleLayerType }
        }.bind(this))
      });

      this.paintColorTypeSelect = registry.byId("style-layer-type-select");
      this.paintColorTypeSelect.on("change", function () {
        this.searchResultsList.refresh();
      }.bind(this));
      this.paintColorTypeSelect.set("store", this.styleLayerTypesStore);

      /*
       this.paintColorTypeSelect2 = registry.byId("style-layer-type-select-2");
       this.paintColorTypeSelect2.on("change", function () {
       this.styleLayersList.refresh();
       }.bind(this));
       this.paintColorTypeSelect2.set("store", this.styleLayerTypesStore);
       */

    },

    /**
     * INITIALIZE FIND AND REPLACE
     */
    initializeFindReplace: function () {

      // REPLACE NODES //
      if(!this.replaceSourceColorNode) {

        // REPLACE SOURCE NODE //
        this.replaceSourceColorNode = this._createColorNode(dom.byId("replace-source-color-node"), "#FF0000", ".replace-color-node", true);

        // REPLACE TARGET NODE //
        this.replaceTargetColorNode = this._createColorNode(dom.byId("replace-target-color-node"), "#FF0000", ".selectable.replace-color-node", true);
        on(this.replaceTargetColorNode, "click", function (evt) {
          var sourceColor = domAttr.get(this.replaceSourceColorNode, "data-color");
          var targetColor = domAttr.get(this.replaceTargetColorNode, "data-color");
          this.selectColor(sourceColor, targetColor).then(function (selectedColor) {
            this._updateColorNode(this.replaceTargetColorNode, selectedColor);
          }.bind(this), console.warn);
        }.bind(this));

        // REPLACE COLOR //
        registry.byId("replace-color-btn").on("click", function (evt) {

          // SOURCE AND TARGET COLORS //
          var sourceColor = domAttr.get(this.replaceSourceColorNode, "data-color");
          var targetColor = domAttr.get(this.replaceTargetColorNode, "data-color");

          // UPDATE ITEMS //
          var noSelection = (Object.keys(this.searchResultsList.selection).length === 0);
          var searchItems = this.styleLayersStore.query(this.searchResultsList.query);
          var itemUpdates = array.map(searchItems, function (item) {
            return this._updateItemPaint(noSelection, item, sourceColor, targetColor);
          }.bind(this));
          all(itemUpdates).then(function () {
            // APPLY STYLE //
            this.applyBasemapStyle("Batch Color Replace");
          }.bind(this), console.warn);

          // UPDATE COLOR NODE AND SET AS SEARCH COLOR //
          this._updateColorNode(this.replaceSourceColorNode, targetColor);
          this.setColorSearch(targetColor);

          // COLORS CHANGED //
          this.updateBasemapColorPalette(sourceColor, targetColor);

        }.bind(this));
      }

    },

    /**
     * UPDATE ITEM
     *
     * @param noSelection
     * @param item
     * @param sourceColor
     * @param targetColor
     * @returns {*}
     * @private
     */
    _updateItemPaint: function (noSelection, item, sourceColor, targetColor) {
      var deferred = new Deferred();

      var isSelected = this.searchResultsList.isSelected(item.id);
      if(noSelection || isSelected) {
        setTimeout(function () {
          var paintProp = json.stringify(item.paint);
          var updatePaintProp = paintProp.replace(new RegExp(sourceColor, "gi"), targetColor.toUpperCase());
          item.paint = json.parse(updatePaintProp);
          this.styleLayersStore.put(item);
          deferred.resolve();
        }.bind(this), 0);
      } else {
        deferred.resolve();
      }

      return deferred.promise;
    },

    /**
     * INITIALIZE UNDO MANAGER
     */
    initializeUndoManager: function () {

      // UNDO MANAGER //
      this.undoManager = new UndoManager({ maxOperations: 100 });
      // UNDO MANAGER EVENT //
      this.undoManager.on("change", function (evt) {
        registry.byId("undo-btn").set("disabled", !this.undoManager.canUndo);
        registry.byId("redo-btn").set("disabled", !this.undoManager.canRedo);
      }.bind(this));

      // UNDO/REDO BUTTON CLICKS //
      registry.byId("undo-btn").on("click", lang.hitch(this.undoManager, this.undoManager.undo));
      registry.byId("redo-btn").on("click", lang.hitch(this.undoManager, this.undoManager.redo));

      // MOUSE OVER UNDO BUTTON //
      registry.byId("undo-btn").on("mouseover", function () {
        /*
         var undoStackInfos = array.map(this.undoManager._historyStack, function (stackItem) {
         return stackItem.label;
         }.bind(this));
         registry.byId("undo-btn").set("title", undoStackInfos.join("\n"));
         */
        registry.byId("undo-btn").set("title", "Undo " + (this.undoManager.canUndo ? this.undoManager.peekUndo().label : ""));
      }.bind(this));

      // MOUSE OVER REDO BUTTON //
      registry.byId("redo-btn").on("mouseover", function () {
        registry.byId("redo-btn").set("title", "Redo " + (this.undoManager.canRedo ? this.undoManager.peekRedo().label : ""));
      }.bind(this));

    },

    /**
     * INITIALE COLOR SELECTION DIALOG //
     */
    initializeColorSelectDialog: function () {
      if(!this.colorSelectorDialog) {
        this.colorSelectorDialog = new ColorSelectorDialog();
      }
    },

    /**
     * USE COLOR SELECTION DIALOG TO GET NEW COLOR
     *
     * @param sourceColor
     * @param targetColor
     * @returns {*}
     */
    selectColor: function (sourceColor, targetColor) {
      var deferred = new Deferred();

      this.colorSelectorDialog.setColors(sourceColor, targetColor);
      on.once(this.colorSelectorDialog, "execute", function (evt) {
        deferred.resolve(this.colorSelectorDialog.getSelectedColor());
      }.bind(this));
      this.colorSelectorDialog.show();

      return deferred.promise;
    },

    /**
     *  INITIALIZE JSON EDITOR
     *
     *  https://github.com/josdejong/jsoneditor/
     */
    initializeJsonEditor: function () {

      // JSON EDITOR DIALOG //
      this.styleLayerEditorDialog = registry.byId("style-layer-editor-dialog");
      var jsonEditorNode = put(this.styleLayerEditorDialog.containerNode, "div.jsoneditor-node");

      // JSON EDITOR OPTIONS //
      var jsonEditorOptions = {
        editable: function (node) {
          return {
            field: false,
            value: true
          };
        }
      };
      // JSON EDITOR //
      this.jsonEditor = new JSONEditor(jsonEditorNode, jsonEditorOptions);
      //this.jsonEditor.setMode('tree');  // Available modes: 'tree' (default), 'view', 'form', 'text', and 'code'.

      // JSON EDITOR //
      //this.fullJsonEditor = new JSONEditor(dom.byId("json-editor-node"),{});
      //this.fullJsonEditor.setMode('code');
    },

    /**
     * INITIALIZE USER VECTOR TILE SERVICE ITEM LIST
     */
    initializeBasemapItemList: function () {

      if(this.portalUser) {

        // USER VECTOR TILE BASEMAPS //
        //var itemQuery = 'owner:{username} AND typekeywords:"Vector Tile Service" AND -typekeywords:"Hosted"';
        var itemQuery = 'owner:{username} AND typekeywords:"Vector Tile Service"';

        // GET VECTOR TILE SERVICE ITEMS //
        this.portalUser.portal.queryItems({
          q: lang.replace(itemQuery, this.portalUser),
          num: 100
        }).then(function (queryResponse) {
          console.info("QUERY RESPONSE: ", queryResponse);

          // ITEM STORE //
          this.userBasemapsItemsStore = new Observable(new Memory({ data: queryResponse.results }));
          // ITEM LIST //
          this.userBasemapsItemsList.set("store", this.userBasemapsItemsStore);
          if(queryResponse.total > 0) {
            this.userBasemapsItemsList.select(this.userBasemapsItemsStore.data[0].id);
          }

        }.bind(this));
      }

    },

    /**
     * INITIALIZE ABILITY TO COPY DEFAULT ESRI BASEMAP ITEM
     */
    initializeCopyDefaultEsriItem: function () {

      // ARCGIS.COM //
      if(this.portal.portalName === "ArcGIS Online") {

        // ESRI VECTOR BASEMAPS GROUP  //
        //  - http://www.arcgis.com/home/group.html?id=30de8da907d240a0bccd5ad3ff25ef4a&focus=layers
        //var itemQuery = 'group:30de8da907d240a0bccd5ad3ff25ef4a AND typekeywords:"Vector Tile Service" AND -typekeywords:"Hosted"';
        var itemQuery = 'group:30de8da907d240a0bccd5ad3ff25ef4a AND typekeywords:"Vector Tile Service"';

        // GET ESRI VECTOR TILE SERVICE ITEMS //
        this.portalUser.portal.queryItems({
          q: lang.replace(itemQuery, this.portalUser),
          num: 100
        }).then(function (queryResponse) {
          // ESRI BASEMAPS ITEM STORE //
          this.esriBasemapsItemsStore = new Observable(new Memory({ data: queryResponse.results }));
          registry.byId("create-copy-btn").set("disabled", false);
        }.bind(this));

        // CREATE COPY BUTTON CLICK //
        registry.byId("create-copy-btn").on("click", function () {

          // CREATE BASEMAP COPY DIALOG //
          var createCopyDlg = new ConfirmDialog({ title: "Copy Esri Vector Basemap Item" });
          createCopyDlg.okButton.set("disabled", true);
          createCopyDlg.show();

          // NEW ITEM TITLE //
          var itemTitleNode = put(createCopyDlg.actionBarNode, "div.item-title");
          put(itemTitleNode, "label", "New Title: ");
          var itemTitleInput = new ValidationTextBox({
            required: true,
            invalidMessage: "Item with this title already exists...",
            validator: function (value, constraints) {
              var isValidTitle = value ? (this.userBasemapsItemsStore.query({ title: value }).total === 0) : false;
              createCopyDlg.okButton.set("disabled", !isValidTitle);
              return isValidTitle;
            }.bind(this)
          }, put(itemTitleNode, "div"));

          // DIALOG CONTENT //
          var dialogContent = put(createCopyDlg.containerNode, "div.dialog-content");

          // ESRI VECTOR BASEMAP LIST //
          this.esriBasemapItemList = new (declare([OnDemandList, Selection, DijitRegistry]))({
            store: this.esriBasemapsItemsStore,
            sort: "title",
            selectionMode: "single",
            renderRow: function (item) {
              var basemapNode = put("div.basemap-node");
              put(basemapNode, "div.basemap-title-node", item.title);
              put(basemapNode, "img.basemap-thumb-node", { src: item.thumbnailUrl });
              put(basemapNode, "div.basemap-snippet-node", item.snippet);
              //put(basemapNode, "fieldset.basemap-description-node", {legend: 'Description', innerHTML: item.description});
              return basemapNode;
            }.bind(this)
          }, put(dialogContent, "div"));
          this.esriBasemapItemList.startup();
          // BASEMAP SELECTED //
          this.esriBasemapItemList.on("dgrid-select", function (evt) {
            createCopyDlg.selectedItem = evt.rows[0].data;
            itemTitleInput.set("value", this.suggestTitle(createCopyDlg.selectedItem.title));
          }.bind(this));
          this.esriBasemapItemList.on("dgrid-deselect", function () {
            createCopyDlg.selectedItem = null;
            itemTitleInput.set("value", null);
          }.bind(this));

          // SUGGEST VALID ITEM TITLE //
          this.suggestTitle = function (initialTitle) {
            var copyCount = 1;
            var newTitle = initialTitle + " - Copy";
            while (this.userBasemapsItemsStore.query({ title: newTitle }).total > 0) {
              newTitle = initialTitle + " - Copy" + (++copyCount);
            }
            return newTitle;
          }.bind(this);

          // OK BUTTON CLICK //
          createCopyDlg.on("execute", function () {
            if(createCopyDlg.selectedItem) {
              // ITEM TO COPY //
              var copyItem = createCopyDlg.selectedItem;

              // EXTENT //
              var extentText = lang.replace("{0},{1},{2},{3}", [copyItem.extent[0][0], copyItem.extent[0][1], copyItem.extent[1][0], copyItem.extent[1][1]]);

              // ADD ITEM //
              esriRequest({
                url: lang.replace("{userContentUrl}/addItem", this.portalUser),
                content: {
                  f: "json",
                  type: "Vector Tile Service",
                  originItemId: copyItem.id,
                  relationshipType: "Style2Style",
                  url: copyItem.url,
                  title: itemTitleInput.get("value"),
                  snippet: copyItem.snippet,
                  description: copyItem.description,
                  tags: copyItem.tags.join(","),
                  extent: extentText,
                  thumbnailUrl: copyItem.thumbnailUrl
                }
              }).then(function (addItemResponse) {
                if(addItemResponse.success) {

                  // GET COPY ITEM STYLE //
                  esriRequest({
                    url: lang.replace("{itemUrl}/resources/styles/root.json", copyItem),
                    content: { f: "json" }
                  }).then(function (copyStyle) {

                    // COPY SOURCE STYLE //
                    var newStyle = this._cloneVectorTileLayerStyle(copyStyle);

                    // URL INFO //
                    var urlInfo = {
                      userContentUrl: this.portalUser.userContentUrl,
                      itemsFolder: (addItemResponse.folder) ? addItemResponse.folder + "/items" : "items",
                      itemId: addItemResponse.id
                    };

                    // ADD STYLE RESOURCE //
                    esriRequest({
                      url: lang.replace("{userContentUrl}/{itemsFolder}/{itemId}/addResources", urlInfo),
                      content: {
                        f: "json",
                        resourcesPrefix: "styles",
                        filename: "root.json",
                        text: json.stringify(newStyle)
                      }
                    }, { usePost: true }).then(function (addResourcesResponse) {
                      if(addResourcesResponse.success) {
                        this.displayMessageDialog("Esri Vector Basemap copied...");
                        // GET NEW BASEMAP ITEM //
                        this.portalUser.getItem(addItemResponse.id).then(function (newBasemapItem) {
                          this.userBasemapsItemsStore.add(newBasemapItem);
                        }.bind(this), console.warn);

                      } else {
                        this.displayMessageDialog("Unable to copy Esri Basemap");
                        console.warn("Unable to copy Esri Basemap: ", addResourcesResponse);
                      }
                    }.bind(this));
                  }.bind(this));
                } else {
                  console.warn("Unable to add new Basemap item: ", addItemResponse);
                }
              }.bind(this));
            }
          }.bind(this));
        }.bind(this));
      } else {
        // NOT ARCGIS.COM //
        registry.byId("create-copy-btn").set("disabled", true);
      }
    },

    /**
     * GET USER ITEM - MAKE SURE WE GET ITEM DIRECTLY FROM PORTAL USER INSTEAD OF SEARCH
     *
     * @param item
     * @returns {*}
     * @private
     */
    _getUserItem: function (item) {
      var deferred = new Deferred();
      if(item.userItemUrl) {
        deferred.resolve(item);
      } else {
        this.portalUser.getItem(item.id).then(function (userItem) {
          // UPDATE USER BASEMAP ITEMS STORE //
          this.userBasemapsItemsStore.put(userItem);
          deferred.resolve(userItem);
        }.bind(this));
      }
      return deferred.promise;
    },

    /**
     * USER VECTOR TILE SERVICE ITEM SELECTED
     *
     * @param item
     */
    itemSelected: function (item) {

      // GET ITEM VIA PORTAL USER //
      this._getUserItem(item).then(function (userItem) {

        // SELECTED ITEM //
        this.selectedItem = userItem;

        // DISPLAY VECTOR BASEMAP //
        if(!this.map) {
          // ONLY CREATE MAP ONCE //
          this.map = new Map("map-node", {
            sliderOrientation: "horizontal",
            zoom: 1
          });

          // ZOOM LEVEL NODE //
          domClass.remove(dom.byId("zoom-node"), "dijitHidden");

          // MAP ZOOM-END EVENT //
          this.map.on("zoom-end", function (evt) {
            dom.byId("zoom-node").innerHTML = lang.replace("Zoom: {level}", evt);
            if(this.styleLayersList && registry.byId("current-zoom-chk").get("checked")) {
              this.styleLayersList.refresh();
            }
          }.bind(this));

          // HOME BUTTON //
          this.homeButton = new HomeButton({
            map: this.map,
            extent: this.map.extent,
            visible: true
          }, "home-button-node");
          this.homeButton.startup();

          // INIT SEARCH //
          this.initSearch();

          // INITIALIZE EYE TOOL //
          this.initializeEyeTool();

        } else {
          // REMOVE PREVIOUS LAYERS //
          this.map.removeAllLayers();
        }

        // GET STYLE //
        esriRequest({
          url: lang.replace("{itemUrl}/resources/styles/root.json", this.selectedItem),
          content: { f: "json" }
        }).then(function (style) {
          console.info("root.json", style);

          var isSecure = /https:/i;
          if(isSecure.test(window.location.protocol)) {
            style.glyphs = style.glyphs.replace(/http:/gi, "https:");
            style.sprite = style.sprite.replace(/http:/gi, "https:");
            style.sources.esri.url = style.sources.esri.url.replace(/http:/gi, "https:");
          }

          // VECTOR BASEMAP LAYER //
          // - THERE ARE SEVERAL WAYS TO CREATE VECTORTILELAYER...
          //   HERE WE PASS IN THE STYLE DIRECTLY INTO THE CONSTRUCTOR
          this.vectorBasemapLayer = new VectorTileLayer(this._cloneVectorTileLayerStyle(style));
          this.vectorBasemapLayer.on("error", function (evt) {
            console.warn("vectorBasemapLayer.error: ", evt.error);
          }.bind(this));
          this.vectorBasemapLayer.on("load", function () {

            this.vectorBasemapLayer.on("style-change", function (event) {
              console.info("style-change: ", event);
            });

            // VECTOR BASEMAP STYLES //
            this.vectorBasemapStylePrevious = this._cloneVectorTileLayerStyle(style);
            this.vectorBasemapStyle = this._cloneVectorTileLayerStyle(style);

            // DISPLAY STYLE LAYERS //
            this.displayStyleLayers(this.vectorBasemapStyle.layers);
            // CLEAR UNDO/REDO //
            if(this.undoManager) {
              this.undoManager.clearUndo();
              this.undoManager.clearRedo();
            }

            //this.fullJsonEditor.set(this.vectorBasemapStyle, "", true);
            //dom.byId("json-editor-node").innerHTML = "";
            //put(dom.byId("json-editor-node"), "pre", json.stringify(this.vectorBasemapStyle, null, "  "));
          }.bind(this));
          this.map.addLayers([this.vectorBasemapLayer]);


        }.bind(this), console.warn);
      }.bind(this), console.warn);

    },

    /**
     * CLONE A STYLE
     * - REMOVE _ssl PROPERTY FROM CLONE
     *
     * @param style
     * @returns {*}
     * @private
     */
    _cloneVectorTileLayerStyle: function (style) {
      var clonedStyle = lang.clone(style);
      if(clonedStyle.hasOwnProperty("_ssl")) {
        delete clonedStyle._ssl;
      }
      return clonedStyle;
    },

    /**
     * INITIALIZE SEARCH WIDGET
     */
    initSearch: function () {

      // SEARCH //
      this.search = new Search({
        map: this.map,
        autoNavigate: true,
        autoSelect: true,
        enableButtonMode: true,
        enableHighlight: true,
        enableLabel: false,
        enableInfoWindow: false,
        showInfoWindowOnSelect: false
      }, "search-node");
      this.search.startup();
    },


    /**
     * INITIALIZE COLOR PICKER MAP TOOL
     * - SEE CONSTRUCTOR FOR ADDITIONAL DETAILS...
     */
    initializeEyeTool: function () {

      // ENABLE EYE TOOL //
      domClass.remove("eye-tool-node", "dijitHidden");

      // EYE TOOL //
      this.eyeTool = registry.byId("eye-tool");

      // MOUSE CLICK //
      this.eyeTool.mapClickHandle = on.pausable(this.map, "click", function (evt) {
        // TAKE SCREENSHOT //
        this.vectorBasemapLayer.takeScreenshot().then(function (screenshotInfo) {
          // Based on https://stackoverflow.com/questions/3528299/get-pixel-color-of-base64-png-using-javascript //
          var image = new Image();
          image.onload = function () {
            var canvas = put("canvas", { width: screenshotInfo.width, height: screenshotInfo.height });
            var context = canvas.getContext("2d");
            context.drawImage(image, screenshotInfo.x, screenshotInfo.y);
            var imageData = context.getImageData(screenshotInfo.x, screenshotInfo.y, screenshotInfo.width, screenshotInfo.height);
            var index = (evt.offsetY * imageData.width + evt.offsetX) * 4;
            var red = imageData.data[index];
            var green = imageData.data[index + 1];
            var blue = imageData.data[index + 2];
            var imageColor = new Color([red, green, blue]);
            var findNearest = registry.byId("find-nearest-chk").get("checked");
            var screenColor = findNearest ? this._findNearestColor(imageColor) : imageColor;
            var screenColorHex = screenColor.toHex().toUpperCase();
            this._updateColorNode(this.replaceSourceColorNode, screenColorHex);
            this.setColorSearch(screenColorHex);
          }.bind(this);
          image.src = screenshotInfo.dataURL;
        }.bind(this));
      }.bind(this));
      this.eyeTool.mapClickHandle.pause();

      // EYE TOOL TOGGLE //
      this.eyeTool.on("change", function (checked) {
        if(checked && this.vectorBasemapLayer) {
          registry.byId("main-center-pane").selectChild(registry.byId("search-container")); // hhkaos //
          this.map.setMapCursor("crosshair");
          this.eyeTool.mapClickHandle.resume();
        } else {
          this.eyeTool.mapClickHandle.pause();
          this.map.setMapCursor("default");
        }
      }.bind(this));

    },

    /**
     * UPDATE ITEM VISIBILITY
     *
     * @param item
     * @param isVisible
     * @returns {*}
     * @private
     */
    _updateItemVisibility: function (item, isVisible) {
      var deferred = new Deferred();

      setTimeout(function () {
        var styleVisibility = (isVisible ? this.LAYOUT_VISIBILITY.VISIBLE : this.LAYOUT_VISIBILITY.NONE);
        item.layout = lang.mixin(item.layout || {}, { visibility: styleVisibility });
        this.styleLayersStore.put(item);
        deferred.resolve();
      }.bind(this), 0);

      return deferred.promise;
    },

    /**
     * DEFINE GRID COLUMNS FOR STYLE OBJECTS
     */
    getStyleColumns: function (displayAllColumns) {

      // SOURCE RELATED COLUMNS //
      var sourceColumns = [
        {
          label: "",
          field: "visibility",
          get: function (item) {
            if(item.layout && item.layout.visibility) {
              return (item.layout.visibility === this.LAYOUT_VISIBILITY.VISIBLE);
            } else {
              return true;
            }
          }.bind(this),
          renderCell: function (item, value, node, options) {
            // VISIBILITY CHECKBOX //
            var visCheckBox = new CheckBox({ checked: value });
            visCheckBox.on("change", function (isChecked) {
              this._updateItemVisibility(item, isChecked).then(function () {
                this.applyBasemapStyle("Visibility Update");
              }.bind(this), console.warn);
            }.bind(this));
            visCheckBox.startup();
            return visCheckBox.domNode;
          }.bind(this)
        },
        {
          label: "source-layer",
          field: "source-layer"
        }
      ];

      // ITEM RELATED COLUMNS //
      var itemColumns = [
        {
          label: "id",
          field: "id"
        },
        editor({
          label: "zoom",
          field: "zoom",
          editor: HorizontalRangeSlider,
          editorArgs: {
            disabled: true,
            minimum: this.zoomRange.min,
            maximum: this.zoomRange.max,
            discreteValues: this.zoomRange.count,
            showButtons: false
          },
          get: function (item) {
            return [parseInt(item.minzoom || this.zoomRange.min, 10), parseInt(item.maxzoom || this.zoomRange.max, 10)];
          }.bind(this)
        }),
        {
          label: "type",
          field: "type"
        }
      ];

      // LAYOUT RELATED COLUMNS //
      var layoutColumns = [
        {
          label: "text-font",
          field: "text-font",
          get: function (item) {
            return item.layout ? item.layout["text-font"] || "" : "";
          }.bind(this)
        }
      ];

      // PAINT RELATED COLUMNS //
      var paintColumns = array.map(this.paintColorTypes, function (paintColorType) {
        return {
          label: paintColorType.replace(/-color/, ""),
          field: paintColorType,
          get: this._getPaintValue.bind(this, paintColorType),
          renderCell: this.renderPaintCell.bind(this, paintColorType)
        }
      }.bind(this));

      // RETURN LIST OF COLUMNS //
      if(displayAllColumns) {
        return sourceColumns.concat(itemColumns, paintColumns); //, layoutColumns);
      } else {
        return itemColumns.concat(paintColumns);
      }
    },

    /**
     * USE NEW STYLE LAYERS IN ALL RELEVANT UI PLACES
     *
     * @param styleLayers
     */
    displayStyleLayers: function (styleLayers) {

      // BASEMAP COLORS STORE //
      this.basemapColorsStore = new Observable(new Memory({ data: [] }));

      // CREATE COLOR STORE FOR ALL COLORS IN STYLE  //
      array.forEach(styleLayers, function (styleLayer) {
        if(styleLayer.hasOwnProperty("paint")) { // 'paint' is optional...
          var paintInfo = json.stringify(styleLayer["paint"]);
          var colorMatches = paintInfo.match(this.hexColorRegEx);
          array.forEach(colorMatches, function (colorMatch) {
            var hexColor = colorMatch.toUpperCase();
            if(!this.basemapColorsStore.get(hexColor)) {
              this.basemapColorsStore.add({ id: hexColor, color: hexColor, luminosity: (new Color(hexColor)).toHsl().l });
            }
          }.bind(this));
        } else {
          console.warn("No PAINT in style layer: ", json.stringify(styleLayer));
        }
      }.bind(this));

      // COLOR SELECTOR DIALOG //
      this.colorSelectorDialog.setBasemapColorStore(this.basemapColorsStore);

      // BASEMAP COLOR PALETTE LIST //
      this.basemapColorList.set("store", this.basemapColorsStore);

      // STYLE LAYERS STORE //
      this.styleLayersStore = new Observable(new Memory({ data: styleLayers }));

      // ALL STYLES LIST //
      this.styleLayersList.set("store", this.styleLayersStore);

      // SOURCE-LAYER LIST //
      this.sourceLayerList.set("store", this.styleLayersStore);

      // SEARCH RESULTS LIST //
      this.searchResultsList.set("store", this.styleLayersStore);


      // SET SOURCE/TARGET COLORS
      //var firstColor = this.basemapColorsStore.data[0].color;
      //this._updateColorNode(this.replaceSourceColorNode, firstColor);
      //this._updateColorNode(this.replaceTargetColorNode, firstColor);
      //this.setColorSearch(firstColor);

    },

    /**
     * UPDATE BASEMAP COLOR PALETTE WHEN COLOR HAS BEEN REPLACED
     *  - REMOVE COLOR IF NO OTHER STYLE IS USING THE OLD COLOR
     *  - ADD COLOR IF NEW COLOR IS NOT IN THE CURRENT BASEMAP COLOR LIST
     *
     * @param sourceColor
     * @param targetColor
     * @private
     */
    updateBasemapColorPalette: function (sourceColor, targetColor) {

      // HEX COLORS VALUES //
      var sourceColorHex = sourceColor.toUpperCase();
      var targetColorHex = targetColor.toUpperCase();

      // ARE THERE OTHER ITEMS STILL USING THIS COLOR? //
      var itemsWithColor = this.styleLayersStore.query(this.searchByColor.bind(this, sourceColorHex));
      if(itemsWithColor.length === 0) {
        this.basemapColorsStore.remove(sourceColorHex);
      }
      // IS THIS NEW COLOR NOT IN BASEMAP COLOR PALETTE? //
      if(!this.basemapColorsStore.get(targetColorHex)) {
        this.basemapColorsStore.add({ id: targetColorHex, color: targetColorHex, luminosity: (new Color(targetColorHex)).toHsl().l });
      }
    },

    /**
     * CREATE A COLOR NODE
     *  - A COLOR NODE IS A DOM NODE WITH THE STYLE BACKGROUND OF THE COLOR AND
     *    A NODE ATTRIBUTE CALLED 'data-color' WITH A VALUE OF THE COLOR AS HEX
     *
     * @param parent
     * @param colorStr
     * @param classNames
     * @param addColorName
     * @returns {*}
     * @private
     */
    _createColorNode: function (parent, colorStr, classNames, addColorName) {
      var colorNode = put(parent, "span.color-node" + (classNames || ""), { title: colorStr });
      if(addColorName) {
        colorNode.nameNode = put(parent, "span.color-name-node", colorStr);
      }

      domAttr.set(colorNode, "data-color", colorStr);
      domStyle.set(colorNode, "backgroundColor", colorStr);

      return colorNode;
    },

    /**
     * UPDATE COLOR NODE
     *
     * @param colorNode
     * @param colorStr
     * @private
     */
    _updateColorNode: function (colorNode, colorStr) {

      if(colorNode.nameNode) {
        colorNode.nameNode.innerHTML = colorStr;
      }

      domAttr.set(colorNode, "title", colorStr);
      domAttr.set(colorNode, "data-color", colorStr);
      domStyle.set(colorNode, "backgroundColor", colorStr);
    },

    /**
     * GET PAINT PROPERTY OF STYLE LAYER ITEM
     *
     * @param property
     * @param item
     * @returns {*}
     * @private
     */
    _getPaintValue: function (property, item) {
      if(item.paint && item.paint[property]) {
        return item.paint[property];
      } else {
        return "";
      }
    },

    /**
     * RENDER PAINT PROPERTY CELL NODE
     *  - A COLOR CELL REPRESENTS THE COLOR OF A PAINT PROPERTY OF A STYLE LAYER ITEM
     *
     * @param paintProperty
     * @param item
     * @param value
     * @param node
     * @param options
     * @returns {*}
     */
    renderPaintCell: function (paintProperty, item, value, node, options) {
      if(value) {
        var paintNode = put("div");

        if(value.stops) {
          array.forEach(value.stops, function (stopInfo, stopIndex) {
            this._createColorCell(paintNode, stopInfo, item, paintProperty, stopIndex);
          }.bind(this));
        } else {
          this._createColorCell(paintNode, value, item, paintProperty);
        }

        return paintNode
      }
    },

    /**
     * CREATE COLOR CELL
     *  - A COLOR CELL REPRESENTS THE COLOR OF A PAINT PROPERTY OF A STYLE LAYER ITEM
     *
     * @param parentNode
     * @param colorInfo
     * @param item
     * @param paintProperty
     * @param subIndex
     * @returns {*}
     * @private
     */
    _createColorCell: function (parentNode, colorInfo, item, paintProperty, subIndex) {

      if(colorInfo instanceof Array) {
        console.assert(colorInfo.length === 2, "colorInfo.length: ", colorInfo.length, paintProperty);
      }

      var colorStr = (colorInfo instanceof Array) ? colorInfo[1].toUpperCase() : colorInfo.toUpperCase();
      var label = (colorInfo instanceof Array) ? colorInfo.join(":").toUpperCase() : colorInfo.toUpperCase();

      var storeColor = this.basemapColorsStore.get(colorStr);
      var luminosity = storeColor ? storeColor.luminosity : 101;
      //console.assert(luminosity !== 101, "luminosity -- ", colorStr);

      var colorCell = put(parentNode, "div.color-cell", label);
      if(colorStr.search(this.hexColorRegEx) > -1) {
        domStyle.set(colorCell, "backgroundColor", colorStr);
        domStyle.set(colorCell, "color", (luminosity > 60) ? "#000000" : "#FFFFFF");
      }

      // COLOR CELL CLICK //
      on(colorCell, "click", function (evt) {
        // SELECT COLOR //
        this.selectColor(colorStr, colorStr).then(function (selectedColor) {
          // REPLACE COLOR //
          if(subIndex != null) {
            item.paint[paintProperty].stops[subIndex][1] = selectedColor;
          } else {
            item.paint[paintProperty] = selectedColor;
          }
          this.styleLayersStore.put(item);
          this.applyBasemapStyle("Color Replace");

          // COLORS CHANGED //
          this.updateBasemapColorPalette(colorStr, selectedColor);
        }.bind(this));

      }.bind(this));

      return colorCell;
    },

    /**
     * SET THE SEARCH COLOR
     *
     * @param colorHex
     * @private
     */
    setColorSearch: function (colorHex) {
      this._updateColorNode(this.replaceSourceColorNode, colorHex);
      this.searchResultsList.refresh();
    },

    /**
     * SEARCH BY COLOR LIST FILTER
     *
     * @param searchColor
     * @param item
     * @returns {boolean}
     */
    searchByColor: function (searchColor, item) {

      var searchFilter = false;

      if(item.hasOwnProperty("paint")) {
        var paintInfo = json.stringify(item["paint"]);
        if(paintInfo.toUpperCase().indexOf(searchColor.toUpperCase()) > -1) {
          searchFilter = true;
        }
      }

      return searchFilter;
    },

    /**
     * SEARCH BY COLOR AND TYPE LIST FILTER
     *
     * @param item
     * @returns {boolean}
     */
    searchByColorAndType: function (item) {

      var searchFilter = false;

      if(item.hasOwnProperty("paint")) {
        var paintInfo = json.stringify(item["paint"]);
        var searchColor = domAttr.get(this.replaceSourceColorNode, "data-color");
        if(paintInfo.toUpperCase().indexOf(searchColor.toUpperCase()) > -1) {
          searchFilter = true;
        }
      }

      var styleTypeList = registry.byId("style-layer-type-select");
      var selectedTypes = styleTypeList.get("value");
      if(selectedTypes.length > 0) {
        searchFilter = (searchFilter && (array.indexOf(selectedTypes, item.type) > -1));
      }

      return searchFilter;
    },

    /**
     * SEARCH LIST FILTER
     *  - NOTE: CURRENTLY NOT USED...
     *
     * @param item
     * @returns {boolean}
     */
    searchByFilter: function (item) {

      var filter = this.filterInput.get("value");
      if(filter && filter.length > 0) {
        var styleSourceLayer = item["source-layer"];
        var styleId = item.id;
        var pattern = new RegExp(filter, "ig");
        return (pattern.test(styleSourceLayer) || pattern.test(styleId));
      } else {
        return true;
      }
    },

    /**
     * DISPLAY STYLES BASED ON VISIBILITY, FILTER, AND/OR SOURCE LAYER
     *
     * @param item
     */
    searchBySourceLayers_prev: function (item) {

      var isVisible = true;
      if(registry.byId("current-zoom-chk").get("checked")) {
        var mapZoom = this.map.getZoom();
        isVisible = (mapZoom >= (item.minzoom || this.zoomRange.min)) && (mapZoom <= (item.maxzoom || this.zoomRange.max));
      }

      var styleSourceLayer = item["source-layer"];

      var filter = this.filterInput.get("value");
      if(filter && filter.length > 0) {
        var styleId = item.id;
        var pattern = new RegExp(filter, "ig");
        return isVisible && (pattern.test(styleSourceLayer) || pattern.test(styleId));

      } else {

        var isSourceLayer = true;
        var selectedSourceLayer = this.sourceLayerList.get("value");
        if(selectedSourceLayer) {
          isSourceLayer = (selectedSourceLayer === styleSourceLayer);
        }

        return isSourceLayer && isVisible;
      }
    },

    /**
     * DISPLAY STYLES BASED ON VISIBILITY, FILTER, AND/OR SOURCE LAYER
     *
     * @param item
     */
    searchBySourceLayers: function (item) {

      var isVisible = true;
      if(registry.byId("current-zoom-chk").get("checked")) {
        var mapZoom = this.map.getZoom();
        isVisible = (mapZoom >= (item.minzoom || this.zoomRange.min)) && (mapZoom <= (item.maxzoom || this.zoomRange.max));
      }

      var styleSourceLayer = item["source-layer"];

      var filter = this.filterInput.get("value");
      if(filter && filter.length > 0) {
        var pattern = new RegExp(filter, "ig");
        isVisible &= (pattern.test(styleSourceLayer) || pattern.test(item.id));
      } else {
        var selectedSourceLayer = this.sourceLayerList.get("value");
        if(selectedSourceLayer) {
          isVisible &= (selectedSourceLayer === styleSourceLayer);
        }
      }

      return isVisible;
    },

    /**
     * DISPLAY STYLE LAYER JSON EDITOR
     *
     * @param item
     */
    editStyleLayerJson: function (item) {

      if(this.styleLayerEditorDialogExecutteHandle) {
        this.styleLayerEditorDialogExecutteHandle.remove();
      }

      // ADD STYLE TO JSON EDITOR //
      this.jsonEditor.set(item, item.id, true);
      this.styleLayerEditorDialog.show();

      this.styleLayerEditorDialogExecutteHandle = on.once(this.styleLayerEditorDialog, "execute", function () {
        var updatedItem = this.jsonEditor.get();
        this.styleLayersStore.put(updatedItem);
        this.applyBasemapStyle("Style JSON Edit");
      }.bind(this));

    },


    /**
     *
     * @param screenColor
     * @returns {Color}
     * @private
     */
    _findNearestColor: function (screenColor) {
      var screenColorHex = screenColor.toHex().toUpperCase();
      var storeColor = this.basemapColorsStore.get(screenColorHex);
      if(storeColor) {
        return new Color(storeColor.color);
      } else {
        // Adapted from https://github.com/dtao/nearest-color/blob/master/nearestColor.js //
        var nearestColorInfo = { minDistance: Infinity, nearestColor: null };
        this.basemapColorsStore.query().forEach(function (basemapColorItem) {
          var basemapColor = new Color(basemapColorItem.color);
          var distance = Math.sqrt(Math.pow(screenColor.r - basemapColor.r, 2) + Math.pow(screenColor.g - basemapColor.g, 2) + Math.pow(screenColor.b - basemapColor.b, 2));
          if(distance < nearestColorInfo.minDistance) {
            nearestColorInfo.minDistance = distance;
            nearestColorInfo.nearestColor = basemapColor;
          }
        }.bind(this));
        return nearestColorInfo.nearestColor;
      }

    },

    /**
     *
     * @param updateType
     * @param undoItems
     * @param redoItems
     */
    /*updateBasemapStyle: function (updateType, undoItems, redoItems) {
     if(this.undoManager) {
     // ALLOW UNDO/REDO OPERATION //
     var styleUpdateOperation = new StyleUpdate({
     label: updateType || StyleUpdate.defaultLabel,
     store: this.styleLayersStore,
     undoItems: undoItems,
     redoItems: redoItems,
     updateStyleCallback: function () {

     this.vectorBasemapStyle.layers = this.styleLayersStore.query();

     // SET STYLE OF VECTOR BASEMAP //
     this.vectorBasemapLayer.setStyle(this._cloneVectorTileLayerStyle(this.vectorBasemapStyle));
     // DISPLAY STYLE LAYERS //
     this.displayStyleLayers(this.vectorBasemapStyle.layers);

     }.bind(this)
     });
     this.undoManager.add(styleUpdateOperation);
     }

     },*/

    /**
     * APPLY BASEMAP STYLE
     *  - CREATE APPLYSTYLE OPERATION AND ADD TO UNDO MANAGER
     *  - CLONE PREVIOUS AND CURRENT STYLES
     *  - UPDATE VECTOR TILE SERVICE LAYER WITH CURRENT STYLE
     *  - UPDATE UI ELEMENTS WITH NEW STYLE
     */
    applyBasemapStyle: function (operationName) {

      if(this.vectorBasemapLayer && this.vectorBasemapStyle) {

        if(this.undoManager) {
          // ALLOW UNDO/REDO OPERATION //
          var applyStyleOperation = new ApplyStyle({
            label: operationName || ApplyStyle.defaultLabel,
            layer: this.vectorBasemapLayer,
            undoStyle: this._cloneVectorTileLayerStyle(this.vectorBasemapStylePrevious),
            redoStyle: this._cloneVectorTileLayerStyle(this.vectorBasemapStyle),
            applyStyleCallback: this.displayStyleLayers.bind(this)
          });
          this.undoManager.add(applyStyleOperation);
        }

        // UPDATE STYLES //
        this.vectorBasemapStylePrevious = this._cloneVectorTileLayerStyle(this.vectorBasemapStyle);
        this.vectorBasemapStyle = this._cloneVectorTileLayerStyle(this.vectorBasemapStyle);

        //this.fullJsonEditor.set(this.vectorBasemapStyle, "", true);
        //dom.byId("json-editor-node").innerHTML = "";
        //put(dom.byId("json-editor-node"), "pre", json.stringify(this.vectorBasemapStyle, null, "  "));

        // SET STYLE OF VECTOR BASEMAP //
        this.vectorBasemapLayer.setStyle(this._cloneVectorTileLayerStyle(this.vectorBasemapStyle));
        // DISPLAY STYLE LAYERS //
        this.displayStyleLayers(this.vectorBasemapStyle.layers);

      }
    },

    /**
     * UPDATE SELECTED USER VECTOR TILE SERVICE ITEM WITH CURRENT STYLE
     */
    saveStyleChangesToUserItem: function () {

      if(this.selectedItem && this.vectorBasemapLayer) {
        // NEW STYLE //
        var newStyle = this._cloneVectorTileLayerStyle(this.vectorBasemapStyle);

        // REMOVE PREVIOUS STYLE //
        esriRequest({
          url: lang.replace("{userItemUrl}/removeResources", this.selectedItem),
          content: {
            f: "json",
            resource: "styles/root.json"
          }
        }, { usePost: true }).then(function (removeResponse) {
          if(removeResponse.success) {
            // ADD NEW STYLE //
            esriRequest({
              url: lang.replace("{userItemUrl}/addResources", this.selectedItem),
              content: {
                f: "json",
                resourcesPrefix: "styles",
                filename: "root.json",
                text: json.stringify(newStyle)
              }
            }, { usePost: true }).then(function (addResponse) {
              if(addResponse.success) {
                this.displayMessageDialog("Vector basemap style updated");
              } else {
                this.displayMessageDialog("Unable to add new style");
                console.warn("Unable to add new style", addResponse);
              }
            }.bind(this));
          } else {
            this.displayMessageDialog("Unable to remove previous style");
            console.warn("Unable to remove previous style", removeResponse);
          }
        }.bind(this));
      }

    },

    /**
     * DISPLAY MESSAGE IN DIALOG
     *
     * @param message
     */
    displayMessageDialog: function (message) {
      (new ConfirmDialog({ title: MainApp.appName, content: message })).show();
    },

    /**
     * DISPLAY STYLE LAYER DETAILS
     *  - NOTE: CURRENTLY NOT USED...
     *
     * @param style
     * @private
     */
    _displayStyleDetails: function (style) {
      var styleDlg = new ConfirmDialog({
        title: "Style",
        content: put("pre", json.stringify(style, null, "  "))
      });
      styleDlg.show();

    }

  });

  /**
   *  DISPLAY MESSAGE OR ERROR
   *
   * @param messageOrError {string | Error}
   * @param smallText {boolean}
   */
  MainApp.displayMessage = function (messageOrError, smallText) {
    require(["dojo/query", "put-selector/put"], function (query, put) {
      query(".message-node").orphan();
      if(messageOrError) {
        if(messageOrError instanceof Error) {
          put(document.body, "div.message-node.error-node span", messageOrError.message);
        } else {
          if(messageOrError.declaredClass === "esri.tasks.GPMessage") {
            var simpleMessage = messageOrError.description;
            put(document.body, "div.message-node span.esriJobMessage.$ span.small-text $", messageOrError.type, simpleMessage);
          } else {
            put(document.body, smallText ? "div.message-node span.small-text" : "div.message-node span", messageOrError);
          }
        }
      }
    });
  };

  MainApp.appName = "Vector Basemap Style Editor";
  MainApp.version = "0.1.3";

  return MainApp;
});