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


            this.getModel("AttachmentsModel").setData({ Attachments: [] });

            // 2. Set the upload URL for the UploadCollection

            //this.loadAttachments(this._oId, "JVP", "001");

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


        onTestEF: async function () {
            try {
                const that = this;
                const appId = that.getOwnerComponent().getManifestEntry('/sap.app/id');
                const appPath = appId.replaceAll('.', '/');
                that.appModPath = jQuery.sap.getModulePath(appPath);
                that.sbpaWfUrl = "/workflow/rest/v1/workflow-instances";

                const workflowPayload = {
                    definitionId: "ap21.smu-dev.zuiadwfixedassetsdisposal.fixedAssetsDisposal_Process",
                    context: {
                        Btprn: "0000200198",// Fill this dynamically if needed
                        PhysicalDisposalFlag: "yes",
                        GrantIdFlag: "no",
                        RequestorEmail: "marella@abeam.com",
                        CFOApprovers: "bvenkatappaiahch@abeam.com,gkoundal@abeam.com,marella@abeam.com,nsaheb@abeam.com,srathore@abeam.com",
                        FUMANApprovers: "bvenkatappaiahch@abeam.com,gkoundal@abeam.com,marella@abeam.com,nsaheb@abeam.com,srathore@abeam.com",
                        HODApprovers: "bvenkatappaiahch@abeam.com,gkoundal@abeam.com,marella@abeam.com,nsaheb@abeam.com,rdasari@abeam.com,srathore@abeam.com",
                        OFINApprovers: "bvenkatappaiahch@abeam.com,gkoundal@abeam.com,marella@abeam.com,nsaheb@abeam.com,srathore@abeam.com",
                        GrantApprovers: "bvenkatappaiahch@abeam.com,gkoundal@abeam.com,marella@abeam.com,nsaheb@abeam.com,rdasari@abeam.com,srathore@abeam.com",
                    }
                };

                console.log("Workflow Payload:", JSON.stringify(workflowPayload, null, 2));


                const wfResp = await fetch(that.appModPath + that.sbpaWfUrl, {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json"
                    },
                    body: JSON.stringify(workflowPayload)
                });

                if (!wfResp.ok) {
                    const errText = await wfResp.text();
                    console.error("Workflow trigger failed:", errText);
                    MessageBox.error("Workflow trigger failed:\n" + errText);
                    return;
                }

                const result = await wfResp.json();
                console.log("Workflow Result:", result);
                MessageToast.show("Workflow triggered successfully!");

            } catch (error) {
                console.error("Error in triggering workflow:", error);
                MessageBox.error("Unexpected error occurred:\n" + error.message);
            }
        },

        // Simple controller method - Step 1: Just open file selector
        // File upload implementation using your backend service

        onAttachmentPress: function (oEvent) {
            // Get the button that was pressed
            var oButton = oEvent.getSource();

            // Get the table using the ID
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
            oFileInput.onchange = function (e) {
                var oFile = e.target.files[0];
                if (oFile) {
                    // Show file selected message
                    sap.m.MessageToast.show("Selected: " + oFile.name + " for row " + (iRowIndex + 1) + " - Starting upload...");

                    // Call upload function
                    this.uploadFileToBackend(oFile, iRowIndex);
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
            // Get the OData service model
            var oSrvModel = this.getOwnerComponent().getModel("ZUI_SMU_ATTACHMENTS_SRV");

            // Prepare form data
            var oFormData = new FormData();
            oFormData.append("fileData", oFile);

            // Get CSRF token
            var sToken = oSrvModel.getSecurityToken();

            // Prepare upload URL
            var sUploadUrl = oSrvModel.sServiceUrl + "/FileSet";

            // Show busy indicator
            sap.ui.core.BusyIndicator.show();

            // Create XMLHttpRequest for file upload
            var xhr = new XMLHttpRequest();

            xhr.onreadystatechange = function () {
                if (xhr.readyState === 4) { // Request completed
                    sap.ui.core.BusyIndicator.hide();

                    if (xhr.status === 201 || xhr.status === 200) {
                        // Success - parse response
                        try {
                            var sResponse = xhr.responseText;

                            // Parse XML response to get Fileid (similar to your existing code)
                            var xml = jQuery.parseXML(sResponse);
                            var sFileid = xml.getElementsByTagName("d:Fileid")[0].textContent;

                            // Update the model with the uploaded file info
                            this.updateAttachmentModel(sFileid, oFile.name, oFile.type, iRowIndex);

                            sap.m.MessageToast.show("File uploaded successfully!");

                        } catch (e) {
                            console.error("Error parsing upload response:", e);
                            sap.m.MessageToast.show("Upload completed but failed to parse response");
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
            // Get context of clicked link from listOfSelectedAssetsModel
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
    console.log("Delete button pressed");

    // Get binding context of the clicked attachment
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
    sap.m.MessageToast.show("Attachment deleted successfully.");
},



        // updateAttachmentModel: function (sFileid, sFileName, sMimeType, iRowIndex) {
        //     const oAttachmentsModel = this.getOwnerComponent().getModel("AttachmentsModel");
        //     let aAttachments = oAttachmentsModel.getProperty("/Attachments") || [];

        //     // Generate Reqitem based on row index (1-based, zero-padded to 3 digits)
        //     const sReqitem = String(iRowIndex + 1).padStart(3, "0");

        //     const oAttachmentData = {
        //         Fileid: sFileid,
        //         Filename: sFileName,
        //         MimeType: sMimeType,
        //         Reqitem: sReqitem,
        //         Url: `/sap/opu/odata/sap/ZUI_SMU_ATTACHMENTS_SRV/FileSet('${sFileid}')/$value`,
        //         Linked: false
        //     };

        //     if (iRowIndex !== undefined && aAttachments[iRowIndex]) {
        //         // Update existing row
        //         aAttachments[iRowIndex] = { ...aAttachments[iRowIndex], ...oAttachmentData };
        //         console.log("Updated attachment at index", iRowIndex, aAttachments[iRowIndex]);
        //     } else {
        //         // Add new attachment
        //         aAttachments.push(oAttachmentData);
        //         console.log("Added new attachment:", oAttachmentData);
        //     }

        //     // Update the model
        //     oAttachmentsModel.setProperty("/Attachments", aAttachments);

        //     console.log("Current attachments model data:", oAttachmentsModel.getData());
        // },

        


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

        // Link uploaded files to specific record with correct Reqitem and Reqtype
        linkUploadedFiles: function (sReqno) {
            var oAttachmentsModel = this.getModel("AttachmentsModel");
            var aAllRows = oAttachmentsModel.getProperty("/") || [];

            // Filter rows that have files but are not yet linked
            var aRowsWithFiles = [];

            if (Array.isArray(aAllRows)) {
                // If your model structure is an array of rows
                aAllRows.forEach(function (oRow, iIndex) {
                    if (oRow.Fileid && !oRow.Linked) {
                        aRowsWithFiles.push({
                            Fileid: oRow.Fileid,
                            Reqno: sReqno,
                            Reqtype: "ADW", // Changed to ADW
                            Reqitem: (iIndex + 1).toString().padStart(3, '0') // Row number as Reqitem
                        });
                    }
                });
            } else {
                // If your model has a different structure, adjust accordingly
                // For example, if it's { Attachments: [...] }
                var aAttachments = aAllRows.Attachments || [];
                aAttachments.forEach(function (oRow, iIndex) {
                    if (oRow.Fileid && !oRow.Linked) {
                        aRowsWithFiles.push({
                            Fileid: oRow.Fileid,
                            Reqno: sReqno,
                            Reqtype: "ADW", // Changed to ADW
                            Reqitem: oRow.Reqitem || (iIndex + 1).toString().padStart(3, '0')
                        });
                    }
                });
            }

            if (aRowsWithFiles.length === 0) {
                return;
            }

            var oSrvModel = this.getOwnerComponent().getModel("ZUI_SMU_ATTACHMENTS_SRV");

            // Prepare payload
            var oPayload = {
                Comments: "",
                Attachments: aRowsWithFiles
            };

            console.log("Linking files with payload:", oPayload);

            // Call LinkFiles service
            oSrvModel.create("/LinkFiles", oPayload, {
                success: function () {
                    // Mark files as linked in the model
                    if (Array.isArray(aAllRows)) {
                        aAllRows.forEach(function (oRow) {
                            if (oRow.Fileid && !oRow.Linked) {
                                oRow.Linked = true;
                            }
                        });
                    } else {
                        var aAttachments = aAllRows.Attachments || [];
                        aAttachments.forEach(function (oRow) {
                            if (oRow.Fileid && !oRow.Linked) {
                                oRow.Linked = true;
                            }
                        });
                    }

                    oAttachmentsModel.refresh();
                    sap.m.MessageToast.show("Files linked successfully to record " + sReqno + "!");
                },
                error: function () {
                    sap.m.MessageBox.error("Error linking files to record");
                }
            });
        },


        // onAttachmentPress: function (oEvent) {
        //     var oView = this.getView();

        //     if (!this._oAttachmentDialog) {
        //         this._oAttachmentDialog = sap.ui.xmlfragment(
        //             oView.getId(),
        //             "zui.adw.fixedassetsdisposalapproval.zuiadwfadispreq.view.fragments.AttachmentUploader", // path of your fragment
        //             this
        //         );
        //         oView.addDependent(this._oAttachmentDialog);
        //     }
        //     this._oAttachmentDialog.open();
        //      var oUploadCollection = this.byId("UploadCollection");
        //     if (oUploadCollection) {
        //         var sServiceUrl = this.getOwnerComponent()
        //             .getModel("ZUI_SMU_ATTACHMENTS_SRV")
        //             .sServiceUrl;
        //         oUploadCollection.setUploadUrl(sServiceUrl + "/FileSet");
        //     }

        // },

        onCloseAttachmentDialog: function () {
            if (this._oAttachmentDialog) {
                this._oAttachmentDialog.close();
            }
        },

        onBeforeUploadStarts: function (oEvent) {
            const sFileName = oEvent.getParameter("fileName"); // this works
            const oSrvModel = this.getOwnerComponent().getModel("ZUI_SMU_ATTACHMENTS_SRV");

            // Add slug header
            oEvent.getParameter("addHeaderParameter")(
                new sap.m.UploadCollectionParameter({
                    name: "slug",
                    value: sFileName
                })
            );

            // Add CSRF token
            oEvent.getParameter("addHeaderParameter")(
                new sap.m.UploadCollectionParameter({
                    name: "x-csrf-token",
                    value: oSrvModel.getSecurityToken()
                })
            );
        },

        onUploadComplete: function (oEvent) {
            const oFile = oEvent.getParameter("files")[0];
            if (oFile && oFile.status === 201) {
                const xml = jQuery.parseXML(oFile.responseRaw);
                const sFileid = xml.getElementsByTagName("d:Fileid")[0].textContent;

                const oAttachmentsModel = this.getOwnerComponent().getModel("AttachmentsModel");
                const aAttachments = oAttachmentsModel.getProperty("/Attachments") || [];

                aAttachments.push({
                    Fileid: sFileid,
                    Filename: oFile.fileName,
                    MimeType: oFile.mimeType,
                    Url: `/sap/opu/odata/sap/ZUI_SMU_ATTACHMENTS_SRV/FileSet('${sFileid}')/$value`
                });

                oAttachmentsModel.setProperty("/Attachments", aAttachments);
                sap.m.MessageToast.show("File uploaded and stored locally.");
            }
        },

        onFileDeleted: function (oEvent) {
            const sFileId = oEvent.getParameter("documentId");
            const oAttachmentsModel = this.getOwnerComponent().getModel("AttachmentsModel");
            let aAttachments = oAttachmentsModel.getProperty("/Attachments") || [];
            aAttachments = aAttachments.filter(f => f.Fileid !== sFileId);
            oAttachmentsModel.setProperty("/Attachments", aAttachments);
        },

        onSaveAttachments: function (sBtprn) {
            const oAttachmentsModel = this.getOwnerComponent().getModel("AttachmentsModel");
            const aAttachments = oAttachmentsModel.getProperty("/Attachments") || [];

            if (!aAttachments.length && (!this._originalAttachments || !this._originalAttachments.length)) {
                return sap.m.MessageToast.show("No attachments to link or delete.");
            }

            const oSrvModel = this.getView().getModel("ZUI_SMU_ATTACHMENTS_SRV");
            const sReqno = "0000200252";
            const sReqtype = "ADW";
            const sReqitem = "001";


            const aNewFiles = aAttachments.filter(att => !att.Linked); // files not yet linked
            if (aNewFiles.length) {
                const oPayload = {
                    Comments: "",
                    Attachments: aNewFiles.map(att => ({
                        Fileid: att.Fileid,
                        Reqno: sReqno,
                        Reqtype: sReqtype,
                        Reqitem: sReqitem
                    }))
                };

                oSrvModel.create("/LinkFiles", oPayload, {
                    success: () => {
                        console.log("New files linked successfully.");
                        // sap.m.MessageToast.show("New files linked successfully.");
                        // Mark linked files to avoid relinking
                        aNewFiles.forEach(f => f.Linked = true);
                        oAttachmentsModel.refresh();
                    },
                    error: () => sap.m.MessageBox.error("Error linking new files.")
                });
            }


            if (this._originalAttachments && this._originalAttachments.length) {
                const aDeletedFiles = this._originalAttachments.filter(orig =>
                    !aAttachments.find(att => att.Fileid === orig.Fileid)
                );

                aDeletedFiles.forEach(file => {
                    oSrvModel.remove(`/AttachmentsList('${file.Fileid}')`, {
                        success: () => console.log(file.Fileid + " deleted from backend."),
                        error: () => sap.m.MessageBox.error("Failed to delete file " + file.Fileid)
                    });
                });
            }


        },




    });
});