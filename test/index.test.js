import { MQTTListen } from "../src";

describe("MQTTListen", () => {
  it("should initialise", () => {
    MQTTListen({ url: "ws://example.com/mqtt" });
  });
});
