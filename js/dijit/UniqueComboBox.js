/**
 *
 * UniqueComboBox
 *  - COMBOBOX THAT ONLY DISPLAYS UNIQUE VALUES
 *
 * Adapted from: https://davidwalsh.name/unique-combobox
 *               https://github.com/dojo/dijit/blob/master/form/_ComboBoxMenu.js
 *               https://github.com/dojo/dijit/blob/master/form/_ComboBoxMenuMixin.js
 *
 * Author:   John Grayson - Applications Prototype Lab - Esri
 * Created:  11/30/2015 - 0.0.1 -
 * Modified: 12/18/2015 - 0.0.2 - GET searchAttr FROM COMBOX AND PASS ON TO COMBOXMENU
 *
 *
 * Usage:
 *
 *  var itemList = new UniqueComboBox({
 *    style: "width:250px;",
 *    placeHolder: 'select item',
 *    searchAttr: "source-layer",
 *    intermediateChanges: true,
 *    fetchProperties: { sort: [{ attribute: "source-layer", descending: false }] }
 *  }, "source-layer-combo");
 *  itemList.startup();
 *  itemList.on("change", lang.hitch(this, function (evt) {
 *    console.info(evt);
 *  }));
 *
 */

define([
  "dojo/_base/declare",
  "dijit/form/ComboBox",
  "dijit/form/_ComboBoxMenu",
  "dojo/_base/lang",
  "dojo/_base/array"
], function (declare, ComboBox, _ComboBoxMenu, lang, array) {

  /**
   *  COMBOBOXMENU THAT DISPLAYS UNIQUE VALUES
   */
  var _UniqueComboBoxMenu = declare(_ComboBoxMenu, {

    // CLASS NAME //
    declaredClass: "_UniqueComboBoxMenu",

    /**
     *
     * @param results
     * @param dataObject
     * @param labelFunc
     * @returns {*}
     */
    createOptions: function (results, dataObject, labelFunc) {

      // FILTER DUPLICATE VALUES IF WE HAVE searchAttr SET //
      if(this.searchAttr) {

        // UNIQUE KEYS AND ITEMS //
        var uniqueKeys = {};
        var uniqueItems = [];

        array.forEach(results, lang.hitch(this, function (result, index) {
          // FOR THIS DATA WE NEED TO ADDITIONALLY CHECK TO SEE //
          // IF THE ITEM HAS THE searchAttr PROPERTY...         //
          if(result.hasOwnProperty(this.searchAttr)) {
            var label = labelFunc(result);
            if(typeof label != "string") {
              label = label.label;
            }
            if(!uniqueKeys[label]) {
              uniqueKeys[label] = result;
              uniqueItems.push(result);
            }
          }
        }));

        // RESET RESULTS //
        arguments[0] = uniqueItems;
      }

      return this.inherited(arguments);
    }

  });

  /**
   * COMBOBOX THAT ONLY DISPLAYS UNIQUE VALUES IN searchAttr PROPERTY OF ITEMS
   */
  var UniqueComboBox = declare([ComboBox], {
    // DROPDOWN CLASS //
    dropDownClass: _UniqueComboBoxMenu,
    /**
     * OVERRIDE POSTCREATE SO WE CAN SET searchAttr ON COMBOBOXMENU
     */
    postCreate: function () {
      this.inherited(arguments);
      // THIS SHOULD FORCE THE CREATION OF DROPDOWN //
      this._startSearchAll();
      if(this.dropDown) {
        // SET searchAttr ON DROPDOWN //
        this.dropDown.searchAttr = this.searchAttr;
      }
    }
  });

  // VERSION //
  UniqueComboBox.version = "0.0.2";

  // RETURN CLASS //
  return UniqueComboBox;
});
  

