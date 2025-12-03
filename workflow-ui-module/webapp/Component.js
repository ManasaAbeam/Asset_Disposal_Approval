sap.ui.define(
  [
      "sap/ui/core/UIComponent",
      "sap/ui/Device",
      "fixedassetsdisposalapproval/adw/wf/workflowuimodule/model/models",
  ],
  function (UIComponent, Device, models) {
      "use strict";

      return UIComponent.extend(
        "fixedassetsdisposalapproval.adw.wf.workflowuimodule.Component",
      {
          metadata: {
          manifest: "json",
          },

          /**
          * The component is initialized by UI5 automatically during the startup of the app and calls the init method once.
          * @public
          * @override
          */
          init: function () {
          // call the base component's init function
          UIComponent.prototype.init.apply(this, arguments);

          // enable routing
          this.getRouter().initialize();

          // set the device model
          this.setModel(models.createDeviceModel(), "device");

        //   this.setTaskModels();

        //   const rejectOutcomeId = "reject";
        //   this.getInboxAPI().addAction(
        //       {
        //       action: rejectOutcomeId,
        //       label: "Reject",
        //       type: "reject",
        //       },
        //       function () {
        //       this.completeTask(false, rejectOutcomeId);
        //       },
        //       this
        //   );
        //   const approveOutcomeId = "approve";
        //   this.getInboxAPI().addAction(
        //       {
        //       action: approveOutcomeId,
        //       label: "Approve",
        //       type: "accept",
        //       },
        //       function () {
        //       this.completeTask(true, approveOutcomeId);
        //       },
        //       this
        //   );
        //   },

        //   setTaskModels: function () {
        //   // set the task model
        //   var startupParameters = this.getComponentData().startupParameters;
        //   this.setModel(startupParameters.taskModel, "task");

        //   // set the task context model
        //   var taskContextModel = new sap.ui.model.json.JSONModel(
        //       this._getTaskInstancesBaseURL() + "/context"
        //   );
        //   this.setModel(taskContextModel, "context");
        //   },

        //   _getTaskInstancesBaseURL: function () {
        //   return (
        //       this._getWorkflowRuntimeBaseURL() +
        //       "/task-instances/" +
        //       this.getTaskInstanceID()
        //   );
          },

          _getWorkflowRuntimeBaseURL: function () {  
            var ui5CloudService = this.getManifestEntry("/sap.cloud/service").replaceAll(".", "");  
            var ui5ApplicationName = this.getManifestEntry("/sap.app/id").replaceAll(".", "");  
            var appPath = `${ui5CloudService}.${ui5ApplicationName}`;
            return `/${appPath}/api/public/workflow/rest/v1`

          },

          getTaskInstanceID: function () {
          return this.getModel("task").getData().InstanceID;
          },

          getInboxAPI: function () {
          var startupParameters = this.getComponentData().startupParameters;
          return startupParameters.inboxAPI;
          },


          // _triggerAction: function (outcome) {
          //   var that = this;
          //   var oModel = this.getModel("ZUI_ADW_ASSET_REQUEST_SRV");
         
          //   var oPayload = {
          //     Reqno: this.getModel("context").getData().Btprn,
          //     ActionCode: outcome === "approve" ? "APPROVE" : "REJECT",
          //     Comments: this.getRootControl().byId("idApproverComments").getValue(),
          //     CrBtpuser:  this.getModel("currentUser").getProperty("/email"),
          //     Reqstatus: outcome === "approve" ? "Approved By HOD" : "Rejected By HOD"
          //   };
         
          //   console.log("TriggerAction payload:", oPayload);
         
          //   return new Promise(function (resolve, reject) {
          //     oModel.create("/ActionSet", oPayload, {
          //       success: function (oData) {
          //         console.log("Created ActionSet:", oData);
          //         resolve(oData);
          //       },
          //       error: function (oError) {
          //         console.error("Error in _triggerAction:", oError);
          //         reject(new Error("Failed to trigger workflow action"));
          //       }
          //     });
          //   });
          // },
     
     

          completeTask: function (approvalStatus, outcomeId) {
          if (outcomeId === "reject") {
              var sComments = this.getRootControl().byId("idApproverComments").getValue();
              if (!sComments || sComments.trim() === "") {
                  var oBundle = this.getModel("i18n").getResourceBundle();
                  sap.m.MessageBox.error(oBundle.getText("msgCommentsRequiredReject"));
                  return;
              }
          }

          this.getModel("context").setProperty("/approved", approvalStatus);
          //this._triggerAction(outcomeId);
          this._patchTaskInstance(outcomeId);
          },

          _patchTaskInstance: function (outcomeId) {
          const context = this.getModel("context").getData();
          const sComments = this.getRootControl().byId("idApproverComments").getValue();
          const cCurrentUser=this.getModel("currentUser").getProperty("/email")
          var data = {
              status: "COMPLETED",
              context: {...context, Comments:sComments,ActionTakenBy:cCurrentUser},
              decision: outcomeId
          };

          jQuery.ajax({
              url: `${this._getTaskInstancesBaseURL()}`,
              method: "PATCH",
              contentType: "application/json",
              async: true,
              data: JSON.stringify(data),
              headers: {
              "X-CSRF-Token": this._fetchToken(),
              },
          }).done(() => {
              this._refreshTaskList();
          })
          },

          _fetchToken: function () {
          var fetchedToken;

          jQuery.ajax({
              url: this._getWorkflowRuntimeBaseURL() + "/xsrf-token",
              method: "GET",
              async: false,
              headers: {
              "X-CSRF-Token": "Fetch",
              },
              success(result, xhr, data) {
              fetchedToken = data.getResponseHeader("X-CSRF-Token");
              },
          });
          return fetchedToken;
          },

          _refreshTaskList: function () {
          this.getInboxAPI().updateTask("NA", this.getTaskInstanceID());
          },
      }
      );
  }
);