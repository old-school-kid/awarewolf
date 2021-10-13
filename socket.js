// Minimum update interval for the charts
var update_interval = 200;

var socket = io.connect('http://localhost:8080');

/**
 * General methods used
 */
function setState(state) {

	$("body").removeClass("connected uncertain disconnected");
	$("body").addClass(state);
};

var enabledCharts = {};

Highcharts.setOptions({
    global: {
        useUTC: false
    }
});

function requestChartData(elem) {

    var container = $(elem.target.container);

    // If the chart was deleted before the timeout, then stop everything
    if(elem == null || container.length <= 0) {
        return false;
    }

    var path = container.parent().attr("id").replace("_chart", "")

    if(enabledCharts[path] != null) {
        var series = elem.target.series[0],
            shift = series.data.length > 20; // shift if the series is longer than 20

        // add the point
        elem.target.series[0].addPoint([(new Date()).getTime() , parseFloat(enabledCharts[path]["data"])], true, shift);
    }

     // call it again after interval
    setTimeout(function(){ requestChartData(elem) }, update_interval); 
}

function createChart(path, title, data) {

    enabledCharts[path] = {
    	"element" : $("#charts")
        .append("<div class='col-md-6'><div class='chart' id='" + path + "_chart'></div></div>")
        .children("div").last().children("div"),
        "data" : data,
        "title" : title
    }

    enabledCharts[path]["chart"] = new Highcharts.Chart({
        chart: {
            renderTo: path + "_chart",
            defaultSeriesType: 'spline',
            marginRight: 10,
            events: {
                load: requestChartData
            }
        },
        title: {
            text: title
        },
        xAxis: {
            type: 'datetime',
            tickPixelInterval: 150
        },
        yAxis: {
            title: {
                text: 'Value'
            },
            plotLines: [{
                value: 0,
                width: 2,
                color: '#8cc152'
            }]
        },
        tooltip: {
            enabled: false
        },
        legend: {
            enabled: false
        },
        exporting: {
            enabled: false
        },
        series: [{
            name: title,
            data: [{ x: (new Date()).getTime(), y: parseFloat(data)}],
            marker: {
		       enabled: false
		    }
        }]
    });      
}

function destroyChart(path) {
    enabledCharts[path].chart.destroy();
    enabledCharts[path].element.parent().remove();
    delete enabledCharts[path];
}

function setChart(path, enabled, title, data) {

    if(enabled == null) enabled = true;

    if(enabled && (enabledCharts[path] == null || !enabledCharts[path])) {
        createChart(path, title, data);
    }

    if(!enabled && enabledCharts[path]) {
        destroyChart(path);
    }
}

function setChartData(path, data) {

    if( enabledCharts[path] != null && enabledCharts[path] ) {
        enabledCharts[path]["data"] = data;
    }
}

var table = {},
    jTable = null,
    columns = 7;

function setTableValue(opath, values) {

    if(jTable == null) jTable = $("table#raw-table tbody");

    var count = 0;

    for (var title in values) {

        // Add the counter
        path = opath + '_' + count;

        if(typeof table[path] == "undefined") {
            // Always used
            var the_column = '<td id=' + path + '><button class="btn btn-default btn-block" data-toggle="tooltip" data-placement="top" data-original-title="' + title + '">' + parseFloat(values[title]).toFixed(2); values[title] + '</button></td>';
            // We just have to catch whether to make a new row
            if(jTable.children("tr").length <= 0 || jTable.children("tr").last().children("td").length >= columns) {
                table[path] = jTable.append('<tr>' + the_column + '</tr>').children("tr").last().children("td").last();
            } else {
                table[path] = jTable.children("tr").last().append(the_column).children("td").last();
            }
            // Enable tooltips
			$(table[path]).children("button").tooltip();
			$(table[path]).children("button").off("click").on("click", function(){
                if($(this).hasClass('btn-default')) {
                    $(this).removeClass("btn-default").addClass("btn-success");
                    setChart(path, true, title, parseFloat(values[title]).toFixed(2));
                } else {
                    $(this).removeClass("btn-success").addClass("btn-default");
                    setChart(path, false);
                }
			});
        } else {
            table[path].children("button").text(parseFloat(values[title]).toFixed(2));
            setChartData(path, parseFloat(values[title]).toFixed(2));
        }

        count ++;
    }
}

/**
 * Connection states received by the socket
 */

socket.on('disconnect', function(){
	setState("disconnected");
});

socket.on('connected', function (data) {
	if( data.connected ) {
		setState("connected");
        if(data.config != null) 
            $("#battery i").attr("data-percentage", data.config.battery_percent_remaining).parent().attr("data-percentage", data.config.battery_percent_remaining);
	}
});

/**
 * Specific data received by the socket
 */