sap.ui.define(
    [
        "sap/ui/core/mvc/Controller",
         "sap/ui/core/format/DateFormat"
    ],
    function(BaseController,DateFormat) {
      "use strict";
  
      return BaseController.extend("fixedassetsdisposalapproval.adw.wf.workflowuimodule.controller.App", {
        onInit() {
       // this.getAssetDetails("0000200224");  
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
              this.getOwnerComponent().getModel("listOfSelectedAssetsModel").setData(oResponse);      
              console.log(this.getOwnerComponent().getModel("listOfSelectedAssetsModel").getData()) ;
     
          } catch (error) {
              console.error("Error in getAssetDetails:", error);
          }
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
  