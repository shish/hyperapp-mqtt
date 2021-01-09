import { getOpenMQTT, closeMQTT, MQTTListen } from "../src";

describe("MQTTListen", () => {
  it("should initialise", () => {
    MQTTListen({ url: "ws://test.mosquitto.org/mqtt" });
  });
});

describe("Connections", () => {
  it("should open", () => {
    getOpenMQTT({ url: "ws://test.mosquitto.org/mqtt" });
  });
  it("shouldn't duplicate", () => {
    let a = getOpenMQTT({ url: "ws://test.mosquitto.org/mqtt" });
    let b = getOpenMQTT({ url: "ws://test.mosquitto.org/mqtt" });
    expect(a).toEqual(b);
  });
  it("should close", () => {
    let a = getOpenMQTT({ url: "ws://test.mosquitto.org/mqtt" });
    closeMQTT({ url: "ws://test.mosquitto.org/mqtt" });
    let b = getOpenMQTT({ url: "ws://test.mosquitto.org/mqtt" });
    expect(a).not.toEqual(b);
  });
});
