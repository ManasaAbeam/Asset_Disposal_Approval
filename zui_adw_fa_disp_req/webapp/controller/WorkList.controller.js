sap.ui.define([
    "sap/ui/core/mvc/Controller",
    "zui/adw/fixedassetsdisposalapproval/zuiadwfadispreq/controller/BaseController",
    "sap/m/MessageBox",
    "sap/ui/core/BusyIndicator",
    "sap/ui/model/Filter",
    "sap/ui/model/FilterOperator",
    "sap/ui/core/Fragment",

], (Controller, BaseController, MessageBox, BusyIndicator, Filter, FilterOperator, Fragment) => {
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
        },

        clearTableSelection: function () {
            let oTable = this.byId("idTAssetDisposal");
            if (oTable) {
                oTable.removeSelections();
            }
        },
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

        onCostCenterValueHelp: function (oEvent) {
            this.onGenericValueHelp(
                oEvent,
                "zui.adw.fixedassetsdisposalapproval.zuiadwfadispreq.view.fragments.CostCenterValueHelp",
                "CostCenter"
            );
        },
        onAssetNumValueHelp: function (oEvent) {
            this.onGenericValueHelp(
                oEvent,
                "zui.adw.fixedassetsdisposalapproval.zuiadwfadispreq.view.fragments.AssetNumValueHelp",
                "MasterFixedAsset"
            );
        },


        onRequestIdValueHelp: function (oEvent) {
            this.applyUserFilterToInput(oEvent.getSource())
            this.onGenericValueHelp(
                oEvent,
                "zui.adw.fixedassetsdisposalapproval.zuiadwfadispreq.view.fragments.RequestValueHelp",
                "Btprn"
            );
        },

        



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
                    aSelectedData.push(oCompleteData);
                }
            });

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


                // --- New Validation for AssetPhysicalDisposalRequired ---
    // let uniqueDisposalValues = [...new Set(aSelectedData.map(item => item.AssetPhysicalDisposalRequired))];

    // if (uniqueDisposalValues.length > 1) {
    //     MessageBox.error(oResourceBundle.getText("msgMixedDisposalSelection")); 
    //     return null;
    // }

            console.log("Selected Items Data:", aSelectedData);
            let oModel = this.getModel("listOfSelectedAssetsModel");
            // oModel.setData({
            //     assets: aSelectedData,
            //     length: aSelectedData.length
            // });

             // ✅ Initialize each row with an empty Attachments array
    oModel.setData({
        assets: aSelectedData.map(item => {
            return {
                ...item,
                Attachments: []   // new property
            };
        }),
        length: aSelectedData.length
    });


            console.log(`Data set to model listOfSelectedAssetsModel:`, oModel.getData());
            BusyIndicator.show(0);
            this.getRouter().navTo("RouteDisposalRequest");
        },


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
        },


       


    });
});