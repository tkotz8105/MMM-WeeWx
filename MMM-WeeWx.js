
Module.register("MMM-WeeWx", {

    getScripts: function () {
        return [
            this.file('node_modules/jsonpointer/jsonpointer.js')
        ];
    },

    // Default module config
    defaults: {
        mqttServers: [
            {
                address: '192.168.1.31',  // Server address or IP address
                port: '1883',          // Port number if other than default
                user: '',          // Leave out for no user
                password: '',  // Leave out for no password
                subscriptions: [
                    {
                        topic: 'home/weather/outdoor_temperature', // Topic to look for
                        label: 'Outdoor Temperature', // Displayed in front of value
                        suffix: '°F',        // Displayed after the value
                        decimals: 0,         // Round numbers to this number of decimals
                        sortOrder: 1,       // Can be used to sort entries in the same table
                        maxAgeSeconds: 300    // Reduce intensity if value is older
                    },
                    {
                        topic: 'home/weather/outHumidity',
                        label: 'Relative Humidity',
                        suffix: '°F',
                        decimals: 0,
                        sortOrder: 3,
                        maxAgeSeconds: 300
                    },
                    {
                        topic: 'astro/solar/today',
                        label: '',
                        suffix: '',
                        decimals: 0,
                        sortOrder: 5,
                        maxAgeSeconds: 300
                    },
                    {
                        topic: 'home/weather/rain24_in',
                        label: '24 Hour Precip',
                        suffix: '°F',
                        decimals: 2,
                        sortOrder: 10,
                        maxAgeSeconds: 300
                    }
                ]
            }
        ]
    },

    makeServerKey: function (server) {
        return '' + server.address + ':' + (server.port | '1883' + server.user);
    },

    start: function () {
        console.log(this.name + ' Started.');
        this.subscriptions = []
        this.mstr_opdata={};

        console.log(this.name + ': Setting up connection to ' + this.config.mqttServers.length + ' servers');

        for (i = 0; i < this.config.mqttServers.length; i++) {
            var s = this.config.mqttServers[i];
            var serverKey = this.makeServerKey(s);
            console.log(this.name + ': Adding config for ' + s.address + ' port ' + s.port + ' user ' + s.user);
            for (j = 0; j < s.subscriptions.length; j++) {
                var sub = s.subscriptions[j];
                // console.log(sub)
                this.subscriptions.push({
                    serverKey: serverKey,
                    label: sub.label,
                    topic: sub.topic,
                    decimals: sub.decimals,
                    jsonpointer: sub.jsonpointer,
                    suffix: typeof (sub.suffix) == 'undefined' ? '' : sub.suffix,
                    value: '',
                    time: Date.now(),
                    maxAgeSeconds: sub.maxAgeSeconds
                });
            }
            console.log(this.name + ': Adding Subscriptions: ', this.subscriptions);
        }

        this.openMqttConnection();
        var self = this;
        setInterval(function () {
            self.updateDom(100);
        }, 5000);
    },

    openMqttConnection: function () {
        this.sendSocketNotification('MQTT_CONFIG', this.config);
    },

    extend: function (obj, src) {
        Object.keys(src).forEach(function(key) { obj[key] = src[key]; });
        return obj;
    },

    processData: function(data) {
        var opdata = {};
        if (sub.topic === 'home/weather/outdoor_temperature') {
            opdata.outdoor_temp =  sub.value;
        } else if (sub.topic === 'astro/solar/today') {
            var json = JSON.parse(data);
            opdata.sunrise=json["sunrise"];
            opdata.sunset=json["sunset"];
        } else if (sub.topic === 'home/weather/outHumidity') {
            opdata.rh = sub.value;
        } else if (sub.topic === 'home/weather/rain24_in') {
            opdata.precip24 = sub.value;
        }
    return opdata;
    },

    socketNotificationReceived: function (notification, payload) {
        if (notification === 'MQTT_PAYLOAD') {
            if (payload != null) {
                for (i = 0; i < this.subscriptions.length; i++) {
                    sub = this.subscriptions[i];
                    if (sub.serverKey == payload.serverKey && sub.topic == payload.topic) {
                        var value = payload.value;
                        // Extract value if JSON Pointer is configured
                        if (sub.jsonpointer) {
                            value = get(JSON.parse(value), sub.jsonpointer);
                        }
                        // Round if decimals is configured
                        if (isNaN(sub.decimals) == false) {
                            if (isNaN(value) == false) {
                                value = Number(value).toFixed(sub.decimals);
                            }
                        }
                        sub.value = value;
                        sub.time = payload.time;
                        var opdata2=self.processData(sub.value);
                        window.mstr_opdata=self.extend(self.mstr_opdata, opdata2);
                    }
                }
                this.updateDom();
            } else {
                console.log(this.name + ': MQTT_PAYLOAD - No payload');
            }
        }
    },

    getStyles: function () {
        return [
            'MMM-WeeWx.css'
        ];
    },

    isValueTooOld: function (maxAgeSeconds, updatedTime) {
        // console.log(this.name + ': maxAgeSeconds = ', maxAgeSeconds);
        // console.log(this.name + ': updatedTime = ', updatedTime);
        // console.log(this.name + ': Date.now() = ', Date.now());
        if (maxAgeSeconds) {
            if ((updatedTime + maxAgeSeconds * 1000) < Date.now()) {
                return true;
            }
        }
        return false;
    },

    getDom: function () {
        self = this;
        var wrapper = document.createElement("div");
        wrapper.className = "small";
        var first = true;

        if (self.subscriptions.length === 0) {
            wrapper.innerHTML = (self.loaded) ? self.translate("EMPTY") : self.translate("LOADING");
            wrapper.className = "small dimmed";
            console.log(self.name + ': No values');
            return wrapper;
        }
        var subWrapper = document.createElement("table");
        subWrapper.className = "table-center";

        // opdata = self.processData(sub.value);

        // self.subscriptions.forEach(function (sub) {


            // Label
            // var labelWrapper = document.createElement("td");
            // labelWrapper.innerHTML = sub.label;
            // labelWrapper.className = "align-left";
            // subWrapper.appendChild(labelWrapper);

            // Value
            // tooOld = self.isValueTooOld(sub.maxAgeSeconds, sub.time);
            var data=self.mstr_opdata;
            var temprh_table = document.createElement("table");
            temprh_table.className = "table-center"
            var temp_rh = document.createElement("tr");
            temp_rh.className = "center";
            var temperature = document.createElement("td");
            temperature.className = "large bright center";
            temperature.innerHTML = data.outdoor_temp + "&deg;F";
            temp_rh.appendChild(temperature);

            var rh = document.createElement("td");
            rh.className = "medium vcen center";
            rh.innerHTML = "RH " + data.rh + "%";
            temp_rh.appendChild(rh);
            temprh_table.appendChild(temp_rh);

            // // valueWrapper.className = "align-right medium " + (tooOld ? "dimmed" : "bright");
            // rh.appendChild(valueWrapper); 
            // valueWrapper.className = "align-right medium " + (tooOld ? "dimmed" : "bright");
            // subWrapper.appendChild(valueWrapper);
            // wrapper.appendChild(subWrapper);


            // var sunriseSunsetIcon = document.createElement("td");
            // sunriseSunsetIcon.className = "wi " + this.sunriseSunsetIcon;
            // subWrapper.appendChild(sunriseSunsetIcon);
            var subWrapper2 = document.createElement("div");
            subWrapper2.className = "small";
            var sunriseSunsetTxt = document.createElement("tr");
            // var json = JSON.parse(sub.value);
            sunriseSunsetTxt.innerHTML = "SUNRISE: " + data.sunrise + " SUNSET: " + data.sunset;
            sunriseSunsetTxt.className = "small center";

            var precip24 = document.createElement("tr");
            precip24.className = "small center";
            precip24.innerHTML = "24 Hr Precip: " + data.precip24 + "in";
            // valueWrapper.className = "align-right medium " + (tooOld ? "dimmed" : "bright");
           

            // Suffix
            // var suffixWrapper = document.createElement("td");
            // suffixWrapper.innerHTML = sub.suffix;
            // suffixWrapper.className = "align-left";
            // subWrapper.appendChild(suffixWrapper);

            wrapper.appendChild(temprh_table);
            // subWrapper.appendChild(rh);
            subWrapper2.appendChild(sunriseSunsetTxt);   
            subWrapper2.appendChild(precip24);  
            wrapper.appendChild(subWrapper2);        
        // })
        return wrapper;

        },

});