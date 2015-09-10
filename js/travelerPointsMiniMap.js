/* * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * /
*
*   travelerPointsMiniMap.js (JavaScript)
*   written by Cody M Leff for the Grand Tour project
*   CESTA – Stanford University
*/

/*
*   This script creates an AngularJS module for the Traveler Points map meant
*   to be embedded within the traveler detail page of the Grand Tour web app.
*   To add to the site, add this module as a dependency for whatever main
*   manages the page, import the MiniMapService service into the controller
*   manages the travel destination list and bind the appropriate fields and
*   methods, then include a <traveler-points-mini-map> element in the HTML to
*   call the directive.
*/

(function() {

    var module = angular.module('TravelerPointsMiniMap', []);


    //  This is the service that connects to the mini map controller.
    module.factory('MiniMapService', function() {

        var miniMapShared = {
            travels: null,
            mouseOver: null,
            clicked: [],
        };

        return {

            miniMapShared: miniMapShared,

        };

    });


    //  This is the mini map controller.
    module.controller('MiniMapController', function($scope, MiniMapService) {

        $scope.miniMapShared = MiniMapService.miniMapShared;



    });


    //  This is the mini map directive for HTML inclusion.
    module.directive('travelerPointsMiniMap', function() {

        return {

            template: '{{ miniMapShared }}',
            restrict: 'E',

        };

    });

})();
