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

        _onRouteRouteEditAssetRequestMatched: function () {
            BusyIndicator.hide();
            this._loadAllAttachments();
        },
        _loadAllAttachments: function () {
            const oModel = this.getView().getModel("listOfSelectedAssetsModel");
            const aItems = oModel.getProperty("/Items");
            const sReqno = oModel.getProperty("/Header/RequestId"); // adapt to your RequestId
            const sReqtype = "ADApproval"; // same as you save

            aItems.forEach((oRow, index) => {
                this._loadRowAttachments(sReqno, sReqtype, String(index + 1).padStart(3, "0"),
                    new sap.ui.model.Context(oModel, "/Items/" + index));
            });
        },

        _loadRowAttachments: function (sReqno, sReqtype, sReqitem, oRowContext) {
            const oSrvModel = this.getView().getModel("ZUI_SMU_ATTACHMENTS_SRV");

            const aFilters = [
                new sap.ui.model.Filter("Reqno", "EQ", sReqno),
                new sap.ui.model.Filter("Reqtype", "EQ", sReqtype),
                new sap.ui.model.Filter("Reqitem", "EQ", sReqitem)
            ];

            oSrvModel.read("/AttachmentsList", {
                filters: aFilters,
                // success: (oData) => {
                //     const aAttachments = oData.results.map(item => ({
                //         Fileid: item.Fileid,
                //         Filename: item.Filename,
                //         MimeType: item.MimeType,
                //         Url: `/sap/opu/odata/sap/ZUI_SMU_ATTACHMENTS_SRV/FileSet('${item.Fileid}')/$value`,
                //         Linked: true
                //     }));

                //     // inject attachments into that row in your table model
                //     oRowContext.getModel("listOfSelectedAssetsModel")
                //         .setProperty(oRowContext.getPath() + "/Attachments", aAttachments);

                //     // Store original copy per row
                //     oModel.setProperty(oRowContext.getPath() + "/_OriginalAttachments",
                //         JSON.parse(JSON.stringify(aAttachments))
                //     );
                // },
                success: (oData) => {
                    const aAttachments = oData.results.map(item => ({
                        Fileid: item.Fileid,
                        Filename: item.Filename,
                        MimeType: item.MimeType,
                        Url: `/sap/opu/odata/sap/ZUI_SMU_ATTACHMENTS_SRV/FileSet('${item.Fileid}')/$value`,
                        Linked: true
                    }));

                    const oModel = oRowContext.getModel("listOfSelectedAssetsModel");
                    oModel.setProperty(oRowContext.getPath() + "/Attachments", aAttachments);

                    // Store original copy per row
                    oModel.setProperty(oRowContext.getPath() + "/_OriginalAttachments",
                        JSON.parse(JSON.stringify(aAttachments))
                    );
                },
                error: (oError) => {
                    console.error("❌ Error while loading attachments:", oError);
                }
            });
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
        // File upload implementation using your backend service
        // onAttachmentPress: function (oEvent) {
        //   this.onGenericAttachmentPress(oEvent,"idtEditAssetRequest");

        // },

        onAttachmentPress: function (oEvent) {
            var oButton = oEvent.getSource();

            // Create input synchronously here, not inside another async function
            var oFileInput = document.createElement("input");
            oFileInput.type = "file";
            oFileInput.accept = ".pdf,.doc,.docx,.jpg,.png,.gif";

            oFileInput.onchange = async function (e) {
                var oFile = e.target.files[0];
                if (oFile) {
                    // call your generic upload logic here
                    await this.onGenericUploadFileToBackend(oFile, oButton.getBindingContext("listOfSelectedAssetsModel"), "/Items");
                }
            }.bind(this);

            oFileInput.click(); // <-- browser treats this as a user action
        },


        onDownloadItem: function (oEvent) {
            this.onGenericDownloadItem(oEvent);
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

            let oApcValue = oInputValue.getParent().getCells()[16].getProperty("text");
            // if(sValue>oApcValue){
            // oInputValue.setValueState("Error");
            // }
            // else{
            //     oInputValue.setValueState("none");
            // }
            debugger;
            let oPercentageInput = oInputValue.getParent().getCells()[23];

            if (sValue && sValue !== "0") {
                oPercentageInput.setEditable(false);
            } else {
                oPercentageInput.setEditable(true);
            }
        }

    });
});