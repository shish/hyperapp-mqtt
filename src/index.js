import mqtt from "mqtt";

var mqttConnections = {};

function getOptions(props) {
  return {
    username: props.username,
    password: props.password
  };
}

function getKey(props) {
  return props.url + "#" + JSON.stringify(getOptions(props));
}

/**
 * @param {string[]} pattern
 * @param {string[]} topic
 */
function matchPattern(pattern, topic) {
  if (pattern.length === 0 && topic.length === 0) {
    return true;
  }
  if (pattern.length === 0 || topic.length === 0) {
    return false;
  }
  if (pattern[0] === topic[0] || pattern[0] === "+") {
    return matchPattern(pattern.slice(1), topic.slice(1));
  }
  if (pattern[0] === "#" && pattern.length === 1) {
    return true;
  }
  return false;
}

export function topicMatches(pattern, topic) {
  if (pattern === topic) return true;
  let pattern_parts = pattern.split("/");
  let topic_parts = topic.split("/");
  if (!pattern_parts.includes("+") && !pattern_parts.includes("#")) {
    return false;
  }
  return matchPattern(pattern_parts, topic_parts);
}

export function getOpenMQTT(props) {
  var key = getKey(props);
  var c = mqttConnections[key];
  if (!c) {
    c = {
      socket: mqtt.connect(props.url, getOptions(props)),
      connect_listeners: [],
      message_listeners: [],
      close_listeners: [],
      error_listeners: []
    };
    c.socket.on("connect", function() {
      c.message_listeners.map(x => c.socket.subscribe(x[0]));
      c.connect_listeners.map(l => l());
    });
    c.socket.on("message", function(topic, _payload, packet) {
      c.message_listeners.map(([t, l]) => topicMatches(t, topic) && l(packet));
    });
    c.socket.on("error", function(e) {
      c.error_listeners.map(l => l(e));
    });
    c.socket.on("close", function() {
      c.close_listeners.map(l => l());
    });
    mqttConnections[key] = c;
  }
  return c;
}

export function closeMQTT(props) {
  var c = getOpenMQTT(props);
  // FIXME: handle close on opening
  c.socket.end();
  delete mqttConnections[getKey(props)];
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

  let my_onerror = null;
  if (props.error) {
    my_onerror = dispatch.bind(null, props.error);
    c.error_listeners.push(my_onerror);
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
    c.error_listeners = c.error_listeners.filter(x => x != my_onerror);
    c.close_listeners = c.close_listeners.filter(x => x != my_onclose);
    // if no more listeners, close the socket
    if (
      c.message_listeners.length === 0 &&
      c.connect_listeners.length === 0 &&
      c.error_listeners.length === 0 &&
      c.close_listeners.length === 0
    ) {
      closeMQTT(props);
      // this only exists so that tests can call done()
      // after the cleanup is finished
      if (props._unsub) {
        props._unsub();
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
