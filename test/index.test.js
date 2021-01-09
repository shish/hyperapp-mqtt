import { getOpenMQTT, closeMQTT, MQTTSubscribe, MQTTPublish } from "../src";

let props = {
  url: "ws://test.mosquitto.org/mqtt",
  topic: "test/hyperapp-mqtt"
};

describe("MQTTSubscribe", () => {
  it("should initialise", () => {
    MQTTSubscribe(props);
  });
});

describe("MQTTPublish", () => {
  it("should initialise", () => {
    MQTTPublish(props);
  });
});

describe("Connections", () => {
  it("should open", () => {
    getOpenMQTT(props);
  });
  it("shouldn't duplicate", () => {
    let a = getOpenMQTT(props);
    let b = getOpenMQTT(props);
    expect(a).toEqual(b);
  });
  it("should close", () => {
    let a = getOpenMQTT(props);
    closeMQTT(props);
    let b = getOpenMQTT(props);
    expect(a).not.toEqual(b);
  });
});
