/*global QUnit*/

sap.ui.define([
	"zui/adw/fixedassetsdisposalapproval/zuiadwfadispreq/controller/WorkList.controller"
], function (Controller) {
	"use strict";

	QUnit.module("WorkList Controller");

	QUnit.test("I should test the WorkList controller", function (assert) {
		var oAppController = new Controller();
		oAppController.onInit();
		assert.ok(oAppController);
	});

});
