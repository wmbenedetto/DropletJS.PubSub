define(function(require){

    var SF_Array                        = require('core/Array');
    var SF_Log                          = require('core/Log');
    var SF_Message                      = require('core/Message');
    var SF_Object                       = require('core/Object');
    var SF_Sequence                     = require('core/vendor/DropletJS.Sequencer/src/DropletJS.Sequencer');

    var PubSub = {

        DEFAULT_NAMESPACE               : '__default',

        globalHandlers                  : {},
        channelHandlers                 : {},
        routes                          : {},
        subscribers                     : {},

        /**
         * Listen for message(s)
         *
         * Valid forms:
         *
         * PubSub.listen('someMessage',messageHandler);
         * PubSub.listen('someMessage',messageHandler,true);
         * PubSub.listen('someMessage','SomeChannel',messageHandler);
         * PubSub.listen('someMessage','SomeChannel',messageHandler,true);
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

            var data                    = this.processListenArgs(SF_Array.argsToArray(arguments));

            SF_Log.info('[PubSub.listen()] Adding listener',data,'PubSub');

            if (SF_Array.isArray(data.message)){

                /* Call listen() for each message in array */
                this.each(data,this.listen.bind(this));

                return null;
            }

            this.addMessageHandler(data);
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

            var data                    = this.processListenArgs(SF_Array.argsToArray(arguments));
            data.limit                  = 1;

            SF_Log.info('[PubSub.once()] Adding one-time listener',data,'PubSub');

            if (SF_Array.isArray(data.message)){

                /* Call once() for each message in array */
                this.each(data,this.once.bind(this));

                return null;
            }

            this.addMessageHandler(data);
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

            var data                    = this.processStopArgs(SF_Array.argsToArray(arguments));

            SF_Log.info('[PubSub.stop()] Stopping listener',data,'PubSub');

            if (SF_Array.isArray(data.message)){

                /* Call stop() for each message in array */
                this.each(data,this.stop.bind(this));

                return null;
            }

            this.removeMessageHandlers(data);
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
         * PubSub.subscribe(handler,async);
         * PubSub.subscribe(handler,'namespace');
         * PubSub.subscribe(handler,'namespace',async);
         * PubSub.subscribe(handler,'namespace','phase');
         * PubSub.subscribe(handler,'namespace','phase',async);
         */
        subscribe : function(){

            var data                            = this.processSubscribeArgs(SF_Array.argsToArray(arguments));

            SF_Log.info('[PubSub.subscribe()] Adding subscriber',data,'PubSub');

            this.subscribers[data.phase]        = this.subscribers[data.phase] || [];

            this.subscribers[data.phase].push(data);
        },

        /**
         * Removes any subscribers matching the namespace. If no namespace is
         * specified, removes subscribers in the default namespace.
         *
         * If phase is specified, limits the removal to subscribers
         * in that phase ('before' or 'after')
         *
         * @param namespace The namespace of the subscribers to remove
         * @param phase The phase from which to remove subscribers
         */
        unsubscribe : function(namespace,phase){

            /* If "phase" isn't specified, remove before and after */
            if (!phase){

                this.unsubscribe(namespace,'before');
                this.unsubscribe(namespace,'after');

                return null;
            }

            SF_Log.info('[PubSub.unsubscribe()] Unsubscribe from ' + phase + ' phase' + ((namespace) ? ' in ' +namespace + ' namespace' : ''),null,'PubSub');

            var subscribers                     = this.getSubscribers(phase);
            namespace                           = namespace || this.getDefaultNamespace();

            if (SF_Array.isArray(subscribers)){

                for (var i=0;i<subscribers.length;i++){

                    if (subscribers[i].namespace === namespace){
                        subscribers.splice(i,1);
                    }
                }
            }
        },

        /**
         * Clears all handlers, routes, and subscribers
         */
        clear : function(){

            SF_Log.info('[PubSub.clear()] Clearing PubSub',null,'PubSub');

            this.globalHandlers                 = {};
            this.channelHandlers                = {};
            this.routes                         = {};
            this.subscribers                    = {};
        },

        /**
         * Valid forms:
         *
         * PubSub.publish('someMessage');
         * PubSub.publish('someMessage',payloadObject);
         * PubSub.publish('someMessage','SOME_ROUTE');
         * PubSub.publish('someMessage','SOME_ROUTE',payloadObject);
         *
         * PubSub.publish('someMessage',onComplete);
         * PubSub.publish('someMessage',onComplete,onPublish);
         * PubSub.publish('someMessage',payloadObject,onComplete,onPublish);
         * PubSub.publish('someMessage','SOME_ROUTE',onComplete,onPublish);
         * PubSub.publish('someMessage','SOME_ROUTE',payloadObject,onComplete,onPublish);
         *
         * PubSub.publish({
         *     message                  : 'someMessage',
         *     route                    : 'SOME_ROUTE',     // optional
         *     payload                  : payloadObject,    // optional
         *     onComplete               : onCompleteFunc,   // optional
         *     onPublish                : onPublishFunc     // optional
         * });
         *
         * ... plus all the above forms with an array of messages in place of a single message
         */
        publish : function(){

            var data                            = this.processPublishArgs(SF_Array.argsToArray(arguments));

            if (SF_Array.isArray(data.message)){

                /* If an onComplete has been defined, store it in a local variable,
                 * then delete it from the data object. This is done so that onComplete
                 * is only called once the each() iterator is complete, and not when each
                 * iteration is complete. */
                var onComplete                  = data.onComplete;
                data.onComplete                 = null;

                /* Call stop() for each message in array */
                this.each(data,this.publish.bind(this),onComplete);

                return null;
            }

            SF_Log.info('[PubSub.publish()] # START PUBLISHING '+data.message.serialize(), data, 'PubSub');

            var sequencer                       = new SF_Sequence([],{ name : 'Publish '+data.message.serialize()});
            var self                            = this;

            sequencer.addStep(function(){
                self.publishToSubscribers(data,'before',sequencer.next.bind(sequencer));
            });

            sequencer.addStep(function(){
                self.publishToGlobalHandlers(data,sequencer.next.bind(sequencer));
            });

            sequencer.addStep(function(){
                self.publishToChannelHandlers(data,sequencer.next.bind(sequencer));
            });

            sequencer.addStep(function(){
                self.publishToSubscribers(data,'after',sequencer.next.bind(sequencer));
            });

            if (typeof data.onComplete === 'function'){
                sequencer.onComplete            = data.onComplete;
            }

            sequencer.run();

            SF_Log.info('[PubSub.publish()] # END PUBLISHING '+data.message.serialize(), data, 'PubSubPublish');
        },

        /**
         * Adds a route to which messages can be published.
         *
         * A route is an array of channels. Listeners can optionally listen on one of a route's channels.
         * When a message is published to the route, the handlers for each channel are called in order.
         * All the handlers for a channel are called before the handlers for the next channel are called.
         *
         * For example, consider a route of ['Model','Controller','View'] called INCOMING_UI.
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
         * @param name The name of the route. CAPS_WITH_UNDERSCORES by convention.
         * @param route Array of channel names. Channels are arbitrary strings.
         */
        addRoute : function(name,route){

            if (typeof name !== 'string'){
                throw new Error("[PubSub.addRoute()] Route name must be a string (CAPS_WITH_UNDERSCORES by convention)");
            }

            if (!SF_Array.isArray(route)){
                throw new Error("Route must be an array of channel names");
            }

            SF_Log.info('[PubSub.addRoute()] Adding '+name+' route',route,'PubSubRoute');

            this.routes[name]                   = route;
        },

        /**
         * Gets route by route name
         *
         * @param name The name of the route to get
         * @return {Array}
         */
        getRoute : function(name){
            return this.routes[name] || null;
        },

        /**
         * Checks whether the route exists
         *
         * @param name The name of the route to check
         * @return {Boolean}
         */
        hasRoute : function(name){
            return this.getRoute(name) !== null;
        },

        /**
         * Iterates over an array of messages, passing each one to a function
         * as part of an object containing the rest of the properties required
         * for the function. For example, the data object may contains messages,
         * plus route and channel. The object is passed through the function with
         * one of the messages, plus the route and channel. This is repeated for
         * each message in the array.
         *
         * @param data Array of messages over which to iterate
         * @param fn Function to call on each iteration
         * @param onComplete Function to call once iterator is complete
         */
        each : function(data,fn,onComplete){

            /* Call function for each message in array */
            for (var i=0;i<data.message.length;i++){

                var thisData                    = {};

                /* Copy properties of data to new object */
                for (var j in data){

                    if (data.hasOwnProperty(j) && j !== 'message'){

                        thisData[j]             = data[j];
                    }
                }

                thisData.message                = data.message[i];

                fn(thisData)
            }

            if (typeof onComplete === 'function'){
                onComplete();
            }
        },

        /**
         * Publishes message to subscriber handlers for the specified phase (before or after)
         *
         * @param data Data object containing message being published
         * @param phase The phase for which to get handlers
         * @param done Callback function to execute once all handlers have been called
         */
        publishToSubscribers : function(data,phase,done){

            var handlers                        = this.getSubscribers(phase);
            var numHandlers                     = handlers.length;

            SF_Log.info('[PubSub.publishToSubscribers()] Publishing '+data.message.serialize()+' to '+numHandlers+' "'+phase+'" subscriber(s)',handlers,'PubSubPublish');

            for (var i=0;i<numHandlers;i++){

                var result                      = (handlers[i].async) ? handlers[i].handler(data.message,data.payload,data.onPublish) : handlers[i].handler(data.message,data.payload);

                if (handlers[i].async !== true && typeof data.onPublish === 'function'){
                    data.onPublish(result);
                }
            }

            done();
        },

        /**
         * Publishes message to global handlers
         *
         * @param data Data object containing message being published
         * @param done Callback function to execute once all handlers have been called
         */
        publishToGlobalHandlers : function(data,done){

            var handlers                        = this.getGlobalHandlers(data);

            SF_Log.info('[PubSub.publishToGlobalHandlers()] Publishing '+data.message.serialize()+' to '+handlers.length+' global handlers',handlers,'PubSubPublish');

            for (var i=0;i<handlers.length;i++){

                if (handlers[i].limit === null || handlers[i].count < handlers[i].limit){

                    var result                  = (handlers[i].async) ? handlers[i].handler(data.message,data.payload,data.onPublish) : handlers[i].handler(data.message,data.payload);

                    if (handlers[i].async !== true && typeof data.onPublish === 'function'){
                        data.onPublish(result);
                    }

                    handlers[i].count          += 1;
                }

                if (typeof handlers[i].limit === 'number' && handlers[i].count === handlers[i].limit){
                    this.removeMessageHandlers(data,i);
                }
            }

            done();
        },

        /**
         * Publishes messages to handlers for each channel on the given route
         *
         * Handlers are grouped by channel. All handlers for one channel must be completed
         * before handlers for next channel are executed. Once all handlers for all channels
         * have completed, the done() callback is called.
         *
         * @param data Data object containing message being published
         * @param done Callback function to execute once all handlers have been called
         */
        publishToChannelHandlers : function(data,done){

            /* If no route is specified, there's nothing to do */
            if (typeof data.route === 'undefined'){
                done(); return null;
            }

            /* Get handlers for route, grouped by channel */
            var handlers                        = this.getChannelHandlers(data);
            var numChannels                     = handlers.length;
            var msgString                       = data.message.serialize();
            var sequencer                       = new SF_Sequence([],{ name : 'Publish '+msgString+' to '+data.route+' route' });
            var route                           = this.getRoute(data.route);

            SF_Log.info('[PubSub.publishToChannelHandlers()] START '+data.route+' ROUTE --------------------------------------------------->', {

                message                         : msgString,
                payload                         : data.payload

            }, 'PubSub');

            /* Loop through channels and add step to Sequence for each one */
            for (var i=0;i<numChannels;i++){

                (function(channelHandlers){

                    var numHandlers             = channelHandlers.length;
                    var counter                 = 0;
                    var channel                 = route[i];

                    /* Add one step to Sequence for each channel in route. We do this because
                     * we want all the handlers for one channel to be complete before moving on
                     * to the handlers for the next channel. */
                    sequencer.addStep(function(){

                        SF_Log.info('[PubSub.publishToChannelHandlers()] There are '+numHandlers+' handlers for "'+msgString+'" on the '+channel+' channel', data.payload, 'PubSubRoute');

                        /* If there are no handlers for the message on this channel, exit early */
                        if (numHandlers === 0){
                            sequencer.next(); return null;
                        }

                        /* Execute each handler for message on this channel */
                        for (var h=0;h<numHandlers;h++){

                            (function(thisHandlerObj){

                                counter        += 1;

                                if (thisHandlerObj.limit === null || thisHandlerObj.count < thisHandlerObj.limit){

                                    SF_Log.info('[PubSub.publishToChannelHandlers()] + STARTED: Handler '+counter+' of '+numHandlers+' for "'+msgString+'" on the '+channel+' channel', null, 'PubSubRoute');

                                    /* After each handler is complete, this callback is called. When all the
                                     * handlers have completed, this callback will call the sequencer.next() function,
                                     * telling the Sequence to move onto the next channel. */
                                    var callback = function(result){

                                        SF_Log.info('[PubSub.publishToChannelHandlers()] - COMPLETED: Handler '+counter+' of '+numHandlers+' for "'+msgString+'" on the '+channel+' channel', null, 'PubSubRoute');

                                        if (typeof data.onPublish === 'function'){
                                            data.onPublish(result);
                                        }

                                        if (counter === numHandlers){
                                            sequencer.next();
                                        }
                                    };

                                    /* If handler is asynchronous, pass callback to handler. Handler must call it
                                     * once it is done handling message */
                                    if (thisHandlerObj.async){

                                        thisHandlerObj.handler(data.message,data.payload,callback);
                                    }
                                    /* Otherwise, callback is called immediately */
                                    else {

                                        var result      = thisHandlerObj.handler(data.message,data.payload);

                                        callback(result);
                                    }

                                    thisHandlerObj.count += 1;

                                } else {

                                    if (counter === numHandlers){
                                        sequencer.next();
                                    }
                                }

                            }(channelHandlers[h]))
                        }

                    });

                }(handlers[i]))
            }

            /* Once all steps of the Sequence are complete, we can call the done() callback */
            sequencer.onComplete = function(){

                SF_Log.info('[PubSub.publishToChannelHandlers()] END '+data.route+' ROUTE --------------------------------------------------->', {

                    message                         : msgString,
                    payload                         : data.payload

                }, 'PubSub');

                done();
            };

            sequencer.run();
        },

        /**
         * Adds message handler
         *
         * @param data Data object containing message to handle
         */
        addMessageHandler : function(data){

            var msgString                       = data.message.serialize();
            var handlerArray                    = [];

            /* If route is included, add handler to channel handlers */
            if (data.channel){

                SF_Log.info('[PubSub.addMessageHandler()] Adding message handler for '+msgString+' message on '+data.channel+' channel',null,'PubSubPublish');

                /* Initialize channelHandlers array for this route/channel/message if it doesn't exist */
                this.channelHandlers[data.channel]                = this.channelHandlers[data.channel] || {};
                this.channelHandlers[data.channel][msgString]     = this.channelHandlers[data.channel][msgString] || [];

                handlerArray                    = this.channelHandlers[data.channel][msgString];
            }
            /* Otherwise, add it to global handlers */
            else {

                SF_Log.info('[PubSub.addMessageHandler()] Adding global handler for '+msgString+' message',null,'PubSub');

                /* Initialize globalHandlers array for this message if it doesn't exist */
                this.globalHandlers[msgString]  = this.globalHandlers[msgString] || [];

                handlerArray                    = this.globalHandlers[msgString];
            }

            handlerArray.push({
                namespace                       : data.message.getNamespace(),
                handler                         : data.handler,
                async                           : data.async,
                limit                           : (typeof data.limit === 'number')? data.limit : null,
                count                           : 0
            })
        },

        /**
         * Removes message handlers for given message
         *
         * @param data Data object containing message to remove handler for
         * @param handlerNum The index of the handler to remove. If none specified, all handlers are removed.
         */
        removeMessageHandlers : function(data,handlerNum){

            var msgString                       = data.message.serialize();
            var namespace                       = data.message.getNamespace();

            /* If route is included, only remove handlers from channelHandlers for given
             * route and channel */
            if (data.channel){

                this.removeChannelHandlers(data.channel,msgString,namespace);
            }
            /* Otherwise, remove handlers from global handlers */
            else {

                this.removeGlobalHandlers(msgString,namespace,handlerNum);
            }
        },

        /**
         * Removes message handlers from channelHandlers
         *
         * @param channel The channel from which to remove the message handlers
         * @param msgString The message string from which to remove the handlers
         * @param namespace The message namespace
         */
        removeChannelHandlers : function(channel,msgString,namespace){

            SF_Log.info('[PubSub.removeChannelHandlers()] Removing channel handler for '+msgString+' message on '+channel+' channel' + ((namespace) ? ' in ' + namespace + ' namespace' : ''),null,'PubSubPublish');

            if (this.channelHandlers[channel] &&
                this.channelHandlers[channel][msgString])
            {

                for (var i=0;i<this.channelHandlers[channel][msgString].length;i++){

                    if (this.channelHandlers[channel][msgString][i].namespace === namespace){
                        this.channelHandlers[channel][msgString].splice(i,1);
                    }
                }
            }
        },

        /**
         * Removes message handlers from globalHandlers
         *
         * @param msgString The message string from which to remove the handlers
         * @param namespace The message namespace
         * @param handlerNum The index of the handler to remove. If none specified, all handlers are removed.
         */
        removeGlobalHandlers : function(msgString,namespace,handlerNum){

            if (this.globalHandlers[msgString]){

                for (var i=0;i<this.globalHandlers[msgString].length;i++){

                    if (this.globalHandlers[msgString][i].namespace === namespace){

                        if (typeof handlerNum === 'undefined' || handlerNum === i){

                            SF_Log.info('[PubSub.removeGlobalHandlers()] Removing global handler for '+msgString+' message' + ((namespace) ? ' in ' + namespace + ' namespace' : ''),null,'PubSubPublish');

                            this.globalHandlers[msgString].splice(i,1);
                        }
                    }
                }
            }
        },

        /**
         * Gets array of handlers for the message on the specified route's channels.
         *
         * If route is ['Foo','Bar','Baz'], returned array is structured like:
         *
         * - Foo channel
         *    - handler 1
         *    - handler 2
         *    - handler 3
         * - Bar channel
         *    - handler 1
         *    - handler 2
         *    - handler 3
         * - Baz channel
         *    - handler 1
         *    - handler 2
         *    - handler 3
         *
         * @param data Data object containing message for which to get handlers
         * @return {Array}
         */
        getChannelHandlers : function(data){

            var msgString                       = data.message.serialize();
            var channelHandlers                 = [];

            if (this.hasRoute(data.route)){

                var channels                    = this.getRoute(data.route);

                if (typeof this.channelHandlers !== 'undefined'){

                    /* Get handlers for each channel in the route, for this message */
                    for (var i=0;i<channels.length;i++){
                        channelHandlers.push(this.getChannelMsgHandlers(channels[i],msgString));
                    }
                }

            } else {

                throw new Error('PubSub.getChannelHandlers() '+data.route+' route does not exist');
            }

            return channelHandlers;
        },

        /**
         * Gets the handlers for message for one channel on route
         *
         * @param channel The channel containing the message
         * @param msgString The message string for which to get handlers
         * @return {*}
         */
        getChannelMsgHandlers : function(channel,msgString){

            /* If no handlers have been added for channel, return early with empty array */
            if (typeof this.channelHandlers[channel] === 'undefined'){
                return [];
            }

            var handlers                        = [];

            for (var thisMsg in this.channelHandlers[channel]){

                if (this.channelHandlers[channel].hasOwnProperty(thisMsg)){

                    if (this.compare(msgString,thisMsg)){
                        handlers                = handlers.concat(this.channelHandlers[channel][thisMsg]);
                    }
                }
            }

            return handlers;
        },

        /**
         * Gets global handlers for message
         *
         * @param data Object containing message for which to get global handlers
         * @return {*}
         */
        getGlobalHandlers : function(data){

            var msgString                       = data.message.serialize();
            var handlers                        = [];

            for (var thisMsg in this.globalHandlers){

                if (this.globalHandlers.hasOwnProperty(thisMsg)){

                    if (this.compare(msgString,thisMsg)){
                        handlers                = handlers.concat(this.globalHandlers[thisMsg]);
                    }
                }
            }

            return handlers;
        },

        /**
         * Gets subscribers in the specified phase ('after' by default)
         *
         * @param phase The phase for which to get the subscribers
         * @return {*}
         */
        getSubscribers : function(phase){

            phase                                = phase || 'after';

            return this.subscribers[phase] || [];
        },

        /**
         * Gets the default namespace
         *
         * @return {String}
         */
        getDefaultNamespace : function(){
            return this.DEFAULT_NAMESPACE;
        },

        /**
         * Compares two messages
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
         * If checkSpecificity is true (which it is by default), and messages match based on wildcards,
         * we only return true if the first message if more specific than the second.
         *
         * A good use-case for this is when checking messages against a list of listeners. We want
         * to trigger a listener when the message and listener match exactly, or when the listener is
         * more general than the message, but not when the message is more general than the listener.
         *
         * For example:
         *
         * If message is foo.bar.baz and listener is foo.bar.baz, trigger listener.
         * If message is foo.bar.baz and listener is foo.bar.*, trigger listener.
         * If message is foo.bar.* and listener is foo.bar.baz DON'T trigger listener.
         *
         * @param msg1 The first message to compare
         * @param msg2 The second message to compare
         * @param checkSpecificity True by default
         */
        compare : function(msg1,msg2,checkSpecificity){

            checkSpecificity                    = (typeof checkSpecificity === 'undefined') ? true : checkSpecificity;

            if (msg1 === msg2){
                return true;
            }

            /* Split messages into arrays at the dots */
            var msg1Array                       = msg1.split('.');
            var msg2Array                       = msg2.split('.');

            /* If the messages don't have the same number of segments, they aren't equivalent */
            if (msg1Array.length !== msg2Array.length){
                return false;
            }

            var msg1Bitmask                     = '';
            var msg2Bitmask                     = '';
            var longerMessage                   = (msg1Array.length >= msg2Array.length) ? msg1Array : msg2Array;

            /* Loop through segments and compare them */
            for (var i=0;i<longerMessage.length;i++){

                /* If neither segment is a wildcard, and the segments don't match, then the messages aren't equivalent */
                if (msg1Array[i] !== '*' && msg2Array[i] !== '*' && msg1Array[i] !== msg2Array[i]){
                    return false;
                }

                msg1Bitmask                    += (msg1Array[i] === '*') ? '0' : '1';
                msg2Bitmask                    += (msg2Array[i] === '*') ? '0' : '1';
            }

            /**
             * If checkSpecificity is true, that means we want to know now only whether
             * the messages are equal, but also which one is more specific. Therefore,
             * we only return true if the first message is more specific than the second.
             */
            if (checkSpecificity === true){
                return msg1Bitmask > msg2Bitmask;
            }

            return true;
        },

        /**
         * Processes arguments passed to publish() method, validating them
         * and setting defaults as needed
         *
         * Returns object with message, route, payload, onComplete, and/or onPublish
         * properties defined
         *
         * @param args Array of args to process
         * @return {Object} Object containing processed args
         */
        processPublishArgs : function(args){

            if (args.length === 0){
                throw new Error("[PubSub.processPublishArgs()] Method publish() requires message. Either publish('someMessage'), publish(['array','of','messages']), publish({message : 'someMessage'}), or publish({message : ['array','of','messages']})");
            }

            var data                            = (SF_Object.isObjLiteral(args[0])) ? this.processArgsObj('publish',args[0]) : this.processPublishArgsList(args);

            data.payload                        = data.payload || {};

            return this.convertMessages(data);
        },

        /**
         * Processes array of args passed to publish() method
         * 
         * @param args Array of args to process
         * @return {Object} Object containing processed args
         */
        processPublishArgsList : function(args){

            if (typeof args[0] !== 'string' && !SF_Array.isArray(args[0])){
                throw new Error("[PubSub.processPublishArgsList()] First argument for PubSub.publish() must be a string or an array (message)");
            }

            var data = {
                message                         : args[0],
                payload                         : {}
            };

            if (args.length > 1){

                if (SF_Object.isObjLiteral(args[1])){

                    data.payload                = args[1];

                } else if (typeof args[1] === 'string'){

                    data.route                  = args[1];

                } else if (typeof args[1] === 'function' || args[1] === null){

                    data.onComplete             = args[1];

                } else if (typeof args[1] === 'undefined'){

                    data.payload                = {};

                } else {

                    throw new Error("[PubSub.processPublishArgsList()] Second argument for PubSub.publish() must be an object (payload), string (route), or function (onComplete)");
                }
            }

            if (args.length > 2){

                if (SF_Object.isObjLiteral(args[2])){

                    data.payload                = args[2];

                } else if ((typeof args[1] === 'string' || SF_Object.isObjLiteral(args[1])) && (typeof args[2] === 'function' || args[2] === null)){

                    data.onComplete             = args[2];

                } else if ((typeof args[1] === 'function' || args[1] === null) && typeof args[2] === 'function'){

                    data.onPublish              = args[2];

                } else {

                    throw new Error("[PubSub.processPublishArgsList()] Third argument for PubSub.publish() must be an object (payload) or a function (onPublish)");
                }
            }

            if (args.length > 3){

                if ((typeof args[2] === 'function' || args[2] === null) && typeof args[3] === 'function'){

                    data.onPublish              = args[3];

                } else if (SF_Object.isObjLiteral(args[2]) && (typeof args[3] === 'function' || args[3] === null)){

                    data.onComplete             = args[3];

                } else {

                    throw new Error("[PubSub.processPublishArgsList()] Fourth argument for PubSub.publish() must be a function");
                }
            }

            if (args.length > 4){

                if ((typeof args[3] === 'function' || args[3] === null) && typeof args[4] === 'function'){

                    data.onPublish              = args[4];

                } else {

                    throw new Error("[PubSub.processPublishArgsList()] Fifth argument for PubSub.publish() must be a function (onPublish)");
                }
            }

            return data;
        },

        /**
         * Processes arguments passed to listen() or once() methods, validating them
         * and setting defaults as needed
         *
         * Returns object with message, handler, channel and/or async properties defined
         *
         * @param args Array of args to process
         * @return {Object} Object containing processed args
         */
        processListenArgs : function(args){

            var data                            = (SF_Object.isObjLiteral(args[0])) ? this.processArgsObj('listen',args[0]) : this.processListenArgsList(args);

            if ((typeof data.message !== 'string' && !(data.message instanceof SF_Message) && !SF_Array.isArray(data.message)) || typeof data.handler !== 'function'){
                throw new Error("[PubSub.processListenArgs()] Method listen() requires message and handler. Either listen('someMessage',someHandler), listen(['array','of','messages'],someHandler), listen({message : 'someMessage', handler: someHandler}), or listen({message : ['array','of','messages'], handler : someHandler})");
            }

            data.async                          = (typeof data.async !== 'undefined') ? data.async : false;

            return this.convertMessages(data);
        },

        /**
         * Processes array of args passed to listen() or once() methods
         *
         * @param args Array of args to process
         * @return {Object} Object containing processed args
         */
        processListenArgsList : function(args){

            if (typeof args[0] !== 'string' && !SF_Array.isArray(args[0])){
                throw new Error("[PubSub.processListenArgsList()] First argument for PubSub.listen() must be a string or an array (message)");
            }

            var data = {
                message                         : args[0]
            };

            if (typeof args[1] === 'function'){

                data.handler                    = args[1];

            } else if (typeof args[1] === 'string'){

                data.channel                    = args[1];

            } else {

                throw new Error("[PubSub.processListenArgsList()] Second argument for PubSub.listen() must be a function (handler) or a string (channel)");
            }

            if (args.length > 2){

                if (typeof args[1] === 'string' && typeof args[2] === 'function'){

                    data.handler                = args[2];

                } else if (typeof args[1] === 'function' && typeof args[2] === 'boolean'){

                    data.async                  = args[2];

                } else {

                    throw new Error("[PubSub.processListenArgsList()] Third argument for PubSub.listen() must be a function (handler) or boolean (async)");
                }
            }

            if (args.length > 3){

                if (typeof args[3] === 'boolean'){

                    data.async                  = args[3];

                } else {

                    throw new Error("[PubSub.processListenArgsList()] Fourth argument for PubSub.listen() must be boolean (async)");
                }
            }

            return data;
        },

        /**
         * Processes arguments passed to stop() method, validating them
         * and setting defaults as needed
         *
         * Returns object with message and channel
         *
         * @param args Array of args to process
         * @return {Object} Object containing processed args
         */
        processStopArgs : function(args){

            var data                            = (SF_Object.isObjLiteral(args[0])) ? this.processArgsObj('stop',args[0]) : this.processStopArgsList(args);

            if (typeof data.message !== 'string' && !(data.message instanceof SF_Message) && !SF_Array.isArray(data.message)){
                throw new Error("[PubSub.processStopArgs()] Method stop() requires message. Either stop('someMessage'), stop(['array','of','messages']), stop({message : 'someMessage'}), or stop({message : ['array','of','messages']})");
            }

            return this.convertMessages(data);
        },

        /**
         * Processes array of args passed to stop() method
         *
         * @param args Array of args to process
         * @return {Object} Object containing processed args
         */
        processStopArgsList : function(args){

            if (typeof args[0] !== 'string' && !SF_Array.isArray(args[0])){
                throw new Error("[PubSub.processStopArgsList()] First argument for PubSub.stop() must be a string or an array (message)");
            }

            var data = {
                message                         : args[0]
            };

            if (args.length > 1){

                if (typeof args[1] === 'string'){

                    data.channel                = args[1];

                } else {

                    throw new Error("[PubSub.processStopArgsList()] Second argument for PubSub.stop() must be a string (channel)");
                }
            }

            return data;
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

            var data                            = (SF_Object.isObjLiteral(args[0])) ? this.processArgsObj('subscribe',args[0]) : this.processSubscribeArgsList(args);

            if (typeof data.handler !== 'function'){
                throw new Error("[PubSub.processSubscribeArgs()] Method subscribe() requires handler function");
            }

            return data;
        },

        /**
         * Processes array of args passed to subscribe() method
         *
         * @param args Array of args to process
         * @return {Object} Object containing processed args
         */
        processSubscribeArgsList : function(args){

            if (typeof args[0] !== 'function'){
                throw new Error('PubSub.processSubscribeArgsList() First argument for PubSub.subscribe() must be a function (handler)');
            }

            var data = {
                handler                         : args[0],
                async                           : false,
                namespace                       : this.getDefaultNamespace(),
                phase                           : 'after'
            };

            if (args.length > 1){

                if (typeof args[1] === 'boolean'){

                    data.async                  = args[1];

                } else if (typeof args[1] === 'string'){

                    data.namespace              = args[1];

                } else {

                    throw new Error('PubSub.processSubscribeArgsList() Second argument for PubSub.subscribe() must be boolean (async) or a string (namespace)');
                }
            }

            if (args.length > 2){

                if (typeof args[2] === 'boolean'){

                    data.async                  = args[2];

                } else if (typeof args[2] === 'string'){

                    data.phase                  = args[2];

                } else {

                    throw new Error('PubSub.processSubscribeArgsList() Third argument for PubSub.subscribe() must be boolean (async) or a string (phase)');
                }
            }

            if (args.length > 3){

                if (typeof args[3] === 'boolean'){

                    data.async                  = args[3];

                } else {

                    throw new Error('PubSub.processSubscribeArgsList() Fourth argument for PubSub.subscribe() must be boolean (async)');
                }
            }

            if (data.phase !== 'before' && data.phase !== 'after'){
                throw new Error('PubSub.processSubscribeArgsList() Phase must be "before" or "after"');
            }

            return data;
        },

        /**
         * Processes single object argument
         *
         * @param method The name of the method receiving the argument
         * @param obj The object argument
         * @return {Object} Validated object
         */
        processArgsObj : function(method,obj){

            if (!('message' in obj)){

               throw new Error("[PubSub.processArgsObj()] PubSub."+method+"() object argument requires message property. Either "+method+"({message : 'someMessage'}), or "+method+"({message : ['array','of','messages']})");
            }

            if ('route' in obj && typeof obj.route !== 'string'){

                throw new Error("[PubSub.processArgsObj()] PubSub."+method+"() route must be a string");
            }

            if ('payload' in obj && (typeof obj.payload !== 'object' || obj.payload === null)){

                throw new Error("[PubSub.processArgsObj()] PubSub."+method+"() payload must be an object");
            }

            if ('callback' in obj && typeof obj.callback !== 'function'){

                throw new Error("[PubSub.processArgsObj()] PubSub."+method+"() callback must be a function");
            }

            if ('onComplete' in obj && typeof obj.onComplete !== 'function' && obj.onComplete !== null){

                throw new Error("[PubSub.processArgsObj()] PubSub."+method+"() onComplete must be a function");
            }

            if ('onPublish' in obj && typeof obj.onPublish !== 'function' && obj.onPublish !== null){

                throw new Error("[PubSub.processArgsObj()] PubSub."+method+"() onPublish must be a function");
            }

            if ('channel' in obj && typeof obj.channel !== 'string'){

                throw new Error("[PubSub.processArgsObj()] PubSub."+method+"() channel must be a string");
            }

            if ('handler' in obj && typeof obj.handler !== 'function'){

                throw new Error("[PubSub.processArgsObj()] PubSub."+method+"() handler must be a function");
            }

            if ('async' in obj && typeof obj.async !== 'boolean'){

                throw new Error("[PubSub.processArgsObj()] PubSub."+method+"() async argument must be boolean");
            }

            if ('namespace' in obj && typeof obj.namespace !== 'string'){

                throw new Error("[PubSub.processArgsObj()] PubSub."+method+"() namespace argument must be a string");
            }

            if ('phase' in obj && (typeof obj.phase !== 'string' || (obj.phase !== 'before' && obj.phase !== 'after'))){

                throw new Error("[PubSub.processArgsObj()] PubSub."+method+"() phase argument must be a string with a value of 'before' or 'after'");
            }

            return obj;
        },

        /**
         * Converts message strings to Message objects
         *
         * @param data Data object containing message(s)
         * @return {Object} Data object containing converted messages
         */
        convertMessages : function(data){

            /* Convert array of message strings to Message objects, if needed */
            if (SF_Array.isArray(data.message)){

                var messageArray                = [];

                for (var i=0;i<data.message.length;i++){

                    if (!(data.message[i] instanceof SF_Message)){
                        messageArray[i]         = new SF_Message(data.message[i]);
                    }
                }

                data.message                    = messageArray;
            }
            /* Convert single message string to Message object, if needed */
            else if (!(data.message instanceof SF_Message)){

                data.message                    = new SF_Message(data.message);
            }

            return data;
        }
    };

    return {

        addRoute                : PubSub.addRoute.bind(PubSub),
        clear                   : PubSub.clear.bind(PubSub),
        compare                 : PubSub.compare.bind(PubSub),
        listen                  : PubSub.listen.bind(PubSub),
        once                    : PubSub.once.bind(PubSub),
        publish                 : PubSub.publish.bind(PubSub),
        stop                    : PubSub.stop.bind(PubSub),
        subscribe               : PubSub.subscribe.bind(PubSub),
        unsubscribe             : PubSub.unsubscribe.bind(PubSub)
    }
});