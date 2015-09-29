var Hapi = require('hapi');
var Good = require('good');
var cron = require('./cron');

var server = new Hapi.Server();
server.connection({port: 3000});

server.register({
	register: Good,
	options: {
		reporters: [{
			reporter: require('good-console'),
			events: {
				response: '*',
				log: '*'
			}
		}]
	}
}, function(err) {
	if(err) {
		throw err;
	}
	server.start(function() {
		server.log('Server running at:', server.info.uri);
	});
});

exports.server = server;