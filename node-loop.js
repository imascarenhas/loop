// Subscribe to electricity and gas streams on Navetas Loop websockets
// Secrets and serial numbers can be found by logging into your-loop.com
// and evaluating the 'Drupal.settings.navetas_realtime' variable in browser console.

require('dotenv').config()
require( "console-stamp" )( console, { pattern : "dd/mm/yyyy HH:MM:ss.l" } );
var io = require('socket.io-client');
var ThingSpeakClient = require('thingspeakclient');

var ts_client_elec = new ThingSpeakClient({useTimeoutMode:false});
var ts_client_gas = new ThingSpeakClient();


console.log('Starting');


// Loop Settings
var elec_serial = process.env.ELEC_SERIAL;
var elec_secret = process.env.ELEC_SECRET;

var gas_serial = process.env.GAS_SERIAL;
var gas_secret = process.env.GAS_SECRET;

// ThingSpeak Settings
var ts_channel_id_elec = parseInt(process.env.TS_ID_ELEC);
var ts_channel_write_key_elec = process.env.TS_KEY_ELEC;

var ts_channel_id_gas = parseInt(process.env.TS_ID_GAS);
var ts_channel_write_key_gas = process.env.TS_KEY_GAS;



// Need version 0.9.16, newer versions incompatible
var socket = io.connect('https://www.your-loop.com', {reconnect: true});

// Connect to Loop
socket.on('connect', function(){
  console.log('Connecting');

  // Subscribe to electricity readings in watts
  socket.emit("subscribe_electric_realtime", {
    serial: elec_serial,
    clientIp: '127.0.0.1',
    secret: elec_secret
  });

  // Subscribe to gas readings
  socket.emit("subscribe_gas_interval", {
     serial: gas_serial,
     clientIp: '127.0.0.1',
     secret: gas_secret
  });
});

// Connect to ThingSpeak
ts_client_elec.attachChannel(ts_channel_id_elec, { writeKey:ts_channel_write_key_elec});
ts_client_gas.attachChannel(ts_channel_id_gas, { writeKey:ts_channel_write_key_gas});

// Output electricity readings (~1 per 10 seconds)
socket.on('electric_realtime', 
          function(data) { 
              var sampleTime = new Date(data.deviceTimestamp * 1000).toISOString();
              var sampleValue = data.inst;
              
              console.log("Power: %j Watts", sampleValue);
              console.log("Sample Time: " + sampleTime);
              
              ts_client_elec.updateChannel(ts_channel_id_elec, {field1: sampleValue, created_at: sampleTime}, function(err, resp) {
                  if (!err && resp > 0) {
                      console.log('Electricity update successfully. Entry number was: ' + resp);
                  } else {
                      console.log('Electricity update error: ' + err + '  response: '+ resp);
                  }
              });
           }
         );


// Output gas readings (much slower ~15 mins)
socket.on('gas_interval', 
          function(data) { 
              var sampleTime = new Date(data.deviceTimestamp * 1000).toISOString();
              var sampleValue = data.totalRegister;
              
              console.log("totalRegister: %j", sampleValue);
              console.log("Sample Time: " + sampleTime);
              
              ts_client_gas.updateChannel(ts_channel_id_gas, {field1: sampleValue, created_at: sampleTime}, function(err, resp) {
                  if (!err && resp > 0) {
                      console.log('Gas update successfully. Entry number was: ' + resp);
                  } else {
                      console.log('Gas update error: ' + err + '  response: '+ resp);
                  }
              });              
            }
         );

// Disconnect
socket.on('disconnect', function(){ console.log("Disconnected.");});
