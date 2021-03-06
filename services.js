'use strict';
var http = require('http');
var pg = require('pg');
var escape = require('pg-escape');
var q = require('q');
var app = require('./index');

var conString = process.env.DATABASE_URL || 'postgres://admin@localhost/stoker';

var options = {
  host: '136.243.129.219',
  path: '',
  method: 'GET'
};

function parseGeneral(obj, data) {

  obj = JSON.parse(obj);
  data = {
    roomTemp: obj['592'].split(' ')[0],
    outTemp: obj['524'].split(' ')[0],
    windSpd: obj['587'].split(' ')[0],
    power: obj['504'].split(' ')[0],
    boiler: obj['501'].split(' ')[0]
  };
  return data;
}

function parseWeather(str, data) {
  var outletAct = str.split('<br/>')[1].split(' ')[3].split('&')[0];
  var outletWant = str.split('<br/>')[1].split(' ')[4].split('&')[0].replace(/^\(/, "");
  var correctTemp = str.split('<br/>')[3].split(' ')[3].split('&')[0];
  data.outletAct = outletAct;
  data.outletWant = outletWant;
  data.correctedOut = correctTemp;

  return data;
}

function parsePellets(str, data) {
  var obj = JSON.parse(str);
  var ts = obj[0].data[0][0];
  var pelletsTotal = obj[0].data[0][1];
  var pelletsDhw = obj[1].data[0][1];
  var current = {
    time: ts,
    total: pelletsTotal,
    heat: pelletsTotal - pelletsDhw,
    dhw: pelletsDhw
  };

  ts = obj[0].data[1][0];
  pelletsTotal = obj[0].data[1][1];
  pelletsDhw = obj[1].data[1][1];
  var previous = {
    time: ts,
    total: pelletsTotal,
    heat: pelletsTotal - pelletsDhw,
    dhw: pelletsDhw
  };


  data.pellets = {
    current: current,
    previous: previous
  };

  return data;
}

exports.getData = function (user, callback) {
  var data;
  var now = new Date();
  options.path = '/dev/getjsondriftdata.php?mac=' + user + '&tid=' + now.getTime();

  //get general data

  makeRequest(options, function (str) {
    data = parseGeneral(str, data);
    options.path = '/dev/weatherdata.php?mac=' + user;
    //Weather settings
    makeRequest(options, function (str) {
      data = parseWeather(str, data);
      //Pellets consume
      options.path = '/dev/getjsonusagenew.php?mac=' + user + '&hours=24&' + now.getTime();
      makeRequest(options, function (str) {
        data = parsePellets(str, data);
        callback(data);
      })

    })
  })

};

function makeRequest(options, callback) {

  app.server.log(options.host + options.path); //TODO: Remove
  var req = http.request(options, function (response) {
    var str = '';
    response.on('data', function (chunk) {
      str += chunk;
    });
    response.on('end', function () {

      callback(str);

    });
  });
  req.on('error', function (e) {
    app.server.log(e);
  });
  req.on('timeout', function () {
    app.server.log('timeout'); //TODO: Remove
    req.abort();
  });
  req.setTimeout(5000);
  req.end();
}

exports.writeToDb = function (data, user, callback) {
  var now = new Date().getTime();
  delete data.pellets;
  pg.connect(conString, function (err, client, done) {
    if (err) {
      return callback(err);
    }
    var query = escape("INSERT INTO %I (time, data, usern) VALUES(%s, %L, %L)", 'data', now, JSON.stringify(data), user);
    app.server.log('Write data', query);
    client.query(query, function (err, res) {
      done();
      if (err) {
        return callback(err);
      }
      callback(null, res.rowCount);
    })
  });
};

exports.writePellets = function (data, user, callback) {
  console.log(JSON.stringify(data)); //TODO: Remove
  pg.connect(conString, function (err, client, done) {
    var query = escape("SELECT count(id) FROM %I WHERE time = %s", 'pellets', data.time);
    client.query(query, function (err, res) {
      if (res.rows[0].count == 0) {
        //Insert
        query = escape("INSERT INTO %I (time, data, usern) VALUES(%s, %L, %L)", 'pellets', data.time, JSON.stringify(data), user);
      } else {
        //Update
        query = escape("UPDATE %I SET data = %L WHERE time = %s AND usern = %L", 'pellets', JSON.stringify(data), data.time, user);
      }
      app.server.log('Write pellets', query);
      client.query(query, function (err, res) {
        done();
        if (err) {
          return callback(err);
        }
        callback(null, res.rowCount);
      });
    });
  });
};

function makeTime(timestamp) {
  var date = new Date(timestamp);
  var time = "";
  if (date.getMinutes() == 0) {
    time = date.getHours() + ":00";
  } else if (date.getMinutes() == 30) {
    time = date.getHours() + ":30";
  }

  return time;
}

function makeHour(timesamp) {
  var hour = new Date(Date(timesamp)).getHours();
  hour = (hour < 10) ? '0' + hour : hour;
  return hour;
}

exports.chartData = function (user, hours, callback) {
  var data = {
    labels: [],
    datasets: [
      {
        label: "Out Temp",
        unit: "\xB0 C",
        fillColor: "rgba(168,171,255,0)",
        strokeColor: "rgba(0,8,255,0.8)",
        pointColor: "rgba(125,129,255,0.8)",
        highlightFill: "rgba(125,129,255,0.8)",
        highlightStroke: "rgba(125,129,255,0.8)",
        pointHighlightStroke: "rgba(125,129,255,0.8)",
        data: []
      },
      {
        label: "Corrected Out",
        unit: "\xB0 C",
        fillColor: "rgba(168,171,255,0)",
        strokeColor: "rgba(153,2,255,1)",
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
        strokeColor: "rgba(255,0,0,0.8)",
        pointColor: "rgba(255,0,0,0.8)",
        highlightFill: "rgba(220,220,220,0.75)",
        highlightStroke: "rgba(220,220,220,1)",
        data: []
      },
      {
        label: "Outlet Wanted",
        unit: "\xB0 C",
        fillColor: "rgba(255,163,185,0)",
        strokeColor: "rgba(14,204,14,1)",
        pointColor: "rgba(14,204,14,0.8)",
        highlightFill: "rgba(220,220,220,0.75)",
        highlightStroke: "rgba(220,220,220,1)",
        data: []
      },
      {
        label: "Outlet Actual",
        unit: "\xB0 C",
        fillColor: "rgba(255,163,185,0)",
        strokeColor: "rgba(255,140,140,0.7)",
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
      },
      {
        label: "Boiler",
        unit: "\xB0 C",
        fillColor: "rgba(255,217,0,0)",
        strokeColor: "rgba(255,217,0,0.8)",
        pointColor: "rgba(255,217,0,0.8)",
        highlightFill: "rgba(255,217,0,0.75)",
        highlightStroke: "rgba(255,217,0,1)",
        data: []
      }

    ]
  };
  var now = new Date().getTime();
  pg.connect(conString, function (err, client, done) {
    if (err) {
      return callback(err);
    }
    var query = escape("SELECT * FROM %I WHERE time < %s and time > %s AND usern = %L", 'data', now, now - 3600 * hours * 1000, user);
    client.query(query, function (err, res) {
      done();
      if (err) {
        return callback(err);
      }
      for (var i = 0; i < res.rows.length; i++) {
        var item = res.rows[i];
        data.labels.push(makeTime(parseInt(item.time)));
        data.datasets[0].data.push(item.data.outTemp);
        data.datasets[1].data.push(item.data.correctedOut);
        data.datasets[2].data.push(item.data.roomTemp);
        data.datasets[3].data.push(item.data.outletWant);
        data.datasets[4].data.push(item.data.outletAct);
        data.datasets[5].data.push(item.data.power);
        data.datasets[6].data.push(item.data.boiler);
      }
      callback(null, data);
    })
  });
};

exports.pelletsData = function (user, hours, callback) {
  var data = {
    labels: [],
    datasets: [
      {
        label: "Out Temp",
        unit: "\xB0 C",
        fillColor: "rgba(22,112,25,0.8)",
        strokeColor: "rgba(22,112,25,0.8)",
        pointColor: "rgba(22,112,25,0",
        highlightFill: "rgba(22,112,25,1",
        highlightStroke: "rgba(22,112,25,1",
        pointHighlightStroke: "rgba(22,112,25,0",
        data: []
      }
    ]
  };
  pg.connect(conString, function (err, client, done) {
    if (err) {
      return callback(err);
    }
    var now = new Date().getTime();
    var query = escape("SELECT * FROM %I WHERE time > %s AND usern = %L ORDER BY time ASC", 'pellets', now - 3600 * hours * 1000, user);
    client.query(query, function (err, res) {
      done();
      if (err) {
        return callback(err);
      }
      for (var i = 0; i < res.rows.length; i++) {
        var item = res.rows[i];
        data.labels.push(makeHour(parseInt(item.time)));
        data.datasets[0].data.push(item.data.heat);
      }
      callback(null, data);
    })
  });


};

exports.getLatest = function (user, callback) {
  pg.connect(conString, function (err, client, done) {
    if (err) {
      return callback(err);
    }
    var query = escape("SELECT * FROM %I WHERE usern = %L ORDER BY time desc LIMIT 1", 'data', user);
    client.query(query, function (err, res) {
      done();
      var item = res.rows[0];
      var data = {
        label: makeTime(item.time),
        data: [
          item.data.outTemp,
          item.data.correctedOut,
          item.data.roomTemp,
          item.data.outletWant,
          item.data.outletAct,
          item.data.power,
          item.data.boiler
        ]
      };
      callback(null, data);
    })
  })
};

