import {
  getOpenMQTT,
  closeMQTT,
  closeAll,
  MQTTSubscribe,
  MQTTPublish,
} from "../src";
//import { connect } from "mqtt";

let url_unauth = "ws://test.mosquitto.org:8080/";
let url_auth = "ws://test.mosquitto.org:8090/";
let topic = "test/hyperapp-mqtt/public/t1";
let topic2 = "test/hyperapp-mqtt/public/t2";

function dispatch(fn, props) {
  fn({}, props);
}

afterEach(function () {
  closeAll();
});

// just testing that our foundations work as expected
/*
describe("MQTT", () => {
  it("should open & close", (done) => {
    var client = connect(url_unauth);
    client.on("connect", function () {
      client.subscribe(topic, function (err) {
        if (!err) {
          client.publish(topic, "hello from mqtt");
        }
      });
    });
    client.on("message", function () {
      client.end();
      done();
    });
  });
});
*/

// open & close
describe("Connections", () => {
  it("should open & close", (done) => {
    let props = { url: url_unauth, topic };
    let c = getOpenMQTT(props);
    c.socket.on("connect", function () {
      closeMQTT(props);
    });
    c.socket.on("close", function () {
      done();
    });
  });
  it("should cache for the same DSN", (done) => {
    let props = { url: url_unauth, topic };
    let a = getOpenMQTT(props);
    a.socket.on("connect", function () {
      closeMQTT(props);
    });
    a.socket.on("close", function () {
      done();
    });
    let b = getOpenMQTT(props);
    expect(a).toEqual(b);
  });
  it("should not cache for different DSN", (done) => {
    let props = { url: url_unauth, topic };
    let authprops = {
      url: url_unauth,
      topic,
      username: "test",
      password: "test",
    };
    let a = getOpenMQTT(props);
    a.socket.on("connect", function () {
      let b = getOpenMQTT(authprops);
      expect(a).not.toEqual(b);
      b.socket.on("connect", function () {
        closeMQTT(authprops);
      });
      b.socket.on("close", function () {
        closeMQTT(props);
      });
    });
    a.socket.on("close", function () {
      done();
    });
  });
  it("should not cache after close", (done) => {
    let props = { url: url_unauth, topic };
    let a = getOpenMQTT(props);
    a.socket.on("connect", function () {
      closeMQTT(props);
    });
    a.socket.on("close", function () {
      var b = getOpenMQTT(props);
      expect(a).not.toEqual(b);
      b.socket.on("connect", function () {
        closeMQTT(props);
      });
      b.socket.on("close", function () {
        done();
      });
    });
  });
});

describe("Authentication", () => {
  it("should open & close anon", (done) => {
    let props = { url: url_unauth, topic };
    let c = getOpenMQTT(props);
    c.socket.on("connect", function () {
      closeMQTT(props);
    });
    c.socket.on("close", function () {
      done();
    });
  });
  it("should open & close authed", (done) => {
    let props = { url: url_auth, topic, username: "ro", password: "readonly" };
    let c = getOpenMQTT(props);
    c.socket.on("connect", function () {
      closeMQTT(props);
    });
    c.socket.on("close", function () {
      done();
    });
  });
  // It appears that the test server doesn't reject invalid
  // passwords, it just downgrades them to Anonymous??
  it.skip("should open & error if wrong password", (done) => {
    let props = { url: url_auth, topic, username: "ro", password: "waffles" };
    let c = getOpenMQTT(props);
    c.socket.on("connect", function () {
      console.log("connected");
      closeMQTT(props);
    });
    c.socket.on("error", function (e) {
      try {
        // Error object has no `.code`... but it does?
        expect((e as any).code).toEqual(5);
        done();
      } catch (err) {
        done(err);
      }
    });
  });
});

describe("MQTTSubscribe", () => {
  it("should subscribe and unsubscribe", (done) => {
    let unsub: any = null;
    let [sub, sub_props] = MQTTSubscribe({
      url: url_unauth,
      topic,
      connect: () => {
        unsub();
      },
      error: () => {},
      close: () => {},
      _unsub: () => {
        done();
      },
    });
    unsub = sub(dispatch, sub_props);
  });
  it("should receive messages", (done) => {
    let unsub: any = null;
    let [sub, sub_props] = MQTTSubscribe({
      url: url_unauth,
      topic,
      connect: () => {
        let [fx, fx_props] = MQTTPublish({
          url: url_unauth,
          topic,
          payload: "Hello from MQTTPublish",
        });
        fx(dispatch, fx_props);
      },
      message: (state, message) => {
        try {
          expect(message.topic).toEqual("test/hyperapp-mqtt/public/t1");
          expect(message.payload.toString()).toEqual("Hello from MQTTPublish");
          unsub();
        } catch (err) {
          done(err);
        }
      },
      _unsub: () => {
        done();
      },
    });
    unsub = sub(dispatch, sub_props);
  });
  it("should match single-level wildcards", (done) => {
    let unsub: any = null;
    let [sub, sub_props] = MQTTSubscribe({
      url: url_unauth,
      topic: "test/hyperapp-mqtt/+/t1",
      connect: () => {
        let fx = MQTTPublish({
          url: url_unauth,
          topic: "test/hyperapp-mqtt/public/t1",
          payload: "Hello from MQTTPublish",
        });
        fx[0](dispatch, fx[1]);
      },
      message: (state, message) => {
        try {
          expect(message.topic).toEqual("test/hyperapp-mqtt/public/t1");
          expect(message.payload.toString()).toEqual("Hello from MQTTPublish");
          unsub();
        } catch (err) {
          done(err);
        }
      },
      _unsub: () => {
        done();
      },
    });
    unsub = sub(dispatch, sub_props);
  });
  it("should match multi-level wildcards", (done) => {
    let unsub: any = null;
    let [sub, sub_props] = MQTTSubscribe({
      url: url_unauth,
      topic: "test/hyperapp-mqtt/#",
      connect: () => {
        let fx = MQTTPublish({
          url: url_unauth,
          topic: "test/hyperapp-mqtt/public/t1",
          payload: "Hello from MQTTPublish",
        });
        fx[0](dispatch, fx[1]);
      },
      message: (state, message) => {
        try {
          expect(message.topic).toEqual("test/hyperapp-mqtt/public/t1");
          expect(message.payload.toString()).toEqual("Hello from MQTTPublish");
          unsub();
        } catch (err) {
          done(err);
        }
      },
      _unsub: () => {
        done();
      },
    });
    unsub = sub(dispatch, sub_props);
  });
  it("should add new subscriptions even if open already", (done) => {
    let unsub: any = null;
    let [sub, sub_props] = MQTTSubscribe({
      url: url_unauth,
      topic,
      connect: () => {
        // 2. after connecting, make a second subscription on the same connection
        let unsub2: any = null;
        let [sub2, sub2_props] = MQTTSubscribe({
          url: url_unauth,
          topic: topic2,
          message: (state, message) => {
            // 4. when second subscription gets a message,
            // send a message to first subscription
            expect(message.payload.toString()).toEqual("Hello from inner");
            let fx2 = MQTTPublish({
              url: url_unauth,
              topic,
              payload: "Hello from MQTTPublish",
            });
            fx2[0](dispatch, fx2[1]);
            unsub2();
          },
        });
        unsub2 = sub2(dispatch, sub2_props);
        // 3. send message to second subscription
        let [effect, effect_props] = MQTTPublish({
          url: url_unauth,
          topic: topic2,
          payload: "Hello from inner",
        });
        effect(dispatch, effect_props);
      },
      message: (state, message) => {
        // 6. when the first subscription gets a message,
        // close
        expect(message.payload.toString()).toEqual("Hello from MQTTPublish");
        unsub();
      },
      _unsub: () => {
        done();
      },
    });
    unsub = sub(dispatch, sub_props);
  });
});

/*
describe("MQTTPublish", () => {
  it("should publish", (done) => {
    let c = getOpenMQTT({ url: url_unauth });
    let client = c.socket;
    client.on("connect", function () {
      client.subscribe(topic, function () {
        let [effect, effect_props] = MQTTPublish({
          url: url_unauth,
          topic,
          payload: "Hello from MQTTPublish",
        });
        effect(dispatch, effect_props);
      });
    });
    client.on("message", function (topic, message) {
      expect(message.toString()).toEqual("Hello from MQTTPublish");
      closeMQTT({ url: url_unauth });
    });
    client.on("close", function () {
      done();
    });
  });
});
*/
