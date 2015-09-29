var services = require('./services');
services.getData(function(data){
	console.log(data);
	services.writeToDb(data, function(err, res){
		if(err){
			console.log(err);
		}
		console.log(res);
	})
});