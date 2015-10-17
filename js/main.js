/*
*   JS for the sample page for demonstrating embedding the mini traveler point
*   map in the Grand Tour Explorer.
*/

(function() {

    //  the module for the sample page; requires the TravelerPointsMini module
    var module = angular.module('SamplePage', ['TravelerPointsMiniMap']);

    //  the controller for the sample page; exchanges point selection data with
    //  the TravelerPointsMini selection controller
    module.controller('SamplePageController', function($scope, $http, $compile, $log, $interval, MiniMapService) {

        var API_URL = 'https://grandtour.herokuapp.com/api/entries/';
        var ANIMATION_INTERVAL = 500;

        $scope.getTraveler = function(travelerID) {

            //  executed when the Explore Traveler button is clicked
            $http.get(API_URL + travelerID).then(function(response) {

                //  expose the full name of the traveler to the sample site
                $scope.fullName = response.data.entry.fullName;
                $scope.travels = response.data.entry.travels;

                //  send the list of travels to the shared data service
                $scope.miniMapShared.travels = (response.data.entry.travels);

                $scope.placeholder = travelerID;

                var directiveHTML = '<traveler-points-mini-map></traveler-points-mini-map>';
                var miniMapElement = $compile(directiveHTML)($scope);

                var wrapperElement = angular.element(document.getElementById('minimap'));
                wrapperElement[0].innerHTML = '';
                wrapperElement.append(miniMapElement);

                doInitialAnimation($scope.travels);

                $scope.reanimate = doInitialAnimation;


            }).catch(function() {

                alert('There was an error loading traveler information!');

            });

            $scope.placeholder = 'Loading...';
            $scope.travelerID = '';

        };

        $scope.miniMapShared = MiniMapService.miniMapShared;

        //  Hovers over every element.
        function doInitialAnimation(travels) {

            var i = 0;

            $interval(next, ANIMATION_INTERVAL, travels.length + 1);

            function next() {

                if (i > 0) $scope.miniMapShared.travelUnhovered(travels[i - 1]);
                if (i < travels.length) $scope.miniMapShared.travelHovered(travels[i]);
                i++;

            };
        }

    });

})();
