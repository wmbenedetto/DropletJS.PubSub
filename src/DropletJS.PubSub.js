/** @license DropletJS.PubSub | MIT License | https://github.com/wmbenedetto/DropletJS.PubSub#mit-license */
if (typeof MINIFIED === 'undefined'){
    MINIFIED = false;
}

/**
 *     ____                   __     __      _______
 *    / __ \_________  ____  / /__  / /_    / / ___/
 *   / / / / ___/ __ \/ __ \/ / _ \/ __/_  / /\__ \
 *  / /_/ / /  / /_/ / /_/ / /  __/ /_/ /_/ /___/ /
 * /_____/_/   \____/ .___/_/\___/\__/\____//____/
 *                 /_/
 *
 * DropletJS.PubSub : Advanced JavaScript event framework
 *
 * Copyright (c) 2013 Warren Benedetto <warren@transfusionmedia.com>
 *
 * Permission is hereby granted, free of charge, to any person obtaining
 * a copy of this software and associated documentation files (the "Software"),
 * to deal in the Software without restriction, including without limitation
 * the rights to use, copy, modify, merge, publish, distribute, sublicense,
 * and/or sell copies of the Software, and to permit persons to whom the Software
 * is furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in
 * all copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NON-INFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
 * THE SOFTWARE.
 */

/* If we're in a browser, window will be defined. If we're on the server, global will be defined. */
(function(){
    window = (typeof window !== 'undefined') ? window : null;
    global = (typeof global !== 'undefined') ? global : null;
}());

(function(root,undefined){

    if (!MINIFIED){

        var logLevels = {
            OFF                         : 0,
            ERROR                       : 1,
            WARN                        : 2,
            INFO                        : 3,
            DEBUG                       : 4,
            TRACE                       : 5
        };

        var logLevel                    = 'OFF';
        var console                     = window.console || {};

        console.log                     = (typeof console.log   === 'function') ? console.log   : function() {};
        console.info                    = (typeof console.info  === 'function') ? console.info  : console.log;
        console.error                   = (typeof console.error === 'function') ? console.error : console.log;
        console.warn                    = (typeof console.warn  === 'function') ? console.warn  : console.log;

        /**
         * Default log() implementation
         *
         * This can be overridden by defining a log() function in the initObj
         * passed to the constructor
         *
         * @param funcName The name of the function generating the log message
         * @param message The message to log
         * @param payload Data object
         * @param level Log level (ERROR, WARN, INFO, DEBUG)
         */
        var log = function(funcName,message,payload,level) {

            payload                     = (!payload) ? '' : payload;
            level                       = (!level) ? 'INFO' : level.toUpperCase();
            message                     = '[' + funcName + '()] ' + message;

            if (isLoggable(level)) {

                if (level === 'ERROR') {
                    console.error(message,payload);
                } else if (level === 'WARN') {
                    console.warn(message,payload);
                } else if (level === 'INFO') {
                    console.info(message,payload);
                } else {
                    console.log(message,payload);
                }
            }
        };

        /**
         * Checks whether the given level is loggable based on the
         * current log level
         *
         * @param level The level to check
         * @return {Boolean}
         */
        var isLoggable = function(level){

            var currentLogLevel         = logLevels[logLevel];
            var thisLogLevel            = logLevels[level];

            return thisLogLevel <= currentLogLevel;
        };
    }

    /**
     * Add bind() to Function prototype for browsers that don't yet support ECMAScript 5.
     *
     * @see https://developer.mozilla.org/en/JavaScript/Reference/Global_Objects/Function/bind
     */
    if (typeof Function.prototype.bind !== 'function'){

        Function.prototype.bind = function(scope) {

            var self                    = this;

            return function() {
                return self.apply(scope,arguments);
            }
        };
    }

    /**
     * Checks whether options is an array
     *
     * @param options The object to check
     */
    var isArray = function(options){
        return typeof options === 'object' && options !== null && typeof options.length === 'number';
    };

    /**
     * Checks whether an object is an object literal (non-null, non-array)
     *
     * @param options The object to check
     * @return {Boolean}
     */
    var isObjLiteral = function(options) {
        return typeof options === 'object' && options !== null && typeof options.length !== 'number';
    };

    /**
     * Delete property from object in IE-safe way
     *
     * @param obj Object containing property
     * @param prop Property to delete
     */
    var safeDelete = function(obj,prop){

        try {
            delete obj[prop];
        } catch (e){
            obj[prop] = undefined;
        }
    };

    /**
     * Converts dot-delimited string into object literal with
     * properties corresponding to message parts. Any parts
     * that don't exist are set to wildcards.
     *
     * Strings are formatted like:
     *
     * Namespace:Originator.subject.verb.DESCRIPTOR
     *
     * @param msgString Dot-delimited string with optional namespace
     * @constructor
     */
    var Message = function Message(msgString){

        this.namespace                  = '__default';

        /* Namespace is specified like Namespace:Foo.bar.baz.QUZ,
         * so if a colon is found, we must separate it from the
         * rest of the message string */
        if (msgString.indexOf(':') > -1){
            this.namespace              = msgString.substr(0,msgString.indexOf(':'));
            msgString                   = msgString.substr((msgString.indexOf(':')+1),msgString.length);
        }

        if (msgString.indexOf('.') > -1){

            var msgArray                = msgString.split('.');

            this.originator             = msgArray[0] || '*';
            this.subject                = msgArray[1] || '*';
            this.verb                   = msgArray[2] || '*';
            this.descriptor             = msgArray[3] || '*';
            this.msgArray               = [this.originator,this.subject,this.verb,this.descriptor];
            this.msgString              = this.msgArray.join('.');

        } else {

            this.msgArray               = [msgString];
            this.msgString              = msgString;
        }
    };

    /**
     * Message class prototype
     *
     * @type {Object}
     */
    Message.prototype = {

        /**
         * Compares this message to another
         *
         * If all segments are either matching or wildcards, then the messages are equivalent.
         *
         * For example:
         *
         * foo.bar.baz      === foo.bar.baz
         * *.bar.*          === foo.bar.baz
         * foo.*.baz        === foo.bar.baz
         * goo.*.baz        !== foo.bar.baz
         *
         * We only return true if the this message if more specific than the other. Say we want
         * to trigger a listener when the message and listener match exactly, or when the listener is
         * more general than the message, but not when the message is more general than the listener.
         *
         * For example:
         *
         * If message is foo.bar.baz and listener is foo.bar.baz, trigger listener.
         * If message is foo.bar.baz and listener is foo.bar.*, trigger listener.
         * If message is foo.bar.* and listener is foo.bar.baz, DON'T trigger listener.
         *
         * @param msgString The message to compare
         */
        matches : function(msgString){

            if (this.msgString === msgString){
                return true;
            }

            /* Split messages into arrays at the dots */
            var msg1Array               = this.msgArray;
            var msg2Array               = msgString.split('.');

            /* If the messages don't have the same number of segments, they aren't equivalent */
            if (msg1Array.length !== msg2Array.length){
                return false;
            }

            var msg1Bitmask             = '';
            var msg2Bitmask             = '';
            var longerMessageLength     = (msg1Array.length >= msg2Array.length) ? msg1Array.length : msg2Array.length;

            /* Loop through segments and compare them */
            for (var i=0;i<longerMessageLength;i++){

                /* If neither segment is a wildcard, and the segments don't match, then the messages aren't equivalent */
                if (msg1Array[i] !== '*' && msg2Array[i] !== '*' && msg1Array[i] !== msg2Array[i]){
                    return false;
                }

                msg1Bitmask            += (msg1Array[i] === '*') ? '0' : '1';
                msg2Bitmask            += (msg2Array[i] === '*') ? '0' : '1';
            }

            return msg1Bitmask >= msg2Bitmask;
        },

        /**
         * Returns serialized message string
         *
         * @returns {String}
         */
        toString : function(){
            return this.msgString;
        }
    };

    /**
     * PubSub singleton definition
     *
     * @constructor
     */
    var PubSub = {

        DEFAULT_NAMESPACE               : '__default',
        handlers                        : {},
        subscribers : {
            before                      : [],
            after                       : []
        },

        /**
         * Gets public API methods
         *
         * @return {Object}
         */
        getAPI : function(){

             return {
                clear                   : this.clear.bind(this),
                listen                  : this.listen.bind(this),
                once                    : this.once.bind(this),
                publish                 : this.publish.bind(this),
                stop                    : this.stop.bind(this),
                subscribe               : this.subscribe.bind(this),
                unsubscribe             : this.unsubscribe.bind(this)
             }
        },

        /**
         * Listen for message(s)
         *
         * Valid forms:
         *
         * PubSub.listen('someMessage',messageHandler);
         *
         * PubSub.listen({
         *     message                  : 'someMessage',
         *     handler                  : messageHandler,
         *     async                    : false             // optional. True if handler is asynchronous
         * });
         *
         * ... plus all the above forms with an array of messages in place of a single message
         */
        listen : function(){

            var options                 = this.processListenArgs(Array.prototype.slice.call(arguments));

            if (!MINIFIED){
                this.log('listen', 'Adding listener', options);
            }

            /* Call listen() for each message in array */
            if (isArray(options.message)){
                this.each(options,this.listen.bind(this));
                return null;
            }

            this.addHandler(options);
        },

        /**
         * Listen for a message one time. Once the message is handled once,
         * stop listening for it.
         *
         * Valid forms are the same as for listen()
         *
         * @return {*}
         */
        once : function(){

            var options                 = this.processListenArgs(Array.prototype.slice.call(arguments));
            options.limit               = 1;

            if (!MINIFIED){
                this.log('once', 'Adding one-time listener', options);
            }

            /* Call once() for each message in array */
            if (isArray(options.message)){
                this.each(options,this.once.bind(this));
                return null;
            }

            this.addHandler(options);
        },

        /**
         * Stop listening for message(s)
         *
         * Valid forms:
         *
         * PubSub.stop('someMessage');
         *
         * ... plus the above form with an array of messages in place of a single message
         *
         * @return {*}
         */
        stop : function(message){

            if (message){
                throw new Error('Message(s) must be passed to stop()');
            }

            var options = {
                message                 : this.convertMessages(message)
            };

            if (!MINIFIED){
                this.log('stop', 'Stopping listener', options);
            }

            /* Call stop() for each message in array */
            if (isArray(options.message)){
                this.each(options,this.stop.bind(this));
                return null;
            }

            this.removeHandlers(options);
        },
        
        /**
         * subscribe() registers a handler to be called every time a message
         * is published. Typical use-cases for this would be a reporting mechanism
         * that wants to receive every message so it can report on some (or all) of
         * them. Another use-case would be a third-party system that needs to adjust
         * its own state based on changes indicated by published messages.
         *
         * By default, subscribed handlers are called after all message handlers are
         * called. Setting the 'phase' param to 'before' will tell PubSub to call the
         * subscribed handler before the message handlers instead.
         *
         * An optional namespace can be set so that subscribers can be removed later,
         * limiting the removal to subscribers in a namespace.
         *
         * Finally, a boolean async param can be set. This tells PubSub to wait to call
         * any onPublish() function until after the subscriber handler has been executed.
         *
         * Valid forms:
         *
         * PubSub.subscribe(handler);
         *
         * PubSub.subscribe({
         *     handler                  : messageHandler,
         *     namespace                : 'SomeNamespace',  // optional
         *     phase                    : 'before',         // optional
         *     async                    : true              // optional. True if handler is asynchronous
         * });
         */
        subscribe : function(){

            var options                 = this.processSubscribeArgs(Array.prototype.slice.call(arguments));
            var phase                   = options.phase;

            if (!MINIFIED){
                this.log('subscribe', 'Adding subscriber', options);
            }

            this.subscribers[phase]     = this.subscribers[phase] || [];
            this.subscribers[phase].push(options);
        },

        /**
         * Removes any subscribers matching the namespace. If no namespace is
         * specified, removes subscribers in the default namespace.
         *
         * If phase is specified, limits the removal to subscribers
         * in that phase ('before' or 'after')
         *
         * Valid forms:
         *
         * PubSub.unsubscribe(namespace,phase);
         *
         * PubSub.unsubscribe({
         *     namespace                : 'SomeNamespace',  // optional
         *     phase                    : 'before'          // optional
         * });
         */
        unsubscribe : function(){

            var options                 = this.processUnsubscribeArgs(Array.prototype.slice.call(arguments));

             /* If "phase" isn't specified, remove before and after */
            if (!options.phase){

                this.unsubscribe(options.namespace,'before');
                this.unsubscribe(options.namespace,'after');

                return null;
            }

            var namespace               = options.namespace;
            var phase                   = options.phase;
            var subscribers             = this.subscribers[phase];

            if (!MINIFIED){
                this.log('unsubscribe', 'Unsubscribe from ' + phase + ' phase' + ((namespace) ? ' in ' +namespace + ' namespace' : ''), options);
            }

            if (isArray(subscribers)){

                for (var i=0;i<subscribers.length;i++){

                    if (!namespace || subscribers[i].namespace === namespace){
                        subscribers.splice(i,1);
                    }
                }
            }
        },

        /**
         * Valid forms:
         *
         * PubSub.publish('someMessage');
         * PubSub.publish('someMessage',payloadObject);
         *
         * PubSub.publish({
         *     message                  : 'someMessage',
         *     payload                  : payloadObject,    // optional
         *     onComplete               : onCompleteFunc,   // optional
         *     onPublish                : onPublishFunc     // optional
         * });
         *
         * ... plus all the above forms with an array of messages in place of a single message
         */
        publish : function(){

            var options                 = this.processPublishArgs(Array.prototype.slice.call(arguments));

            if (isArray(options.message)){

                /* If an onComplete has been defined, store it in a local variable,
                 * then delete it from the data object. This is done so that onComplete
                 * is only called once the each() iterator is complete, and not when each
                 * iteration is complete. */
                var onComplete          = options.onComplete;
                options.onComplete      = null;

                /* Call publish() for each message in array */
                this.each(options,this.publish.bind(this),onComplete);

                return null;
            }

            var msgString               = options.message.toString();

            if (!MINIFIED){
                this.log('publish', '# START publishing '+msgString, options);
            }

            var message                 = options.message;
            var payload                 = options.payload;
            var onPublish               = options.onPublish;
            var publishTo               = this.subscribers['before']
                                            .concat(this.getHandlers(message))
                                            .concat(this.subscribers['after']);

            for (var i=0;i<publishTo.length;i++){

                if (publishTo[i].limit === null || publishTo[i].count < publishTo[i].limit){

                    var result          = (publishTo[i].async) ?
                                           publishTo[i].handler(message,payload,onPublish) :
                                           publishTo[i].handler(message,payload);

                    if (publishTo[i].async !== true && typeof onPublish === 'function'){
                        onPublish(result);
                    }

                    publishTo[i].count += 1;
                }

                if (typeof publishTo[i].limit === 'number' && publishTo[i].count === publishTo[i].limit){
                    this.removeHandlers(options,i);
                }
            }

            if (!MINIFIED){
                this.log('publish', '# END publishing ' + msgString, options);
            }

            if (typeof options.onComplete === 'function'){
                options.onComplete();
            }
        },

        /**
         * Gets all handlers that match the published message (including those
         * that match by wildcard, if applicable)
         *
         * @param message The message for which to get handlers
         * @returns {Array}
         */
        getHandlers : function(message){

            var handlers                = [];

            for (var msgString in this.handlers){

                if (this.handlers.hasOwnProperty(msgString) && message.matches(msgString)){
                    handlers            = handlers.concat(this.handlers[msgString]);
                }
            }

            return handlers;
        },

        /**
         * Clears all handlers and subscribers
         */
        clear : function(){

            if (!MINIFIED){
                this.log('clear', 'Clearing PubSub');
            }

            this.handlers               = {};

            this.subscribers = {
                before                  : [],
                after                   : []
            };
        },

        /**
         * Iterates over an array of messages, passing each one to a function
         * as part of an object containing the rest of the properties required
         * for the function.
         *
         * For example, the data object may contains messages, plus payload and
         * callbacks. The object is passed through the function with one of the
         * messages, plus the payload and callbacks. This is repeated for each
         * message in the array.
         *
         * @param data Array of messages over which to iterate
         * @param fn Function to call on each iteration
         * @param onComplete Function to call once iterator is complete
         */
        each : function(data,fn,onComplete){

            /* Call function for each message in array */
            for (var i=0;i<data.message.length;i++){

                var thisData            = {};

                /* Copy properties of data to new object */
                for (var j in data){

                    if (data.hasOwnProperty(j) && j !== 'message'){
                        thisData[j]     = data[j];
                    }
                }

                thisData.message        = data.message[i];

                fn(thisData)
            }

            if (typeof onComplete === 'function'){
                onComplete();
            }
        },

        /**
         * Adds handlers for message
         *
         * @param options Object containing listen() options
         */
        addHandler : function(options){

            var msgString               = options.message.toString();

            if (!MINIFIED){
                this.log('addHandler', 'Adding handler for '+msgString+' message', null, 'TRACE');
            }

            this.handlers[msgString]    = this.handlers[msgString] || [];

            this.handlers[msgString].push({
                namespace               : options.message.namespace,
                handler                 : options.handler,
                async                   : options.async,
                limit                   : (typeof options.limit === 'number')? options.limit : null,
                count                   : 0
            });
        },

        /**
         * Removes handlers for given message
         *
         * @param options Data object containing message to remove handler for
         * @param handlerNum The index of the handler to remove. If none specified, all handlers are removed.
         */
        removeHandlers : function(options,handlerNum){

            var msgString               = options.message.toString();
            var namespace               = options.message.namespace;
            var handlers                = this.handlers;

            if (handlers && handlers[msgString]){

                if (!MINIFIED){

                    var logMsg          = 'Removing handler for ' + msgString + ' message';
                    logMsg             += (namespace !== this.DEFAULT_NAMESPACE) ? ' in ' + namespace + ' namespace' : '';

                    this.log('removeHandlers', logMsg, null, 'TRACE');
                }

                if (typeof handlerNum === 'number'){

                    if (handlers[msgString][handlerNum].namespace === namespace){
                        handlers[msgString].splice(handlerNum,1);
                    }

                } else {

                    for (var i=0;i<handlers[msgString].length;i++){

                        if (handlers[msgString][i].namespace === namespace){
                            handlers[msgString].splice(i,1);
                        }
                    }
                }

                if (handlers[msgString].length === 0){
                    safeDelete(handlers,msgString);
                }
            }
        },

        /**
         * Processes arguments passed to listen() or once() methods, validating them
         * and setting defaults as needed
         *
         * Returns object with message, handler, and/or async properties defined
         *
         * @param args Array of args to process
         * @return {Object} Object containing processed args
         */
        processListenArgs : function(args){

            var options                 = {};

            if (isObjLiteral(args[0])){

                options                 = args[0];

            } else {

                options.message         = (typeof args[0] === 'string' || isArray(args[0])) ? args[0] : null;
                options.handler         = (typeof args[1] === 'function') ? args[1] : null;
            }

            if (!options.message || typeof options.handler !== 'function'){
                throw new Error('Message(s) and handler function must be passed to listen() and/or once()');
            }

            options.message             = this.convertMessages(options.message);

            return options;
        },

        /**
         * Processes arguments passed to subscribe() method, validating them
         * and setting defaults as needed
         *
         * Returns object with handler, async, namespace and/or phase
         *
         * @param args Array of args to process
         * @return {Object} Object containing processed args
         */
        processSubscribeArgs : function(args){

            var options                 = {};

            if (isObjLiteral(args[0])){

                options                 = args[0];

            } else {

                options.handler         = (typeof args[0] === 'function') ? args[0] : null;
            }

            if (typeof options.handler !== 'function'){
                throw new Error("Handler must be passed to subscribe()");
            }

            options.phase               = options.phase || 'after';
            options.limit               = null;
            options.count               = 0;

            if (options.phase && !(options.phase in { before : 1, after : 1 } )){
                throw new Error(options.phase+" is not a valid phase for subscribe().");
            }

            return options;
        },

        /**
         * Processes arguments passed to unsubscribe() method, validating them
         * and setting defaults as needed
         *
         * Returns object with namespace and/or phase
         *
         * @param args Array of args to process
         * @return {Object} Object containing processed args
         */
        processUnsubscribeArgs : function(args){

            var options                 = {};

            if (isObjLiteral(args[0])){

                options                 = args[0];

            } else {

                options.namespace       = (typeof args[0] === 'string') ? args[0] : null;
                options.phase           = (typeof args[1] === 'string') ? args[1] : null;
            }

            if (options.phase && !(options.phase in { before : 1, after : 1 } )){
                throw new Error(options.phase+" is not a valid phase for unsubscribe().");
            }

            return options;
        },

        /**
         * Processes arguments passed to publish() method, validating them
         * and setting defaults as needed
         *
         * Returns object with message, payload, onComplete, and/or onPublish
         * properties defined
         *
         * @param args Array of args to process
         * @return {Object} Object containing processed args
         */
        processPublishArgs : function(args){

            var options                 = {};

            if (isObjLiteral(args[0])){

                options                 = args[0];

            } else {

                options.message         = (typeof args[0] === 'string' || isArray(args[0])) ? args[0] : null;
                options.payload         = (typeof args[1] !== 'undefined') ? args[1] : null;
            }

            if (!options.message){
                throw new Error("Message(s) must be passed to publish()");
            }

            options.message             = this.convertMessages(options.message);

            return options;
        },

        /**
         * Converts message strings to Message objects
         *
         * @param message Message string or array of message strings
         * @return {String|Array} Converted message(s)
         */
        convertMessages : function(message){
            
            /* Convert array of message strings to Message objects */
            if (isArray(message)){

                var messageArray        = [];

                for (var i=0;i<message.length;i++){

                    if (!(message[i] instanceof Message)){
                        messageArray[i] = new Message(message[i]);
                    }
                }

                message                 = messageArray;
            }
            /* Convert single message string to Message object */
            else if (message && !(message instanceof Message)){

                message                 = new Message(message);
            }
            
            return message;
        },

        /**
         * Alias for global log(). Prepends PubSub to funcName.
         *
         * @param funcName The name of the function generating the log message
         * @param message The message to log
         * @param payload Data object
         * @param level Log level (ERROR, WARN, INFO, DEBUG)
         */
        log : function(funcName,message,payload,level){

            if (!MINIFIED){
                log('DropletJS.PubSub.'+funcName,message,payload,level);
            }
        },

        /**
         * Sets the log level
         *
         * @param level OFF, ERROR, WARN, INFO, DEBUG, or TRACE
         */
        setLogLevel : function(level){
            logLevel                    = level;
        }
    };

    /* If RequireJS define() is present, use it to export PubSub */
    if (typeof define === "function") {

        define(function() {
            return PubSub;
        });
    }
    /* If module.exports is available, use that to export Brightline */
    else if (typeof module !== 'undefined' && module.exports) {
        module.exports = PubSub;
    }
    /* Otherwise, add PubSub to global namespace */
    else {
        root.DropletJS                  = (typeof root.DropletJS === 'object' && root.DropletJS !== 'null') ? root.DropletJS : {};
        root.DropletJS.PubSub           = PubSub;
    }

}(window || global));