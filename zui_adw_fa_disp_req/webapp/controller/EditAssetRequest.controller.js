sap.ui.define([
    "sap/ui/core/mvc/Controller",
    "zui/adw/fixedassetsdisposalapproval/zuiadwfadispreq/controller/BaseController",
    "sap/m/MessageBox",
    "sap/ui/core/BusyIndicator"

], (Controller, BaseController, MessageBox,BusyIndicator) => {
    "use strict";

    return BaseController.extend("zui.adw.fixedassetsdisposalapproval.zuiadwfadispreq.controller.EditAssetRequest", {
        onInit() {
            this.getRouter().getRoute("RouteEditAssetRequest").attachPatternMatched(this._onRouteRouteEditAssetRequestMatched, this);
        },

        _onRouteRouteEditAssetRequestMatched: function () {
            BusyIndicator.hide();
           
        },
        
        onEditSaveDraftPress: function () {
            try {
                let oModel = this.getModel("listOfSelectedAssetsModel");
                let aTableData = this.getTableData(oModel);
                let oValidationResult = this.validateAssetData(aTableData);
        
                if (oValidationResult.hasError) {
                    MessageBox.error(oValidationResult.errorMessages.join("\n"));
                    return;
                }
        
                console.log("Data to save as draft:", aTableData);
                this.showConfirmationDialog("draft", function () {
                    this.saveRequestToBackend(aTableData, "draft");
                }.bind(this));
        
            } catch (error) {
                console.error("Error in onEditSaveDraftPress:", error);
                MessageBox.error(this.getResourceBundle().getText("errorSavingDraft"));
            }
        },
        
        onEditSubmitPress: function () {
            try {
                let oModel = this.getModel("listOfSelectedAssetsModel");
                let aTableData = this.getTableData(oModel);
                let oValidationResult = this.validateAssetData(aTableData);
        
                if (oValidationResult.hasError) {
                    MessageBox.error(oValidationResult.errorMessages.join("\n"));
                    return;
                }
        
                console.log("Data Submitted:", aTableData);
                this.showConfirmationDialog("submit", function () {
                    this.saveRequestToBackend(aTableData, "submit");
                }.bind(this));
        
            } catch (error) {
                console.error("Error in onEditSubmitPress:", error);
                MessageBox.error(this.getResourceBundle().getText("errorSubmittingRequest"));
            }
        },
        
        onEditCancelPress: function () {
            this.showConfirmationDialog("cancel", function () {
                this.getRouter().navTo("RouteWorkList");
            }.bind(this));
        },

        onEditDisposalRequiredChange: function (oEvent) {
            this.updateTableColumnAcrossRows(
                oEvent,
                "listOfSelectedAssetsModel",           // model name
                "/Items",                             // binding path
                "Zphya"        
            );
        },
        
    });
});