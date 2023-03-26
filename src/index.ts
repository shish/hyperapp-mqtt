import type {
  Subscription,
  Dispatchable,
  Effecter,
  Dispatch,
  Unsubscribe,
} from "hyperapp";
//import mqtt_client, { MQTTClient_v5 } from "u8-mqtt";
//import mqtt_client, { MQTTClient_v5 } from "u8-mqtt/esm/web";
import mqtt_client, { MQTTClient_v5 } from "../node_modules/u8-mqtt/esm/web/index.js";
//import mqtt_client, { MQTTClient, pkt_api } from "u8-mqtt/cjs/index.cjs";

type ConnMeta<S> = {
  socket: typeof MQTTClient_v5;
  message_listeners: Array<(pkt: any, params: any, ctx: any) => void>;
  connect_listeners: Array<[Dispatch<S>, Dispatchable<S>]>;
  close_listeners: Array<[Dispatch<S>, Dispatchable<S>]>;
  error_listeners: Array<[Dispatch<S>, Dispatchable<S>]>;
};

type ConnProps = {
  url: string;
  username?: string;
  password?: string;
};

type SubscribeProps<S> = ConnProps & {
  topic: string;
  message?: Dispatchable<S, any>; // packet
  connect?: Dispatchable<S>;
  error?: Dispatchable<S, any>;
  close?: Dispatchable<S>;
  _unsub?: any;
};

type PublishProps = ConnProps & {
  topic: string;
  payload: string;
};

var mqttConnections: Record<string, ConnMeta<any>> = {};

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

export function getOpenMQTT<S>(props: ConnProps): ConnMeta<S> {
  var key = getKey(props);
  var c = mqttConnections[key];
  if (!c) {
    async function on_live(client, is_reconnect) {
      if (is_reconnect) {
        client.connect();
      }
      c.connect_listeners.map(([d, h]) => d(h));
    }
    async function on_error(err, err_path) {
      c.error_listeners.map(([d, h]) => d(h, err));
    }
    async function on_disconnect(client, intentional) {
      c.close_listeners.map(([d, h]) => d(h));
      if (!intentional) {
        return client.on_reconnect();
      }
    }

    let client = mqtt_client({ on_live, on_error, on_disconnect })
      .with_websock(props.url)
      .with_autoreconnect();
    client.connect(getOptions(props)).then();
    c = {
      socket: client,
      message_listeners: [],
      connect_listeners: [],
      close_listeners: [],
      error_listeners: [],
    };
    mqttConnections[key] = c;
  }
  return c;
}

export function closeMQTT(props: ConnProps): void {
  var c = getOpenMQTT(props);
  c.socket.disconnect();
  let key = getKey(props);
  delete mqttConnections[key];
}

export function closeAll(): void {
  Object.keys(mqttConnections).forEach((key) => {
    try {
      mqttConnections[key].socket.disconnect();
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

  let my_onmessage = (pkt: any, params: any, ctx: any) => {
    dispatch(props.message, pkt);
  };
  c.message_listeners.push(my_onmessage);
  c.socket.subscribe_topic(props.topic, my_onmessage);

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
    c.socket.unsubscribe(props.topic, my_onmessage);
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
  c.socket.send(props.topic, props.payload);
}

export function MQTTPublish<S>(
  props: PublishProps
): [Effecter<S, PublishProps>, PublishProps] {
  return [mqttPublishEffect, props];
}
