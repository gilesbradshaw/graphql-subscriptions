import { GraphQLSchema, GraphQLError } from 'graphql';
export interface PubSubEngine {
    publish(triggerName: string, payload: any): boolean;
    subscribe(triggerName: string, onMessage: Function, options: Object): Promise<number>;
    subscribe(triggerName: string, onMessage: Function, options: Object, variables: Object): Promise<number>;
    unsubscribe(subId: number): any;
}
export declare class PubSub implements PubSubEngine {
    private ee;
    private subscriptions;
    private subIdCounter;
    constructor();
    publish(triggerName: string, payload: any): boolean;
    subscribe(triggerName: string, onMessage: Function): Promise<number>;
    unsubscribe(subId: number): void;
}
export declare class ValidationError extends Error {
    errors: Array<GraphQLError>;
    message: string;
    constructor(errors: any);
}
export interface SubscriptionOptions {
    query: string;
    operationName: string;
    callback: Function;
    variables?: {
        [key: string]: any;
    };
    context?: any;
    formatError?: Function;
    formatResponse?: Function;
}
export interface TriggerConfig {
    channelOptions?: Object;
    filter?: Function;
}
export interface TriggerMap {
    [triggerName: string]: TriggerConfig;
}
export interface SetupFunction {
    (options: SubscriptionOptions, args: {
        [key: string]: any;
    }, subscriptionName: string): TriggerMap;
}
export interface SetupFunctions {
    [subscriptionName: string]: SetupFunction;
}
export declare class SubscriptionManager {
    private pubsub;
    private schema;
    private setupFunctions;
    private subscriptions;
    private maxSubscriptionId;
    constructor(options: {
        schema: GraphQLSchema;
        setupFunctions: SetupFunctions;
        pubsub: PubSubEngine;
    });
    publish(triggerName: string, payload: any): void;
    subscribe(options: SubscriptionOptions): Promise<number>;
    unsubscribe(subId: any): void;
}
