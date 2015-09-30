//var services = require('./services');
//services.getData(function(data){
//	console.log(data);
//	services.writeToDb(data, function(err, res){
//		if(err){
//			console.log(err);
//		}
//		console.log(res);
//	})
//});

console.log(makeTime(1443491761614)); //TODO: Remove

function makeTime(timestamp){
	var date = new Date(timestamp);
	var hours = date.getHours();
	var minutes = date.getMinutes();

	return hours+':'+minutes;
}