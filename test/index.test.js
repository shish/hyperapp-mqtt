import { getOpenMQTT, closeMQTT, MQTTSubscribe, MQTTPublish } from "../src";
import mqtt from "mqtt";

let url = "mqtt://test.mosquitto.org/";
let topic = "test/hyperapp-mqtt";
let payload = "hello world";
let options = {username: 'test', password: 'test'};

// just testing that our foundations work as expected
describe("MQTT", () => {
  it("should open & close", done => {
    var client = mqtt.connect(url)
    client.on('connect', function () {
      client.subscribe(topic, function (err) {
        if (!err) {
          client.publish(topic, 'hello from mqtt')
        }
      })
    })
    client.on('message', function (topic, message) {
      client.end()
      done()
    })
  });
});

// open & close
describe("Connections", () => {
  it("should open & close", done => {
    let props = {url, topic};
    let c = getOpenMQTT(props);
    c.socket.on("connect", function() {
      closeMQTT(props);
    });
    c.socket.on("close", function() {
      done();
    });
  });
  it("should cache for the same DSN", done => {
    let props = {url, topic};
    let a = getOpenMQTT(props);
    a.socket.on("connect", function() {closeMQTT(props);});
    a.socket.on("close", function() {done();});
    let b = getOpenMQTT(props);
    expect(a).toEqual(b);
  });
  it("should not cache for different DSN", done => {
    let props = {url, topic};
    let authprops = {url, topic, options};
    let a = getOpenMQTT(props);
    a.socket.on("connect", function() {
      let b = getOpenMQTT(authprops);
      expect(a).not.toEqual(b);
      b.socket.on("connect", function() {closeMQTT(authprops);});
      b.socket.on("close", function() {closeMQTT(props);});
    });
    a.socket.on("close", function() {done();});
  });
  it("should not cache after close", done => {
    let props = {url, topic};
    let a = getOpenMQTT(props);
    let b = null;
    a.socket.on("connect", function() {closeMQTT(props);});
    a.socket.on("close", function() {
      b = getOpenMQTT(props);
      expect(a).not.toEqual(b);
      b.socket.on("connect", function() {closeMQTT(props);});
      b.socket.on("close", function() {done();});  
    });
  });
});

/*
describe("MQTTSubscribe", () => {
  it("should subscribe and unsubscribe", done => {
    let dispatch = {bind: (n, x) => x};
    let props = {url, topic, close: () => {done();}};
    let sub = MQTTSubscribe(props);
    let unsub = sub[0](dispatch, sub[1]);
    unsub();
  });
  it("should receive messages", done => {
    let dispatch = {bind: (n, x) => x};
    let props = {url, topic, close: () => {done();}};
    let sub = MQTTSubscribe(props);
    let unsub = sub[0](dispatch, sub[1]);
    unsub();
  });
});
*/

describe("MQTTPublish", () => {
  it("should publish", done => {

    let c = getOpenMQTT({url});
    let client = c.socket;
    client.on('connect', function () {
      client.subscribe(topic, function (err) {

        let dispatch = {bind: (n, x) => x};
        let fx = MQTTPublish({
          url,
          topic,
          payload: "Hello from MQTTPublish",
        });
        fx[0](dispatch, fx[1]);
    
      })
    })
    client.on('message', function (topic, message) {
      expect(message.toString()).toEqual("Hello from MQTTPublish");
      closeMQTT({url})
    })
    client.on('close', function () {
      done()
    })
  });
});
