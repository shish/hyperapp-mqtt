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

type SubscribeProps = ConnProps | {
    message?: CallableFunction,
    connect?: CallableFunction,
    error?: CallableFunction,
    close?: CallableFunction,
};

type PublishProps = ConnProps | {
    payload?: string,
};

export declare function topicMatches(pattern: Array<string>, topic: Array<string>): boolean;
export declare function getOpenMQTT(props: ConnProps): ConnMeta;
export declare function closeMQTT(props: ConnProps): void;
export declare function MQTTSubscribe(props: SubscribeProps): [CallableFunction, SubscribeProps];
export declare function MQTTPublish(props: PublishProps): [CallableFunction, PublishProps];
