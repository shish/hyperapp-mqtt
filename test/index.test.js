import { getOpenMQTT, closeMQTT, MQTTSubscribe, MQTTPublish } from "../src";
import mqtt from "mqtt";

let url = "mqtt://violet.shishnet.org/";
let topic = "test/public/t1";
let topic2 = "test/public/t2";
let options = { username: "demo", password: "demo" };
let dispatch = { bind: (_n, x) => x };

// just testing that our foundations work as expected
describe("MQTT", () => {
  it("should open & close", done => {
    var client = mqtt.connect(url);
    client.on("connect", function() {
      client.subscribe(topic, function(err) {
        if (!err) {
          client.publish(topic, "hello from mqtt");
        }
      });
    });
    client.on("message", function() {
      client.end();
      done();
    });
  });
});

// open & close
describe("Connections", () => {
  it("should open & close", done => {
    let props = { url, topic };
    let c = getOpenMQTT(props);
    c.socket.on("connect", function() {
      closeMQTT(props);
    });
    c.socket.on("close", function() {
      done();
    });
  });
  it("should cache for the same DSN", done => {
    let props = { url, topic };
    let a = getOpenMQTT(props);
    a.socket.on("connect", function() {
      closeMQTT(props);
    });
    a.socket.on("close", function() {
      done();
    });
    let b = getOpenMQTT(props);
    expect(a).toEqual(b);
  });
  it("should not cache for different DSN", done => {
    let props = { url, topic };
    let authprops = { url, topic, options };
    let a = getOpenMQTT(props);
    a.socket.on("connect", function() {
      let b = getOpenMQTT(authprops);
      expect(a).not.toEqual(b);
      b.socket.on("connect", function() {
        closeMQTT(authprops);
      });
      b.socket.on("close", function() {
        closeMQTT(props);
      });
    });
    a.socket.on("close", function() {
      done();
    });
  });
  it("should not cache after close", done => {
    let props = { url, topic };
    let a = getOpenMQTT(props);
    let b = null;
    a.socket.on("connect", function() {
      closeMQTT(props);
    });
    a.socket.on("close", function() {
      b = getOpenMQTT(props);
      expect(a).not.toEqual(b);
      b.socket.on("connect", function() {
        closeMQTT(props);
      });
      b.socket.on("close", function() {
        done();
      });
    });
  });
});

describe("Authentication", () => {
  it("should open & close anon", done => {
    let props = { url, topic };
    let c = getOpenMQTT(props);
    c.socket.on("connect", function() {
      closeMQTT(props);
    });
    c.socket.on("close", function() {
      done();
    });
  });
  it("should open & close authed", done => {
    let props = { url, topic, options };
    let c = getOpenMQTT(props);
    c.socket.on("connect", function() {
      closeMQTT(props);
    });
    c.socket.on("close", function() {
      done();
    });
  });
  it("should open & error if invalid", done => {
    let props = { url, topic, options: { username: "asdf", password: "asdf" } };
    let c = getOpenMQTT(props);
    c.socket.on("connect", function() {
      closeMQTT(props);
    });
    c.socket.on("error", function(e) {
      expect(e.code).toEqual(5);
      done();
    });
  });
});

describe("MQTTSubscribe", () => {
  it("should subscribe and unsubscribe", done => {
    let unsub = null;
    let sub = MQTTSubscribe({
      url,
      topic,
      connect: () => {
        unsub();
      },
      error: () => {},
      close: () => {},
      _unsub: () => {
        done();
      }
    });
    unsub = sub[0](dispatch, sub[1]);
  });
  it("should receive messages", done => {
    let unsub = null;
    let sub = MQTTSubscribe({
      url,
      topic,
      connect: () => {
        let fx = MQTTPublish({
          url,
          topic,
          payload: "Hello from MQTTPublish"
        });
        fx[0](dispatch, fx[1]);
      },
      message: message => {
        expect(message.payload.toString()).toEqual("Hello from MQTTPublish");
        unsub();
      },
      _unsub: () => {
        done();
      }
    });
    unsub = sub[0](dispatch, sub[1]);
  });
  it("should add new subscriptions even if open already", done => {
    let unsub = null;
    let sub = MQTTSubscribe({
      url,
      topic,
      connect: () => {
        // 2. after connecting, make a second subscription on the same connection
        let unsub2 = null;
        let sub2 = MQTTSubscribe({
          url,
          topic: topic2,
          message: message => {
            // 4. when second subscription gets a message,
            // send a message to first subscription
            expect(message.payload.toString()).toEqual("Hello from inner");
            let fx2 = MQTTPublish({
              url,
              topic,
              payload: "Hello from MQTTPublish"
            });
            fx2[0](dispatch, fx2[1]);
            unsub2();
          }
        });
        unsub2 = sub2[0](dispatch, sub2[1]);
        // 3. send message to second subscription
        let fx = MQTTPublish({
          url,
          topic: topic2,
          payload: "Hello from inner"
        });
        fx[0](dispatch, fx[1]);
      },
      message: message => {
        // 6. when the first subscription gets a message,
        // close
        expect(message.payload.toString()).toEqual("Hello from MQTTPublish");
        unsub();
      },
      _unsub: () => {
        done();
      }
    });
    unsub = sub[0](dispatch, sub[1]);
  });
});

describe("MQTTPublish", () => {
  it("should publish", done => {
    let c = getOpenMQTT({ url });
    let client = c.socket;
    client.on("connect", function() {
      client.subscribe(topic, function() {
        let fx = MQTTPublish({
          url,
          topic,
          payload: "Hello from MQTTPublish"
        });
        fx[0](dispatch, fx[1]);
      });
    });
    client.on("message", function(topic, message) {
      expect(message.toString()).toEqual("Hello from MQTTPublish");
      closeMQTT({ url });
    });
    client.on("close", function() {
      done();
    });
  });
});
