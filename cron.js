'use strict';
var CronJob = require('cron').CronJob;
var services = require('./services');
new CronJob('1 * * * * *', function(){
	services.getData(function(data){
		var pellets = data.pellets;
		services.writeToDb(data, function(err, res){
			if(err){
				console.log(err);
			}
		});
		services.writePellets(pellets.current, function(err, res){
			if(err){
				console.log(err);
			}
		});
		services.writePellets(pellets.previous, function(err, res){
			if(err){
				console.log(err);
			}
		})
	});
}, null, true, "Europe/Tallinn");