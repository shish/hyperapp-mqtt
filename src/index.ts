import type {
  Subscription,
  Dispatchable,
  Effecter,
  Dispatch,
  Unsubscribe,
} from "hyperapp";
import type { MqttClient, IPublishPacket } from "mqtt";
import { connect } from "mqtt";

interface Dictionary<T> {
  [Key: string]: T;
}

type ConnMeta<S> = {
  socket: MqttClient;
  connect_listeners: Array<[Dispatch<S>, Dispatchable<S>]>;
  message_listeners: Array<[string, Dispatch<S>, Dispatchable<S>]>;
  close_listeners: Array<[Dispatch<S>, Dispatchable<S>]>;
  error_listeners: Array<[Dispatch<S>, Dispatchable<S>]>;
};

type ConnProps = {
  url: string;
  topic: string;
  username?: string;
  password?: string;
};

type SubscribeProps<S> = ConnProps & {
  message?: Dispatchable<S, IPublishPacket>;
  connect?: Dispatchable<S>;
  error?: Dispatchable<S, any>;
  close?: Dispatchable<S>;
  _unsub?: any;
};

type PublishProps = ConnProps & {
  payload: string;
};

var mqttConnections: Dictionary<ConnMeta<any>> = {};

function getOptions(props: ConnProps): object {
  return props.username && props.password
    ? {
        username: props.username,
        password: props.password,
      }
    : {};
}

function getKey(props: ConnProps): string {
  return props.url + "#" + JSON.stringify(getOptions(props));
}

function matchPattern(pattern: Array<string>, topic: Array<string>): boolean {
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

export function topicMatches(pattern: string, topic: string): boolean {
  if (pattern === topic) return true;
  let pattern_parts = pattern.split("/");
  let topic_parts = topic.split("/");
  if (!pattern_parts.includes("+") && !pattern_parts.includes("#")) {
    return false;
  }
  return matchPattern(pattern_parts, topic_parts);
}

export function getOpenMQTT<S>(props: ConnProps): ConnMeta<S> {
  var key = getKey(props);
  var c = mqttConnections[key];
  if (!c) {
    c = {
      socket: connect(props.url, getOptions(props)),
      connect_listeners: [],
      message_listeners: [],
      close_listeners: [],
      error_listeners: [],
    };
    c.socket.on("connect", function () {
      // topic, dispatch(), handler
      c.message_listeners.map(([t, d, h]) => c.socket.subscribe(t));
      c.connect_listeners.map(([d, h]) => d(h));
    });
    c.socket.on("message", function (topic, _payload, packet) {
      c.message_listeners.map(
        ([t, d, h]) => topicMatches(t, topic) && d(h, packet)
      );
    });
    c.socket.on("error", function (e) {
      c.error_listeners.map(([d, h]) => d(h, e));
    });
    c.socket.on("close", function () {
      c.close_listeners.map(([d, h]) => d(h));
    });
    mqttConnections[key] = c;
  }
  return c;
}

export function closeMQTT(props: ConnProps): void {
  var c = getOpenMQTT(props);
  // FIXME: handle close on opening
  c.socket.end();
  let key = getKey(props);
  delete mqttConnections[key];
}

export function closeAll(): void {
  Object.keys(mqttConnections).forEach((key) => {
    try {
      mqttConnections[key].socket.end();
    } finally {
      delete mqttConnections[key];
    }
  });
}

function mqttSubscribeEffect<S>(
  dispatch: Dispatch<S>,
  props: SubscribeProps<S>
): Unsubscribe {
  var c = getOpenMQTT<S>(props);

  // if we created a new connection, then it included a call to subscribe
  // if we were already connected, we need to do it ourselves
  if (c.socket.connected) {
    c.socket.subscribe(props.topic);
  }

  let my_onmessage: any = null;
  if (props.message) {
    my_onmessage = [props.topic, dispatch, props.message];
    c.message_listeners.push(my_onmessage);
  }

  let my_onconnect: any = null;
  if (props.connect) {
    my_onconnect = [dispatch, props.connect];
    c.connect_listeners.push(my_onconnect);
  }

  let my_onerror: any = null;
  if (props.error) {
    my_onerror = [dispatch, props.error];
    c.error_listeners.push(my_onerror);
  }

  let my_onclose: any = null;
  if (props.close) {
    my_onclose = [dispatch, props.close];
    c.close_listeners.push(my_onclose);
  }

  return function () {
    // Remove the listeners which we added
    c.message_listeners = c.message_listeners.filter((x) => x != my_onmessage);
    c.connect_listeners = c.connect_listeners.filter((x) => x != my_onconnect);
    c.error_listeners = c.error_listeners.filter((x) => x != my_onerror);
    c.close_listeners = c.close_listeners.filter((x) => x != my_onclose);
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

export function MQTTSubscribe<S>(props: SubscribeProps<S>): Subscription<S> {
  return [mqttSubscribeEffect, props];
}

function mqttPublishEffect<S>(dispatch: Dispatch<S>, props: PublishProps) {
  var c = getOpenMQTT(props);
  c.socket.publish(props.topic, props.payload);
}

export function MQTTPublish<S>(
  props: PublishProps
): [Effecter<S, PublishProps>, PublishProps] {
  return [mqttPublishEffect, props];
}
