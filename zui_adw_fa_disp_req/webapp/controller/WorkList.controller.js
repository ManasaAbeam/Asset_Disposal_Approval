sap.ui.define([
    "sap/ui/core/mvc/Controller",
    "zui/adw/fixedassetsdisposalapproval/zuiadwfadispreq/controller/BaseController",
    "sap/m/MessageBox",
    "sap/ui/core/BusyIndicator",
    "sap/ui/model/Filter",
    "sap/ui/model/FilterOperator",
], (Controller, BaseController, MessageBox, BusyIndicator, Filter, FilterOperator) => {
    "use strict";

    return BaseController.extend("zui.adw.fixedassetsdisposalapproval.zuiadwfadispreq.controller.WorkList", {
        onInit() {
            this.getRouter().getRoute("RouteWorkList").attachPatternMatched(this._onRouteFixedAssetsDisposalMatched, this);
        },
        _onRouteFixedAssetsDisposalMatched: function () {
            BusyIndicator.hide();
            this.checkIfFiltersAreEmpty(
                ["inpAssetCostCenter", "inpMasterFixedAsset"],
                "visibilityModel",
                "/columlist"
            );
            this.clearTableSelection();
            this.getUserInfo();
            this.clearRequestIdInput();
            this.byId("idTAssetDisposal").getBinding("items").filter([]);
            this.getModel("visibilityModel").setProperty("/columlist", false);
            this.byId("inpAssetCostCenter").setValue("");
        },

        /**
        * Internal helper method to clear all selected rows from the Asset Disposal table.
        * @private
        */
        clearTableSelection: function () {
            let oTable = this.byId("idTAssetDisposal");
            if (oTable) {
                oTable.removeSelections();
            }
        },

        /**
        * Internal helper method that clears the Request ID input field and resets the RequestItemsModel data.
        * @private
        */
        clearRequestIdInput: function () {
            let oInput = this.byId("inpRequestId");
            let oModel = this.getModel("RequestItemsModel");
            if (oInput) {
                oInput.setValue("");
                oInput.setSelectedKey("");
                oInput.fireLiveChange();
                oModel.setProperty("/RequestItemsData", []);
            }
        },

        /**
         * Opens the Cost Center value help dialog by calling the generic value help method.
         * @param {sap.ui.base.Event} oEvent The event triggered by the input field.
         * @private
         */
        onCostCenterValueHelp: function (oEvent) {
            this.onGenericValueHelp(
                oEvent,
                "zui.adw.fixedassetsdisposalapproval.zuiadwfadispreq.view.fragments.CostCenterValueHelp",
                "CostCenter"
            );
        },

        /**
         * Opens the Asset Number value help dialog after validating that a Cost Center is selected.
         * Filters the dialog items based on the selected Cost Center.
         * @param {sap.ui.base.Event} oEvent The event triggered by the input field.
         * @private
         */
        onAssetNumValueHelp: function (oEvent) {
            let sCostCenter = this.byId("inpAssetCostCenter").getValue();
            if (!sCostCenter) {
                sap.m.MessageToast.show("Please select a Cost Center first.");
                return;
            }
            this.onGenericValueHelp(
                oEvent,
                "zui.adw.fixedassetsdisposalapproval.zuiadwfadispreq.view.fragments.AssetNumValueHelp",
                "MasterFixedAsset"
            );
            let that = this;
            this._pValueHelpDialogs[
                "zui.adw.fixedassetsdisposalapproval.zuiadwfadispreq.view.fragments.AssetNumValueHelp"
            ].then(function (oDialog) {
                let oItemsBinding = oDialog.getBinding("items");
                if (oItemsBinding) {
                    oItemsBinding.filter([
                        new Filter("CostCenter", FilterOperator.EQ, sCostCenter)
                    ]);
                } else {
                    oDialog.attachEventOnce("afterOpen", function () {
                        let oLateBinding = oDialog.getBinding("items");
                        if (oLateBinding) {
                            oLateBinding.filter([
                                new Filter("CostCenter", FilterOperator.EQ, sCostCenter)
                            ]);
                        }
                    });
                }
            });
        },

        /**
         * Opens the Request ID value help dialog and applies a filter based on the logged-in user.
         * @param {sap.ui.base.Event} oEvent The event triggered by the input field.
         * @private
         */
        onRequestIdValueHelp: function (oEvent) {
            this.applyUserFilterToInput(oEvent.getSource())
            this.onGenericValueHelp(
                oEvent,
                "zui.adw.fixedassetsdisposalapproval.zuiadwfadispreq.view.fragments.RequestValueHelp",
                "Btprn"
            );
        },

        /**
         * Handles the search action for Asset Disposal.
         * Validates mandatory fields, clears previous table selections, 
         * and triggers the search on the Asset Disposal table.
         * @private
         */
        onSearchAssetDisposal: function () {
            let oFilterBar = this.byId("filterbarAssetDisposal");
            this.clearTableSelection();
            let oTable = this.byId("idTAssetDisposal");
            const bValid = this.validateMandatoryFields([
                { id: "inpAssetCostCenter", labelKey: "msgCostCenter" }
            ]);

            if (!bValid) {
                this.getModel("visibilityModel").setProperty("/columlist", false);
                return;
            };
            this.onSearch(oFilterBar, oTable);

        },

        /**
         * Handles the search action for Requests Section. Validates mandatory fields 
         * @private
         */
        onSearchRequest: function () {
            let oFilterBar = this.byId("filterbarRequests");
            let oTable = this.byId("idTRequests");
            const bValid = this.validateMandatoryFields([
                { id: "inpRequestId", labelKey: "msgBtpr" }
            ]);

            if (!bValid) {
                let oModel = this.getModel("RequestItemsModel");
                oModel.setData({ RequestItemsData: [], RequestId: "" });
                return;
            };
            this.onSearch(oFilterBar, oTable);
            BusyIndicator.hide();
        },

        /**
         * Handles the creation of new asset requests from the selected items in the Asset Disposal table.
         * Performs multiple validations including table visibility, item selection, AssetPhysicalDisposalRequired field,
         * and GrantID consistency. Sets the selected data into the "listOfSelectedAssetsModel" and navigates to the Disposal Request route.
         * @private
         */
        onNewAssetRequests: function () {
            let oTable = this.byId("idTAssetDisposal");
            const oVisibilityModel = this.getModel("visibilityModel");
            const oResourceBundle = this.getResourceBundle();
            const bIsTableVisible = oVisibilityModel.getProperty("/columlist");

            if (!bIsTableVisible) {
                MessageBox.warning(oResourceBundle.getText("msgApplyFiltersFirst"));
                return null;
            }

            let aSelectedItems = oTable.getSelectedItems();
            if (aSelectedItems.length === 0) {
                MessageBox.warning(oResourceBundle.getText("msgSelectItem"));
                return null;
            }

            let aSelectedData = [];
            aSelectedItems.forEach(function (oSelectedItem) {
                let oBindingContext = oSelectedItem.getBindingContext();
                if (oBindingContext) {
                    let oCompleteData = oBindingContext.getObject();
                    let aCells = oSelectedItem.getCells();
                    let oComboBox = null;
                    for (let i = 0; i < aCells.length; i++) {
                        if (aCells[i].getMetadata().getName() === "sap.m.ComboBox") {
                            oComboBox = aCells[i];
                            break;
                        }
                    }
                    let sPhysicalDisposalValue = "";
                    if (oComboBox) {
                        sPhysicalDisposalValue = oComboBox.getSelectedKey();
                    }
                    oCompleteData.AssetPhysicalDisposalRequired = sPhysicalDisposalValue;
                    aSelectedData.push(oCompleteData);
                }
            });

            // Validation 1: Check if AssetPhysicalDisposalRequired is filled for all selected assets
            let hasEmptyPhysicalDisposal = false;
            aSelectedData.forEach(function (item) {
                if (!item.AssetPhysicalDisposalRequired || item.AssetPhysicalDisposalRequired === "") {
                    hasEmptyPhysicalDisposal = true;
                }
            });

            if (hasEmptyPhysicalDisposal) {
                MessageBox.error(oResourceBundle.getText("msgPhysicalDisposalRequired"));
                return null;
            }

            // Validation 2: Check if all selected assets have the same AssetPhysicalDisposalRequired value
            let firstPhysicalDisposalValue = aSelectedData[0].AssetPhysicalDisposalRequired;
            let hasMixedPhysicalDisposal = false;

            aSelectedData.forEach(function (item) {
                if (item.AssetPhysicalDisposalRequired !== firstPhysicalDisposalValue) {
                    hasMixedPhysicalDisposal = true;
                }
            });
            if (hasMixedPhysicalDisposal) {
                MessageBox.error(oResourceBundle.getText("msgMixedPhysicalDisposalSelection"));
                return null;
            }
            let hasGrantId = false;
            let hasNoGrantId = false;
            aSelectedData.forEach(function (item) {
                const grantId = item.GrantID;
                if (grantId && grantId !== "NOT_RELEVANT_FOR_GM") {
                    hasGrantId = true;
                }
                if (!grantId || grantId === "NOT_RELEVANT_FOR_GM") {
                    hasNoGrantId = true;
                }
            });
            if (hasGrantId && hasNoGrantId) {
                MessageBox.error(oResourceBundle.getText("msgMixedGrantIdSelection"));
                return null;
            }
            console.log("Selected Items Data:", aSelectedData);
            let oModel = this.getModel("listOfSelectedAssetsModel");
            oModel.setData({
                assets: aSelectedData.map(item => {
                    return {
                        ...item,
                        Attachments: []
                    };
                }),
                length: aSelectedData.length
            });
            console.log(`Data set to model listOfSelectedAssetsModel:`, oModel.getData());
            BusyIndicator.show(0);
            this.getRouter().navTo("RouteDisposalRequest");
        },

        /**
         * Prepares selected asset request data for editing and navigates to the Edit Asset Request route, showing warnings or errors if validation fails.
         * @async
         * @private
         */
        onEditAssetRequests: async function () {
            try {
                let oTable = this.byId("idTRequests");
                let oBinding = oTable.getBinding("items");
                let aTableData = oBinding.getModel("RequestItemsModel").getData();
                let aRequestItems = aTableData.RequestItemsData || [];
                let oResourceBundle = this.getResourceBundle();

                if (aRequestItems.length === 0) {
                    MessageBox.warning(oResourceBundle.getText("msgOnEditError"));
                    return;
                }
                let oHeaderInfo = {
                    RequestId: aRequestItems[0].RequestId || aRequestItems[0].Btprn,
                    CompanyCode: aRequestItems[0].Bukrs,
                    Status: aRequestItems[0].Zstat
                };
                let oEditModel = this.getModel("listOfSelectedAssetsModel");
                oEditModel.setData({
                    Header: oHeaderInfo,
                    Items: aRequestItems,
                    OriginalData: JSON.parse(JSON.stringify(aRequestItems)),
                    length: aRequestItems.length
                });
                console.log("listOfSelectedAssetsModel data for editing", oEditModel.getData())
                BusyIndicator.show(0);
                this.getRouter().navTo("RouteEditAssetRequest");

            } catch (error) {
                console.error("Error in onEditAssetRequests:", error);
                MessageBox.error(oResourceBundle.getText("errorAssetRequestEdit"));
            }
        }

    });
});