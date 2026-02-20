// assign the access token
mapboxgl.accessToken =
    'pk.eyJ1IjoibGlseTA3IiwiYSI6ImNta3lpYTg3dzA3angzZnE3eHd0YTViZG4ifQ.f4GE26SsfN5fKe_R8KimlA';

// declare the map object
let map = new mapboxgl.Map({
    container: 'map', // container ID
    style: 'mapbox://styles/mapbox/dark-v10',
    zoom: 3.3, // starting zoom
    minZoom: 3.3,
    center: [-112, 37.8] // starting center
});

// declare the coordinated chart as well as other variables.
let covidChart = null,
    cases = {},
    numcovid = 0;

// create a few constant variables.
const grades = [100, 1000, 10000, 50000, 100000];
const colors = ['#fef0d9', '#fdcc8a', '#fc8d59', '#e34a33', '#b30000'];
const radii = [5, 10, 15, 20, 25];

// create the legend object and anchor it to the html element with id legend.
const legend = document.getElementById('legend');

//set up legend grades content and labels
let labels = ['<strong>Cases</strong>'], vbreak;

//iterate through grades and create a scaled circle and label for each
for (var i = 0; i < grades.length; i++) {
    vbreak = grades[i];
    // you need to manually adjust the radius of each dot on the legend
    // in order to make sure the legend can be properly referred to the dot on the map.
    dot_radii = 2 * radii[i];
    labels.push(
        '<p class="break"><i class="dot" style="background:' + colors[i] + '; width: ' + dot_radii +
        'px; height: ' +
        dot_radii + 'px; "></i> <span class="dot-label" style="top: ' + dot_radii / 2 + 'px;">' + vbreak +
        '</span></p>');

}

// join all the labels and the source to create the legend content.
legend.innerHTML = labels.join('');



// define the asynchronous function to load geojson data.
async function geojsonFetch() {

    // Await operator is used to wait for a promise.
    // An await can cause an async function to pause until a Promise is settled.
    let response, covid, x, y;
    response = await fetch('assets/us-covid-2020-counts.json');
    covid = await response.json();



    //load data to the map as new layers.
    //map.on('load', function loadingData() {
    map.on('load', () => { //simplifying the function statement: arrow with brackets to define a function

        // when loading a geojson, there are two steps
        // add a source of the data and then add the layer out of the source
        map.addSource('covid', {
            type: 'geojson',
            data: covid
        });


        map.addLayer({
                'id': 'covid-point',
                'type': 'circle',
                'source': 'covid',
                'minzoom': 3.3,
                'paint': {
                    // increase the radii of the circle as cases value increases
                    'circle-radius': {
                        'property': 'cases',
                        'stops': [
                            [grades[0], radii[0]],
                            [grades[1], radii[1]],
                            [grades[2], radii[2]],
                            [grades[3], radii[3]],
                            [grades[4], radii[4]]
                        ]
                    },
                    // change the color of the circle as cases value increases
                    'circle-color': {
                        'property': 'cases',
                        'stops': [
                            [grades[0], colors[0]],
                            [grades[1], colors[1]],
                            [grades[2], colors[2]],
                            [grades[3], colors[3]],
                            [grades[4], colors[4]]
                        ]
                    },
                    'circle-stroke-color': 'white',
                    'circle-stroke-width': 1,
                    'circle-opacity': 0.6
                }
            },
            'waterway-label' // make the thematic layer above the waterway-label layer.
        );


        // click on each dot to view cases in a popup
        map.on('click', 'covid-point', (event) => {
            new mapboxgl.Popup()
                .setLngLat(event.features[0].geometry.coordinates)
                .setHTML(`<strong>Cases:</strong> ${event.features[0].properties.cases}`)
                .addTo(map);
        });



        // the coordinated chart relevant operations

        // found the the cases of all the covid in the displayed map view.
        cases = calCovid(covid, map.getBounds());

        // enumerate the number of covid.
        numcovid = cases[100] + cases[1000] + cases[10000] + cases[50000] + cases[100000];

        // update the content of the element earthquake-count.
        document.getElementById("covid-count").innerHTML = numcovid;

        // add "cases" to the beginning of the x variable - the cases, and "#" to the beginning of the y variable - the number of earthquake of similar cases.
        x = Object.keys(cases);
        x.unshift("cases")
        y = Object.values(cases);
        y.unshift("#")


        // generate the chart
        covidChart = c3.generate({
            size: {
                height: 350,
                width: 460
            },
            data: {
                x: 'cases',
                columns: [x, y],
                type: 'bar', // make a bar chart.
                colors: {
                    '#': (d) => {
                        return colors[d["x"]];
                    }
                },
                onclick: function (d) { // update the map and sidebar once the bar is clicked.
                    let floor = parseInt(x[1 + d["x"]]),
                        ceiling = floor + 1;
                    // combine two filters, the first is ['>=', 'cases', floor], the second is ['<', 'cases', ceiling]
                    // the first indicates all the covid with cases greater than floor, the second indicates
                    // all the covid with cases smaller than the ceiling.
                    map.setFilter('covid-point',
                        ['all',
                            ['>=', 'cases', floor],
                            ['<', 'cases', ceiling]
                        ]);
                }
            },
            axis: {
                x: { //cases
                    type: 'category',
                },
                y: {
                }
            },
            legend: {
                show: false
            },
            bindto: "#covid-chart" //bind the chart to the place holder element "earthquake-chart".
        });

    });



    //load data to the map as new layers.
    //map.on('load', function loadingData() {
    map.on('idle', () => { //simplifying the function statement: arrow with brackets to define a function

        cases = calCovid(covid, map.getBounds());
        numcovid = cases[100] + cases[1000] + cases[10000] + cases[50000] + cases[100000];
        document.getElementById("covid-count").innerHTML = numcovid;


        x = Object.keys(cases);
        x.unshift("cases")
        y = Object.values(cases);
        y.unshift("#")

        // after finishing each map reaction, the chart will be rendered in case the current bbox changes.
        covidChart.load({
            columns: [x, y]
        });
    });
}

// call the geojson loading function
geojsonFetch();

function calCovid(currentData, currentMapBounds) {
    let casesClasses = {};
    grades.forEach(g => casesClasses[g] = 0);

    currentData.features.forEach(function (d) {
        if (currentMapBounds.contains(d.geometry.coordinates)) {
            let cases = d.properties.cases;
            for (let i = grades.length - 1; i >= 0; i--) {
                if (cases >= grades[i]) {
                    casesClasses[grades[i]] += 1;
                    break;
                }
            }
        }
    });
    return casesClasses;
}

// capture the element reset and add a click event to it.
const reset = document.getElementById('reset');
reset.addEventListener('click', event => {

    // this event will trigger the map fly to its origin location and zoom level.
    map.flyTo({
        zoom: 3.3,
        center: [-112, 37.8]
    });
    // also remove all the applied filters
    map.setFilter('covid-point', null)


});