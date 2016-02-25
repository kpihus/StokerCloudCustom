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

var io = require('socket.io')(server.listener);

io.on('connection', function(socket){
	socket.emit('Hello world');
});


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

server.ext('onRequest', function(request, reply) {
	//if()
	//return reply('Forwarding to secure route')
	//		.redirect('https://' + 'www.delfi.ee' + request.path);

	return reply.continue();
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
	path: '/getData/{user}/{hours}',
	handler: function(request, reply){
		services.chartData(request.params.user, request.params.hours, function(err, res){
			if(err){
				server.log(err);
			}
			reply(res);
		})
	}
});

server.route({
	method: 'GET',
	path: '/getPellets/{user}/{hours}',
	handler: function(request, reply){
		services.pelletsData(request.params.user, request.params.hours, function(err, res){
			if(err){
				server.log(err);
			}
			reply(res);
		})
	}
});

server.route({
	method: 'GET',
	path: '/getLatest/{user}',
	handler: function(request, reply){
		services.getLatest(request.params.user, function(err, res){
			if(err){
				server.log(err);
			}
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