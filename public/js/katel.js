$(document).ready(function() {
	var chart, pellets;
	var chartOpts = {
		pointDot: false,
		datasetStrokeWidth: 1,
		animation: false,
		scaleShowVerticalLines: false
//            legendTemplate : "<ul class=\"<%=name.toLowerCase()%>-legend\"><% for (var i=0; i<datasets.length; i++){%><li><span style=\"background-color:<%=datasets[i].strokeColor%>\"></span><%if(datasets[i].label){%><%=datasets[i].label%><%}%></li><%}%></ul>"
	};
	var pellChartOpts = {

	};
	var data = null;
	function LegendVm() {
		var self = this;
		self.items = ko.observableArray([]);

		self.additem = function(label, value, unit, color){
			self.items.push({label: label, value: value, unit: unit, color: color})
		};
		self.updateVal = function(data, pos){
			var old = JSON.parse(JSON.stringify(self.items()[pos]));
			old.value = data;
			self.items.replace(self.items()[pos], old);
		}
	}

	var vm = {
		legend: new LegendVm()
	};
	ko.applyBindings(vm);
	var ctx = document.getElementById("myChart").getContext("2d");
	var ctxPellets = document.getElementById("pellets").getContext("2d");

	var myLineChart = new Chart(ctx);
	var pelletChart = new Chart(ctxPellets);

	$.get("getData", function(data) {
		chart = myLineChart.Line(data, chartOpts);
		makeLegend(data);
	});
	$.get("getPellets", function(data){
		pellets = pelletChart.Bar(data, pellChartOpts);
	});

	setInterval(function() {
		update();

	}, 60000);
	function makeLegend(data){
		for(var i=0; i<data.datasets.length; i++){
			var item = data.datasets[i];
			vm.legend.additem(item.label, item.data[item.data.length-1], item.unit, item.strokeColor);
		}
	}
	function updateLegend(data){
		for(var i=0; i<data.length; i++){
			vm.legend.updateVal(data[i], i);
		}
	}
	function update() {
		$.get("getLatest", function(data) {
			chart.removeData();
			//{"label":"","data":["7.7","23.3","33.1","33.6","6.4"]}
			chart.addData(data.data, data.label);
			updateLegend(data.data);
		});
	}
});