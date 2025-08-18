/* global QUnit */
QUnit.config.autostart = false;

sap.ui.getCore().attachInit(function () {
	"use strict";

	sap.ui.require([
		"zui/adw/fixedassetsdisposalapproval/zuiadwfadispreq/test/unit/AllTests"
	], function () {
		QUnit.start();
	});
});
