sap.ui.define(
  [
    "sap/ui/core/mvc/Controller",
    "sap/ui/core/format/DateFormat"
  ],
  function (BaseController, DateFormat) {
    "use strict";

    return BaseController.extend("fixedassetsdisposalapproval.adw.wf.workflowuimodule.controller.App", {
      onInit() {
      //  this.getAssetDetails("0000200329");
        this.getUserInfo();
      },

      onAfterRendering: function () {
        console.log(window.location);
        if (window?.location?.hash.includes("TaskCollection")) {
          setTimeout(() => {
            var oContextData = this.getOwnerComponent().getModel("context").getData();
            this._oID = oContextData.Btprn;
            console.log("btprn-", this._oID); 
            this.getAssetDetails(this._oID);             
          }, 1000);
        }
      },



      //   getAssetDetails: async function (oId) {          
      //     var that = this;
      //     var oModel = this.getView().getModel("zi_adw_asset_details");
      //     var sServiceUrl = oModel.sServiceUrl;
      //     var sUrl = sServiceUrl + "/AssetDetails?$filter=Btprn eq '" + oId + "'";

      //     try {
      //         const oResponse = await $.ajax({
      //             url: sUrl,
      //             method: "GET",
      //             headers: {
      //                 "Accept": "application/json"
      //             }
      //         });
      //         console.log("Header:", oResponse); 
      //         this.getOwnerComponent().getModel("listOfSelectedAssetsModel").setData(oResponse);      
      //         console.log(this.getOwnerComponent().getModel("listOfSelectedAssetsModel").getData()) ;

      //     } catch (error) {
      //         console.error("Error in getAssetDetails:", error);
      //     }
      // },


      getAssetDetails: async function (oId) {
        var that = this;
        var oModel = this.getView().getModel("zi_adw_asset_details");
        var sServiceUrl = oModel.sServiceUrl;
        var sUrl = sServiceUrl + "/AssetDetails?$filter=Btprn eq '" + oId + "'";

        try {
          const oResponse = await $.ajax({
            url: sUrl,
            method: "GET",
            headers: {
              "Accept": "application/json"
            }
          });

          console.log("Header:", oResponse);

          // Push data into WF UI JSON model
          this.getOwnerComponent().getModel("listOfSelectedAssetsModel").setData(oResponse);

          // ✅ Now load attachments row by row
          this._loadAllAttachments();

        } catch (error) {
          console.error("Error in getAssetDetails:", error);
        }
      },
      _loadAllAttachments: function () {
        const oModel = this.getView().getModel("listOfSelectedAssetsModel");
        const aItems = oModel.getProperty("/value");   // WF UI returns items under `/value`

        const sReqno = aItems.length > 0 ? aItems[0].Btprn : null; // your workflow request number
        const sReqtype = "ADApproval"; // or whatever you save

        if (!aItems || aItems.length === 0) return;

        aItems.forEach((oRow, index) => {
          this._loadRowAttachments(
            sReqno,
            sReqtype,
            String(index + 1).padStart(3, "0"),
            new sap.ui.model.Context(oModel, "/value/" + index)
          );
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

            // store original copy if needed
            oModel.setProperty(oRowContext.getPath() + "/_OriginalAttachments",
              JSON.parse(JSON.stringify(aAttachments))
            );
          },
          error: (oError) => {
            console.error("❌ Error while loading attachments:", oError);
          }
        });
      },


      onGenericDownloadItem: function (oEvent) {
        const oContext = oEvent.getSource().getBindingContext("listOfSelectedAssetsModel");
        const aAttachments = oContext.getProperty("Attachments");
        if (!aAttachments || aAttachments.length === 0) {
          sap.m.MessageBox.warning("No attachment found.");
          return;
        }
        const oAttachment = aAttachments[0]; // since you bound to Attachments/0
        const sFileId = oAttachment.Fileid;
        const sMimeType = oAttachment.MimeType || "application/octet-stream";
        const sFileName = oAttachment.Filename;

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
            sap.m.MessageBox.error("Failed to download file.");
          });
      },


      // This function fetches the logged-in user's information
      getUserInfo: async function () {
        const url = this.getBaseURL() + "/user-api/currentUser";
        const oModel = this.getView().getModel("currentUser");
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
      getBaseURL: function () {
        return sap.ui.require.toUrl("fixedassetsdisposalapproval/adw/wf/workflowuimodule");
      },

      formatCapitalizationDate: function (oValue) {
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



    });
  }
);
