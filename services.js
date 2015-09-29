'use strict';
var http = require('http');
var pg = require('pg');
var escape = require('pg-escape');
var q = require('q');
var app = require('./index');

var conString = 'postgres://admin@localhost/stoker';
var apiHost = 'stokercloud.dk';

function parseGeneral(obj, data) {
	obj = JSON.parse(obj);
	data = {
		roomTemp: obj['592'].split(' ')[0],
		outTemp: obj['524'].split(' ')[0],
		windSpd: obj['587'].split(' ')[0],
		power: obj['502'].split(' ')[0]
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

exports.getData = function(callback) {
	var data;
	var now = new Date();
	var options = {
		host: apiHost,
		path: '/dev/getjsondriftdata.php?mac=kpihus&tid=' + now.getTime(),
		method: 'GET'
	};

	//get general data

	makeRequest(options, function(str) {
		data = parseGeneral(str, data);

		options = {
			host: apiHost,
			path: '/dev/weatherdata.php?mac=kpihus',
			method: 'GET'
		};
		makeRequest(options, function(str) {
			data = parseWeather(str, data);
			callback(data);
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
	req.on('error', function(e){
		app.server.log(e);
	});
	req.on('timeout', function(){
		app.server.log('timeout'); //TODO: Remove
		req.abort();
	});
		req.setTimeout(5000);
		req.end();
}

exports.writeToDb = function(data, callback){
	var now = new Date().getTime();
	pg.connect(conString, function(err, client, done){
		if(err){
			return callback(err);
		}
		var query = escape("INSERT INTO %I (time, data) VALUES(%s, %L)", 'data', now, JSON.stringify(data));
		app.server.log(query);
		client.query(query, function(err, res){
			done();
			if(err){
				return callback(err);
			}
			callback(null, res.rowCount);
		})
	});
};