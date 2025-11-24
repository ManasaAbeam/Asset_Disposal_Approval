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

        // _loadAllAttachments: function () {
        //     const oModel = this.getView().getModel("listOfSelectedAssetsModel");
        //     const aItems = oModel.getProperty("/Items") || [];
        //     const sReqno = oModel.getProperty("/Header/RequestId"); // Your RequestId
        //     const sReqtype = "FAD"; // Change to your actual Reqtype

        //     if (!sReqno || !sReqtype) {
        //         console.warn("⚠️ Missing Reqno or Reqtype");
        //         return;
        //     }

        //     console.log(`📥 Loading attachments for Request: ${sReqno}, Type: ${sReqtype}`);

        //     // Load attachments for each item row
        //     aItems.forEach((oRow, index) => {
        //         const sReqitem = String(index + 1).padStart(3, "0"); // "001", "002", "003"
        //         const oRowContext = new sap.ui.model.Context(oModel, "/Items/" + index);

        //         this._loadRowAttachments(sReqno, sReqtype, sReqitem, oRowContext);
        //     });
        // },

        // _loadRowAttachments: async function (sReqno, sReqtype, sReqitem, oRowContext) {
        //     try {
        //         const oBackendModel = this.getModel("attachment"); // Your attachment model

        //         // 🔹 Construct the path for DownloadFiles function
        //         const sPath = `/DownloadFiles(Reqno='${sReqno}',Reqtype='${sReqtype}')`;

        //         console.log(`📥 Loading attachments for Reqitem: ${sReqitem}, Path: ${sPath}`);

        //         // 🔹 Call the backend using bindContext and requestObject
        //         const oBinding = oBackendModel.bindContext(sPath);
        //         const oContext = await oBinding.requestObject();

        //         console.log("✔ Backend Response:", oContext);

        //         // 🔹 Extract all attachments from response
        //         const aAllAttachments = oContext?.value || [];

        //         // 🔹 Filter attachments for this specific Reqitem
        //         const aFilteredAttachments = aAllAttachments.filter(item => item.Reqitem === sReqitem);

        //         // 🔹 Map to your model structure (matching your view bindings)
        //         const aAttachments = aFilteredAttachments.map(item => ({
        //             Fileid: item.fileID,          // Capital F to match your view
        //             Filename: item.fileName,      // Capital F to match your view
        //             MimeType: this._getMimeTypeFromFileName(item.fileName),
        //             Url: item.url,                // Capital U to match your view
        //             Reqno: item.Reqno,
        //             Reqitem: item.Reqitem,
        //             Reqtype: item.Reqtype,
        //             Linked: true                  // Flag to indicate it's from backend
        //         }));

        //         console.log(`✔ Loaded ${aAttachments.length} attachment(s) for item ${sReqitem}:`, aAttachments);

        //         // 🔹 Set attachments in the model (same as your old code)
        //         const oModel = oRowContext.getModel();
        //         oModel.setProperty(oRowContext.getPath() + "/Attachments", aAttachments);

        //         // 🔹 Keep original copy for comparison (like your old code)
        //         oModel.setProperty(oRowContext.getPath() + "/_OriginalAttachments",
        //             JSON.parse(JSON.stringify(aAttachments))
        //         );

        //         // 🔹 Refresh the model to update the UI
        //         oModel.refresh();

        //     } catch (oError) {
        //         console.error(`❌ Error loading attachments for Reqitem ${sReqitem}:`, oError);
        //     }
        // },

        // // Helper function to derive MIME type from filename
        // _getMimeTypeFromFileName: function (sFileName) {
        //     if (!sFileName) return "application/octet-stream";

        //     const sExtension = sFileName.split('.').pop().toLowerCase();
        //     const oMimeTypes = {
        //         "pdf": "application/pdf",
        //         "png": "image/png",
        //         "jpg": "image/jpeg",
        //         "jpeg": "image/jpeg",
        //         "gif": "image/gif",
        //         "doc": "application/msword",
        //         "docx": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        //         "xls": "application/vnd.ms-excel",
        //         "xlsx": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        //         "txt": "text/plain",
        //         "zip": "application/zip"
        //     };

        //     return oMimeTypes[sExtension] || "application/octet-stream";
        // },
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
                    oModel.setProperty(oRowContext.getPath() + "/_OriginalAttachments",
                        JSON.parse(JSON.stringify(aAttachments))
                    );
                },
                error: (oError) => {
                    console.error("Error while loading attachments:", oError);
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

        onAttachmentPress: function (oEvent) {
            var oButton = oEvent.getSource();
            var oFileInput = document.createElement("input");
            oFileInput.type = "file";
            oFileInput.accept = ".pdf,.doc,.docx,.jpg,.png,.gif";

            oFileInput.onchange = async function (e) {
                var oFile = e.target.files[0];
                if (oFile) {
                    await this.onGenericUploadFileToBackend(oFile, oButton.getBindingContext("listOfSelectedAssetsModel"), "/Items");
                }
            }.bind(this);
            oFileInput.click();
        },


        onDownloadItem: function (oEvent) {
            this.onGenericDownloadItem(oEvent);
        },

        // onDownloadItem: function (oEvent) {
        //     const oContext = oEvent.getSource().getBindingContext("listOfSelectedAssetsModel");
        //     const sUrl = oContext.getProperty("Url");
        //     const sFilename = oContext.getProperty("Filename");

        //     console.log("📥 Downloading file:", sFilename);
        //     console.log("🔗 Download URL:", sUrl);

        //     // Open the SharePoint download URL - file will auto-download
        //     window.open(sUrl, '_blank');
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