HyperApp MQTT
=============

Very WIP, see github issues for TODOs

A hyperapp `Subscriber` to connect to a MQTT-over-websockets server
(eg Mosquitto) and react to received messages; and an `Effect` to
send messages.

Usage:
------
A complete chat app based on this is at https://github.com/shish/hyperapp-mqtt-chat

Here's the meat of the code:

```js
import { h, app, text } from "hyperapp";
import { MQTTSubscribe, MQTTPublish } from "hyperapp-mqtt";

const mqtt_host = "wss://my.mqtt.host/mqtt";
const mqtt_topic = "test/hyperapp-mqtt-chat";

const AddMessage = (state) => ([
    {
        ...state,
        value: "",
    },
    MQTTPublish({
        url: mqtt_host,
        topic: mqtt_topic,
        payload: state.value
    })
])

const InputMessage = (state, event) => ({
    ...state,
    value: event.target.value,
})

const mqtt_subscriber = MQTTSubscribe({
    url: mqtt_host,
    topic: mqtt_topic,
    message: (state, message) => ({
        ...state,
        messages: state.messages.concat(message.payload),
    })
});

app({
    init: { messages: [], value: "" },
    view: ({ messages, value }) =>
        h("main", {}, [
            h("input", { type: "text", oninput: InputMessage, value }),
            h("button", { onclick: AddMessage }, text("Post")),
            h("ul", {},
                messages.map((message) => h("li", {}, text(message)))
            ),
        ]),
    subscriptions: () => [mqtt_subscriber],
    node: document.getElementById("app"),
});
```
