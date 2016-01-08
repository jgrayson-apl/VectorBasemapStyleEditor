/**
 *
 * ApplyStyle
 *  - Apply VectorTileLayer Style
 *
 * Author:   John Grayson - Applications Prototype Lab - Esri
 *
 * Created:  11/24/2015 - 0.0.1 -
 * Modified: 12/21/2015 - 0.0.2 - ADDED CALLBACK FUNCTION AND INPUT VALIDATION
 *
 */
define([
  "dojo/_base/declare",
  "esri/OperationBase"
], function (declare, OperationBase) {

  // CLASS //
  var ApplyStyle = declare([OperationBase], {

    // CLASS NAME //
    declaredClass: "ApplyStyle",

    // LABEL //
    label: "Apply VectorTileLayer Style",

    // TYPE //
    type: "ApplyVectorTileLayerStyle",

    // VALID //
    validOperation: false,

    /**
     * CONSTRUCTOR
     */
    constructor: function (options) {
      declare.safeMixin(this, options);
      // VALIDATE INPUTS //
      this.validOperation = ((this.layer != null) && (this.undoStyle != null) && (this.redoStyle != null));
    },

    /**
     * UNDO APPLY STYLE
     */
    performUndo: function () {
      if(this.validOperation) {
        // SET STYLE //
        this.layer.setStyle(this.undoStyle);
        if(this.applyStyleCallback) {
          // CALLBACK //
          this.applyStyleCallback(this.undoStyle.layers)
        }
      }
    },

    /**
     *  REDO APPLY STYLE
     */
    performRedo: function () {
      if(this.validOperation) {
        // SET STYLE //
        this.layer.setStyle(this.redoStyle);
        if(this.applyStyleCallback) {
          // CALLBACK //
          this.applyStyleCallback(this.redoStyle.layers)
        }
      }
    }

  });

  // DEFAULT LABEL //
  ApplyStyle.defaultLabel = "Apply VectorTileLayer Style";

  // VERSION //
  ApplyStyle.version = "0.0.2";

  // RETURN CLASS //
  return ApplyStyle;
});
  

