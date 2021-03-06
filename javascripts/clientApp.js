/*jslint indent:8, devel:true, browser:true, vars:true*/
/*global jQuery, $, Handlebars, define*/

define(["helper/util", "handlebars", "jquery"], function (util, Handlebars, $) {
        "use strict";

        // ajaxInProgress: La variable informa si hay una petición Ajax en proceso
        var     ajaxInProgress = false,
                ENTER_KEY = 13;

        // Tipos de llamadas Ajax y tiempo de cacheo de respuestas
        // FUTURE: Estas variables se utilizarán cuando haya diferentes tipos de peticiones Ajax. Por el momento solo hay una
        var     FORECAST_CALL = 0,
                LOCALIDAD_CALL = 1;

        var App = {

                //Propiedad para almacenar información sobre la predicción de cada día
                data: [],

                init: function () {

                        // Poner el foco en el primer campo de entrada visible
                        $("body").find("input[type=text]:visible:first").focus();
                        this.cacheElements();
                        this.bindEvents();
                        this.route();
                },
                cacheElements: function () {
                        this.window = $(window);
                        this.forecastTemplate = Handlebars.compile($('#forecast-template').html());
                        this.extendedInfoTemplate = Handlebars.compile($('#extended-info-template').html());
                        this.logo = $("#logo");
                        this.foxyWeather = $("#foxyWeather");
                        this.condicionesActuales = this.foxyWeather.find("#condicionesActuales");
                        this.condicionesActualesLink = this.condicionesActuales.find(">a");
                        this.cuerpo = this.foxyWeather.find(".cuerpo");
                        this.temperatura = this.condicionesActuales.find(".temperatura");
                        this.estado = this.condicionesActuales.find(".estado");
                        this.localidadTemperatura = this.condicionesActuales.find(".localidad-temperatura");
                        this.imagenActual = this.condicionesActuales.find(".imagen-actual");
                        this.localidad = this.cuerpo.find("#localidad");
                        this.indicadorAjaxEnCurso = this.cuerpo.find("#indicadorAjaxEnCurso");
                        this.btoGetWeatherInfo = this.cuerpo.find("#getWeatherInfo");
                        this.forecastContainer = this.cuerpo.find("#forecast-container");
                        this.extendedInfoContainer = this.cuerpo.find("#extended-info-container");
                        this.validacionesContainer = this.cuerpo.find("#validaciones-container");
                        this.errorContainer = this.cuerpo.find("#error-container");
                        this.txtLocalidad = this.cuerpo.find(".localidad");
                },
                bindEvents: function () {

                        // Al clicar el botón se consulta el tiempo para la localidad indicada
                        this.btoGetWeatherInfo.on("click", this.eventWeatherInfo.bind(this));
                        this.localidad.on("click", this.eventMuestraBuscar.bind(this));
                        this.localidad.on("keyup", this.eventLocalidad.bind(this));
                        this.forecastContainer.on("click", ".resultado", this.eventShowExtendedInfo.bind(this));
                        this.condicionesActualesLink.on("click", this.eventShowExtendedInfo.bind(this));

                        // En este caso se deve delegar y no se puede cachear el elmento ".icon-extende-close" porque al arrancar la aplicación
                        // aún no existe el elemento
                        this.extendedInfoContainer.on("click", ".icon-extended-close", function () {
                                this.extendedInfoContainer.hide().empty();
                        }.bind(this));

                        this.window.on("hashchange", this.route.bind(this));

                        // Acciones a ejecutar cuando una petición Ajax comienza y/o termina
                        var that = this;
                        $(document).on("ajaxStart", function () {
                                ajaxInProgress = true;
                                that.indicadorAjaxEnCurso.show();
                        });
                        $(document).on("ajaxStop", function () {
                                ajaxInProgress = false;
                                that.indicadorAjaxEnCurso.hide();
                        });

                },
                route: function (e) {
                        var hash = window.location.hash.slice(2);

                        // Si en la URL se informa una localidad buscar directamente la previsión sobre la misma. Ej: /#/madrid
                        if (hash.length) {
                                this.localidad.val(hash);
                                this.txtLocalidad.text(hash);
                                this.btoGetWeatherInfo.click();
                        } else if (this.localidad.val()) {

                                //Si está relleno el input de localidad y no hay hash es porque se ha pulsado -F5-, así que se resetea la aplicación y se refresca la página
                                this.localidad.val("");
                                this.txtLocalidad.text("...");
                                window.location.reload();
                        }
                },

                /*
                Métodos utilizados desde 'bindEvents'
                */

                eventWeatherInfo: function (event) {

                        // Validaciones sobre los campos de entrada
                        var erroresEntrada = false;
                        if (!this.localidad.val()) {
                                this.muestraValidaciones(["Es necesario especificar una localidad"]);
                                this.localidad.focus().addClass("error-input");
                                erroresEntrada = true;
                        }

                        if (!erroresEntrada) {

                                //Al comenzar una nueva consulta se resetea la propiedad 'data'
                                this.data.length = 0;

                                this.validacionesContainer.hide();
                                this.getWeatherInfo();
                        }
                },
                eventLocalidad: function (event) {

                        // Al comenzar a teclear en el campo de entrada quitar la alerta visual de error por campo vacío
                        this.localidad.removeClass("error-input");

                        // Si la tecla pulsada es un 'Intro' lanzar el evento 'click' del botón
                        if (event.keyCode === ENTER_KEY) {
                                setTimeout(function() {this.logo.focus();}, 0);
                                this.btoGetWeatherInfo.click();
                                return false;
                        }

                        // Se utiliza 'event.target' en vez de 'this', ya que este en vez de hacer referencia al objeto
                        // que ha lanzado el evento hace referenci al objeto App porque se ha invocado así: '.bind(this)'?
                        this.txtLocalidad.text($(event.target).val());

                        // Si el campo está vacío
                        if (!$(event.target).val()) {
                                this.txtLocalidad.text("...");
                        }

                        // Si se han introducido más de 3 caracteres se procede a buscar localidades
                        // que coincidan con esos caracteres
                        // FUTURE Descomentar cuando se sepa qué hacer con la lista de localidades devueltas
                        /*
                        if ($(this).val().length >= 4) {
                        getLocalidades(this);
                        }*/
                },

                eventMuestraBuscar: function (event) {

                        // Al clicar en el campo de entrada quitar la alerta visual de error por campo vacío
                        $(event.target).removeClass("error-input");
                        this.localidad.select();
                        this.localidad.css("width", "93%");
                },

                eventShowExtendedInfo: function (event) {
                        // TODO: Mejorar plantilla handlebars con información extendida del tiempo
                        // Objeto de configuración de entrada para la plantilla Handlebars 'extendedInfoTemplate'
                        // NOTE: event.currentTarget hace referencia al elemento del DOM donde está puesto el listener, y no el elemento hijo que proboca el evento (event.target)
                        var extendedInfo = this.data[$(event.currentTarget).data("index")];

                        this.extendedInfoContainer.append(this.extendedInfoTemplate(extendedInfo));
                        this.extendedInfoContainer.show();
                },


                // Muestra mensajes de validación
                muestraValidaciones: function (arrValidaciones) {

                        //La información meteorológica anteriormente cargada se esconde
                        this.forecastContainer.hide();
                        this.condicionesActuales.hide();

                        this.validacionesContainer.html("<span class='centrado'>" + arrValidaciones[0] + "<span>");

                        if (this.validacionesContainer.is(":visible")) {
                                this.validacionesContainer.slideUp(200).delay(200).slideDown(200);
                        } else {
                                this.validacionesContainer.slideDown(200);
                        }
                },

                // Maneja los errores de la petición Ajax
                // err = { cod, desc }
                errorHandle: function (err) {
                        // La información meteorológica anteriormente cargada se oculta, además de los errores que se estén ya mostrando
                        this.forecastContainer.hide();
                        this.condicionesActuales.hide();
                        this.errorContainer.hide();

                        var errorMsg = err.statusText + "\n Error " + err.status;

                        this.errorContainer.html(errorMsg);
                        this.errorContainer.slideDown(200).delay(5000).slideUp(2000);
                },

                // Recupera la información meteorológica para la localización introducida
                getWeatherInfo: function () {
                        // Si no hay una petición Ajax en curso se realiza una
                        if (!ajaxInProgress) {
                                var     key = this.localidad.val().trim().toUpperCase(),
                                        cachedObj = util.cache.getResponse(key);

                                // Si existe una respuesta cacheada para la misma localidad utilizar los datos cacheados
                                // Si la respuesta cacheada sí existe pero no está vigente (es antigua), util.cache no habrá devuelvo respuesta
                                if (cachedObj) {
                                        this.printWeather(cachedObj.response);
                                        return false;
                                }

                                // URL del servicio RESTful del Backend de la aplicación
                                var targetUrl = "http://api.worldweatheronline.com/free/v1/weather.ashx";

                                // Objecto con los datos de entrada de la petición
                                var datos = {
                                        key: "4g6yp8teksrqzy6rfykh6c24",
                                        format: "json",
                                        q: this.localidad.val(),
                                        num_of_days: 4
                                };

                                // NOTE: Se quiere utilizar 'this' dentro de una función [complete] de un objeto, pero la función tendrá como 'this' el objeto en el que fué creada
                                // por lo que guardo el 'this' actual en una variable alcanzable desde dentro de la función llamada 'that'
                                var that = this;

                                // Configuración y llamada al servicio RESTful vía Ajax
                                $.ajax({
                                        url: targetUrl,
                                        data: datos,
                                        type: "GET",
                                        dataType: "jsonp",
                                        cache: false,
                                        contentType: "application/x-www-form-urlencoded; charset=UTF-8", // por defecto
                                        // En el contexto de una invocación Ajax, 'this' no se refiere al objeto contenedor sino a la propia llamada. Por eso 'bind(this)'
                                        success: this.printWeather.bind(this),
                                        error: this.errorHandle.bind(this),
                                        // Función que se ejecuta sin importar el resultado de la petición Ajax
                                        // CHANGES He comprobado que si se produce una excepción en la función 'success' la función 'complete' no se ejecuta.
                                        complete: function () {
                                        }
                                });
                        } // End if
                },

                // Función que ejecuta en caso de que la petición Ajax 'getWeatherInfo' haya sido exitosa
                // Muestra en pantalla la información meteorológica
                printWeather: function (json) {

                        // Si la respuesta no contiene errores
                        if (json.data.error === undefined) {

                                //Actualizar hash e historial
                                util.historyHandler(this.localidad.val().trim().toLocaleLowerCase());

                                // Cachear la respuesta del servidor (los errores no se cachean, solo las respuestas válidas)
                                // Si la respuesta ya está cacheada y está vigente (no es antigua) esta nos e cacheará. Esta funcionalidad se implementa en util.cache
                                var key = this.localidad.val().trim().toUpperCase();
                                util.cache.setResponse(key, {
                                        type: FORECAST_CALL,
                                        date: Date(),
                                        response: json
                                });

                                // Carga del tiempo actual
                                // Objeto de configuración del timepo actual
                                // TODO: Crear plantilla Handlebars para el tiempo actual
                                // TODO: Poblar estes objecto con toda la información que necesite la información extendida
                                var forecast = {
                                        cabeceraDiaSemana: "Condiciones Actuales",
                                        cabeceraDiaMes: "",
                                        imagen: json.data.current_condition[0].weatherIconUrl[0].value,
                                        localidad: json.data.request[0].query,
                                        temperatura: json.data.current_condition[0].temp_C + "Cº",
                                        estado: json.data.current_condition[0].weatherDesc[0].value,
                                        precipitacion: "TODO" + "mm",
                                        velocidadViento: "TODO" + "Km/h",
                                        colIndex: 0
                                };

                                //Se almacena el objeto con la información actual formateada en la propiedad data para poder ser reutilizada posteriormente
                                this.data.push(forecast);

                                this.condicionesActualesLink.data("index", 0);

                                this.temperatura.text(forecast.temperatura);
                                this.estado.text(forecast.estado);
                                $(this.temperatura).closest("div").show();
                                this.localidadTemperatura.text(forecast.localidad);

                                // FUTURE utilizar los siguientes datos referentes al tiempo actual
                                /*
                                $("#cloud-cover").text(json.data.current_condition[0].cloudcover + "%");
                                $("#precipitacion").text(json.data.current_condition[0].precipMM + "mm");
                                $("#velocidad-viento").text(json.data.current_condition[0].windspeedKmph + "Km/h");
                                */

                                // Carga de la imagen asociada al tiempo actual
                                this.imagenActual.attr("src", forecast.imagen);

                                // Presentación de la previsión meteorológica (diferentes de temperatura actual)
                                var jsonForecast = json.data.weather;

                                if (jsonForecast !== undefined) {

                                        this.forecastContainer.empty();

                                        $.each(jsonForecast, function (key, value) {

                                                // Mostrar fecha en formato Español/España
                                                var date = new Date(value.date);
                                                var day = date.getDate();
                                                var month = date.getMonth();
                                                var year = date.getFullYear();

                                                var formatedDay = util.getDiaSemana(date.getDay()).complete;
                                                var formatedMonth = util.getMes(month).complete;
                                                var diaMes =  day + " " + formatedMonth;

                                                var hoy = new Date();

                                                if ((hoy.getDate() === day) && (hoy.getMonth() === month) && (hoy.getFullYear() === year)) {
                                                        formatedDay = "Hoy";
                                                }

                                                // Objeto de configuración de entrada para la plantilla Handlebars 'forecastTemplate'
                                                forecast = {
                                                        imagen: value.weatherIconUrl[0].value,
                                                        cabeceraDiaSemana: formatedDay,
                                                        cabeceraDiaMes: diaMes,
                                                        temperatura: value.tempMaxC + "/" + value.tempMinC + "Cº Max/min",
                                                        estado: value.weatherDesc[0].value,
                                                        precipitacion: value.precipMM + "mm",
                                                        velocidadViento: value.windspeedKmph + "Km/h",
                                                        colIndex: key+1
                                                };

                                                //Se almacena el objeto con la información formateada de cada día en la propiedad data para poder ser reutilizada posteriormente
                                                this.data.push(forecast);
                                                this.forecastContainer.append(this.forecastTemplate(forecast));
                                        }.bind(this));

                                        this.forecastContainer.append("<div class='clear'></div>");
                                }

                                // Animación para la presentación del listado de datos y la imagen
                                if (this.forecastContainer.is(":visible")) {
                                        this.forecastContainer.slideUp(200).delay(200).slideDown(1000);
                                        this.condicionesActuales.hide().slideDown("1000");
                                } else {
                                        this.forecastContainer.slideDown(1000);
                                        this.condicionesActuales.hide().slideDown("1000");
                                }
                        } else {
                                // Se pasa el error a la función manejadora de errores
                                this.errorHandle({statusText: json.data.error[0].msg, status: 200});
                        }
                }

        };

        //Se exporta la funcionalidad que se desea exponer
        return {
                "App" : App
        };

}); //Fin requirejs
