import mqtt from "mqtt";

var mqttConnections = {};

export function getOpenMQTT(props) {
  var connection = mqttConnections[props.url + JSON.stringify(props.options)];
  if (!connection) {
    connection = {
      socket: mqtt.connect(props.url, props.options),
      connect_listeners: [],
      topic_listeners: {},
      close_listeners: []
    };
    connection.socket.on("connect", function() {
      Object.keys(connection.topic_listeners).map(t =>
        connection.socket.subscribe(t)
      );
      connection.connect_listeners.map(l => l());
    });
    connection.socket.on("message", function(topic, _payload, packet) {
      connection.topic_listeners[topic](packet);
    });
    connection.socket.on("close", function() {
      connection.close_listeners.map(l => l());
    });
    mqttConnections[props.url + JSON.stringify(props.options)] = connection;
  }
  return connection;
}

export function closeMQTT(props) {
  var connection = getOpenMQTT(props);
  // FIXME: handle close on opening
  connection.socket.end();
  delete mqttConnections[props.url + JSON.stringify(props.options)];
}

function mqttSubscribeEffect(dispatch, props) {
  var connection = getOpenMQTT(props);

  connection.topic_listeners[props.topic] = dispatch.bind(null, props.message);
  if (connection.socket.connected) {
    connection.socket.subscribe(props.topic);
  }

  if (props.connect) {
    connection.connect_listeners.push(dispatch.bind(null, props.connect));
  }
  if (props.close) {
    connection.close_listeners.push(dispatch.bind(null, props.close));
  }

  return function() {
    // TODO: remove our connect & close listeners when we unsubscribe
    delete connection.topic_listeners[props.topic];
    if (connection.topic_listeners.length === 0) {
      closeMQTT(props);
    }
  };
}

export function MQTTSubscribe(props) {
  return [mqttSubscribeEffect, props];
}

function mqttPublishEffect(dispatch, props) {
  var connection = getOpenMQTT(props);
  connection.socket.publish(props.topic, props.payload);
}

export function MQTTPublish(props) {
  return [mqttPublishEffect, props];
}
