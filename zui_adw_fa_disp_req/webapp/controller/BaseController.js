sap.ui.define([
    "sap/ui/core/mvc/Controller",
    "sap/ui/core/BusyIndicator",
    "sap/ui/core/Fragment",
    "sap/ui/model/Filter",
    "sap/ui/model/FilterOperator",
    "sap/m/MessageBox",
    "sap/ui/core/format/DateFormat",
    "sap/m/MessageToast"
], function (Controller, BusyIndicator, Fragment, Filter, FilterOperator, MessageBox, DateFormat, MessageToast) {
    "use strict";

    return Controller.extend("zui.adw.fixedassetsdisposalapproval.zuiadwfadispreq.controller.BaseController", {

        /**
         * Returns the router instance of the current component for navigation.
         * @returns {sap.ui.core.routing.Router} The router instance.
         * @public
         */
        getRouter: function () {
            return this.getOwnerComponent().getRouter();
        },

        onRequestIdValueHelpSearch: function (oEvent, searchColumn) {
            const sSearchValue = oEvent.getParameter("value");
            const oUserModel = this.getModel("currentUser");
            const sUserEmail = oUserModel.getProperty("/email") || "dummy.user@com";
            const aSearchFilters = [];
            if (sSearchValue) {
                aSearchFilters.push(new Filter("Btprn", FilterOperator.Contains, sSearchValue));
            }
            let oCombinedSearchFilter = null;
            if (aSearchFilters.length > 0) {
                oCombinedSearchFilter = new Filter(aSearchFilters, false);
            }
            const oUserFilter = new Filter("CrBtpuser", FilterOperator.EQ, sUserEmail);
            const oStatusFilter = new Filter({
                filters: [
                    new Filter("ReqStatus", FilterOperator.EQ, "Save As Draft"),
                    new Filter("ReqStatus", FilterOperator.Contains, "Rejected")
                ],
                and: false
            });
            const aFinalFilters = [oUserFilter, oStatusFilter];
            if (oCombinedSearchFilter) {
                aFinalFilters.push(oCombinedSearchFilter);
            }
            const oFinalFilter = new Filter(aFinalFilters, true);
            const oBinding = oEvent.getSource().getBinding("items");
            if (oBinding) {
                oBinding.filter(oFinalFilter);
            }
        },

        /**
         * helper method that applies a filter to an input field's suggestion items based on the currently logged-in user's email.
         * @param {sap.m.Input} oInput The input control to apply the filter on.
         * @private
         */
        applyUserFilterToInput: function (oInput) {
            const oUserModel = this.getModel("currentUser");
            const sUserEmail = oUserModel.getProperty("/email") || "dummy.user@com";
            console.log("Applying user filter to input for:", sUserEmail);
            const oFilter = new Filter("CrBtpuser", FilterOperator.EQ, sUserEmail);
            oInput.bindAggregation("suggestionItems", {
                path: "ZUI_ADW_ASSET_REQUEST_SRV>/AssetDispSet",
                filters: [oFilter],
                template: new sap.ui.core.ListItem({
                    key: "{ZUI_ADW_ASSET_REQUEST_SRV>Btprn}",
                    text: "{ZUI_ADW_ASSET_REQUEST_SRV>Btprn}"
                })
            });
        },

        /**
         * helper method to open a generic value help dialog for any input field.
         * Loads the dialog fragment if not already loaded, applies filters if needed, and opens the dialog.
         * @param {sap.ui.base.Event} oEvent The event triggered by the input field.
         * @param {string} sFragmentName The fragment name of the value help dialog.
         * @param {string} sFilterField The field name to filter the dialog items.
         * @Public
         */
        onGenericValueHelp: function (oEvent, sFragmentName, sFilterField) {
            let that = this;
            this._sInputId = oEvent.getSource().getId();
            let oView = this.getView();

            if (!this._pValueHelpDialogs) {
                this._pValueHelpDialogs = {};
            }

            if (!this._pValueHelpDialogs[sFragmentName]) {
                this._pValueHelpDialogs[sFragmentName] = Fragment.load({
                    id: oView.getId(),
                    name: sFragmentName,
                    controller: this
                }).then(function (oDialog) {
                    oView.addDependent(oDialog);
                    return oDialog;
                });
            }

            this._pValueHelpDialogs[sFragmentName].then(function (oDialog) {
                oDialog.data("filterField", sFilterField);

                if (sFragmentName.includes("RequestValueHelp")) {
                    const oUserModel = that.getModel("currentUser");
                    const sUserEmail = oUserModel.getProperty("/email") || "dummy.user@com";

                    const oUserFilter = new Filter("CrBtpuser", FilterOperator.EQ, sUserEmail);
                    const oStatusFilter = new Filter({
                        filters: [
                            new Filter("ReqStatus", FilterOperator.EQ, "Save As Draft"),
                            new Filter("ReqStatus", FilterOperator.Contains, "Rejected")
                        ],
                        and: false
                    });

                    const aFilters = [oUserFilter, oStatusFilter];
                    let oItemsBinding = oDialog.getBinding("items");
                    if (oItemsBinding) {
                        oItemsBinding.filter(new Filter(aFilters, true));
                    } else {
                        oDialog.attachEventOnce("afterOpen", function () {
                            let oLateBinding = oDialog.getBinding("items");
                            if (oLateBinding) {
                                oLateBinding.filter(new Filter(aFilters, true));
                            }
                        });
                    }
                }
                oDialog.open();
            });
        },

        /**
         * Filters items in a value help dialog based on the user's search input.
         * @param {sap.ui.base.Event} oEvent The search event triggered by the value help dialog.
         * @private
         */
        onGenericValueHelpSearch: function (oEvent) {
            let sValue = oEvent.getParameter("value");
            let oDialog = oEvent.getSource();
            let sFilterFields = oDialog.data("filterFields");
            let aFilterFields = sFilterFields ? sFilterFields.split(",") : [];
            let aSearchFilters = aFilterFields.map(function (field) {
                return new Filter(
                    field.trim(),
                    FilterOperator.Contains,
                    sValue
                );
            });

            let oSearchFilter = null;
            if (aSearchFilters.length > 1) {
                oSearchFilter = new Filter({
                    filters: aSearchFilters,
                    and: false
                });
            } else if (aSearchFilters.length === 1) {
                oSearchFilter = aSearchFilters[0];
            }
            let sCostCenter = this.byId("inpAssetCostCenter").getValue();
            let oCostCenterFilter = null;
            if (sCostCenter) {
                oCostCenterFilter = new Filter("CostCenter", FilterOperator.EQ, sCostCenter);
            }
            let aFinalFilters = [];
            if (oSearchFilter && oCostCenterFilter) {
                aFinalFilters.push(new Filter([oCostCenterFilter, oSearchFilter], true));
            } else if (oCostCenterFilter) {
                aFinalFilters.push(oCostCenterFilter);
            } else if (oSearchFilter) {
                aFinalFilters.push(oSearchFilter);
            }
            oEvent.getSource().getBinding("items").filter(aFinalFilters);
        },


        /**
         * Handles the closing of a value help dialog, updating the input field with the selected item(s) and clearing filters.
         * @param {sap.ui.base.Event} oEvent The close event triggered by the value help dialog.
         * @private
         */
        onGenericValueHelpClose: function (oEvent) {
            let oDialog = oEvent.getSource();
            let bMultiSelect = oDialog.getMultiSelect();
            let oInput = sap.ui.getCore().byId(this._sInputId);

            if (bMultiSelect) {
                let aSelectedItems = oEvent.getParameter("selectedItems");
                let sSearchValue = oDialog._oSearchField ? oDialog._oSearchField.getValue() : "";

                if (aSelectedItems && aSelectedItems.length > 0) {
                    oInput.removeAllTokens();
                    aSelectedItems.forEach(function (oItem) {
                        oInput.addToken(new sap.m.Token({
                            key: oItem.getTitle(),
                            text: oItem.getTitle()
                        }));
                    });
                }
                if ((!aSelectedItems || aSelectedItems.length === 0) && sSearchValue) {
                    oInput.addToken(new sap.m.Token({
                        key: sSearchValue,
                        text: sSearchValue
                    }));
                }
            } else {
                let oSelectedItem = oEvent.getParameter("selectedItem");
                if (oSelectedItem) {
                    oInput.setValue(oSelectedItem.getTitle());
                }
            }
            oEvent.getSource().getBinding("items").filter([]);
        },


        /**
        * Internal helper method that checks if all filter inputs are empty and updates visibility property accordingly
        * @param {string[]} aInputIds array of input control IDs to check for values
        * @param {string} sModelName the name of the model to update
        * @param {string} sPropertyPath the property path in the model to set visibility (true if filters have values, false if empty)
        * @public
        */
        checkIfFiltersAreEmpty: function (aInputIds, sModelName, sPropertyPath) {
            const oView = this.getView();
            const oModel = this.getModel(sModelName);
            let bAllEmpty = true;
            aInputIds.forEach(function (sId) {
                const sValue = oView.byId(sId)?.getValue();
                if (sValue && sValue.trim() !== "") {
                    bAllEmpty = false;
                }
            });
            oModel.setProperty(sPropertyPath, !bAllEmpty);
        },

        /**
         * Generic helper method to perform search and filter table data based on filter bar values.
         * @param {sap.ui.comp.filterbar.FilterBar} oFilterBar The filter bar containing filter inputs.
         * @param {sap.m.Table} oTable The table to be updated with the search results.
         * @public
         */
        onSearch: function (oFilterBar, oTable) {
            const oResourceBundle = this.getResourceBundle();
            let that = this;
            if (oFilterBar.getId().includes("filterbarRequests")) {
                let oView = this.getView();
                let sRequestId = oView.byId("inpRequestId").getValue();
                let sPath = "/AssetDispSet('" + sRequestId + "')/Items";
                let oModel = oView.getModel("ZUI_ADW_ASSET_REQUEST_SRV");
                BusyIndicator.show(0);
                oModel.read(sPath, {
                    success: function (oData) {
                        console.log("Items for Btprn fetched:", oData);
                        let oModel = that.getModel("RequestItemsModel");
                        oModel.setData({
                            RequestItemsData: oData.results,
                            RequestId: sRequestId
                        });
                        console.log(`Data set to model RequestItemsModel:`, oModel.getData());
                    },
                    error: function (oError) {
                        MessageBox.error(oResourceBundle.getText("errorLoadItems"));
                    }
                });
            }

            else {
                let aTableFilters = [];
                let aFilterGroupItems = oFilterBar.getFilterGroupItems();

                for (let i = 0; i < aFilterGroupItems.length; i++) {
                    let oFilterGroupItem = aFilterGroupItems[i];
                    let oControl = oFilterGroupItem.getControl();
                    let sFieldName = oFilterGroupItem.getName();

                    if (oControl instanceof sap.m.MultiInput) {
                        let aTokens = oControl.getTokens();
                        if (aTokens.length > 0) {
                            let aTokenFilters = aTokens.map(function (oToken) {
                                return new Filter(
                                    sFieldName,
                                    FilterOperator.Contains,
                                    oToken.getText()
                                );
                            });
                            aTableFilters.push(new Filter({
                                filters: aTokenFilters,
                                and: false
                            }));
                        }
                    } else {

                        let sValue = oControl.getValue();
                        if (sValue && sValue.trim() !== "") {
                            let oFilter = new Filter(
                                sFieldName,
                                FilterOperator.Contains,
                                sValue.trim()
                            );
                            aTableFilters.push(oFilter);
                        }
                    }
                }

                let today = new Date();
                today.setHours(0, 0, 0, 0);
                let formattedDate = this.formatDateToYMD(today);

                let oDateFilter = new Filter({
                    filters: [
                        new Filter("ValidityEndDate", FilterOperator.LE, formattedDate),
                        new Filter("ValidityEndDate", FilterOperator.EQ, null)
                    ],
                    and: false
                });

                aTableFilters.push(oDateFilter);

                //   BalValue >= 0 AND Currency = 'SGD'
                let oBalValueFilter = new Filter({
                    filters: [
                        new Filter("BalValue", FilterOperator.GT, 0),
                        new Filter("Currency", FilterOperator.EQ, "SGD")
                    ],
                    and: true
                });
                aTableFilters.push(oBalValueFilter);

                //  Exclude assets where both BalValue & BalQty are 0
                let oExcludeZeroFilter = new Filter({
                    filters: [
                        new Filter("BalValue", FilterOperator.NE, 0),
                        new Filter("BalQty", FilterOperator.NE, 0),
                        new Filter("BaseUnit", FilterOperator.EQ, "EA")

                    ],
                    and: true
                });
                aTableFilters.push(oExcludeZeroFilter);

                let oBinding = oTable.getBinding("items");
                if (oBinding) {
                    if (aTableFilters.length > 0) {
                        oBinding.filter(aTableFilters);
                        // MessageBox.information(oResourceBundle.getText("msgFiltersApplied"));
                        this.getModel("visibilityModel").setProperty("/columlist", true);
                    } else {
                        oBinding.filter([]);
                        // MessageBox.information(oResourceBundle.getText("msgNoFiltersApplied"));
                        this.getModel("visibilityModel").setProperty("/columlist", false);
                    }
                }
            }
        },

        // Format date as YYYY-MM-DD
        formatDateToYMD: function (date) {
            let yyyy = date.getFullYear();
            let mm = (date.getMonth() + 1).toString().padStart(2, "0");
            let dd = date.getDate().toString().padStart(2, "0");
            return `${yyyy}-${mm}-${dd}`;
        },

        validateMandatoryFields: function (aFieldConfigs) {
            const oView = this.getView();
            const oResourceBundle = this.getResourceBundle();
            for (let i = 0; i < aFieldConfigs.length; i++) {
                const { id, labelKey } = aFieldConfigs[i];
                const oInput = oView.byId(id);
                const sValue = oInput.getValue();
                if (!sValue || sValue.trim() === "") {
                    const sLabel = oResourceBundle.getText(labelKey);
                    MessageBox.error(sLabel);
                    return false;
                }
            }
            return true;
        },

        showConfirmationDialog: function (sAction, fnCallback) {
            let oBundle = this.getResourceBundle();
            let bIsEditMode = this.isEditMode();
            let sTitle, sMessage, sButtonText;

            if (sAction === "draft") {
                sTitle = bIsEditMode ?
                    oBundle.getText("confirmUpdateDraftTitle") :
                    oBundle.getText("confirmSaveDraftTitle");
                sMessage = bIsEditMode ?
                    oBundle.getText("confirmUpdateDraftMessage") :
                    oBundle.getText("confirmSaveDraftMessage");
                sButtonText = bIsEditMode ?
                    oBundle.getText("btnUpdateDraft") :
                    oBundle.getText("btnSaveDraft");
            } else if (sAction === "submit") {
                sTitle = bIsEditMode ?
                    oBundle.getText("confirmUpdateSubmitTitle") :
                    oBundle.getText("confirmSubmitTitle");
                sMessage = bIsEditMode ?
                    oBundle.getText("confirmUpdateSubmitMessage") :
                    oBundle.getText("confirmSubmitMessage");
                sButtonText = bIsEditMode ?
                    oBundle.getText("btnUpdateSubmit") :
                    oBundle.getText("btnSubmit");
            } else if (sAction === "cancel") {
                sTitle = oBundle.getText("confirmTitle");
                sMessage = oBundle.getText("confirmCancel");
                sButtonText = MessageBox.Action.YES;
            }

            MessageBox.confirm(sMessage, {
                title: sTitle,
                actions: [sButtonText, MessageBox.Action.CANCEL],
                emphasizedAction: sButtonText,
                icon: MessageBox.Icon.WARNING,
                onClose: function (sActionSelected) {
                    if (sActionSelected === sButtonText && typeof fnCallback === "function") {
                        fnCallback();
                    }
                }
            });
        },

        validateAssetData: function (aTableData) {
            let bValidationError = false;
            let aErrorMessages = [];
            let oBundle = this.getResourceBundle();

            if (!aTableData || aTableData.length === 0) {
                bValidationError = true;
                aErrorMessages.push(oBundle.getText("errorNoDataToValidate"));
                return {
                    hasError: bValidationError,
                    errorMessages: aErrorMessages
                };
            }
            aTableData.forEach(function (oRowData) {
                if (!oRowData.DisposalReason && !oRowData.Rstgr) {
                    bValidationError = true;
                    if (!aErrorMessages.includes(oBundle.getText("errorDisposalReason"))) {
                        aErrorMessages.push(oBundle.getText("errorDisposalReason"));
                    }
                }

                let disposalPercentage = oRowData.DisposalPercentage || oRowData.Prozs;
                if (disposalPercentage &&
                    (isNaN(parseFloat(disposalPercentage)) ||
                        parseFloat(disposalPercentage) < 0 ||
                        parseFloat(disposalPercentage) > 100)) {
                    bValidationError = true;
                    if (!aErrorMessages.includes(oBundle.getText("errorDisposalPercentageRange"))) {
                        aErrorMessages.push(oBundle.getText("errorDisposalPercentageRange"));
                    }
                }

                let quantity = parseFloat(oRowData.BalQty || oRowData.AmMenge);
                let disposalQuantity = parseFloat(oRowData.DisposalQuantity || oRowData.Menge);
                if (disposalQuantity && quantity && !isNaN(disposalQuantity) && !isNaN(quantity)) {
                    if (disposalQuantity > quantity) {
                        bValidationError = true;
                        let errorMessage = oBundle.getText("errorDisposalQuantityExceedsQuantity");
                        if (!aErrorMessages.includes(errorMessage)) {
                            aErrorMessages.push(errorMessage);
                        }
                    }
                }
                let balValue = parseFloat(oRowData.BalValue || oRowData.Answl);
                let disposalValue = parseFloat(oRowData.DisposalValue || oRowData.Anbtr);
                if (disposalValue && balValue && !isNaN(disposalValue) && !isNaN(balValue)) {
                    if (disposalValue > balValue) {
                        bValidationError = true;
                        let errorMessage = oBundle.getText("errorDisposalValueExceedsBalValue");
                        if (!aErrorMessages.includes(errorMessage)) {
                            aErrorMessages.push(errorMessage);
                        }
                    }
                }

            }.bind(this));

            return {
                hasError: bValidationError,
                errorMessages: aErrorMessages
            };
        },

        isEditMode: function () {
            let oModel = this.getModel("listOfSelectedAssetsModel");
            let oHeader = oModel.getProperty("/Header");
            return oHeader && oHeader.RequestId;
        },


        formatCapitalizationDate: function (oValue, sGmGrantNbr) {
            if (sGmGrantNbr !== undefined && sGmGrantNbr === "NOT_RELEVANT_FOR_GM") {
                return "";
            }

            if (!oValue) {
                return "";
            }

            let oDate;

            if (oValue instanceof Date) {
                oDate = oValue;
            }
            else if (typeof oValue === "string") {
                oDate = new Date(oValue);
            }

            else {
                oDate = new Date(oValue);
            }
            let oDateFormat = DateFormat.getDateInstance({ pattern: "dd.MM.yyyy" });
            return oDateFormat.format(oDate);
        },

        saveRequestToBackend: function (aTableData, sAction, bSilent) {
            let that = this;
            let oBackendModel = this.getModel("ZUI_ADW_ASSET_REQUEST_SRV");
            let oBundle = this.getResourceBundle();
            let now = new Date();
            let bIsEditMode = this.isEditMode();
            bSilent = bSilent || false;

            const oUserModel = that.getModel("currentUser");
            const sUserEmail = oUserModel.getProperty("/email") || "unknown@domain.com";
            console.log("Requester Email", sUserEmail)

            function formatSAPDateTime(dateObj) {
                return "/Date(" + dateObj.getTime() + ")/";
            }

            let sZstat = (sAction === "submit") ? "Submitted" : "Save As Draft";

            aTableData.forEach(function (oRowData) {
                oRowData.Zstat = sZstat;
            });

            let aItemsPayload = aTableData.map(function (oRow) {
                let oItem = {
                    "Bukrs": oRow.Bukrs || oRow.CompanyCode,
                    "Anln1": oRow.Anln1 || oRow.Asset,
                    "Anln2": oRow.Anln2 || oRow.AssetSub,
                    "Anlkl": oRow.Anlkl || oRow.AssetClass,
                    "Txa50Nlt": oRow.Txa50Nlt || oRow.Description,
                    "AmMenge": oRow.AmMenge || oRow.BalQty,
                    "Meins": oRow.Meins || oRow.BaseUnit,
                    "Ord42": oRow.Ord42 || oRow.Group2AssetEvaluationKey || "",
                    "Stort": oRow.Stort || oRow.AssetLocation || "",
                    "Kostl": oRow.Kostl || oRow.CostCenter || "",
                    "PsPspPnr2": oRow.PsPspPnr2 || oRow.WBSElementInternalID || "",
                    "Prctr": oRow.Prctr || oRow.ProfitCenter || "",
                    "GmGrantNbr": oRow.GmGrantNbr || oRow.GrantID || "",
                    "Zphya": oRow.Zphya || oRow.AssetPhysicalDisposalRequired,
                    "Rstgr": oRow.Rstgr || oRow.DisposalReason,
                    "Menge": oRow.Menge || oRow.DisposalQuantity,
                    "Anbtr": oRow.Anbtr || oRow.DisposalValue,
                    "Prozs": oRow.Prozs || oRow.DisposalPercentage,
                    "Currency": oRow.Currency || oRow.Currency,
                    "Aktivd": oRow.Aktivd ?
                        (typeof oRow.Aktivd === 'string' ? oRow.Aktivd : formatSAPDateTime(new Date(oRow.Aktivd))) :
                        (oRow.AssetCapitalizationDate ? formatSAPDateTime(new Date(oRow.AssetCapitalizationDate)) : formatSAPDateTime(now)),
                    "Answl": oRow.Answl || oRow.BalValue,
                    "Zstat": sZstat,
                    "Ord41": oRow.Ord41 || oRow.Order1,
                    "Nafag": oRow.Nafag || oRow.DepreTillDate,
                    "Zprofd": oRow.Zprofd || oRow.ProfOfDisposalAttachments,
                    "Zstatdat": "",
                    "Belnr": "",
                    "Gjahr": ""
                };

                if (bIsEditMode || (oRow.Btprn && oRow.Itemno)) {
                    oItem.Btprn = oRow.Btprn;
                    oItem.Itemno = oRow.Itemno;
                }

                if (oRow.GmToDate) {
                    oItem.GmToDate = typeof oRow.GmToDate === "string"
                        ? oRow.GmToDate
                        : formatSAPDateTime(new Date(oRow.GmToDate));
                }
                else if (oRow.ValidityEndDate) {
                    oItem.GmToDate = formatSAPDateTime(new Date(oRow.ValidityEndDate));
                }
                else {

                    oItem.GmToDate = oRow.GmToDate || oRow.ValidityEndDate;
                }

                return oItem;
            });

            let oPayload = {
                "Bukrs": aItemsPayload[0].Bukrs,
                "ReqStatus": sZstat,
                "CrBtpuser": sUserEmail,
                "ChBtpuser": sUserEmail,
                "Purpose": aItemsPayload[0].Rstgr,
                "Items": aItemsPayload,
                "Aprgrp": "SOCI"
            };
            if (bIsEditMode) {
                let oModel = this.getModel("listOfSelectedAssetsModel");
                let oHeader = oModel.getProperty("/Header");
                oPayload.Btprn = oHeader.RequestId;
            } else if (aTableData[0] && aTableData[0].Btprn) {
                oPayload.Btprn = aTableData[0].Btprn;
            }

            BusyIndicator.show(0);

            oBackendModel.create("/AssetDispSet", oPayload, {
                success: function (oData) {
                    try {
                        if (sAction === "submit" && !bSilent) {
                            that.triggerWorkflowAfterSave(oData, sAction, oBundle, aTableData);
                        } else {
                            if (!bSilent) {
                                that._handleSaveSuccess(oData, sAction, oBundle);
                            } else {
                                BusyIndicator.hide();
                                console.log("Silent save completed successfully");
                            }
                        }
                        if (oData && oData.Btprn) {
                            that._saveRowAttachments(aTableData, oData.Btprn);
                        }


                    } catch (error) {
                        console.error("Error in success handler:", error);
                        BusyIndicator.hide();
                        that._handleSaveError(error, sAction, oBundle);
                    }
                },

                error: function (oError) {
                    that._handleSaveError(oError, sAction, oBundle);
                }
            });
        },
        // _saveRowAttachments: async function (aTableData, sBtprn) {
        //     const oBackendModel = this.getModel("attachment");

        //     if (!aTableData || aTableData.length === 0) {
        //         console.log("🚫 No attachments found.");
        //         return;
        //     }

        //     try {
        //         const aResults = []; // Store all responses

        //         for (let oAttachment of aTableData) {
        //             // OData payload must match CDS fields
        //             const oPayload = {
        //                 Reqno: sBtprn,
        //                 Reqitem: oAttachment.Attachments[0].Reqitem,
        //                 Reqtype: oAttachment.Attachments[0].Reqtype,
        //                 FileID: oAttachment.Attachments[0].FileID,
        //                 fileName: oAttachment.Attachments[0].fileName,
        //                 mediaType: oAttachment.Attachments[0].mediaType,
        //                 file: oAttachment.Attachments[0].file    // base64 content
        //             };

        //             console.log("Uploading file:", oPayload.fileName);

        //             // 🔹 Create binding for the action/function
        //             const oBinding = oBackendModel.bindContext("/uploadFileToSharePoint(...)");

        //             // 🔹 Set parameters
        //             oBinding.setParameter("Reqno", oPayload.Reqno);
        //             oBinding.setParameter("Reqitem", oPayload.Reqitem);
        //             oBinding.setParameter("Reqtype", oPayload.Reqtype);
        //             oBinding.setParameter("FileID", oPayload.FileID);
        //             oBinding.setParameter("fileName", oPayload.fileName);
        //             oBinding.setParameter("mediaType", oPayload.mediaType);
        //             oBinding.setParameter("file", oPayload.file);

        //             // 🔹 Execute and get response
        //             await oBinding.execute();
        //             const oContext = await oBinding.getBoundContext().requestObject();

        //             console.log("✔ Backend Response:", oContext);

        //             // 🔹 Extract the response data
        //             const aResponseData = oContext?.value || [];

        //             // Process each response
        //             aResponseData.forEach(oResponse => {
        //                 console.log("✔ File uploaded successfully:", {
        //                     FileID: oResponse.FileID,
        //                     fileName: oResponse.fileName,
        //                     url: oResponse.url,
        //                     message: oResponse.message
        //                 });

        //                 aResults.push(oResponse);
        //             });
        //         }

        //         console.log("✔ All uploads completed:", aResults);
        //         MessageToast.show(`${aResults.length} attachment(s) uploaded successfully!`);

        //         return aResults;

        //     } catch (err) {
        //         console.error("❌ Upload failed:", err);
        //         MessageToast.show("Attachment upload failed!");
        //         throw err;
        //     }
        // },


        _saveRowAttachments: function (aTableData, sBtprn) {
            const oSrvModel = this.getView().getModel("ZUI_SMU_ATTACHMENTS_SRV");

            let aAllAttachmentsPayload = [];
            let aFilesToDelete = [];

            aTableData.forEach((oRow, iIndex) => {
                const aCurrent = oRow.Attachments || [];
                const aOriginal = oRow._OriginalAttachments || [];

                const aDeletedFiles = aOriginal.filter(orig =>
                    !aCurrent.find(att => att.Fileid === orig.Fileid)
                );
                aFilesToDelete = aFilesToDelete.concat(aDeletedFiles);

                const aNewFiles = aCurrent.filter(att => !att.Linked);
                if (aNewFiles.length) {
                    const aRowAttachments = aNewFiles.map(att => ({
                        Fileid: att.Fileid,
                        Reqno: sBtprn,
                        Reqtype: "ADApproval",
                        Reqitem: String(iIndex + 1).padStart(3, "0")
                    }));
                    aAllAttachmentsPayload = aAllAttachmentsPayload.concat(aRowAttachments);
                }
            });

            const deleteFilesSequentially = async () => {
                for (let i = 0; i < aFilesToDelete.length; i++) {
                    const file = aFilesToDelete[i];
                    console.log(` Deleting file ${i + 1}/${aFilesToDelete.length}: ${file.Fileid}`);

                    try {
                        await new Promise((resolve, reject) => {
                            oSrvModel.remove(`/AttachmentsList('${file.Fileid}')`, {
                                success: () => {
                                    console.log(`Deleted file ${i + 1}/${aFilesToDelete.length}: ${file.Fileid}`);
                                    resolve();
                                },
                                error: (err) => {
                                    console.error(` Delete failed for file ${i + 1}/${aFilesToDelete.length}: ${file.Fileid}`, err);
                                    resolve();
                                }
                            });
                        });
                        await new Promise(resolve => setTimeout(resolve, 100));
                    } catch (error) {
                        console.error(` Unexpected error deleting file: ${file.Fileid}`, error);
                    }
                }

                this._linkNewAttachments(aAllAttachmentsPayload, oSrvModel);
            };

            if (aFilesToDelete.length > 0) {
                console.log(`🔄 Starting sequential deletion of ${aFilesToDelete.length} files`);
                deleteFilesSequentially();
            } else {
                this._linkNewAttachments(aAllAttachmentsPayload, oSrvModel);
            }
        },

        // Helper function to link new attachments
        _linkNewAttachments: function (aAllAttachmentsPayload, oSrvModel) {
            if (aAllAttachmentsPayload.length) {
                console.log(`🔗 Linking ${aAllAttachmentsPayload.length} new files`);
                const oPayload = { Comments: "", Attachments: aAllAttachmentsPayload };
                oSrvModel.create("/LinkFiles", oPayload, {
                    success: () => {
                        console.log("✅ Successfully linked all new files");
                    },
                    error: (err) => {
                        console.error("❌ Linking failed", err);
                    }
                });
            } else {
                console.log("ℹ️ No new files to link");
            }
        },
        triggerWorkflowAfterSave: async function (oSaveData, sAction, oBundle, aTableData) {
            let that = this;

            try {
                let bHasPhysicalDisposal = oSaveData.Items.results.some(item =>
                    item.Zphya && (item.Zphya.toLowerCase() === "yes" || item.Zphya.toLowerCase() === "y")
                );

                let bHasGrantId = oSaveData.Items.results.some(item =>
                    item.GmGrantNbr && item.GmGrantNbr.trim() !== "" && item.GmGrantNbr.trim() !== "NOT_RELEVANT_FOR_GM"
                );

                let sPhysicalDisposalFlag = bHasPhysicalDisposal ? "yes" : "no";
                let sGrantIdFlag = bHasGrantId ? "yes" : "no";

                // const approverData = await this.getApproverDetails();
                const approverData = await this.getApproverDetails(oSaveData, sPhysicalDisposalFlag, sGrantIdFlag);


                const workflowPayload = {
                    definitionId: "ap21.smu-dev.zuiadwfixedassetsdisposal.fixedAssetsDisposal_Process",
                    context: {
                        Btprn: oSaveData.Btprn,
                        PhysicalDisposalFlag: sPhysicalDisposalFlag,
                        GrantIdFlag: sGrantIdFlag,
                        RequestorEmail: oSaveData.CrBtpuser,
                        CFOApprovers: approverData.CFO,
                        FUMANApprovers: approverData.FUMAN,
                        HODApprovers: approverData.HOD,
                        OFINApprovers: approverData.OFIN,
                        GrantApprovers: approverData.GFIN
                    }
                };

                let appId = that.getOwnerComponent().getManifestEntry('/sap.app/id');
                let appPath = appId.replaceAll('.', '/');
                that.appModPath = jQuery.sap.getModulePath(appPath);
                that.sbpaWfUrl = "/workflow/rest/v1/workflow-instances";

                console.log("Workflow Payload:", JSON.stringify(workflowPayload, null, 2));
                console.log("Physical Disposal Flag:", sPhysicalDisposalFlag);
                console.log("Grant ID Flag:", sGrantIdFlag);
                console.log("Approver Data:", approverData);

                const wfResp = await fetch(that.appModPath + that.sbpaWfUrl, {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json"
                    },
                    body: JSON.stringify(workflowPayload)
                });

                if (!wfResp.ok) {
                    const errText = await wfResp.text();
                    throw new Error("Workflow trigger failed: " + errText);
                }
                const result = await wfResp.json();
                console.log("Workflow Result:", result);
                that._handleSaveSuccess(oSaveData, sAction, oBundle);

            } catch (err) {
                console.error("Error triggering workflow:", err);
                BusyIndicator.hide();
                aTableData.forEach((oRowData, index) => {
                    oRowData.Zstat = "Save As Draft";
                    if (oSaveData.Items && oSaveData.Items.results && oSaveData.Items.results[index]) {
                        oRowData.Btprn = oSaveData.Items.results[index].Btprn;
                        oRowData.Itemno = oSaveData.Items.results[index].Itemno;
                    } else {
                        oRowData.Btprn = oSaveData.Btprn;
                        oRowData.Itemno = oRowData.Itemno || String(index + 1).padStart(6, '0');
                    }
                });

                that.saveRequestToBackend(aTableData, "Save As Draft", true);
                let sPartialSuccessMsg = oBundle.getText("msgSubmitSuccessWF", [
                    oSaveData.Btprn,
                    err.message
                ]);
                MessageBox.warning(sPartialSuccessMsg, {
                    actions: [MessageBox.Action.OK],
                    onClose: function () {
                        that.getRouter().navTo("RouteWorkList");
                    }
                });
            }
        },

        //retriving approvers from G-table insted DOA Working fine 
        // getApproverDetails: async function () {
        //     try {
        //         const oModel = this.getModel();
        //         const oBindList = oModel.bindList("/AssetApprovers")
        //         const aContexts = await oBindList.requestContexts();
        //         console.log("AssetApprovers contexts fetched:", aContexts);
        //         const approverData = aContexts.map(oContext => oContext.getObject());
        //         console.log("AssetApprovers data:", approverData);
        //         const approverGroups = {};
        //         approverData.forEach(approver => {
        //             if (!approverGroups[approver.Aprgrp]) {
        //                 approverGroups[approver.Aprgrp] = [];
        //             }
        //             approverGroups[approver.Aprgrp].push(approver.Btpuser);
        //         });
        //         const processedApproverData = {};
        //         Object.keys(approverGroups).forEach(group => {
        //             processedApproverData[group] = approverGroups[group].join(",");
        //         });

        //         console.log("Processed approver data:", processedApproverData);
        //         return processedApproverData;

        //     } catch (error) {
        //         console.error("Error fetching or processing approver details:", error);
        //         throw error;
        //     }
        // },

        getApproverDetails: async function (oSaveData, sPhysicalDisposalFlag, sGrantIdFlag) {
            try {
                const oModel = this.getOwnerComponent().getModel("doa"); // DOA model
                const sApplicationID = "FAD";
                const sCostCenter = oSaveData.Items?.results?.[0]?.Kostl || "";
                const sEmail = oSaveData.CrBtpuser || "";

                // 🔹 Determine subObject (Disposal / Non-Disposal)
                const sProcess = sPhysicalDisposalFlag === "yes" ? "Disposal" : "Non-Disposal";
                console.log("sProcess ", sProcess)


                // 🔹 Determine process (Grant / Non-Grant)
                const sSubObject = sGrantIdFlag === "yes" ? "Grant" : "Non-Grant";
                console.log("subobject ", sSubObject)

                if (!sCostCenter || !sEmail) {
                    throw new Error("Missing required data: cost center or email");
                }

                // 🔹 Construct the correct path (with service name prefix)
            const sPath = `/getApproverDetails(applicationID='${sApplicationID}',costCenter='${sCostCenter}',subObject='${sSubObject}',process='${sProcess}',email='${sEmail}')`;
              //  const sPath = `/getApproverDetails(applicationID='FAD',costCenter='C1021-00',subObject='Grant',process='Non-Disposal',email='')`;

                console.log("Calling DOA API:", sPath);

                // 🔹 Call the backend
                const oBinding = oModel.bindContext(sPath);
                const oContext = await oBinding.requestObject();

                console.log("Fetched approver details from DOA:", oContext);

                // Safety check for returned data
                const aApprovers = oContext?.value || [];


                // Prepare approver groups based on LEVEL
                const approverData = {
                    HOD: "",
                    FUMAN: "",
                    OFIN: "",
                    GFIN: "",
                    CFO: ""
                };

                const levelGroups = {};
                aApprovers.forEach(approver => {
                    const level = approver.LEVEL;
                    const email = approver.EMPLOYEEEMAIL;
                    if (!level || !email) return;

                    if (!levelGroups[level]) {
                        levelGroups[level] = [];
                    }
                    levelGroups[level].push(email);
                });

                // ⭐ Final dynamic mapping based on "sProcess"
                // Non-Disposal → 3 levels
                // Disposal → 4 levels
                if (sProcess === "Non-Disposal") {
                    approverData.HOD = (levelGroups["1"] || []).join(",");
                    approverData.OFIN = (levelGroups["2"] || []).join(",");  // Grant/Non-Grant
                    approverData.GFIN = (levelGroups["2"] || []).join(",");
                    approverData.CFO = (levelGroups["3"] || []).join(",");
                } else {
                    // Disposal
                    approverData.HOD = (levelGroups["1"] || []).join(",");
                    approverData.FUMAN = (levelGroups["2"] || []).join(",");
                    approverData.OFIN = (levelGroups["3"] || []).join(",");
                    approverData.GFIN = (levelGroups["3"] || []).join(",");
                    approverData.CFO = (levelGroups["4"] || []).join(",");
                }


                console.log("Processed approver data (mapped by LEVEL):", approverData);

                return approverData;

            } catch (error) {
                console.error("Error fetching approver details from DOA:", error);
                throw error;
            }
        },



        _handleSaveSuccess: function (oData, sAction, oBundle) {
            BusyIndicator.hide();
            let sSuccessMsg = (sAction === "submit") ?
                oBundle.getText("msgSubmitSuccess", [oData.Btprn]) :
                oBundle.getText("msgDraftSuccess", [oData.Btprn]);

            MessageBox.success(sSuccessMsg, {
                actions: [MessageBox.Action.OK],
                onClose: function () {
                    this.getRouter().navTo("RouteWorkList");
                }.bind(this)
            });
            console.log("Response:", oData);
        },

        _handleSaveError: function (oError, sAction, oBundle) {
            BusyIndicator.hide();

            let sErrorMsg = (sAction === "submit") ?
                oBundle.getText("msgSubmitError") :
                oBundle.getText("msgDraftError");

            let detailedError = "";

            try {
                if (oError && oError.responseText) {
                    let errorDetails = JSON.parse(oError.responseText);
                    if (errorDetails.error && errorDetails.error.message && errorDetails.error.message.value) {
                        detailedError = ": " + errorDetails.error.message.value;
                    }
                    else if (errorDetails.error &&
                        errorDetails.error.innererror &&
                        errorDetails.error.innererror.errordetails &&
                        errorDetails.error.innererror.errordetails.length > 0) {
                        detailedError = ": " + errorDetails.error.innererror.errordetails[0].message;
                    }
                }
                else if (oError && oError.message) {
                    detailedError = ": " + oError.message;
                }
            } catch (e) {
                console.error("Error parsing responseText:", e);
                if (oError && oError.message) {
                    detailedError = ": " + oError.message;
                }
            }

            MessageBox.error(sErrorMsg + detailedError);
            console.error("Error:", oError);
        },

        getTableData: function (oModel) {
            if (oModel.getProperty("/Items")) {
                return oModel.getProperty("/Items");
            }
            else if (oModel.getProperty("/assets")) {
                return oModel.getProperty("/assets");
            }
            return [];
        },

        /**
        * Fetches the currently logged-in user's information and updates the "currentUser" model.
        * @returns {Promise<void>} A promise that resolves once the user info is fetched.
        * @public
        */
        getUserInfo: async function () {
            const url = this.getBaseURL() + "/user-api/currentUser";
            const oModel = this.getModel("currentUser");
            const mock = {
                firstname: "Dummy",
                lastname: "User",
                email: "dummy.user@com",
                name: "dummy.user@com",
                displayName: "Dummy User (dummy.user@com)"
            };

            try {
                oModel.loadData(url);
                await oModel.dataLoaded();
                const data = oModel.getData();
                console.log("data fetched- ", data);
                if (!data || !data.email) {
                    oModel.setData(mock);
                    console.log("user info Local", oModel.getData());
                }

                console.log("user info After Deployment", oModel.getData());
            } catch (error) {
                oModel.setData(mock);
                console.log("Fallback to mock user due to error:", error);
            }
        },

        /**  
         * Retrieves a model by name from the current view.  
         * @param {string} sName - The name of the model to retrieve.  
         * @returns {sap.ui.model.Model} The requested model instance.  
         * @public  
         */
        getModel: function (sName) {
            return this.getView().getModel(sName);
        },

        /**  
         * Sets a model with a given name on the current view.  
         * @param {sap.ui.model.Model} oModel - The model instance to set.  
         * @param {string} sName - The name to assign to the model.  
         * @returns {sap.ui.core.mvc.View} The view with the assigned model.  
         * @public  
         */
        setModel: function (oModel, sName) {
            return this.getView().setModel(oModel, sName);
        },

        /**  
         * Retrieves the base URL of the application.  
         * @returns {string} The base URL path of the application.  
         * @public  
         */
        getBaseURL: function () {
            return sap.ui.require.toUrl("zui/adw/fixedassetsdisposalapproval/zuiadwfadispreq");
        },

        /**  
         * Gets the i18n resource bundle for localized texts.  
         * @returns {sap.base.i18n.ResourceBundle} The resource bundle instance.  
         * @public  
         */
        getResourceBundle: function () {
            return this.getOwnerComponent().getModel("i18n").getResourceBundle();
        },

        /**  
         * Handles file upload action for the selected asset row using backend service.  
         * @param {sap.ui.base.Event} oEvent - The press event triggered by the attachment action.  
         * @param {sap.m.Table} oTable - The table containing the asset rows.  
         * @public  
         */
        onGenericAttachmentPress: function (oEvent, oTable) {
            var oButton = oEvent.getSource();
            var oTable = this.byId(oTable);

            if (!oTable) {
                MessageBox.error("Table not found");
                return;
            }
            var aItems = [];
            if (oTable.getItems) {
                aItems = oTable.getItems();
            } else if (oTable.getRows) {
                aItems = oTable.getRows();
            } else if (oTable.getAggregation && oTable.getAggregation("items")) {
                aItems = oTable.getAggregation("items");
            } else {
                console.log("Table type:", oTable.getMetadata().getName());
                MessageBox.error("Unsupported table type");
                return;
            }
            console.log("Found table items:", aItems.length);

            var iRowIndex = -1;
            for (var i = 0; i < aItems.length; i++) {
                var oItem = aItems[i];
                if (this._isButtonInRow(oButton, oItem)) {
                    iRowIndex = i;
                    break;
                }
            }

            if (iRowIndex === -1) {
                console.error("Button not found in any row. Button parent hierarchy:");
                this._logParentHierarchy(oButton);
                MessageBox.error("Could not determine which row was clicked");
                return;
            }
            var sReqitem = (iRowIndex + 1).toString().padStart(3, '0');
            this._iCurrentRowIndex = iRowIndex;
            this._sCurrentReqitem = sReqitem;

            console.log("Row clicked:", iRowIndex, "Reqitem:", sReqitem);

            var oFileInput = document.createElement("input");
            oFileInput.type = "file";
            oFileInput.accept = ".pdf,.doc,.docx,.jpg,.png,.gif";

            oFileInput.onchange = async function (e) {
                var oFile = e.target.files[0];
                if (oFile) {
                    //MessageToast.show("Selected: " + oFile.name + " for row " + (iRowIndex + 1) + " - Starting upload...");
                    await this.onGenericUploadFileToBackend(oFile, iRowIndex);
                    oEvent.getSource().setVisible(false);
                }
            }.bind(this);

            oFileInput.click();


        },

        // Helper function to debug parent hierarchy
        _logParentHierarchy: function (oControl) {
            var aHierarchy = [];
            var oParent = oControl;

            while (oParent && aHierarchy.length < 10) {
                aHierarchy.push(oParent.getMetadata().getName() + " (ID: " + (oParent.getId() || "none") + ")");
                oParent = oParent.getParent();
            }

            console.log("Control hierarchy:", aHierarchy);
        },

        // Helper function to check if a button is within a specific table row
        _isButtonInRow: function (oButton, oTableItem) {
            var oParent = oButton.getParent();
            while (oParent) {
                if (oParent === oTableItem) {
                    return true;
                }
                oParent = oParent.getParent();
            }

            return false;
        },

        /**  
         * Uploads files to the backend for the specified collection path.  
         * @param {File} oFile - The file object to be uploaded.  
         * @param {any} vRowRef - Reference to the related row/asset.  
         * @param {string} sCollectionPath - Backend collection path (e.g., FileSet).  
         * @public  
         */
        onGenericUploadFileToBackend: function (oFile, vRowRef, sCollectionPath) {
            var oSrvModel = this.getOwnerComponent().getModel("ZUI_SMU_ATTACHMENTS_SRV");
            var oFormData = new FormData();
            oFormData.append("fileData", oFile);
            var sToken = oSrvModel.getSecurityToken();
            var sUploadUrl = oSrvModel.sServiceUrl + "/FileSet";
            BusyIndicator.show();

            var xhr = new XMLHttpRequest();

            xhr.onreadystatechange = function () {
                if (xhr.readyState === 4) {
                    BusyIndicator.hide();
                    if (xhr.status === 201 || xhr.status === 200) {
                        try {
                            var sResponse = xhr.responseText;
                            var xml = jQuery.parseXML(sResponse);
                            var sFileid = xml.getElementsByTagName("d:Fileid")[0].textContent;
                            if (typeof vRowRef === "number") {
                                this.onGenericUpdateAttachmentModel(sFileid, oFile.name, oFile.type, vRowRef);
                            } else if (vRowRef && vRowRef.getPath) {
                                var sRowPath = vRowRef.getPath();
                                var oModel = vRowRef.getModel();
                                var aAttachments = oModel.getProperty(sRowPath + "/Attachments") || [];

                                aAttachments.push({
                                    Fileid: sFileid,
                                    Filename: oFile.name,
                                    MimeType: oFile.type,
                                    Url: `/sap/opu/odata/sap/ZUI_SMU_ATTACHMENTS_SRV/FileSet('${sFileid}')/$value`
                                });

                                oModel.setProperty(sRowPath + "/Attachments", aAttachments);
                                console.log("Updated attachments for path:", sRowPath);
                            }

                            MessageToast.show("File uploaded successfully!");
                        } catch (e) {
                            console.error("Error parsing upload response:", e);
                            MessageToast.show("Upload completed but failed to parse response");
                        }
                    } else {
                        console.error("Upload failed:", xhr.status, xhr.statusText);
                        MessageBox.error("Upload failed: " + xhr.statusText);
                    }
                }
            }.bind(this);

            xhr.onerror = function () {
                BusyIndicator.hide();
                MessageBox.error("Upload failed due to network error");
            };

            xhr.open("POST", sUploadUrl, true);
            xhr.setRequestHeader("X-CSRF-Token", sToken);
            xhr.setRequestHeader("slug", oFile.name);
            xhr.send(oFormData);
        },

        /**  
         * Updates files related to the selected asset in the FileSet entity.  
         * @param {string} sFileid - Unique identifier of the file.  
         * @param {string} sFileName - Name of the uploaded file.  
         * @param {string} sMimeType - MIME type of the uploaded file.  
         * @param {number} iRowIndex - Row index of the asset in the table.  
         * @public  
         */
        onGenericUpdateAttachmentModel: function (sFileid, sFileName, sMimeType, iRowIndex) {
            const oModel = this.getModel("listOfSelectedAssetsModel");
            let aAssets = oModel.getProperty("/assets") || sCollectionPath;

            if (!aAssets[iRowIndex]) {
                console.error("Invalid row index for attachment update");
                return;
            }
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
            oModel.setProperty("/assets", aAssets);
            console.log("Updated asset with attachments:", aAssets[iRowIndex]);
        },


        /**
         * Handles Deleting the uploaded file linked to the selected asset From Local Model.
         * @param {sap.ui.base.Event} oEvent - The event triggered by the download action.
         * @public
         */
        onGenericDeleteAttachment: function (oEvent) {
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
            const oAttachmentPath = oAttachmentContext.getPath();
            console.log("Attachment path:", oAttachmentPath);
            const oRowPath = oAttachmentPath.split("/Attachments")[0];
            console.log("Row path:", oRowPath);
            const oModel = this.getView().getModel("listOfSelectedAssetsModel");
            console.log("Model object:", oModel);
            const aAttachments = oModel.getProperty(oRowPath + "/Attachments") || [];
            console.log("Current attachments array:", aAttachments);
            const aUpdated = aAttachments.filter(att => att.Filename !== sFileName);
            console.log("Updated attachments array:", aUpdated);
            oModel.setProperty(oRowPath + "/Attachments", aUpdated);
            MessageToast.show("Attachment deleted successfully.");
            uploadButton.setVisible(true)
        },

        /**
         * Handles downloading the uploaded file linked to the selected asset.
         * @param {sap.ui.base.Event} oEvent - The event triggered by the download action.
         * @public
         */
        onGenericDownloadItem: function (oEvent) {
            const oContext = oEvent.getSource().getBindingContext("listOfSelectedAssetsModel");
            const sFileId = oContext.getProperty("Fileid");
            const sMimeType = oContext.getProperty("MimeType");
            const sFileName = oContext.getProperty("Filename");
            const oSrvModel = this.getOwnerComponent().getModel("ZUI_SMU_ATTACHMENTS_SRV");
            const sUrl = `${oSrvModel.sServiceUrl}/FileSet('${sFileId}')/$value`;
            fetch(sUrl, { credentials: "include" })
                .then(res => res.blob())
                .then(blob => {
                    const newBlob = new Blob([blob], { type: sMimeType });
                    const url = window.URL.createObjectURL(newBlob);
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
                    MessageBox.error("Failed to download file.");
                });
        }

    });
});