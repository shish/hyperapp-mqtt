import Paho from "paho-mqtt";

export function makeRemoveListener(attachTo, dispatch, action, eventName) {
  var handler = dispatch.bind(null, action);
  attachTo.addEventListener(eventName, handler);
  return function() {
    attachTo.removeEventListener(eventName, handler);
  };
}

var mqttConnections = {};

export function getOpenMQTT(props) {
  var connection = mqttConnections[props.url];
  if (!connection) {
    connection = {
      socket: new Paho.MQTT.Client(props.url),
      listeners: []
    };
    mqttConnections[props.url] = connection;
  }
  return connection;
}

export function closeMQTT(props) {
  var connection = getOpenMQTT(props);
  // FIXME: handle close on opening
  connection.socket.disconnect();
  delete mqttConnections[props.url];
}

function mqttListenEffect(dispatch, props) {
  var connection = getOpenMQTT(props);
  var removeMessageArrived = makeRemoveListener(
    connection.socket,
    dispatch,
    props.messageArrived,
    "messageArrived"
  );
  connection.listeners.push(removeMessageArrived);
  var removeConnected;
  if (props.open) {
    removeConnected = makeRemoveListener(
      connection.socket,
      dispatch,
      props.open,
      "connected"
    );
    connection.listeners.push(removeConnected);
  }
  var removeConnectionLost;
  if (props.close) {
    removeConnectionLost = makeRemoveListener(
      connection.socket,
      dispatch,
      props.close,
      "close"
    );
    connection.listeners.push(removeConnectionLost);
  }

  return function() {
    removeMessageArrived && removeMessageArrived();
    removeConnected && removeConnected();
    removeConnectionLost && removeConnectionLost();
    connection.listeners = connection.listeners.filter(function(listener) {
      return (
        listener !== removeMessageArrived &&
        listener !== removeConnected &&
        listener !== removeConnectionLost
      );
    });
    if (connection.listeners.length === 0) {
      closeMQTT(props);
    }
  };
}

export function MQTTListen(props) {
  return [mqttListenEffect, props];
}
