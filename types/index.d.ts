declare type Effect<S> = import('hyperapp').Effect<S>;
declare type Dispatchable<S> = import('hyperapp').Dispatchable<S>;
declare type Subscription<S> = import('hyperapp').Subscription<S>;

type ConnMeta = {
    socket: any,  // mqtt.connect()
    connect_listeners: Array<CallableFunction>,
    message_listeners: Array<[string, CallableFunction]>,
    close_listeners: Array<CallableFunction>,
    error_listeners: Array<CallableFunction>
};

type ConnProps = {
    url: string,
    topic: string,
    username?: string,
    password?: string,
};

type SubscribeProps<S> = ConnProps | {
    message?: Dispatchable<S>,
    connect?: Dispatchable<S>,
    error?: Dispatchable<S>,
    close?: Dispatchable<S>,
};

type PublishProps = ConnProps | {
    payload?: string,
};

export declare function topicMatches(pattern: Array<string>, topic: Array<string>): boolean;
export declare function getOpenMQTT(props: ConnProps): ConnMeta;
export declare function closeMQTT(props: ConnProps): void;
export declare function MQTTSubscribe<S>(props: SubscribeProps<S>): Subscription<S>;
export declare function MQTTPublish<S>(props: PublishProps): Effect<S>;
