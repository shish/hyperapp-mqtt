import { getOpenMQTT, closeMQTT, MQTTSubscribe, MQTTPublish } from "../src";

let props = {
  url: "ws://test.mosquitto.org/mqtt",
  topic: "test/hyperapp-mqtt",
  payload: "hello world",
};
let authprops = {
  url: "ws://test.mosquitto.org/mqtt",
  options: {username: 'test', password: 'test'},
  topic: "test/hyperapp-mqtt"
}

describe("MQTTSubscribe", () => {
  it("should initialise", () => {
    let dispatch = {bind: x => x};
    let sub = MQTTSubscribe(props);
    let unsub = sub[0](dispatch, sub[1]);
    unsub();
  });
});

describe("MQTTPublish", () => {
  it("should initialise", () => {
    let dispatch = {bind: x => x};
    let fx = MQTTPublish(props);
    fx[0](dispatch, fx[1]);
    closeMQTT(props);
  });
});

describe("Connections", () => {
  it("should open & close", () => {
    getOpenMQTT(props);
    closeMQTT(props);
  });
  it("should cache for the same DSN", () => {
    let a = getOpenMQTT(props);
    let b = getOpenMQTT(props);
    expect(a).toEqual(b);
  });
  it("should not cache for different DSN", () => {
    let a = getOpenMQTT(props);
    let b = getOpenMQTT(authprops);
    expect(a).not.toEqual(b);
  });
  it("should close", () => {
    let a = getOpenMQTT(props);
    closeMQTT(props);
    let b = getOpenMQTT(props);
    expect(a).not.toEqual(b);
  });
});
