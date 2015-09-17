/* * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * /
*
*   travelerPointsMiniMap.js (JavaScript)
*   written by Cody M Leff for the Grand Tour project
*   CESTA – Stanford University
*/

/*
*   This script creates an AngularJS module for the Traveler Points map meant
*   to be embedded within the traveler detail page of the Grand Tour web app.
*   To add to the site, add this module as a dependency for whatever module
*   manages the page, import the MiniMapService service into the controller
*   that manages the travel destination list and bind the appropriate fields
*   and methods, then include a <traveler-points-mini-map> element in the HTML
*   to call the directive.
*/

(function() {

    var module = angular.module('TravelerPointsMiniMap', []);

    //  This is the service that connects to the mini map controller.
    module.factory('MiniMapService', function() {

        var miniMapShared = {

            travels: null,

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

            restrict: 'E',
            link: function(scope, element, attrs) {

                setupVisualization(element[0], scope);

                setTimeout(function() {

                    scope.$watch('miniMapShared.travels', function() {

                        if (scope.fullName) refreshVisualization();

                        // if (scope.miniMapShared.travels) for (var i = 0; i < scope.miniMapShared.travels.length; i++) {

                        //     var hovered = scope.miniMapShared.travels[i].hovered;
                        //     console.log('from minimap: travel ' + i + ' ' + (hovered ? 'hovered' : 'unhovered'));

                        // }

                    }, true);

                }, 0);

            },

        };

    });


// ------------------ Visualization Setup ------------------ //

    //  Constants
    var MAP_HEIGHT = 250;
    var MAP_WIDTH = 265;    //  used
    var BASEMAP_CENTER = [12.75, 42.05];
    var BASEMAP_SCALE = 1000;

    var MIN_POINT_RADIUS = 1;
    var MAX_POINT_RADIUS = 15;
    var HOVER_SIZE_INCREASE = 5;
    var TEXT_MARGIN_TOP = 5;
    var ONE_DAY_MS = 1000 * 60 * 60 * 24;

    //  This value was calculated by averaging the length of every traveler's
    //  visit to any destination that was exactly defined to the day.
    var AVG_STAY_DAYS = 26;

    var CLICKED_COLOR = '#88f';
    var UNCLICKED_COLOR = '#888';
    var ANIMATION_DELAY = 150;

    //  Instance variables
    var canvas, projection, uniqueDestinations, pointScale, key, points, targets, labels;


    //  BringToFront function
    var moveToFront = d3.selection.prototype.moveToFront = function() {
        return this.each(function() {
            this.parentNode.appendChild(this);
        });
    };


    //  sets up the visualization canvas
    function setupVisualization(element, scope) {

        canvas = d3.select(element).append('svg').attr('width', MAP_WIDTH).attr('height', MAP_HEIGHT);

        setupBasemap();
        drawPoints(scope);

    };

    //  display the basemap
    function setupBasemap() {

        //  set up mercator projection with map centered and
        //  scaled on region of interest.
        projection = d3.geo.mercator()
            .center(BASEMAP_CENTER)
            .scale(BASEMAP_SCALE)
            .translate([MAP_WIDTH / 2, MAP_HEIGHT / 2]);

        var path = d3.geo.path().projection(projection);

        //  download the basemap data and draw path
        d3.json('italy_outline.json', function(error, data) {

            canvas.append('path')
            .datum(data)
            .attr('d', path)
            .classed('basemap', true);

        });
    };

    //  display the mini map visualization.
    function drawPoints(scope) {

        var travels = scope.miniMapShared.travels

        //  check if there are travels
        var n_travels = travels ? travels.length : 0;

        if (n_travels) {

            //  filter out the points with no location data
            travels = travels.filter(function(destination) {
                return destination.latitude ? true : false;
            });

            drawDestinationPoints(travels, scope);

        }

    };


// ------------------ Visualization Function ------------------ //

    /*
    *   Function: drawDestinationPoints
    *   -------------------------------
    *   Draws a point with radius POINT_RADIUS at the location of each
    *   destination, animating its appearance.
    */
    function drawDestinationPoints(travels, scope) {

        //  create an array of unique travel travels
        uniqueDestinations = findUniqueDestinations(travels);


        //  reduce stayLengths to a total
        var totalStayLengths = uniqueDestinations.reduce(function(accum, next) {

            return accum + next.stayLength;

        }, 0);


        //  calculate the point scale
        pointScale = d3.scale.linear()
        .domain([0, totalStayLengths])
        .range([MIN_POINT_RADIUS, MAX_POINT_RADIUS]);


        //  draw the key
        var keyScale = d3.scale.linear()
        .range([MIN_POINT_RADIUS, MAX_POINT_RADIUS]);

        var keyLabelScale = d3.scale.linear()
        .range([0, totalStayLengths]);

        var SPACE_BETWEEN_KEY_POINTS = 5;

        var keyData = [];
        var keyIntervals = 5;
        for (var i = keyIntervals; i > -1; i--) {

            keyData.push({

                radius: keyScale(i / keyIntervals),
                label: keyLabelScale(i / keyIntervals),

            });
        }

        // key = canvas.selectAll('circle .key')
        // .data(keyData)
        // .enter()
        // .append('circle')
        // .classed('key', true)
        // .attr('cx', MAP_WIDTH - MAX_POINT_RADIUS)
        // .attr('cy', function(d, i) {

        //     var cy = SPACE_BETWEEN_KEY_POINTS + keyData[0].radius;
        //     for (var j = 1; j <= i; j++) {

        //         cy += keyData[j - 1].radius;
        //         cy += SPACE_BETWEEN_KEY_POINTS;
        //         cy += keyData[j].radius;

        //     }
        //     return cy;

        // })
        // .attr('r', function(d) { return d.radius; })
        // .style('fill', CLICKED_COLOR)
        // .style('stroke', CLICKED_COLOR);


        //  create point elements
        points = canvas.selectAll('circle .point')
        .data(uniqueDestinations)
        .enter()
        .append('circle')
        .classed('point', true)
        .attr('cx', function(d) { return d.xy[0]; })
        .attr('cy', function(d) { return d.xy[1]; })
        .attr('r', 0)
        .style('stroke', UNCLICKED_COLOR)
        .style('fill', UNCLICKED_COLOR)

        //  create hover and click targets
        targets = canvas.selectAll('circle .target')
        .data(uniqueDestinations)
        .enter()
        .append('circle')
        .classed('target', true)
        .attr('cx', function(d) { return d.xy[0]; })
        .attr('cy', function(d) { return d.xy[1]; })
        .attr('r', function(d) { return pointScale(d.stayLength) + HOVER_SIZE_INCREASE; })
        .style('stroke', 'rgba(0,0,0,0)')
        .style('fill', 'rgba(0,0,0,0)');

        //  create labels
        labels = canvas.selectAll('text')
        .data(uniqueDestinations)
        .enter()
        .append('text')
        .html(function(d) { return d.place; })
        .attr('x', function(d) { return d.xy[0]; })
        .attr('y', function(d) { return d.xy[1] + pointScale(d.stayLength) + HOVER_SIZE_INCREASE + TEXT_MARGIN_TOP; })
        .attr('font-size', '14')
        .attr('text-anchor', 'middle')
        .attr('dominant-baseline', 'hanging')
        .classed({ hidden: true });

        //  make label unstick if clicked
        targets.on('click', function(d, i) {

            var element = d3.select(labels[0][i]);
            if (element.classed('clicked')) {
                element.classed('clicked', false);
            }
        });

        //  update the visualization and shared data service on point click
        targets.on('click', function(_, i) {

            var d = uniqueDestinations[i];

            d.clicked = !d.clicked;

            for (var j = 0; j < d.sourceTravels.length; j++) {

                d.sourceTravels[j].clicked = d.clicked;

            };

            scope.$apply();

            if (d.clicked) clickOn(d3.select(i));
            else clickOff(d3.select(i));

        });


        //  update the visualization and the shared data service on hover
        targets.on('mouseenter', function(_, i) {

            var d = uniqueDestinations[i];

            d.hovered = true;

            for (var j = 0; j < d.sourceTravels.length; j++) {

                d.sourceTravels[j].hovered = true;

            };

            scope.$apply();
            hoverOn(d3.select(i));

        });

        //  update the visualization and the shared data service on hover end
        targets.on('mouseleave', function(_, i) {

            var d = uniqueDestinations[i];

            d.hovered = false;

            for (var j = 0; j < d.sourceTravels.length; j++) {

                d.sourceTravels[j].hovered = false;

            };

            scope.$apply();
            hoverOff(d3.select(i));

        });
    };


    /*
    *   Function: refreshVisualization
    *   ------------------------------
    *   Called when an element is rolled over or clicked on in the travel list
    *   to refresh the D3 visualization.
    */
    function refreshVisualization() {

        points.each(function(d, i) {

            var hovered = false;
            var clicked = false;

            for (var j = 0; j < d.sourceTravels.length; j++) {

                var travel = d.sourceTravels[j];

                if (travel.hovered) hovered = true;

                if (travel.clicked) clicked = true;
            }

            if (hovered !== d.hovered) {

                d.hovered = hovered;
                if (hovered) hoverOn(i);
                else hoverOff(i);

            }

            if (clicked !== d.clicked) {

                d.clicked = clicked;
                if (clicked) clickOn(i)
                else clickOff(i);

            }

        });

    };


    //  restyles a point to the hovered state
    function hoverOn(index) {

        var pointElement = d3.select(points[0][index]);
        var targetElement = d3.select(targets[0][index]);
        var labelElement = d3.select(labels[0][index]);

        pointElement.transition()
        .attr('r', function(d) { return pointScale(d.stayLength) + HOVER_SIZE_INCREASE; })
        .style('fill', CLICKED_COLOR)
        .style('stroke', CLICKED_COLOR);

        targetElement.moveToFront();

        labelElement.classed('hidden', false);

    };

    //  restyles a point to the non-hovered state
    function hoverOff(index) {

        var pointElement = d3.select(points[0][index]);
        var labelElement = d3.select(labels[0][index]);

        pointElement.transition()
        .attr('r', function(d) { return pointScale(d.stayLength); })
        .style('fill', UNCLICKED_COLOR)
        .style('stroke', UNCLICKED_COLOR);

        labelElement.classed('hidden', true);

    };

    //  restyles a point to the clicked state
    function clickOn(index) {

        var pointElement = d3.select(points[0][index]);

    };

    //  restyles a point to the unclicked state
    function clickOff(index) {

        var pointElement = d3.select(points[0][index]);

    };


// ------------------ Utility Functions ------------------ //

    /*
    *   Function: findUniqueDestinations
    *   -------------------------
    *   This function reduces the list of travels into a list of unique
    *   destinations, calculating the best guess for stay length for each
    *   and keeping references to the source travel objects for each.
    */
    function findUniqueDestinations(travels) {

        var uniqueDestinations = [];

        for (var i = 0; i < travels.length; i++) {

            var current = travels[i];

            var slo = guessStayLength(current.travelStartDay,
                        current.travelStartMonth,
                        current.travelStartYear,
                        current.travelEndDay,
                        current.travelEndMonth,
                        current.travelEndYear);

            //  fix because some date ranges are negative from bad data
            var adjustedStayLength = Math.abs(slo.exact ? slo.exact : slo.guess);


            var matching = uniqueDestinations.filter(function(element) {
                return element.place === current.place;
            });

            if (!matching[0]) {

                var newUniqueDestination = {

                    place: current.place,
                    visits: 1,
                    stayLength: adjustedStayLength,
                    xy: projection([current.longitude, current.latitude]),
                    sourceTravels: [current],
                    hovered: false,
                    clicked: false,

                }

                uniqueDestinations.push(newUniqueDestination);

            } else {

                matching[0].visits++;
                matching[0].stayLength += adjustedStayLength;
                matching[0].sourceTravels.push(current);

            }

        };

        return uniqueDestinations;
    };


    /*
    *   Function: guessStayLength
    *   -------------------------
    *   This function receives a set of stay length parameters and
    *   returns its best guess for the stay length.  If the start
    *   and end dates are both defined to the day, an exact number
    *   of days is returned.  If only the start or end date is
    *   present, or both are present and identical but not defined
    *   to the day, the average stay length of 26 days is returned.
    *   If the start and date are both present and different but not
    *   defined to the day, the function returns the upper and lower
    *   bounds of the range of possible stay lengths, along with the
    *   average of them as a guess.
    */
    var guessStayLength = function(startDay, startMonth, startYear, endDay, endMonth, endYear) {

        //  if either start or end has no data:
        //  return the average difference
        if ((!startDay && !startMonth && !startYear) || (!endDay && !endMonth && !endYear)) {
        //    console.log(arguments);
            return { guess: AVG_STAY_DAYS };
        }

        //  if start and end are both exact to the day:
        //  return an exact difference
        if (startDay && startMonth && startYear && endDay && endMonth && endYear) {
        //    console.log(arguments);
            return {

                exact: getDayDiff(new Date(startYear, startMonth - 1, startDay),
                    new Date(endYear, endMonth - 1, endDay + 1))
            };
        }

        //  if start and end are identical, but not exact to the day:
        //  return the average difference
        if (startDay === endDay && startMonth === endMonth && startYear === endYear) {
        //    console.log(arguments);
            return { guess: AVG_STAY_DAYS }
        }

        // console.log(arguments);

        //  For all other cases: calculate the possible start dates
        //  and end dates.
        var startDateLowerBound;
        var startDateUpperBound;
        var EndDateLowerBound;
        var EndDateUpperBound;

        //  calculate possible start dates
        if (startDay && startMonth && startYear) {

            startDateLowerBound = startDateUpperBound =
                new Date(startYear, startMonth - 1, startDay);

        } else if (startMonth) {

            var startDateLowerBound = new Date(startYear, startMonth - 1, 1);
            var startDateUpperBound = new Date(startYear, startMonth, 0);

        } else {

            var startDateLowerBound = new Date(startYear, 0, 1);
            var startDateUpperBound = new Date(startYear + 1, 0, 0);

        }
        // console.log(startDateLowerBound, startDateUpperBound);

        //  calculate possible end dates
        if (endDay && endMonth && endYear) {

            endDateLowerBound = endDateUpperBound =
                new Date(endYear, endMonth - 1, endDay);

        } else if (endMonth) {

            var endDateLowerBound = new Date(endYear, endMonth - 1, 1);
            var endDateUpperBound = new Date(endYear, endMonth, 0);

        } else {

            var endDateLowerBound = new Date(endYear, 0, 1);
            var endDateUpperBound = new Date(endYear + 1, 0, 0);

        }

        //  calculate the upper and lower bounds of the range
        var stayLengthLowerBound = getDayDiff(startDateUpperBound, endDateLowerBound);
        var stayLengthUpperBound = getDayDiff(startDateLowerBound, endDateUpperBound);

        return {

            guess: (stayLengthLowerBound + stayLengthUpperBound) / 2,
            range: [stayLengthLowerBound, stayLengthUpperBound],
        };
    }


    /*
    *   Function: getDayDiff
    *   --------------------
    *   This function calculates the number of days between two Date
    *   objects.
    */
    var getDayDiff = function(date_1, date_2) {

        //  get difference between dates in milliseconds
        var diff_ms = date_2.getTime() - date_1.getTime();

        //  return this difference in days
        return diff_ms / ONE_DAY_MS;
    };


    /*
    *   Function: getAverageStay
    *   ------------------------
    *   This function finds the average stay length across all
    *   travels; used just for data gathering.
    */
    var getAverageStay = function() {

        var n_stays_total = 0;
        var exact_stays = [];
        var n_travelers = 0;

        for (var i = 0; i < TOTAL_TRAVELERS; i++) {

            d3.json(API_URL + i, function(data) {

                n_travelers++;
                var travels = data.entry.travels;
                if ((travels ? travels.length : 0) > 0) {

                    for (var j = 0; j < travels.length; j++) {

                        n_stays_total++;
                        var d = travels[j];

                        if (d.travelStartDay &&
                            d.travelStartMonth &&
                            d.travelStartYear &&
                            d.travelEndDay &&
                            d.travelEndMonth &&
                            d.travelEndYear) {

                            var start = new Date(d.travelStartYear, d.travelStartMonth - 1, d.travelStartDay);
                            var end = new Date(d.travelEndYear, d.travelEndMonth - 1, d.travelEndDay);

                            var diff = getDayDiff(start, end);

                            exact_stays.push(diff);

                        }

                    }

                }

                if (n_travelers % 100 === 0 || n_travelers === TOTAL_TRAVELERS) {

                    console.log(n_travelers + ' travelers counted, ' +
                        n_stays_total + ' total stays found, ' +
                        exact_stays.length + ' exact stays found.');
                    var sum = exact_stays.reduce(function(accum, next) { return accum + next; }, 0);
                    var average = sum / exact_stays.length;
                    console.log('average stay length: ' + average + ' days');
                    var sumOfSquares = exact_stays.reduce(function(accum, next) { return accum + Math.pow(average - next, 2); }, 0);
                    var stdDev = Math.sqrt(sumOfSquares / exact_stays.length);
                    console.log('stay length standard deviation: ' + stdDev);

                }

            });

        }

    };

})();
