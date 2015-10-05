'use strict';
var http = require('http');
var pg = require('pg');
var escape = require('pg-escape');
var q = require('q');
var app = require('./index');

var conString = process.env.DATABASE_URL || 'postgres://admin@localhost/stoker';
var apiHost = 'stokercloud.dk';

var options = {
	host: 'stokercloud.dk',
	path: '',
	method: 'GET'
};

function parseGeneral(obj, data) {
	obj = JSON.parse(obj);
	data = {
		roomTemp: obj['592'].split(' ')[0],
		outTemp: obj['524'].split(' ')[0],
		windSpd: obj['587'].split(' ')[0],
		power: obj['504'].split(' ')[0]
	};
	return data;
}

function parseWeather(str, data) {

	var outletAct = str.split('<br/>')[1].split(' ')[3].split('&')[0];
	var outletWant = str.split('<br/>')[1].split(' ')[4].split('&')[0].replace(/^\(/, "");
	data.outletAct = outletAct;
	data.outletWant = outletWant;

	return data;
}

function parsePellets(str, data) {
	var obj = JSON.parse(str);
	var pelletsTotal = obj[0].data[0][1];
	var pelletsDhw = obj[1].data[0][1];

	data.pelletsHeat = pelletsTotal-pelletsDhw;

	return data;
}

exports.getData = function(callback) {
	var data;
	var now = new Date();
	options.path = '/dev/getjsondriftdata.php?mac=kpihus&tid=' + now.getTime();

	//get general data

	makeRequest(options, function(str) {
		data = parseGeneral(str, data);
		options.path = '/dev/weatherdata.php?mac=kpihus';
		//Weather settings
		makeRequest(options, function(str) {
			data = parseWeather(str, data);
			//Pellets consume
			options.path = '/dev/getjsonusagenew.php?mac=kpihus&hours=24&' + now.getTime();
			makeRequest(options, function(str) {
				data = parsePellets(str, data);
				callback(data);
			})

		})
	})

};

function makeRequest(options, callback) {
	app.server.log(options.host + options.path); //TODO: Remove
	var req = http.request(options, function(response) {
		var str = '';
		response.on('data', function(chunk) {
			str += chunk;
		});
		response.on('end', function() {
			callback(str);

		});
	});
	req.on('error', function(e) {
		app.server.log(e);
	});
	req.on('timeout', function() {
		app.server.log('timeout'); //TODO: Remove
		req.abort();
	});
	req.setTimeout(5000);
	req.end();
}

exports.writeToDb = function(data, callback) {
	var now = new Date().getTime();
	pg.connect(conString, function(err, client, done) {
		if(err) {
			return callback(err);
		}
		var query = escape("INSERT INTO %I (time, data) VALUES(%s, %L)", 'data', now, JSON.stringify(data));
		app.server.log(query);
		client.query(query, function(err, res) {
			done();
			if(err) {
				return callback(err);
			}
			callback(null, res.rowCount);
		})
	});
};

function makeTime(timestamp) {
	var date = new Date(timestamp);
	var time = "";
	if(date.getMinutes() == 0) {
		time = date.getHours() + ":00";
	} else if(date.getMinutes() == 30) {
		time = date.getHours() + ":30";
	}

	return time;
}

exports.chartData = function(callback) {
	var data = {
		labels: [],
		datasets: [
			{
				label: "Out Temp",
				unit: "\xB0 C",
				fillColor: "rgba(168,171,255,0)",
				strokeColor: "rgba(125,129,255,0.8)",
				pointColor: "rgba(125,129,255,0.8)",
				highlightFill: "rgba(125,129,255,0.8)",
				highlightStroke: "rgba(125,129,255,0.8)",
				pointHighlightStroke: "rgba(125,129,255,0.8)",
				data: []
			},
			{
				label: "Room Temp",
				unit: "\xB0 C",
				fillColor: "rgba(255,163,185,0)",
				strokeColor: "rgba(255,92,130,0.8)",
				pointColor: "rgba(255,92,130,0.8)",
				highlightFill: "rgba(220,220,220,0.75)",
				highlightStroke: "rgba(220,220,220,1)",
				data: []
			},
			{
				label: "Outlet Wanted",
				unit: "\xB0 C",
				fillColor: "rgba(255,163,185,0)",
				strokeColor: "rgba(14,204,14,0.8)",
				pointColor: "rgba(14,204,14,0.8)",
				highlightFill: "rgba(220,220,220,0.75)",
				highlightStroke: "rgba(220,220,220,1)",
				data: []
			},
			{
				label: "Outlet Actual",
				unit: "\xB0 C",
				fillColor: "rgba(255,163,185,0)",
				strokeColor: "rgba(255,140,140,0.8)",
				pointColor: "rgba(255,140,140,0.8)",
				highlightFill: "rgba(220,220,220,0.75)",
				highlightStroke: "rgba(220,220,220,1)",
				data: []
			},
			{
				label: "Power",
				unit: "kW",
				fillColor: "rgba(255,163,185,0)",
				strokeColor: "rgba(56,41,24,0.8)",
				pointColor: "rgba(56,41,24,0.8)",
				highlightFill: "rgba(220,220,220,0.75)",
				highlightStroke: "rgba(220,220,220,1)",
				data: []
			}

		]
	};
	var now = new Date().getTime();
	pg.connect(conString, function(err, client, done) {
		if(err) {
			return callback(err);
		}
		var query = escape("SELECT * FROM %I WHERE time < %s and time > %s", 'data', now, now - 3600 * 24 * 1000);
		client.query(query, function(err, res) {
			done();
			if(err) {
				return callback(err);
			}
			for(var i = 0; i < res.rows.length; i++) {
				var item = res.rows[i];
				data.labels.push(makeTime(parseInt(item.time)));
				data.datasets[0].data.push(item.data.outTemp);
				data.datasets[1].data.push(item.data.roomTemp);
				data.datasets[2].data.push(item.data.outletWant);
				data.datasets[3].data.push(item.data.outletAct);
				data.datasets[4].data.push(item.data.power);
			}
			callback(null, data);
		})
	});

};

exports.getLatest = function(callback) {
	pg.connect(conString, function(err, client, done) {
		if(err) {
			return callback(err);
		}
		var query = escape("SELECT * FROM %I ORDER BY time desc LIMIT 1", 'data');
		client.query(query, function(err, res) {
			done();
			var item = res.rows[0];
			var data = {
				label: makeTime(item.time),
				data: [
					item.data.outTemp,
					item.data.roomTemp,
					item.data.outletWant,
					item.data.outletAct,
					item.data.power
				]
			};
			callback(null, data);
		})
	})
};

