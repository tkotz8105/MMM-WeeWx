var mqtt = require('mqtt');
var NodeHelper = require("node_helper");

var servers = [];

module.exports = NodeHelper.create({

    start: function () {
        console.log(this.name + ': Starting node helper');
        this.loaded = false;
    },

    makeServerKey: function(server){
        return '' + server.address + ':' + (server.port | '1883' + server.user);
    },

    addServer: function (server) {
        console.log(this.name + ': Adding server: ', server.address);
        var serverKey = this.makeServerKey(server);
        var mqttServer = {}
        var foundServer = false;
        for (i = 0; i < servers.length; i++) {
            if (servers[i].serverKey === serverKey) {
                mqttServer = servers[i];
                foundServer = true;
            }
        }
        if(!foundServer) {
            mqttServer.serverKey = serverKey;
            mqttServer.address = server.address;
            mqttServer.port = server.port;
            mqttServer.options = {};
            mqttServer.topics = [];
            if(server.user) mqttServer.options.username = server.user;
            if(server.password) mqttServer.options.password = server.password;
        }
        for(i = 0; i < server.subscriptions.length; i++){
            if (mqttServer.topics.includes(server.subscriptions[i].topic)){
               console.log(this.name + ': Topic Already Exists in Subscription List: ',server.subscriptions[i].topic)
            } else {
               mqttServer.topics.push(server.subscriptions[i].topic);
            }
        }


        // mqttServer.topics =[
            // 'astro/moon',
            // 'astro/moon/today',
            // 'astro/moon/tomorrow',
            // 'astro/solar',
            // 'astro/solar/today',
            // 'astro/solar/tomorrow',
            // 'home/weather/altimeter_inHg',
            // 'home/weather/appTemp_F',
            // 'home/weather/barometer_inHg',
            // 'home/weather/cloudbase_foot',
            // 'home/weather/dateTime',
            // 'home/weather/dayRain_in',
            // 'home/weather/dewpoint_F',
            // 'home/weather/heatindex_F',
            // 'home/weather/hourRain_in',
            // 'home/weather/humidex_F',
            // 'home/weather/inTemp_F',
            // 'home/weather/interval_minute',
            // 'home/weather/loop',
            // 'home/weather/outHumidity',
            // 'home/weather/outTempBatteryStatus',
            // 'home/weather/outTemp_F',
            // 'home/weather/outdoor_temperature',
            // 'home/weather/pressure_inHg',
            // 'home/weather/rain24_in',
            // 'home/weather/rainRate_inch_per_hour',
            // 'home/weather/rain_in',
            // 'home/weather/rain_total',
            // 'home/weather/rssi',
            // 'home/weather/rxCheckPercent',
            // 'home/weather/sensor_battery',
            // 'home/weather/sensor_id',
            // 'home/weather/txTempBatteryStatus',
            // 'home/weather/usUnits',
            // 'home/weather/windDir',
            // 'home/weather/windGustDir',
            // 'home/weather/windGust_mph',
            // 'home/weather/windSpeed_mph',
            // 'home/weather/windchill_F',
            // 'home/weather/windrun_mile'
        // ]

        servers.push(mqttServer);
        this.startClient(mqttServer);
    },

    addConfig: function (config) {
        for (i = 0; i < config.mqttServers.length; i++) {
            this.addServer(config.mqttServers[i]);
            // console.log(config.mqttServers[i])
        }
    },

    startClient: function(server) {

        console.log(this.name + ': Starting client for MQTT Server: ', server.serverKey);

        var self = this;

        var mqttServer = (server.address.match(/^mqtts?:\/\//) ? '' : 'mqtt://') + server.address;
        if (server.port) {
            mqttServer = mqttServer + ':' + server.port
        }
        console.log(self.name + ': Connecting to ' + mqttServer);

        server.client = mqtt.connect(mqttServer, server.options);

        server.client.on('error', function (err) {
            console.log(self.name + ' ' + server.serverKey + ': Error: ' + err);
        });

        server.client.on('reconnect', function (err) {
            server.value = 'reconnecting'; // Hmmm...
            console.log(self.name + ': ' + server.serverKey + ' reconnecting');
        });

        server.client.on('connect', function (connack) {
            console.log(self.name + ': Connected to ' + mqttServer);
            console.log(self.name + ': Subscribing to ' + server.topics);
            server.client.subscribe(server.topics);
        });

        server.client.on('message', function (topic, payload) {
            self.sendSocketNotification('MQTT_PAYLOAD', {
                serverKey: server.serverKey,
                topic: topic,
                value: payload.toString(),
                time: Date.now()
            });
        });

    },

    socketNotificationReceived: function (notification, payload) {
        console.log(this.name + ': Socket notification received: ', notification, ': ', payload);
        var self = this;
        if (notification === 'MQTT_CONFIG') {
            var config = payload;
            // console.log(config.subscriptions);
            self.addConfig(config);
            self.loaded = true;
        }
    },
});