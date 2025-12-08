sap.ui.define([
    "sap/ui/core/mvc/Controller",
    "zui/adw/fixedassetsdisposalapproval/zuiadwfadispreq/controller/BaseController",
    "sap/m/MessageBox",
    "sap/ui/core/BusyIndicator"

], (Controller, BaseController, MessageBox, BusyIndicator) => {
    "use strict";

    return BaseController.extend("zui.adw.fixedassetsdisposalapproval.zuiadwfadispreq.controller.EditAssetRequest", {
        onInit() {
            this.getRouter().getRoute("RouteEditAssetRequest").attachPatternMatched(this._onRouteRouteEditAssetRequestMatched, this);
        },

        _onRouteRouteEditAssetRequestMatched: async function () {
            BusyIndicator.hide();
            await this._loadAllAttachments();
        },

        _loadAllAttachments:  function () {
            const oModel = this.getView().getModel("listOfSelectedAssetsModel");
            const aItems = oModel.getProperty("/Items") || [];
            const sReqno = oModel.getProperty("/Header/RequestId");
            const sReqtype = "FAD";

            if (!sReqno || !sReqtype) {
                console.warn("⚠️ Missing Reqno or Reqtype");
                return;
            }

            console.log(`📥 Loading attachments for Request: ${sReqno}, Type: ${sReqtype}`);

          aItems.forEach( async (oRow, index) => {
                const sReqitem = String(index + 1).padStart(3, "0"); // "001", "002", "003"
                const oRowContext = new sap.ui.model.Context(oModel, "/Items/" + index);

                 await this._loadRowAttachments(sReqno, sReqtype, sReqitem, oRowContext);
            });
        },

        _loadRowAttachments: async function (sReqno, sReqtype, sReqitem, oRowContext) {
            try {
                const oBackendModel = this.getModel("attachment");
                const sPath = `/DownloadFiles(Reqno='${sReqno}',Reqtype='${sReqtype}')`;

                console.log(`Loading attachments for Reqitem: ${sReqitem}, Path: ${sPath}`);

                const oBinding = oBackendModel.bindContext(sPath);
                const oContext = await oBinding.requestObject();

                console.log("Backend Response:", oContext);

                const aAllAttachments = oContext?.value || [];
                const aFilteredAttachments = aAllAttachments.filter(item => item.Reqitem === sReqitem);
                const aAttachments = aFilteredAttachments.map(item => ({
                    fileID: item.fileID,
                    fileName: item.fileName,
                    mimeType: item.mimeType,
                    url: item.url,
                    Reqno: item.Reqno,
                    Reqitem: item.Reqitem,
                    Reqtype: item.Reqtype,
                    Linked: true
                }));

                console.log(`Loaded ${aAttachments.length} attachment(s) for item ${sReqitem}:`, aAttachments);
                const oModel = oRowContext.getModel();
                oModel.setProperty(oRowContext.getPath() + "/Attachments", aAttachments);
                oModel.refresh();

            } catch (oError) {
                console.error(`Error loading attachments for Reqitem ${sReqitem}:`, oError);
            }
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


        onAttachmentSelected: async function (oEvent) {
           await this.uploadAttachmentGeneric(
                oEvent,
                "listOfSelectedAssetsModel",   // model
                "/Items",                      // array path
                true                           // keep existing FileID
            );
        },



        onDownloadItem: async function (oEvent) {
           await this.onGenericDownloadItem(oEvent);
        },

        onDeleteAttachment: function (oEvent) {
            this.onGenericDeleteAttachment(oEvent)
        },


        onDisposalPercentageChange: function (oEvent) {
            let oInputValue = oEvent.getSource();
            let sValue = oInputValue.getValue();
            let oPercentageInput = oInputValue.getParent().getCells()[22];

            if (sValue && sValue !== "0") {
                oPercentageInput.setEditable(false);
            } else {
                oPercentageInput.setEditable(true);
            }
        },

        onDisposaValueChange: function (oEvent) {
            let oInputValue = oEvent.getSource();
            let sValue = oInputValue.getValue();
            let oPercentageInput = oInputValue.getParent().getCells()[23];
            if (sValue && sValue !== "0") {
                oPercentageInput.setEditable(false);
            } else {
                oPercentageInput.setEditable(true);
            }
        }

    });
});