sap.ui.define([
    "zui/adw/fixedassetsdisposalapproval/zuiadwfadispreq/controller/BaseController",
    "sap/m/MessageBox",
    "sap/ui/core/BusyIndicator"


], (BaseController, MessageBox, BusyIndicator) => {
    "use strict";

    return BaseController.extend("zui.adw.fixedassetsdisposalapproval.zuiadwfadispreq.controller.DisposalRequest", {
        onInit() {
            this.getRouter().getRoute("RouteDisposalRequest").attachPatternMatched(this._onRouteFixedAssetsDisposalMatched, this);
        },

        _onRouteFixedAssetsDisposalMatched: function () {
            BusyIndicator.hide();

        },

        onSaveDraftPress: function () {
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
                console.error("Error in onSaveDraftPress:", error);
                MessageBox.error(this.getResourceBundle().getText("errorSavingDraft"));
            }
        },
        onSubmitPress: function () {
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
                console.error("Error in onSubmitPress:", error);
                MessageBox.error(this.getResourceBundle().getText("errorSubmittingRequest"));
            }
        },

        onCancelPress: function () {
            this.showConfirmationDialog("cancel", function () {
                this.getRouter().navTo("RouteWorkList");
            }.bind(this));
        },

        onAttachmentPress: function (oEvent) {
         this.onGenericAttachmentPress(oEvent,"idtDisposalRequest");          
        },

         onDownloadItem: function (oEvent) {
            this.onGenericDownloadItem(oEvent);
        },


        // onAttachmentSelected: function (oEvent) {
        //     const oFileUploader = oEvent.getSource();
        //     const file = oEvent.getParameter("files")[0];
        //     if (!file) return;

        //     const oCtx = oFileUploader.getBindingContext("listOfSelectedAssetsModel");
        //     const rowPath = oCtx.getPath();               // "/assets/2"
        //     const rowIndex = parseInt(rowPath.split("/").pop()); // 2

        //     // Convert rowIndex → Reqno ("001", "002", "003"...)
        //     const reqNo = (rowIndex + 1).toString().padStart(3, "0");

        //     const reader = new FileReader();

        //     reader.onload = (e) => {
        //         const base64 = e.target.result.split(",")[1];

        //         const oAttachment = {
        //             file: base64,
        //             Reqno: reqNo,                   // <-- Final required format
        //             Reqitem: reqNo,                 // If you want Reqitem same
        //             FileID: "",
        //             Reqtype: "FAD",
        //             fileName: file.name,
        //             mediaType: file.type
        //         };

        //         const oModel = this.getView().getModel("listOfSelectedAssetsModel");
        //         const aAssets = oModel.getProperty("/assets");

        //         aAssets[rowIndex].Attachments.push(oAttachment);

        //         // Update model
        //         oModel.setProperty("/assets", aAssets);

        //         sap.m.MessageToast.show("Attachment uploaded successfully");

        //         // Clear file
        //         oFileUploader.clear();
        //     };

        //     reader.readAsDataURL(file);
        // },
       
        // onDownloadItem: function (oEvent) {
        //     const oCtx = oEvent.getSource().getBindingContext("listOfSelectedAssetsModel");
        //     const oAttachment = oCtx.getObject();

        //     const base64 = oAttachment.file;
        //     const fileName = oAttachment.fileName;
        //     const mediaType = oAttachment.mediaType;  // VERY IMPORTANT

        //     // Decode base64 → binary
        //     const byteCharacters = atob(base64);
        //     const byteNumbers = new Array(byteCharacters.length);
        //     for (let i = 0; i < byteCharacters.length; i++) {
        //         byteNumbers[i] = byteCharacters.charCodeAt(i);
        //     }

        //     // Convert to Blob with correct MIME type
        //     const byteArray = new Uint8Array(byteNumbers);
        //     const blob = new Blob([byteArray], { type: mediaType });

        //     // Create download link
        //     const link = document.createElement("a");
        //     link.href = URL.createObjectURL(blob);
        //     link.download = fileName;

        //     // Trigger click
        //     link.click();

        //     // Cleanup
        //     URL.revokeObjectURL(link.href);
        // },
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