/*jslint indent:8, devel:true, browser:true, vars:true*/
/*global require*/

require.config({
        baseUrl: "javascripts",
        paths: {
                jquery: "vendor/jquery-2.1.0",
                handlebars: "vendor/handlebars-v1.3.0"
        },
        shim: { //Se configuran los módulos no AMD
                handlebars: {
                        exports: "Handlebars"
                }
        }
});

require(["clientApp"], function (Application) {
        "use strict";

        Application.App.init();
});
