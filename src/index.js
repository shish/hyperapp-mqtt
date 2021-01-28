import mqtt from "mqtt";

var mqttConnections = {};

export function getOpenMQTT(props) {
  var c = mqttConnections[props.url + JSON.stringify(props.options)];
  if (!c) {
    c = {
      socket: mqtt.connect(props.url, props.options),
      connect_listeners: [],
      message_listeners: [],
      close_listeners: []
    };
    c.socket.on("connect", function() {
      c.message_listeners.map(x => c.socket.subscribe(x[0]));
      c.connect_listeners.map(l => l());
    });
    c.socket.on("message", function(topic, _payload, packet) {
      // TODO support + and # in subscriptions
      c.message_listeners.map(([t, l]) => t === topic && l(packet));
    });
    c.socket.on("close", function() {
      c.close_listeners.map(l => l());
    });
    mqttConnections[props.url + JSON.stringify(props.options)] = c;
  }
  return c;
}

export function closeMQTT(props) {
  var c = getOpenMQTT(props);
  // FIXME: handle close on opening
  c.socket.end();
  delete mqttConnections[props.url + JSON.stringify(props.options)];
}

function mqttSubscribeEffect(dispatch, props) {
  var c = getOpenMQTT(props);

  // if we created a new connection, then it included a call to subscribe
  // if we were already connected, we need to do it ourselves
  if (c.socket.connected) {
    c.socket.subscribe(props.topic);
  }

  let my_onmessage = null;
  if (props.message) {
    my_onmessage = [props.topic, dispatch.bind(null, props.message)];
    c.message_listeners.push(my_onmessage);
  }

  let my_onconnect = null;
  if (props.connect) {
    my_onconnect = dispatch.bind(null, props.connect);
    c.connect_listeners.push(my_onconnect);
  }

  let my_onclose = null;
  if (props.close) {
    my_onclose = dispatch.bind(null, props.close);
    c.close_listeners.push(my_onclose);
  }

  return function() {
    // Remove the listeners which we added
    c.message_listeners = c.message_listeners.filter(x => x != my_onmessage);
    c.connect_listeners = c.connect_listeners.filter(x => x != my_onconnect);
    c.close_listeners = c.close_listeners.filter(x => x != my_onclose);
    // if no more listeners, close the socket
    if (
      c.message_listeners.length === 0 &&
      c.connect_listeners.length === 0 &&
      c.close_listeners.length === 0
    ) {
      closeMQTT(props);
      // if we had a close listener, then it wouldn't have been called,
      // because we clean up listeners before closing. So let's call it now.
      if (my_onclose) {
        my_onclose();
      }
    }
  };
}

export function MQTTSubscribe(props) {
  return [mqttSubscribeEffect, props];
}

function mqttPublishEffect(dispatch, props) {
  var c = getOpenMQTT(props);
  c.socket.publish(props.topic, props.payload);
}

export function MQTTPublish(props) {
  return [mqttPublishEffect, props];
}
