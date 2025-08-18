/*global QUnit*/

sap.ui.define([
	"fixedassetsdisposalapprovaladwwf/workflow-ui-module/controller/AssetDisposal.controller"
], function (Controller) {
	"use strict";

	QUnit.module("AssetDisposal Controller");

	QUnit.test("I should test the AssetDisposal controller", function (assert) {
		var oAppController = new Controller();
		oAppController.onInit();
		assert.ok(oAppController);
	});

});
