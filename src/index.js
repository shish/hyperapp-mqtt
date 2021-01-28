import mqtt from "mqtt";

var mqttConnections = {};

export function getOpenMQTT(props) {
  var connection = mqttConnections[props.url + JSON.stringify(props.options)];
  if (!connection) {
    connection = {
      socket: mqtt.connect(props.url, props.options),
      connect_listeners: [],
      message_listeners: [],
      close_listeners: []
    };
    connection.socket.on("connect", function() {
      Object.keys(connection.message_listeners).map(t =>
        connection.socket.subscribe(t)
      );
      connection.connect_listeners.map(l => l());
    });
    connection.socket.on("message", function(topic, _payload, packet) {
      // TODO support + and # in subscriptions
      connection.message_listeners.map(([t, l]) => t === topic && l(packet));
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

  // if we created a new connection, then it included a call to subscribe
  // if we were already connected, we need to do it ourselves
  if (connection.socket.connected) {
    connection.socket.subscribe(props.topic);
  }

  let my_onmessage = null;
  if (props.message) {
    my_onmessage = [props.topic, dispatch.bind(null, props.message)];
    connection.message_listeners.push(my_onmessage);
  }

  let my_onconnect = null;
  if (props.connect) {
    my_onconnect = dispatch.bind(null, props.connect);
    connection.connect_listeners.push(my_onconnect);
  }

  let my_onclose = null;
  if (props.close) {
    my_onclose = dispatch.bind(null, props.close)
    connection.close_listeners.push(my_onclose);
  }

  return function() {
    // Remove the listeners which we added
    connection.message_listeners = connection.message_listeners.filter(x => x != my_onmessage);
    connection.connect_listeners = connection.connect_listeners.filter(x => x != my_onconnect);
    connection.close_listeners = connection.close_listeners.filter(x => x != my_onclose);

    // if no more listeners, close the socket
    if (
      connection.messagt_listeners.length === 0 &&
      connection.connect_listeners.length === 0 &&
      connection.close_listeners.length === 0
    ) {
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
