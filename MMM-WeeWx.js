
Module.register("MMM-WeeWx", {

    getScripts: function () {
        return [
            this.file('node_modules/jsonpointer/jsonpointer.js')
        ];
    },

    // Default module config
    defaults: {
        mqttServers: []
    },

    makeServerKey: function (server) {
        return '' + server.address + ':' + (server.port | '1883' + server.user);
    },

    start: function () {
        console.log(this.name + ' Started.');
        this.subscriptions = [];

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

        self.subscriptions.forEach(function (sub) {
            var subWrapper = document.createElement("table");

            // Label
            // var labelWrapper = document.createElement("td");
            // labelWrapper.innerHTML = sub.label;
            // labelWrapper.className = "align-left";
            // subWrapper.appendChild(labelWrapper);

            // Value
            tooOld = self.isValueTooOld(sub.maxAgeSeconds, sub.time);
            if (sub.topic === 'home/weather/outdoor_temperature') {
                var valueWrapper = document.createElement("tr");
                valueWrapper.className = "large bright center";
                valueWrapper.innerHTML = sub.value + "&deg;F";
                // valueWrapper.className = "align-right medium " + (tooOld ? "dimmed" : "bright");
                subWrapper.appendChild(valueWrapper);
                wrapper.appendChild(subWrapper);
            } else if (sub.topic === 'home/weather/outHumidity') {
                var valueWrapper = document.createElement("tr");
                valueWrapper.className = "medium center";
                valueWrapper.innerHTML = "RH " + sub.value + "%";
                // valueWrapper.className = "align-right medium " + (tooOld ? "dimmed" : "bright");
                subWrapper.appendChild(valueWrapper); 
            } else if (sub.topic === 'home/weather/rain24_in') {
                var valueWrapper = document.createElement("span");
                valueWrapper.className = "medium center";
                valueWrapper.innerHTML = "24 Hr Precip " + sub.value + "in";
                // valueWrapper.className = "align-right medium " + (tooOld ? "dimmed" : "bright");
                subWrapper.appendChild(valueWrapper); 
            }

            // Suffix
            // var suffixWrapper = document.createElement("td");
            // suffixWrapper.innerHTML = sub.suffix;
            // suffixWrapper.className = "align-left";
            // subWrapper.appendChild(suffixWrapper);

            wrapper.appendChild(subWrapper);
        });

        return wrapper;
    }
});