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
 * DropletJS.PubSub : Project description goes here
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

(function(window,undefined){

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
     * Checks whether obj is an array
     *
     * @param obj The object to check
     */
    var isArray = function(obj){
        return typeof obj === 'object' && obj !== null && typeof obj.length === 'number';
    };

    /**
     * Checks whether an object is an object literal (non-null, non-array)
     *
     * @param obj The object to check
     * @return {Boolean}
     */
    var isObjLiteral = function(obj) {
        return typeof obj === 'object' && obj !== null && typeof obj.length !== 'number';
    };

    var Message = function Message(data){

        this.namespace                  = '__default';

        this.update(data,true);
    };

    /**
     * TemplateBlock class prototype
     *
     * @type {Object}
     */
    Message.prototype = {

        namespace                       : null,
        originator                      : null,
        subject                         : null,
        verb                            : null,
        descriptor                      : null,
        bitMask                         : null,

        /**
         * Updates message properties with new values
         *
         * @param data The data with which to update the message
         * @param override If true, data will overwrite any existing values
         */
        update : function(data,override){

            override                    = (typeof override === 'undefined') ? true : override;

            if (typeof data === 'string'){
                data                    = this.createDataObject(data);
            }

            for (var i in data){

                if (data.hasOwnProperty(i) && typeof data[i] !== 'undefined'){

                    this[i]             = (this[i] === null || override === true) ? data[i] : this[i];
                }
            }
        },

        /**
         * Converts object to string. Null or undefined properties
         * are converted to wildcards (asterisks).
         */
        serialize : function(){

            var segments = [

                this.originator         || '*',
                this.subject            || '*',
                this.verb               || '*',
                this.descriptor         || '*'
            ];

            return segments.join('.');
        },

        /**
         * Converts dot-delimited string into object literal with
         * properties corresponding to message parts. Any parts
         * that don't exist are set to wildcards.
         *
         * Strings are formatted like:
         *
         * Namespace:Originator.subject.verb.DESCRIPTOR
         *
         * @param data Dot-delimited string with optional namespace
         * @return {Object}
         */
        createDataObject : function(data){

            var namespace               = this.namespace;

            /* Namespace is specified like Namespace:Foo.bar.baz.QUZ,
             * so if a colon is found, we must separate it from the
             * rest of the data string */
            if (data.indexOf(':') > -1){
                namespace               = data.substr(0,data.indexOf(':'));
                data                    = data.substr((data.indexOf(':')+1),data.length);
            }

            var dataArray               = data.split('.');

            return {
                namespace               : namespace,
                originator              : dataArray[0],
                subject                 : dataArray[1],
                verb                    : dataArray[2],
                descriptor              : dataArray[3]
            }
        },

        /**
         * Gets bitmask for segments
         *
         * For example, the bitmask for Foo.data.*.* is 1.1.0.0
         *
         * This can be used to sort messages based how specific they are. The
         * more specific a message is (i.e. the more 1's it has), the higher it will
         * appear in a list reverse-sorted by bitmask.
         */
        getBitmask : function(){

            if (this.bitMask === null){

                var segments = [

                    this.originator     ? 1 : 0,
                    this.subject        ? 1 : 0,
                    this.verb           ? 1 : 0,
                    this.descriptor     ? 1 : 0
                ];

                this.bitMask            = segments.join('.');
            }

            return this.bitMask;
        },

        getNamespace : function(){
            return this.namespace;
        },

        getDescriptor : function(){
            return this.descriptor || null;
        },

        getVerb : function(){
            return this.verb || null;
        }
    };

    /**
     * PubSub singleton definition
     *
     * @constructor
     */
    var PubSub = {

        DEFAULT_NAMESPACE               : '__default',

        globalHandlers                  : {},
        channelHandlers                 : {},
        relays                          : {},
        subscribers                     : {},

        /**
         * Gets public API methods
         *
         * @return {Object}
         */
        getAPI : function(){

             return {
                addRelay                : this.addRelay.bind(this),
                clear                   : this.clear.bind(this),
                compare                 : this.compare.bind(this),
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
         *     channel                  : 'SomeChannel',    // optional
         *     async                    : false             // optional. True if handler is asynchronous
         * });
         *
         * ... plus all the above forms with an array of messages in place of a single message
         */
        listen : function(){

            var args                    = Array.prototype.slice.call(arguments);
            var obj                     = {};

            if (isObjLiteral(args[0])){

                obj                     = args[0];

            } else {

                if (typeof args[0] === 'string' || isArray(args[0])){
                    obj.message         = args[0];
                }

                if (typeof args[1] === 'function'){
                    obj.handler         = args[1];
                }
            }


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

        },

        /**
         * Stop listening for message(s)
         *
         * Valid forms:
         *
         * PubSub.stop('someMessage');
         * PubSub.stop('someMessage','SomeChannel');
         *
         * PubSub.stop({
         *     message                  : 'someMessage',
         *     channel                  : 'SomeChannel'     // optional
         * });
         *
         * ... plus all the above forms with an array of messages in place of a single message
         *
         * @return {*}
         */
        stop : function(){

            var args                    = Array.prototype.slice.call(arguments);
            var obj                     = {};

            if (isObjLiteral(args[0])){

                obj                     = args[0];

            } else {

                if (typeof args[0] === 'string' || isArray(args[0])){
                    obj.message         = args[0];
                }

                if (typeof args[1] === 'function'){
                    obj.channel         = args[1];
                }
            }
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
         * subscribed handler before the message handlers.
         *
         * An optional namespace can be set so that subscribers can be removed later,
         * limiting the removal to subscribers in a namespace.
         *
         * Finally, a boolean async param can be set. If this is set to true,
         * a callback function will be passed to the handler. PubSub will not call
         * any additional handlers until this callback has been executed. The
         * typical use-case for this is a subscriber that must wait for an ajax
         * call to return. Once an ajax result is returned, the callback can be called
         * and PubSub will continue publishing the message to the rest of the
         * subscribed and/or message handlers.
         *
         * Valid forms:
         *
         * PubSub.subscribe(handler);
         *
         * PubSub.subscribe({
         *     handler                  : messageHandler,
         *     async                    : true,             // optional. True if handler is asynchronous
         *     namespace                : 'SomeNamespace',  // optional
         *     phase                    : 'before'          // optional
         * });
         */
        subscribe : function(){

            var args                    = Array.prototype.slice.call(arguments);
            var obj                     = {};

            if (isObjLiteral(args[0])){

                obj                     = args[0];

            } else {

                if (typeof args[0] === 'function'){
                    obj.handler         = args[0];
                }

                if (typeof args[1] === 'boolean'){
                    obj.async           = args[1];
                }

                if (typeof args[2] === 'string'){
                    obj.namespace       = args[2];
                }

                if (typeof args[3] === 'string'){
                    obj.phase           = args[3];
                }
            }
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

            var args                    = Array.prototype.slice.call(arguments);
            var obj                     = {};

            if (isObjLiteral(args[0])){

                obj                     = args[0];

            } else {

                if (typeof args[0] === 'string'){
                    obj.namespace       = args[0];
                }

                if (typeof args[1] === 'string'){
                    obj.phase           = args[1];
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
         *     relay                    : 'SOME_RELAY',     // optional
         *     payload                  : payloadObject,    // optional
         *     onComplete               : onCompleteFunc,   // optional
         *     onPublish                : onPublishFunc     // optional
         * });
         *
         * ... plus all the above forms with an array of messages in place of a single message
         */
        publish : function(){

            var args                    = Array.prototype.slice.call(arguments);
            var obj                     = {};

            if (isObjLiteral(args[0])){

                obj                     = args[0];

            } else {

                if (typeof args[0] === 'string' || isArray(args[0])){
                    obj.message         = args[0];
                }

                if (typeof args[1] !== undefined){
                    obj.payload         = args[1];
                }
            }

        },

        /**
         * Clears all handlers, relays, and subscribers
         */
        clear : function(){

        },

        /**
         * Adds a relay to which messages can be published.
         *
         * A relay is an array of channels. Listeners can optionally listen on one of a relay's channels.
         * When a message is published to the relay, the handlers for each channel are called in order.
         * All the handlers for a channel are called before the handlers for the next channel are called.
         *
         * For example, consider a relay of ['Model','Controller','View'] called INCOMING_UI.
         *
         * A message UI.tab.opened.FOO_BAR is published on the INCOMING_UI channel. First, all the
         * listeners listening for that message on the Model channel are called. Then all the
         * listeners on the Controller channel are called. Finally, all the listeners on the View
         * channel are called.
         *
         * This is useful when, for example, you want to make sure a model's state is updated
         * to indicate the new tab that is opened, then you want the controller to fetch content
         * for that tab, and finally you want the view to display that content in the opened tab.
         *
         * @param name The name of the relay. CAPS_WITH_UNDERSCORES by convention.
         * @param relay Array of channel names. Channels are arbitrary strings.
         */
        addRelay : function(name,relay){

        },

        /**
         * Gets relay by relay name
         *
         * @param name The name of the relay to get
         * @return {Array}
         */
        getRelay : function(name){

        },

        /**
         * Checks whether the relay exists
         *
         * @param name The name of the relay to check
         * @return {Boolean}
         */
        hasRelay : function(name){

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