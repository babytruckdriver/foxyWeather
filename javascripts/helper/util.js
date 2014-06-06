/*jslint indent:8, devel:true, browser:true, vars:true*/
/*global define*/

// Objeto contenedor de utilidades.
// Estas funciones, si su uso es lo suficientemente común, podrían ir en un archivo '.js' a parte.

define({
        getDiaSemana: function (numDia) {
                "use strict";

                var dias = [    {short: "D", complete: "Domingo"},
                                {short: "L", complete: "Lunes"},
                                {short: "M", complete: "Martes"},
                                {short: "X", complete: "Miércoles"},
                                {short: "J", complete: "Jueves"},
                                {short: "V", complete: "Viernes"},
                                {short: "S", complete: "Sábado"}
                                ];
                return dias[numDia];
        },
        getMes: function (numDia) {
                "use strict";

                var dias = [    {short: "", complete: "Enero"},
                                {short: "", complete: "Febrero"},
                                {short: "", complete: "Marzo"},
                                {short: "", complete: "Abril"},
                                {short: "", complete: "Mayo"},
                                {short: "", complete: "Junio"},
                                {short: "", complete: "Julio"},
                                {short: "", complete: "Agosto"},
                                {short: "", complete: "Septiembre"},
                                {short: "", complete: "Octubre"},
                                {short: "", complete: "Noviembre"},
                                {short: "", complete: "Diviembre"}
                                ];
                return dias[numDia];
        },

        // Cachea respuestas de servidor en LocalStorage (HTML5)
        // Funcionalidad para el cacheo de respuestas Ajax
        cache: {
                CACHE_MINUTES: 5, //0 significa 'sin caché'
                setResponse: function (key, obj) {
                        "use strict";

                        // Si no existe el objecto lo crea.
                        if (!localStorage.getItem(key)) {

                                // En 'localStorage' se almacena la serialización de un objeto (toString), por lo que lo serializa antes para que se almacene correctamente (JSON.stringify)
                                localStorage.setItem(key, JSON.stringify(obj));
                        }
                },
                getResponse: function (key) {
                        "use strict";

                        var     antiguedadCache,
                                objStored = localStorage.getItem(key);

                        // Retorna el objeto solo si existe y no es más antigo que CACHE_MINUTES
                        // En caso de ser antiguo lo borra
                        if (objStored) {
                                objStored = JSON.parse(objStored);
                                antiguedadCache = (Date.now() - new Date(objStored.date).getTime()) / 60000;
                                if (antiguedadCache <= this.CACHE_MINUTES) {
                                        return objStored;
                                } else {
                                        localStorage.removeItem(key);

                                        // Cada vez que caduque una respuesta hacer un barrido en busca de más respuestas caducadas
                                        this.deleteObsoleteResponses();
                                }
                        }
                        return undefined;
                },

                // Recorre las propiedades de localStorage y borra las que están caducadas según CACHE_MINUTES
                deleteObsoleteResponses: function () {
                        "use strict";

                        var key, antiguedadCache, obj;
                        for (key in localStorage) {
                                if (typeof localStorage[key] !== "function" && localStorage.hasOwnProperty(key)) {
                                        obj = JSON.parse(localStorage.getItem(key));
                                        antiguedadCache = (Date.now() - new Date(obj.date).getTime()) / 60000;
                                        if (antiguedadCache > this.CACHE_MINUTES) {
                                                localStorage.removeItem(key);
                                        }
                                }
                        }
                }
        },

        // Se modifica la URL con la localidad consultada con el fin de que el enlace pueda ser almacenado como marcador/favorito
        // La misma función (pushState), además, genera historial
        historyHandler: function (newHash) {
                "use strict";

                var hash = window.location.hash;
                if (!hash || (hash === "#")) {
                        window.history.pushState(null, "The Weathernode", "#/" + newHash);
                } else {

                        // Si se está consultando la misma localidad (o se ha recargado la página -F5-) no se desea guardar en historial
                        if (hash.slice(2) !== newHash) {

                                // NOTE: He obserbado que según el PC (mismo navegador) las URLs con espacios se codifican con %20 o no.
                                // Esto es un problema, porque el método 'replace' no encuntra la cadena si tiene %20.
                                // La solución es utilizar el método 'encodeURIComponent', pero si no lleva %20 tampoco lo encuentra
                                // Estar atento...
                                window.history.pushState(null, "The Weathernode", hash.replace(hash.slice(2), newHash));
                        }
                }
        }
});
