/**
 * Created by kpihus on 10/11/15.
 */
var memwatch = require('memwatch');
var Hapi = require('hapi');
var Good = require('good');
memwatch.on('leak', function(info) {
console.log(info); //TODO: Remove
});

memwatch.on('stats', function(stats){
	console.log(stats); //TODO: Remove
});


var server = new Hapi.Server({
	connections: {
		routes: {
			cors: {
				matchOrigin: false,
				origin: ['*'],
				headers: ['Authorization', 'Content-Type', 'If-None-Match', 'x-cardola-uuid', 'x-cardola-verify']
			}
		}
	}

});

server.connection({port: 3000});

server.route({
	method: 'GET',
	path: '/mem',
	handler: function(request, reply) {
		reply(process.memoryUsage());
	}
});

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