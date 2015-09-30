require('dotenv').load();
var Hapi = require('hapi');
var Good = require('good');
var cron = require('./cron');
var inert = require('inert');
var Path = require('path');
var services = require('./services.js');
process.env.TZ = 'Europe/Tallinn';
var server = new Hapi.Server();
server.connection({port: 3000});

server.register(require('vision'), function(err) {
	server.views({
		engines: {
			html: require('handlebars')
		},
		relativeTo: __dirname,
		path: './views',
		layoutPath: './views/layouts',
		helpersPath: './views/helpers'
	});
});
server.register(require('inert'), function(err) {
	server.route({
		method: 'GET',
		path: '/{filename*}',
		handler: {
			directory: {
				path: __dirname + '/public',
				listing: false,
				index: false
			}
		}
	});
});

server.route({
	method: 'GET',
	path: '/',
	handler: function(request, reply) {
		reply.view('index');
	}
});

server.route({
	method: 'GET',
	path: '/getData',
	handler: function(request, reply){
		services.chartData(function(err, res){
			reply(res);
		})
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