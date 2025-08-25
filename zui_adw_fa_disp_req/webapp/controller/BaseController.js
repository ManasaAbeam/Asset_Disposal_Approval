sap.ui.define([
    "sap/ui/core/mvc/Controller",
    "sap/ui/core/BusyIndicator",
    "sap/ui/core/Fragment",
    "sap/ui/model/Filter",
    "sap/ui/model/FilterOperator",
    "sap/m/MessageBox",
    "sap/ui/core/format/DateFormat"
], function (Controller, BusyIndicator, Fragment, Filter, FilterOperator, MessageBox, DateFormat) {
    "use strict";

    return Controller.extend("zui.adw.fixedassetsdisposalapproval.zuiadwfadispreq.controller.BaseController", {

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
                oCombinedSearchFilter = new Filter(aSearchFilters, false); // OR logic for search
            }

            // --- User filter ---
            const oUserFilter = new Filter("CrBtpuser", FilterOperator.EQ, sUserEmail);

            // --- Status filter (only Draft or Rejected) ---
            const oStatusFilter = new Filter({
                filters: [
                    new Filter("ReqStatus", FilterOperator.EQ, "Save As Draft"),
                    new Filter("ReqStatus", FilterOperator.Contains, "Rejected")
                ],
                and: false // OR logic between these two
            });

            // --- Combine all filters (AND logic) ---
            const aFinalFilters = [oUserFilter, oStatusFilter];
            if (oCombinedSearchFilter) {
                aFinalFilters.push(oCombinedSearchFilter);
            }

            const oFinalFilter = new Filter(aFinalFilters, true); // AND logic for all

            // --- Apply filter ---
            const oBinding = oEvent.getSource().getBinding("items");
            if (oBinding) {
                oBinding.filter(oFinalFilter);
            }
        },

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
                        oItemsBinding.filter(new Filter(aFilters, true)); // AND between user + status
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

        //this logic is working when  we using cost center and asset number both single select
        // onGenericValueHelpSearch: function (oEvent) {
        //     let sValue = oEvent.getParameter("value");
        //     let oControl = oEvent.getSource();
        //     while (oControl && !(oControl instanceof sap.m.SelectDialog)) {
        //         oControl = oControl.getParent();
        //     }
        //     let oDialog = oControl;

        //     // Get the custom data value
        //     let sFilterFields = oDialog.data("filterFields"); // works with core:CustomData
        //     let aFilterFields = sFilterFields ? sFilterFields.split(",") : [];

        //     // Build filters dynamically
        //     let aFilters = aFilterFields.map(function (field) {
        //         return new sap.ui.model.Filter(
        //             field.trim(),
        //             sap.ui.model.FilterOperator.Contains,
        //             sValue
        //         );
        //     });

        //     // Combine with OR
        //     let oCombinedFilter = new sap.ui.model.Filter({
        //         filters: aFilters,
        //         and: false
        //     });

        //     // Apply
        //     oEvent.getSource().getBinding("items").filter([oCombinedFilter]);
        // },


        // onGenericValueHelpClose: function (oEvent) {
        //     let oSelectedItem = oEvent.getParameter("selectedItem");
        //     if (oSelectedItem) {
        //         let oInput = sap.ui.getCore().byId(this._sInputId);
        //         oInput.setValue(oSelectedItem.getTitle());
        //     }
        //     oEvent.getSource().getBinding("items").filter([]);
        // },


        onGenericValueHelpSearch: function (oEvent) {
            let sValue = oEvent.getParameter("value");
            let oControl = oEvent.getSource();
            while (oControl && !(oControl instanceof sap.m.SelectDialog)) {
                oControl = oControl.getParent();
            }
            let oDialog = oControl;
            let sFilterFields = oDialog.data("filterFields");
            let aFilterFields = sFilterFields ? sFilterFields.split(",") : [];
            let aFilters = aFilterFields.map(function (field) {
                return new sap.ui.model.Filter(
                    field.trim(),
                    sap.ui.model.FilterOperator.Contains,
                    sValue
                );
            });
            let oCombinedFilter = new sap.ui.model.Filter({
                filters: aFilters,
                and: false
            });
            oEvent.getSource().getBinding("items").filter([oCombinedFilter]);
        },


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

        //which is used to check the filters are empty are not
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

        updateTableColumnAcrossRows: function (oEvent, sModelName, sPath, sPropertyToUpdate) {
            const sSelectedKey = oEvent.getSource().getSelectedKey();
            const oModel = this.getView().getModel(sModelName);
            const aItems = oModel.getProperty(sPath);
            aItems.forEach(item => {
                item[sPropertyToUpdate] = sSelectedKey;
            });

            oModel.setProperty(sPath, aItems);
        },

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

                    // 🔹 Check if control is MultiInput (asset number)
                    if (oControl instanceof sap.m.MultiInput) {
                        let aTokens = oControl.getTokens();
                        if (aTokens.length > 0) {
                            let aTokenFilters = aTokens.map(function (oToken) {
                                return new sap.ui.model.Filter(
                                    sFieldName,
                                    sap.ui.model.FilterOperator.Contains,
                                    oToken.getText()
                                );
                            });
                            // combine multiple asset numbers with OR
                            aTableFilters.push(new sap.ui.model.Filter({
                                filters: aTokenFilters,
                                and: false
                            }));
                        }
                    } else {
                        // 🔹 Normal Input (cost center, etc.)
                        let sValue = oControl.getValue();
                        if (sValue && sValue.trim() !== "") {
                            let oFilter = new sap.ui.model.Filter(
                                sFieldName,
                                sap.ui.model.FilterOperator.Contains,
                                sValue.trim()
                            );
                            aTableFilters.push(oFilter);
                        }
                    }
                }

                // 🔹 Add validity date filter
                let today = new Date();
                today.setHours(0, 0, 0, 0);
                let formattedDate = this.formatDateToYMD(today);

                let oDateFilter = new sap.ui.model.Filter({
                    filters: [
                        new sap.ui.model.Filter("ValidityEndDate", sap.ui.model.FilterOperator.LE, formattedDate),
                        new sap.ui.model.Filter("ValidityEndDate", sap.ui.model.FilterOperator.EQ, null)
                    ],
                    and: false
                });

                aTableFilters.push(oDateFilter);

                // 🔹 Apply filter to table
                let oBinding = oTable.getBinding("items");
                if (oBinding) {
                    if (aTableFilters.length > 0) {
                        oBinding.filter(aTableFilters);
                        MessageBox.information(oResourceBundle.getText("msgFiltersApplied"));
                        this.getModel("visibilityModel").setProperty("/columlist", true);
                    } else {
                        oBinding.filter([]);
                        MessageBox.information(oResourceBundle.getText("msgNoFiltersApplied"));
                        this.getModel("visibilityModel").setProperty("/columlist", false);
                    }
                }
            }

            // else {
            //     let aTableFilters = [];
            //     let aFilterGroupItems = oFilterBar.getFilterGroupItems();
            //     for (let i = 0; i < aFilterGroupItems.length; i++) {
            //         let oFilterGroupItem = aFilterGroupItems[i];
            //         let oControl = oFilterGroupItem.getControl();
            //         let sFieldName = oFilterGroupItem.getName();
            //         let sValue = oControl.getValue();
            //         if (sValue && sValue.trim() !== "") {
            //             let oFilter = new Filter(sFieldName, FilterOperator.Contains, sValue.trim());
            //             aTableFilters.push(oFilter);
            //         }
            //     }
            //     let today = new Date();
            //     today.setHours(0, 0, 0, 0);
            //     let formattedDate = this.formatDateToYMD(today);
            //     console.log("todays date", formattedDate)

            //     let oDateFilter = new Filter({
            //         filters: [
            //             new Filter("ValidityEndDate", FilterOperator.LE, formattedDate),
            //             new Filter("ValidityEndDate", FilterOperator.EQ, null)
            //         ],
            //         and: false
            //     });

            //     aTableFilters.push(oDateFilter);
            //     let oBinding = oTable.getBinding("items");
            //     oBinding.filter(aTableFilters);
            //     if (oBinding) {
            //         if (aTableFilters.length > 0) {
            //             oBinding.filter(aTableFilters);
            //             MessageBox.information(oResourceBundle.getText("msgFiltersApplied"));
            //             this.getModel("visibilityModel").setProperty("/columlist", true);
            //         } else {
            //             oBinding.filter([]);
            //             MessageBox.information(oResourceBundle.getText("msgNoFiltersApplied"));
            //             this.getModel("visibilityModel").setProperty("/columlist", false);
            //         }
            //     }
            // }
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

        // validateAssetData: function (aTableData) {
        //     let bValidationError = false;
        //     let aErrorMessages = [];
        //     let oBundle = this.getResourceBundle();
        //     if (!aTableData || aTableData.length === 0) {
        //         bValidationError = true;
        //         aErrorMessages.push(oBundle.getText("errorNoDataToValidate") || "No data to validate");
        //         return {
        //             hasError: bValidationError,
        //             errorMessages: aErrorMessages
        //         };
        //     }
        //     aTableData.forEach(function (oRowData) {
        //         if (!oRowData.AssetPhysicalDisposalRequired && !oRowData.Zphya) {
        //             bValidationError = true;
        //             if (!aErrorMessages.includes(oBundle.getText("errorAssetPhysicalDisposalRequired"))) {
        //                 aErrorMessages.push(oBundle.getText("errorAssetPhysicalDisposalRequired"));
        //             }
        //         }
        //         if (!oRowData.DisposalReason && !oRowData.Rstgr) {
        //             bValidationError = true;
        //             if (!aErrorMessages.includes(oBundle.getText("errorDisposalReason"))) {
        //                 aErrorMessages.push(oBundle.getText("errorDisposalReason"));
        //             }
        //         }
        //         let disposalPercentage = oRowData.DisposalPercentage || oRowData.Prozs;
        //         if (disposalPercentage &&
        //             (isNaN(parseFloat(disposalPercentage)) ||
        //                 parseFloat(disposalPercentage) < 0 ||
        //                 parseFloat(disposalPercentage) > 100)) {
        //             bValidationError = true;
        //             if (!aErrorMessages.includes(oBundle.getText("errorDisposalPercentageRange"))) {
        //                 aErrorMessages.push(oBundle.getText("errorDisposalPercentageRange"));
        //             }
        //         }
        //     }.bind(this));
        //     return {
        //         hasError: bValidationError,
        //         errorMessages: aErrorMessages
        //     };
        // },

        validateAssetData: function (aTableData) {
            let bValidationError = false;
            let aErrorMessages = [];
            let oBundle = this.getResourceBundle();

            if (!aTableData || aTableData.length === 0) {
                bValidationError = true;
                aErrorMessages.push(oBundle.getText("errorNoDataToValidate") || "No data to validate");
                return {
                    hasError: bValidationError,
                    errorMessages: aErrorMessages
                };
            }

            aTableData.forEach(function (oRowData) {
                // Existing validations
                if (!oRowData.AssetPhysicalDisposalRequired && !oRowData.Zphya) {
                    bValidationError = true;
                    if (!aErrorMessages.includes(oBundle.getText("errorAssetPhysicalDisposalRequired"))) {
                        aErrorMessages.push(oBundle.getText("errorAssetPhysicalDisposalRequired"));
                    }
                }

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

                // NEW VALIDATION: Check if DisposalQuantity exceeds Quantity
                let quantity = parseFloat(oRowData.BalQty || oRowData.AmMenge);
                let disposalQuantity = parseFloat(oRowData.DisposalQuantity || oRowData.Menge);

                // Only validate if both values exist and are valid numbers
                if (disposalQuantity && quantity && !isNaN(disposalQuantity) && !isNaN(quantity)) {
                    if (disposalQuantity > quantity) {
                        bValidationError = true;
                        let errorMessage = oBundle.getText("errorDisposalQuantityExceedsQuantity") ||
                            "Enter Disposal Quantity less than Quantity";
                        if (!aErrorMessages.includes(errorMessage)) {
                            aErrorMessages.push(errorMessage);
                        }
                    }
                }


                // NEW VALIDATION: Check if DisposalValue exceeds BalValue
                let balValue = parseFloat(oRowData.BalValue || oRowData.Answl);
                let disposalValue = parseFloat(oRowData.DisposalValue || oRowData.Anbtr);

                // Only validate if both values exist and are valid numbers
                if (disposalValue && balValue && !isNaN(disposalValue) && !isNaN(balValue)) {
                    if (disposalValue > balValue) {
                        bValidationError = true;
                        let errorMessage = oBundle.getText("errorDisposalValueExceedsBalValue") ||
                            "Enter Disposal Value less than Balance Value";
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
            // Only check if grant ID is provided
            if (sGmGrantNbr !== undefined && sGmGrantNbr === "NOT_RELEVANT_FOR_GM") {
                return "";
            }

            if (!oValue) {
                return "";
            }

            let oDate;

            // Handle Date object
            if (oValue instanceof Date) {
                oDate = oValue;
            }
            // Handle "YYYY-MM-DD" string
            else if (typeof oValue === "string") {
                oDate = new Date(oValue);
            }
            // Handle timestamps or other formats
            else {
                oDate = new Date(oValue);
            }

            // Format date to DD.MM.YYYY
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
                    "AmMenge": oRow.AmMenge || oRow.Quantity,
                    "Meins": oRow.Meins || oRow.BaseUnit,
                    "Ord42": oRow.Ord42 || oRow.Group2AssetEvaluationKey || "",
                    "Stort": oRow.Stort || oRow.AssetLocation || "",
                    "Kostl": oRow.Kostl || oRow.CostCenter || "",
                    "PsPspPnr2": oRow.PsPspPnr2 || oRow.WBSElementInternalID || "",
                    "Prctr": oRow.Prctr || oRow.ProfitCenter || "",
                    "GmGrantNbr": oRow.GmGrantNbr || oRow.GrantID || "",
                    // "GmToDate": oRow.GmToDate ? (typeof oRow.GmToDate === "string" ? oRow.GmToDate : formatSAPDateTime(new Date(oRow.GmToDate))) : (oRow.ValidityEndDate ? formatSAPDateTime(new Date(oRow.ValidityEndDate)) : null),
                    // "GmToDate": formatSAPDateTime(new Date(oRow.GmToDate)) || formatSAPDateTime(new Date(oRow.ValidityEndDate)),
                    // "GmToDate": oRow.GmToDate ?
                    //     (typeof oRow.GmToDate === 'string' ? oRow.GmToDate : formatSAPDateTime(new Date(oRow.GmToDate))) :
                    //     (oRow.ValidityEndDate ? formatSAPDateTime(new Date(oRow.ValidityEndDate)) : formatSAPDateTime(now)),
                    "Zphya": oRow.Zphya || oRow.AssetPhysicalDisposalRequired,
                    "Rstgr": oRow.Rstgr || oRow.DisposalReason,
                    "Menge": oRow.Menge || oRow.DisposalQuantity,
                    "Anbtr": oRow.Anbtr || oRow.DisposalValue,
                    "Prozs": oRow.Prozs || oRow.DisposalPercentage,
                    "Currency": oRow.Currency || oRow.Currency,
                    "Aktivd": oRow.Aktivd ?
                        (typeof oRow.Aktivd === 'string' ? oRow.Aktivd : formatSAPDateTime(new Date(oRow.Aktivd))) :
                        (oRow.AssetCapitalizationDate ? formatSAPDateTime(new Date(oRow.AssetCapitalizationDate)) : formatSAPDateTime(now)),
                    "Answl": oRow.Answl || oRow.APC_Value,
                    "Zstat": sZstat,
                    "Ord41": oRow.Ord41 || oRow.Order1,
                    "Nafag": oRow.Nafag || oRow.DepreTillDate,
                    "Zprofd": oRow.Zprofd || oRow.ProfOfDisposalAttachments,
                    "Zstatdat": "",
                    "Belnr": "",
                    "Gjahr": ""
                };

                // Handle edit mode OR workflow failure scenario where Btprn and Itemno are present
                if (bIsEditMode || (oRow.Btprn && oRow.Itemno)) {
                    oItem.Btprn = oRow.Btprn;
                    oItem.Itemno = oRow.Itemno;
                }
                // // Add GmToDate only if one exists
                if (oRow.GmToDate) {
                    oItem.GmToDate = typeof oRow.GmToDate === "string"
                        ? oRow.GmToDate
                        : formatSAPDateTime(new Date(oRow.GmToDate));
                }
                else if (oRow.ValidityEndDate) {
                    oItem.GmToDate = formatSAPDateTime(new Date(oRow.ValidityEndDate));
                }
                else {
                    // oItem.GmToDate = formatSAPDateTime(new Date(11111111));
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

            // if (bIsEditMode) {
            //     let oModel = this.getModel("listOfSelectedAssetsModel");
            //     let oHeader = oModel.getProperty("/Header");
            //     oPayload.Btprn = oHeader.RequestId;
            // }

            if (bIsEditMode) {
                let oModel = this.getModel("listOfSelectedAssetsModel");
                let oHeader = oModel.getProperty("/Header");
                oPayload.Btprn = oHeader.RequestId;
            } else if (aTableData[0] && aTableData[0].Btprn) {
                oPayload.Btprn = aTableData[0].Btprn;
            }

            BusyIndicator.show(0);

            oBackendModel.create("/AssetDispSet", oPayload, {
                // success: function (oData) {
                //     try {
                //         if (sAction === "submit" && !bSilent) {
                //             that.triggerWorkflowAfterSave(oData, sAction, oBundle, aTableData);
                //         } else {
                //             if (!bSilent) {
                //                 that._handleSaveSuccess(oData, sAction, oBundle);
                //             } else {
                //                 // Silent mode - just hide busy indicator
                //                 BusyIndicator.hide();
                //                 console.log("Silent save completed successfully");
                //             }
                //         }
                //     } catch (error) {
                //         console.error("Error in success handler:", error);
                //         BusyIndicator.hide();
                //         that._handleSaveError(error, sAction, oBundle);
                //     }
                // },

                success: function (oData) {
                    try {
                        // First trigger workflow or success handler
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

                        // 🔗 Now link attachments after request created
                        if (oData && oData.Btprn) {
                            that._saveRowAttachments(aTableData, oData.Btprn);
                            // aTableData.forEach((oRow, iIndex) => {
                            //     if (oRow.Attachments && oRow.Attachments.length > 0) {
                            //         that._saveRowAttachments(oRow.Attachments, oData.Btprn, iIndex + 1);
                            //     }
                            // });
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
        // Function to process all table data
        _saveRowAttachments: function (aTableData, sBtprn) {
            const oSrvModel = this.getView().getModel("ZUI_SMU_ATTACHMENTS_SRV");

            console.log("🔗 [Attachment Save] Start for all rows with Request ID:", sBtprn);

            // Iterate over each row to collect all new attachments
            let aAllAttachmentsPayload = [];

            aTableData.forEach((oRow, iIndex) => {
                if (oRow.Attachments && oRow.Attachments.length > 0) {
                    const aNewFiles = oRow.Attachments.filter(att => !att.Linked);
                    if (aNewFiles.length) {
                        const aRowAttachments = aNewFiles.map(att => ({
                            Fileid: att.Fileid,
                            Reqno: sBtprn,
                            Reqtype: "ADApproval", // adapt if required
                            Reqitem: String(iIndex + 1).padStart(3, "0")
                        }));
                        aAllAttachmentsPayload = aAllAttachmentsPayload.concat(aRowAttachments);
                    }
                }
            });

            if (aAllAttachmentsPayload.length) {
                const oPayload = {
                    Comments: "",
                    Attachments: aAllAttachmentsPayload
                };

                console.log("📤 [Attachment Save] Payload for all rows:", oPayload);

                // Single POST call for all attachments
                oSrvModel.create("/LinkFiles", oPayload, {
                    success: (oData, response) => {
                        console.log("✅ [Attachment Save] All files linked successfully");
                        console.log("🔎 [Attachment Save] OData response:", oData);
                    },
                    error: (oError) => {
                        console.error("❌ [Attachment Save] Error linking files");
                        console.error("⚠️ [Attachment Save] Error details:", oError);
                    }
                });
            } else {
                console.log("ℹ️ [Attachment Save] No new files to link for any row");
            }
        },

        //         _saveRowAttachments: async function (aAttachments, sBtprn, sReqItem) {
        //     const oSrvModel = this.getView().getModel("ZUI_SMU_ATTACHMENTS_SRV");


        //     console.log("🔗 [Attachment Save] Start for row:", sReqItem, "with Request ID:", sBtprn);
        //     console.log("📂 [Attachment Save] Attachments received:", aAttachments);

        //     const aNewFiles = aAttachments.filter(att => !att.Linked);
        //     console.log("🆕 [Attachment Save] New files to be linked:", aNewFiles);

        //     for (let idx = 0; idx < aNewFiles.length; idx++) {
        //         const att = aNewFiles[idx];
        //         const oPayload = {
        //             Comments: "",
        //             Attachments: [{
        //                 Fileid: att.Fileid,
        //                 Reqno: sBtprn,
        //                 Reqtype: "JVP",
        //                 Reqitem: String(sReqItem).padStart(3, "0")
        //             }]
        //         };

        //         console.log(`📤 [Attachment Save] Payload for file ${idx + 1}:`, oPayload);

        //         await new Promise((resolve, reject) => {
        //             oSrvModel.create("/LinkFiles", oPayload, {
        //                 success: (oData) => {
        //                     console.log(`✅ [Attachment Save] File ${att.Filename || att.Fileid} linked for row ${sReqItem}`);
        //                     resolve();
        //                 },
        //                 error: (oError) => {
        //                     console.error(`❌ [Attachment Save] Error linking file ${att.Filename || att.Fileid} for row ${sReqItem}`);
        //                     console.error("⚠️ [Attachment Save] Error details:", oError);
        //                     reject(oError);
        //                 }
        //             });
        //         });
        //     }

        //     if (aNewFiles.length === 0) {
        //         console.log(`ℹ️ [Attachment Save] No new files to link for row ${sReqItem}`);
        //     }
        // },

        // _saveRowAttachments: function (aAttachments, sBtprn, sReqItem) {
        //     const oSrvModel = this.getView().getModel("ZUI_SMU_ATTACHMENTS_SRV");

        //     console.log("🔗 [Attachment Save] Start for row:", sReqItem, "with Request ID:", sBtprn);
        //     console.log("📂 [Attachment Save] Attachments received:", aAttachments);

        //     const aNewFiles = aAttachments.filter(att => !att.Linked);
        //     console.log("🆕 [Attachment Save] New files to be linked:", aNewFiles);

        //     if (aNewFiles.length) {
        //         aNewFiles.forEach((att, idx) => {
        //             const oPayload = {
        //                 Comments: "",
        //                 Attachments: [{
        //                     Fileid: att.Fileid,
        //                     Reqno: sBtprn,
        //                     Reqtype: "JVP",        // adapt if required
        //                     Reqitem: String(sReqItem).padStart(3, "0")
        //                 }]
        //             };

        //             console.log(`📤 [Attachment Save] Payload for file ${idx + 1}:`, oPayload);

        //             oSrvModel.create("/LinkFiles", oPayload, {
        //                 success: (oData, response) => {
        //                     console.log(`✅ [Attachment Save] File ${att.Filename || att.Fileid} linked for row ${sReqItem}`);
        //                     console.log("🔎 [Attachment Save] OData response:", oData);
        //                 },
        //                 error: (oError) => {
        //                     console.error(`❌ [Attachment Save] Error linking file ${att.Filename || att.Fileid} for row ${sReqItem}`);
        //                     console.error("⚠️ [Attachment Save] Error details:", oError);
        //                 }
        //             });
        //         });
        //     } else {
        //         console.log(`ℹ️ [Attachment Save] No new files to link for row ${sReqItem}`);
        //     }
        // },


        // triggerWorkflowAfterSave: async function (oSaveData, sAction, oBundle, aTableData) {
        //     let that = this;

        //     try {

        //         let bHasPhysicalDisposal = oSaveData.Items.results.some(item =>
        //             item.Zphya && (item.Zphya.toLowerCase() === "yes" || item.Zphya.toLowerCase() === "y")
        //         );

        //         let bHasGrantId = oSaveData.Items.results.some(item =>
        //             item.GmGrantNbr && item.GmGrantNbr.trim() !== "" && item.GmGrantNbr.trim() !== "NOT_RELEVANT_FOR_GM"
        //         );

        //         let sPhysicalDisposalFlag = bHasPhysicalDisposal ? "yes" : "no";
        //         let sGrantIdFlag = bHasGrantId ? "yes" : "no";

        //         const approverData = await this.getApproverDetails();

        //         const workflowPayload = {
        //             definitionId: "ap21.smu-dev.zuiadwfadispreq.zui_adw_process",
        //             context: {
        //                 input: {
        //                     Btprn: oSaveData.Btprn,
        //                     Bukrs: oSaveData.Bukrs,
        //                     Status: oSaveData.Status,
        //                     PhysicalDisposalFlag: sPhysicalDisposalFlag,
        //                     GrantIdFlag: sGrantIdFlag,
        //                     RequestorEmail: oSaveData.CrBtpuser,
        //                     CFOApprovers: approverData.CFO,
        //                     FUMANApprovers: approverData.FUMAN,
        //                     HODApprovers: approverData.HOD,
        //                     OFINApprovers: approverData.OFIN,
        //                     SOCAApprovers: approverData.SOCA,
        //                     // GrantApprovers:approverData.Grant,
        //                     Items: oSaveData.Items.results.map(item => ({
        //                         Btprn: item.Btprn,
        //                         Itemno: item.Itemno,
        //                         Anbtr: item.Anbtr,
        //                         Zstat: item.Zstat,
        //                         Rstgr: item.Txt40,
        //                         Zphya: item.Zphya,
        //                         GmGrantNbr: item.GmGrantNbr,
        //                         Anln1: item.Anln1,
        //                         Anln2: item.Anln2,
        //                         Anlkl: item.Anlkl,
        //                         Txa50Nlt: item.Txa50Nlt,
        //                         Menge: item.Menge,
        //                         Meins: item.Meins,
        //                         Aktivd: item.Aktivd,
        //                         Ord41: item.Ord41,
        //                         Ord42: item.Ord42,
        //                         Stort: item.Stort,
        //                         Kostl: item.Kostl,
        //                         PsPspPnr2: item.PsPspPnr2,
        //                         Prctr: item.Prctr,
        //                         GmToDate: item.GmToDate,
        //                         Answl: item.Answl,
        //                         DepreTillDate: item.Nafag,
        //                         Currency: item.Currency,
        //                         Prozs: item.Prozs,
        //                         AmMenge: item.AmMenge
        //                     }))
        //                 }
        //             }
        //         };

        //         let appId = that.getOwnerComponent().getManifestEntry('/sap.app/id');
        //         let appPath = appId.replaceAll('.', '/');
        //         that.appModPath = jQuery.sap.getModulePath(appPath);
        //         that.sbpaWfUrl = "/workflow/rest/v1/workflow-instances";

        //         console.log("Workflow Payload:", JSON.stringify(workflowPayload, null, 2));
        //         console.log("Physical Disposal Flag:", sPhysicalDisposalFlag);
        //         console.log("Grant ID Flag:", sGrantIdFlag);
        //         console.log("Approver Data:", approverData);
        //         const wfResp = await fetch(that.appModPath + that.sbpaWfUrl, {
        //             method: "POST",
        //             headers: {
        //                 "Content-Type": "application/json"
        //             },
        //             body: JSON.stringify(workflowPayload)
        //         });

        //         if (!wfResp.ok) {
        //             const errText = await wfResp.text();
        //             throw new Error("Workflow trigger failed: " + errText);
        //         }
        //         const result = await wfResp.json();
        //         console.log("Workflow Result:", result);
        //         that._handleSaveSuccess(oSaveData, sAction, oBundle);

        //     } catch (err) {
        //         console.error("Error triggering workflow:", err);
        //         BusyIndicator.hide();
        //         aTableData.forEach((oRowData, index) => {
        //             oRowData.Zstat = "Save As Draft";
        //             if (oSaveData.Items && oSaveData.Items.results && oSaveData.Items.results[index]) {
        //                 oRowData.Btprn = oSaveData.Items.results[index].Btprn;
        //                 oRowData.Itemno = oSaveData.Items.results[index].Itemno;
        //             } else {
        //                 oRowData.Btprn = oSaveData.Btprn
        //                 oRowData.Itemno = oRowData.Itemno || String(index + 1).padStart(6, '0');
        //             }
        //         });

        //         that.saveRequestToBackend(aTableData, "Save As Draft", true);
        //         let sPartialSuccessMsg = oBundle.getText("msgSubmitSuccessWF", [
        //             oSaveData.Btprn,
        //             err.message
        //         ]);
        //         MessageBox.warning(sPartialSuccessMsg, {
        //             actions: [MessageBox.Action.OK],
        //             onClose: function () {
        //                 that.getRouter().navTo("RouteWorkList");
        //             }
        //         });
        //     }
        // },

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

                const approverData = await this.getApproverDetails();

                // Updated workflow payload - flat context
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
                        GrantApprovers: approverData.Grant
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

        getApproverDetails: async function () {
            try {
                const oModel = this.getModel();
                const oBindList = oModel.bindList("/AssetApprovers")
                const aContexts = await oBindList.requestContexts();
                console.log("AssetApprovers contexts fetched:", aContexts);
                const approverData = aContexts.map(oContext => oContext.getObject());
                console.log("AssetApprovers data:", approverData);
                const approverGroups = {};
                approverData.forEach(approver => {
                    if (!approverGroups[approver.Aprgrp]) {
                        approverGroups[approver.Aprgrp] = [];
                    }
                    approverGroups[approver.Aprgrp].push(approver.Btpuser);
                });
                const processedApproverData = {};
                Object.keys(approverGroups).forEach(group => {
                    processedApproverData[group] = approverGroups[group].join(",");
                });

                console.log("Processed approver data:", processedApproverData);
                return processedApproverData;

            } catch (error) {
                console.error("Error fetching or processing approver details:", error);
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
            if (oError && oError.message) {
                detailedError = ": " + oError.message;
            }

            MessageBox.error(sErrorMsg + detailedError);
            console.error("Error:", oError);

            if (oError && oError.responseText) {
                try {
                    let errorDetails = JSON.parse(oError.responseText);
                    console.error("Error Details:", errorDetails);
                } catch (e) {
                    console.error("Raw Error Response:", oError.responseText);
                }
            }
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

        // This function fetches the logged-in user's information
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

        getModel: function (sName) {
            return this.getView().getModel(sName);
        },

        setModel: function (oModel, sName) {
            return this.getView().setModel(oModel, sName);
        },

        getBaseURL: function () {
            return sap.ui.require.toUrl("zui/adw/fixedassetsdisposalapproval/zuiadwfadispreq");
        },

        getResourceBundle: function () {
            return this.getOwnerComponent().getModel("i18n").getResourceBundle();
        },

    });
});