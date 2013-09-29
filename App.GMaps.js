/**
 * User: skarev
 * Date: 11.06.13
 * Time: 0:28
 */
App.module('GMaps', function(GMaps, App, Backbone, Marionette, $, _) {

    /**
     * MArker types
     * @type {{CURRENT_LOCATION: number, PLACE: number, HOTEL: number}}
     */
    GMaps.MarkerTypes = {
        CURRENT_LOCATION: {id: 0, color: 'FDA345'},
        PLACE: {id: 1, color: 'A2D8A9'},
        HOTEL: {}
    };


    /**
     * Google Places API service.
     * @type {Tutrip.GooglePlacesAPI}
     */
    var googlePlacesAPI = new Tutrip.GooglePlacesAPI();

    /**
     * Map variable.
     */
    var map;

    /**
     * Current location.
     */
    var initialLocation;

    /**
     * Types of places to search for.
     * @type {Array}
     */
    var types = ['museum'];

    /**
     * Markers.
     */
    var markers = [];

    /**
     * Info windows.
     * @type {Array}
     */
    var infoBoxes = [];

    /**
     * Autocomplete element.
     */
    var autocomplete;

    /**
     * Initialize map if it does not exist yet.
     * @param id - identifier of map [div] element
     * @param locate - flag, if [true] then determine my location, otherwise do not determine
     * @param onlocationfound - callback function which is called when location is found
     */
    var initializeMap = function(id, locate) {
        var mapOptions = {
            zoom: 11,
            mapTypeId: google.maps.MapTypeId.ROADMAP
        };
        map = new google.maps.Map(document.getElementById(id), mapOptions);
        if (locate) API.locate();
    };


    /**
     *
     * @param inputId
     */
    var initAutoComplete = function(inputId) {
        var input = document.getElementById(inputId);
        var options = {
            types: ['(cities)']
        };

        autocomplete = new google.maps.places.Autocomplete(input, options);

        google.maps.event.addListener(autocomplete, 'place_changed', function() {
           API.onPlaceChanged();
        });
    };

    /**
     *
     * @param map
     */
    function setAllMap(map, ofType) {
        for (var i = 0; i < markers.length; i++) {
            if (markers[i].typeId === ofType['id']) {
                markers[i].setMap(map);
            }
        }
    }

    /**
     *
     */
    function closeInfoBoxes() {
        for (var i = 0; i < infoBoxes.length; i++) {
            infoBoxes[i].close();
        }
    }

    /**
     * API for working with Google Maps.
     * @type {{getMap: Function, locate: Function, setLocation: Function}}
     */
    var API = {

        /**
         * Retrieve map. Initialize map if it does not exist.
         * @param id - identifier of map [div] element
         * @param locate - flag, if [true] then determine my location, otherwise do not determine
         * @returns map variable
         */
        getMap: function(id, locate) {
            _.bindAll(this);
            if (map === undefined) {
                initializeMap(id, locate);
            }
            return map;
        },
        /**
         * Find my location.
         */
        locate: function() {
            if (map !== undefined) {
                if(navigator.geolocation) {
                    navigator.geolocation.getCurrentPosition(this.setLocation, function() {});
                }
            }
        },
        /**
         * Set location on map.
         * @param e
         */
        setLocation: function(e) {
            initialLocation = new google.maps.LatLng(e.coords.latitude,e.coords.longitude);
            map.setCenter(initialLocation);
            this.findCurrentPlaces(types);
            this.createMarker(-1, initialLocation, 'Current Location', GMaps.MarkerTypes.CURRENT_LOCATION);
        },
        /**
         *
         * @param types
         */
        findCurrentPlaces: function(types) {
            if (map && types && initialLocation) {
                App.vent.trigger('map:findplaces', map, types, initialLocation);
            } else {
                alert('Your current location is not determined');
            }
        },
        /**
         *
         * @param reference
         * @param callback
         */
        getPlaceDetails: function(reference, callback) {
            if (map !== undefined) {
                googlePlacesAPI.getPlaceDetails(map, reference, callback);
            }
        },
        /**
         *
         * @param id
         * @param location
         * @param title
         * @param markertype
         */
        createMarker: function(id, location, title, markertype) {
            var pinImage = new google.maps.MarkerImage("http://chart.apis.google.com/chart?chst=d_map_pin_letter&chld=%E2%80%A2|" + markertype['color'],
                new google.maps.Size(21, 34),
                new google.maps.Point(0,0),
                new google.maps.Point(10, 34));
            var marker = new google.maps.Marker({
                id: id,
                position: location,
                map: map,
                title: title,
                icon: pinImage,
                typeId: markertype['id']
            });
            var infoBox = new google.maps.InfoWindow({
                id: id,
                content: title
            });
            google.maps.event.addListener(marker, 'click', function() {
                closeInfoBoxes();
                infoBox.open(map,marker);
            });
            infoBoxes.push(infoBox);
            markers.push(marker);
        },
        /**
         * Reset markers array.
         */
        resetMarkers: function(ofType) {
            setAllMap(null, ofType);
            markers = [];
        },
        /**
         * Show info box
         * @param id
         */
        showInfoBox: function(id) {
            console.log('Show info box for place id: ' + id);
            var infoBox = infoBoxes.find(function(n) {return n['id'] == id;});
            console.log(infoBox);
            var marker = markers.find(function(n) {return n['id'] == id;});
            console.log(marker);
            closeInfoBoxes();
            infoBox.open(map,marker);
        },
        initAutoComplete: function(inputId) {
            if (autocomplete === undefined) {
                initAutoComplete(inputId);
            }
            return autocomplete;
        },
        onPlaceChanged: function() {
            if (autocomplete !== undefined) {
                var place = autocomplete.getPlace();
                if (place.geometry.viewport) {
                    map.fitBounds(place.geometry.viewport);
                } else {
                    map.setCenter(place.geometry.location);
                    map.setZoom(17);
                }
                initialLocation = place.geometry.location;

                this.findCurrentPlaces(types);
                this.createMarker(-1, initialLocation, 'Current Location', GMaps.MarkerTypes.CURRENT_LOCATION);

            }

        }
    };



    /*
     | ---------------------------------------------------
     | Request Handlers
     | ---------------------------------------------------
     */

    /**
     * map:init handler
     */
    App.reqres.setHandler("map:init", function(id, locate) {
        return API.getMap(id, locate);
    });

    /**
     * map:locate handler
     */
    App.reqres.setHandler("map:locate", function(onlocationfound) {
        return API.locate(onlocationfound);
    });

    /**
     * map:findplaces handler
     */
    App.reqres.setHandler("map:findplaces", function(types) {
        return API.findCurrentPlaces(types);
    });

    /**
     * places:getplacedetails handler
     */
    App.reqres.setHandler("places:getplacedetails", function(reference, callback) {
        API.getPlaceDetails(reference, callback);
    });

    /**
     * map:createmarker handler
     */
    App.reqres.setHandler("map:createmarker", function(id, location, title, markertype) {
        return API.createMarker(id, location, title, markertype);
    });

    /**
     * map:resetmarkers handler
     */
    App.reqres.setHandler("map:resetmarkers", function(ofType) {
        return API.resetMarkers(ofType);
    });

    /**
     * map:showinfobox handler
     */
    App.reqres.setHandler("map:showinfobox", function(id) {
        return API.showInfoBox(id);
    });

    /**
     * map:initautocomplete handler
     */
    App.reqres.setHandler("map:initautocomplete", function(inputId) {
        return API.initAutoComplete(inputId);
    });
});