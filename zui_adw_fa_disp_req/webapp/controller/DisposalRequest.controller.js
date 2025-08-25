sap.ui.define([
    "zui/adw/fixedassetsdisposalapproval/zuiadwfadispreq/controller/BaseController",
    "sap/m/MessageBox",
    "sap/ui/core/BusyIndicator",
    "sap/m/MessageToast"

], (BaseController, MessageBox, BusyIndicator, MessageToast) => {
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

        onDisposalRequiredChange: function (oEvent) {
            this.updateTableColumnAcrossRows(
                oEvent,
                "listOfSelectedAssetsModel",           // model name
                "/assets",                             // binding path
                "AssetPhysicalDisposalRequired"
            );
        },

        // File upload implementation using your backend service
        onAttachmentPress: function (oEvent) {
            var oButton = oEvent.getSource();
            var oTable = this.byId("idtDisposalRequest");

            if (!oTable) {
                sap.m.MessageBox.error("Table not found");
                return;
            }

            // Get table rows based on table type
            var aItems = [];
            if (oTable.getItems) {
                // sap.m.Table
                aItems = oTable.getItems();
            } else if (oTable.getRows) {
                // sap.ui.table.Table
                aItems = oTable.getRows();
            } else if (oTable.getAggregation && oTable.getAggregation("items")) {
                // Generic approach
                aItems = oTable.getAggregation("items");
            } else {
                console.log("Table type:", oTable.getMetadata().getName());
                sap.m.MessageBox.error("Unsupported table type");
                return;
            }

            console.log("Found table items:", aItems.length);

            // Find which row this button belongs to
            var iRowIndex = -1;

            // Loop through table items to find the row containing our button
            for (var i = 0; i < aItems.length; i++) {
                var oItem = aItems[i];
                // Check if this row contains our button (traverse the control tree)
                if (this._isButtonInRow(oButton, oItem)) {
                    iRowIndex = i;
                    break;
                }
            }

            if (iRowIndex === -1) {
                console.error("Button not found in any row. Button parent hierarchy:");
                this._logParentHierarchy(oButton);
                sap.m.MessageBox.error("Could not determine which row was clicked");
                return;
            }

            // Convert row index to Reqitem format (001, 002, 003)
            var sReqitem = (iRowIndex + 1).toString().padStart(3, '0');
            this._iCurrentRowIndex = iRowIndex; // Store for later use
            this._sCurrentReqitem = sReqitem;

            console.log("Row clicked:", iRowIndex, "Reqitem:", sReqitem);

            // Create a file input element
            var oFileInput = document.createElement("input");
            oFileInput.type = "file";
            oFileInput.accept = ".pdf,.doc,.docx,.jpg,.png,.gif"; // Optional: restrict file types

            // When user selects a file
            oFileInput.onchange = async function (e) {
                var oFile = e.target.files[0];
                if (oFile) {
                    // Show file selected message
                    MessageToast.show("Selected: " + oFile.name + " for row " + (iRowIndex + 1) + " - Starting upload...");

                    // Call upload function
                   await this.uploadFileToBackend(oFile, iRowIndex);
                    oEvent.getSource().setVisible(false);
                }
            }.bind(this);

            // Trigger file selection dialog
            oFileInput.click();

            
        },

        // Helper function to debug parent hierarchy
        _logParentHierarchy: function (oControl) {
            var aHierarchy = [];
            var oParent = oControl;

            while (oParent && aHierarchy.length < 10) { // Limit to avoid infinite loops
                aHierarchy.push(oParent.getMetadata().getName() + " (ID: " + (oParent.getId() || "none") + ")");
                oParent = oParent.getParent();
            }

            console.log("Control hierarchy:", aHierarchy);
        },

        uploadFileToBackend: function (oFile, iRowIndex) {
            var oSrvModel = this.getOwnerComponent().getModel("ZUI_SMU_ATTACHMENTS_SRV");
            var oFormData = new FormData();
            oFormData.append("fileData", oFile);
            var sToken = oSrvModel.getSecurityToken();
            var sUploadUrl = oSrvModel.sServiceUrl + "/FileSet";
            BusyIndicator.show();

            // Create XMLHttpRequest for file upload
            var xhr = new XMLHttpRequest();

            xhr.onreadystatechange = function () {
                if (xhr.readyState === 4) { // Request completed
                    BusyIndicator.hide();
                    if (xhr.status === 201 || xhr.status === 200) {
                        try {
                            var sResponse = xhr.responseText;
                            var xml = jQuery.parseXML(sResponse);
                            var sFileid = xml.getElementsByTagName("d:Fileid")[0].textContent;
                            this.updateAttachmentModel(sFileid, oFile.name, oFile.type, iRowIndex);
                            MessageToast.show("File uploaded successfully!");

                        } catch (e) {
                            console.error("Error parsing upload response:", e);
                            MessageToast.show("Upload completed but failed to parse response");
                        }
                    } else {
                        // Error
                        console.error("Upload failed:", xhr.status, xhr.statusText);
                        sap.m.MessageBox.error("Upload failed: " + xhr.statusText);
                    }
                }
            }.bind(this);

            xhr.onerror = function () {
                sap.ui.core.BusyIndicator.hide();
                sap.m.MessageBox.error("Upload failed due to network error");
            };

            // Setup request
            xhr.open("POST", sUploadUrl, true);

            // Add headers
            xhr.setRequestHeader("X-CSRF-Token", sToken);
            xhr.setRequestHeader("slug", oFile.name); // Important: filename as slug header

            // Send the request
            xhr.send(oFormData);
        },

        onDownloadItem: function (oEvent) {
            const oContext = oEvent.getSource().getBindingContext("listOfSelectedAssetsModel");
            const sFileId = oContext.getProperty("Fileid");
            const sMimeType = oContext.getProperty("MimeType");
            const sFileName = oContext.getProperty("Filename");

            const oSrvModel = this.getOwnerComponent().getModel("ZUI_SMU_ATTACHMENTS_SRV");
            const sUrl = `${oSrvModel.sServiceUrl}/FileSet('${sFileId}')/$value`;

            // Download using fetch
            fetch(sUrl, { credentials: "include" })
                .then(res => res.blob())
                .then(blob => {
                    const newBlob = new Blob([blob], { type: sMimeType });
                    const url = window.URL.createObjectURL(newBlob);

                    // Create temporary link to trigger download
                    const a = document.createElement("a");
                    a.href = url;
                    a.download = sFileName;
                    document.body.appendChild(a);
                    a.click();
                    a.remove();

                    window.URL.revokeObjectURL(url);
                })
                .catch(err => {
                    console.error("Download failed", err);
                    sap.m.MessageBox.error("Failed to download file.");
                });
        },


        onDeleteAttachment: function (oEvent) {
            let uploadButton = oEvent.getSource().getParent().getParent().getParent().getParent().getItems()[1];
            console.log("Delete button pressed");

            const oAttachmentContext = oEvent.getSource().getBindingContext("listOfSelectedAssetsModel");
            console.log("Attachment context:", oAttachmentContext);

            if (!oAttachmentContext) {
                console.warn("No attachment context found.");
                return;
            }

            const sFileName = oAttachmentContext.getProperty("Filename");
            console.log("File to delete:", sFileName);

            // Get the parent context (row)
            const oAttachmentPath = oAttachmentContext.getPath();
            console.log("Attachment path:", oAttachmentPath);

            const oRowPath = oAttachmentPath.split("/Attachments")[0];
            console.log("Row path:", oRowPath);

            const oModel = this.getView().getModel("listOfSelectedAssetsModel");
            console.log("Model object:", oModel);

            const aAttachments = oModel.getProperty(oRowPath + "/Attachments") || [];
            console.log("Current attachments array:", aAttachments);

            // Remove only the clicked attachment
            const aUpdated = aAttachments.filter(att => att.Filename !== sFileName);
            console.log("Updated attachments array:", aUpdated);

            oModel.setProperty(oRowPath + "/Attachments", aUpdated);
            MessageToast.show("Attachment deleted successfully.");
            uploadButton.setVisible(true)
        },

        // updateAttachmentModel
        // ----------------------
        updateAttachmentModel: function (sFileid, sFileName, sMimeType, iRowIndex) {
            const oModel = this.getModel("listOfSelectedAssetsModel");
            let aAssets = oModel.getProperty("/assets");

            if (!aAssets[iRowIndex]) {
                console.error("Invalid row index for attachment update");
                return;
            }

            // Attachment object
            const oAttachmentData = {
                Fileid: sFileid,
                Filename: sFileName,
                MimeType: sMimeType,
                Url: `/sap/opu/odata/sap/ZUI_SMU_ATTACHMENTS_SRV/FileSet('${sFileid}')/$value`
            };

            if (!aAssets[iRowIndex].Attachments) {
                aAssets[iRowIndex].Attachments = [];
            }
            aAssets[iRowIndex].Attachments.push(oAttachmentData);

            // Push back to model
            oModel.setProperty("/assets", aAssets);


            console.log("Updated asset with attachments:", aAssets[iRowIndex]);
        },

        // Helper function to check if a button is within a specific table row
        _isButtonInRow: function (oButton, oTableItem) {
            var oParent = oButton.getParent();

            // Traverse up the control hierarchy to find if we reach the table item
            while (oParent) {
                if (oParent === oTableItem) {
                    return true;
                }
                oParent = oParent.getParent();
            }

            return false;
        },

        onDisposalPercentageChange: function (oEvent) {
            let oInputValue = oEvent.getSource();
            let sValue = oInputValue.getValue();

           
            let oPercentageInput =oInputValue.getParent().getCells()[22];

            if (sValue && sValue !== "0") {
                oPercentageInput.setEditable(false);
            } else {
                oPercentageInput.setEditable(true);
            }
        },
        onDisposaValueChange: function (oEvent) {
            let oInputValue = oEvent.getSource();
            let sValue = oInputValue.getValue();

            let oApcValue =oInputValue.getParent().getCells()[16].getProperty("text");
            // if(sValue>oApcValue){
            // oInputValue.setValueState("Error");
            // }
            // else{
            //     oInputValue.setValueState("none");
            // }
            debugger;
            let oPercentageInput =oInputValue.getParent().getCells()[23];

            if (sValue && sValue !== "0") {
                oPercentageInput.setEditable(false);
            } else {
                oPercentageInput.setEditable(true);
            }
        }







    });
});