"use strict";
var __extends = (this && this.__extends) || function (d, b) {
    for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
    function __() { this.constructor = d; }
    d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
};
var events_1 = require("events");
var graphql_1 = require("graphql");
var valueFromAST = require('graphql').valueFromAST;
var validation_1 = require("./validation");
var PubSub = (function () {
    function PubSub() {
        this.ee = new events_1.EventEmitter();
        this.subscriptions = {};
        this.subIdCounter = 0;
    }
    PubSub.prototype.publish = function (triggerName, payload) {
        this.ee.emit(triggerName, payload);
        return true;
    };
    PubSub.prototype.subscribe = function (triggerName, onMessage) {
        this.ee.addListener(triggerName, onMessage);
        this.subIdCounter = this.subIdCounter + 1;
        this.subscriptions[this.subIdCounter] = [triggerName, onMessage];
        return Promise.resolve(this.subIdCounter);
    };
    PubSub.prototype.unsubscribe = function (subId) {
        var _a = this.subscriptions[subId], triggerName = _a[0], onMessage = _a[1];
        delete this.subscriptions[subId];
        this.ee.removeListener(triggerName, onMessage);
    };
    return PubSub;
}());
exports.PubSub = PubSub;
var ValidationError = (function (_super) {
    __extends(ValidationError, _super);
    function ValidationError(errors) {
        var _this = _super.call(this) || this;
        _this.errors = errors;
        _this.message = 'Subscription query has validation errors';
        return _this;
    }
    return ValidationError;
}(Error));
exports.ValidationError = ValidationError;
;
var SubscriptionManager = (function () {
    function SubscriptionManager(options) {
        this.pubsub = options.pubsub;
        this.schema = options.schema;
        this.setupFunctions = options.setupFunctions || {};
        this.subscriptions = {};
        this.maxSubscriptionId = 0;
    }
    SubscriptionManager.prototype.publish = function (triggerName, payload) {
        this.pubsub.publish(triggerName, payload);
    };
    SubscriptionManager.prototype.subscribe = function (options) {
        var _this = this;
        var parsedQuery = graphql_1.parse(options.query);
        var errors = graphql_1.validate(this.schema, parsedQuery, graphql_1.specifiedRules.concat([validation_1.subscriptionHasSingleRootField]));
        if (errors.length) {
            return Promise.reject(new ValidationError(errors));
        }
        var args = {};
        var subscriptionName = '';
        parsedQuery.definitions.forEach(function (definition) {
            if (definition.kind === 'OperationDefinition') {
                var rootField = definition.selectionSet.selections[0];
                subscriptionName = rootField.name.value;
                var fields_1 = _this.schema.getSubscriptionType().getFields();
                rootField.arguments.forEach(function (arg) {
                    var argDefinition = fields_1[subscriptionName].args.filter(function (argDef) { return argDef.name === arg.name.value; })[0];
                    args[argDefinition.name] = valueFromAST(arg.value, argDefinition.type, options.variables);
                });
            }
        });
        var triggerMap;
        if (this.setupFunctions[subscriptionName]) {
            triggerMap = this.setupFunctions[subscriptionName](options, args, subscriptionName);
        }
        else {
            triggerMap = (_a = {}, _a[subscriptionName] = {}, _a);
        }
        var externalSubscriptionId = this.maxSubscriptionId++;
        this.subscriptions[externalSubscriptionId] = [];
        var subscriptionPromises = [];
        Object.keys(triggerMap).forEach(function (triggerName) {
            var _a = triggerMap[triggerName], _b = _a.channelOptions, channelOptions = _b === void 0 ? {} : _b, _c = _a.filter, filter = _c === void 0 ? function () { return true; } : _c;
            var onMessage = function (rootValue) {
                var contextPromise;
                if (typeof options.context === 'function') {
                    contextPromise = new Promise(function (resolve) {
                        resolve(options.context());
                    });
                }
                else {
                    contextPromise = Promise.resolve(options.context);
                }
                contextPromise.then(function (context) {
                    if (!filter(rootValue, context)) {
                        return;
                    }
                    graphql_1.execute(_this.schema, parsedQuery, rootValue, context, options.variables, options.operationName).then(function (data) { return options.callback(null, data); });
                }).catch(function (error) {
                    options.callback(error);
                });
            };
            var subsPromise = _this.pubsub.subscribe(triggerName, onMessage, channelOptions, options.variables);
            subsPromise.then(function (id) { return _this.subscriptions[externalSubscriptionId].push(id); });
            subscriptionPromises.push(subsPromise);
        });
        return Promise.all(subscriptionPromises).then(function () { return externalSubscriptionId; });
        var _a;
    };
    SubscriptionManager.prototype.unsubscribe = function (subId) {
        var _this = this;
        this.subscriptions[subId].forEach(function (internalId) {
            _this.pubsub.unsubscribe(internalId);
        });
        delete this.subscriptions[subId];
    };
    return SubscriptionManager;
}());
exports.SubscriptionManager = SubscriptionManager;
//# sourceMappingURL=pubsub.js.map