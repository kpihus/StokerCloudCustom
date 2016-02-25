'use strict';
var CronJob = require('cron').CronJob;
var services = require('./services');
console.log('Initializing cron ...');
var users = [
	'kpihus', 'ostakatel', 'noarootsi'
];

var execute = function(user){
	services.getData(user, function(data){
		var pellets = data.pellets;

		services.writeToDb(data, user, function(err, res){
			if(err){
				console.log(err);
			}
		});
		services.writePellets(pellets.current, user, function(err, res){
			if(err){
				console.log(err);
			}
		});
		services.writePellets(pellets.previous, user, function(err, res){
			if(err){
				console.log(err);
			}
		})
	});

}

new CronJob('1 * * * * *', function(){
  console.log('Fetch data...');
	for(var i=0; i<users.length; i++){
		var user = users[i];
    console.log('... for user', user);
		execute(user);
	}

}, null, true, "Europe/Tallinn");

