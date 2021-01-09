import mqtt from "mqtt";

var mqttConnections = {};

export function getOpenMQTT(props) {
  var connection = mqttConnections[props.url];
  if (!connection) {
    connection = {
      socket: mqtt.connect(props.url),
      listeners: {}
    };
    connection.socket.on("connect", function() {
      Object.keys(connection.listeners).map(t =>
        connection.socket.subscribe(t)
      );
    });
    connection.socket.on("message", function(topic, _payload, packet) {
      connection.listeners[topic](packet);
    });
    mqttConnections[props.url] = connection;
  }
  return connection;
}

export function closeMQTT(props) {
  var connection = getOpenMQTT(props);
  // FIXME: handle close on opening
  connection.socket.end();
  delete mqttConnections[props.url];
}

function mqttListenEffect(dispatch, props) {
  var connection = getOpenMQTT(props);

  connection.listeners[props.topic] = dispatch.bind(null, props.message);
  if (connection.socket.connected) {
    connection.socket.subscribe(props.topic);
  }

  return function() {
    delete connection.listeners[props.topic];
    if (connection.listeners.length === 0) {
      closeMQTT(props);
    }
  };
}

export function MQTTListen(props) {
  return [mqttListenEffect, props];
}
