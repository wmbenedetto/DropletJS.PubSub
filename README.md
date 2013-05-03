# DropletJS.PubSub

DropletJS.PubSub is an advanced JavaScript event library, specifically designed for building highly complex web apps.

## Why DropletJS.PubSub?

There are literally dozens of JavaScript event libraries and frameworks, and most of them do the same basic things: you publish events, listeners handle the events. Pretty simple.

So why should you use DropletJS.PubSub? Well, if all you need is publishers and listeners, you shouldn't. 

Instead, you should use Backbone, or jQuery, or EventEmitter, or any of the other popular solutions. They're more widely implemented, they're probably faster, and they may already be available in your app (like if you're already using Backbone or jQuery anyway).

Or you can use some events-only micro-framework with a negligible file size and dead simple API.

However, if you've used any of those solutions and have found them lacking, then you should take DropletJS.PubSub out for a spin.

## Core principles

There are a few core principles behind DropletJS.PubSub that may make it the right choice for your app:

### Standalone

DropletJS.PubSub doesn't have any dependencies, and clocks in at a slim **~1.8k** (minified and gzipped) despite its robust feature set. If size matters in your app, you might not want to incur the download overhead of a larger library like Backbone or jQuery, when all you really need is the event functionality.

### Unobtrusive

Many event libraries (i.e. Backbone) work by modifying or extending existing objects with additional methods. This can cause collisions with existing methods, leading to unintended consequences or unexpected bugs.

In contrast, DropletJS.PubSub is a standalone event aggregator. It doesn't alter your objects in any way. In fact, it doesn't even know or care about your objects. All it cares about are messages and callback functions (listeners).

That means you don't have to worry about memory leaks caused by some lingering object references tied up in the internals of your event library.

### Unopinionated

DropletJS.PubSub doesn't force you to commit to any particular event naming scheme, nor does it limit you to a restricted list of possible events. Instead, it allows you to publish and listen for any arbitrary string, so you can use whatever event names that are right for your app.

## Basic features

Naturally, DropletJS.PubSub offers all the basic functionality you'd expect from an event framework. You can:

* **publish** messages
* **listen** for messages, executing a callback each time a message is published
* listen **once** for a message, only executing a callback the first time the message is published
* **stop** listening for messages
* **clear** all listeners

## Advanced features

DropletJS.PubSub offers a number of advanced features that are especially useful if you're building highly complex JavaScript apps:

### Message wildcards

One of DropletJS.PubSub's most powerful features is its built-in message syntax that allows you to listen for messages using wildcards.

For example, say you publish `Foo.issue.detected.SYNTAX_ERROR` and `Bar.issue.detected.ILLEGAL_INPUT` in various parts of your app.

Using wildcards, you can listen for `*.issue.detected.SYNTAX_ERROR` and capture SYNTAX_ERROR issues from both Foo and Bar.

Or you can listen for `Foo.issue.detected.*` and capture both SYNTAX_ERROR and ILLEGAL_INPUT errors coming only from Foo.

Or you can listen for `*.issue.detected.*` and capture all issues detected by Foo, Bar, or any other originators.

This flexibility insulates your app against tight coupling. Your main app can listen for messages from modules without needing to know exactly what the modules are called, and you can add new messages without necessarily needing to add corresponding listeners.

### Global subscribers

Sometimes you need to respond to every message that is published, regardless of what the message is. For example, you might want to pump all messages through a reporting or logging system. Global subscribers allow you to capture all messages flowing through your system through a single, isolated mechanism.

### Before/after filters

You can specify whether global subscribers should be called before or after the message-specific listeners are executed. "Before" filters are helpful when you need to transform messages coming from external systems before they are published to your app. Likewise, "after" filters can transform messages before they go out to third-party systems (i.e. reporting.)

For example, say you're listening for messages coming from a Flash app or Java applet. There's a good chance that those apps were written by different developers with different event-naming rules. Rather than bake their alternate naming scheme into your app, you can use a "before" filter to transform the message to something your app already recognizes.

### Namespaces

Namespaces increase the control you have over adding and removing listeners and subscribers by allowing you to remove listeners from subsets of messages without clobbering all listeners for the message.

For example, you can listen for `Foo:click` and `Bar:click`. Both listeners will respond to a `click` event -- the namespace is ignored for the purposes of triggering the listener.

Where the namespace comes into play is when you want to remove listeners. Without the namespace, you'd be forced to remove all click listeners, then re-add some of them. With namespaces, you can remove just the `Foo:click` listeners, leaving the `Bar:click` listeners untouched.

### onComplete() callbacks

These callbacks are executed after *all* message handlers are executed. They can be used to, for example, perform cleanup tasks or update the UI (i.e. removing a loading spinner).

### onPublish() callbacks

These callbacks are executed after *each* message handler is executed. They can be used to fire off high-priority functions that can't wait for the entire listener stack to finish executing, especially if the listeners are asynchronous functions that can take a while to complete.

Alternately, onPublish callbacks can be used to receive the results of asynchronous listeners (see below).

### Asynchronous listeners

Listeners can be flagged as asynchronous. Asynchronous listeners allow you to return results of async functions (i.e. AJAX requests) via callbacks without blocking your entire app.

### Multiple messages

DropletJS.PubSub's `listen`, `once`, `publish`, and `stop` methods all accept arrays of messages, so you can simultaneously publish multiple messages, or you can listen for multiple messages using the same handler. 

## Quick install

coming soon

## Quick start

coming soon

## Messages

DropletJS.PubSub refers to events as *messages*. Messages are published; listeners and subscribers handle published messages.

A message can be any arbitrary string. It can be something as simple `click` or `keyup`, or as complex as `DAMN_USER_DONE_DID_SOMETHING_STUPID`. Whatever your app needs. 

That said, there is a built-in message syntax that can be very helpful for structuring complex applications. 

### Message syntax

DropletJS.PubSub messages follow the following pattern:

```javascript
Originator.subject.verb.DESCRIPTOR
```

* **Originator** describes where the message was published from. This will usually be the name of a module or class.

* **Subject** and **verb** combine to explain what caused the message to be published, i.e. `button.clicked`, `form.submitted`, `error.detected`, etc. By convention, verbs should be past tense, since the message generally describes something that just happened. However, that's just convention -- if it makes more sense in your app to use present tense, or mix-and-match present and past tense, that's fine too.

* **DESCRIPTOR** is an optional string that can be used to disambiguate similar events. For example, `button.clicked.SUBMIT` vs `button.clicked.CANCEL` vs `button.clicked.NO_THANKS`. By convention, descriptors are ALL_CAPS with underscores used in place of spaces.

### Publishing messages

When messages are published, best practice is to always use an originator, subject, and verb. The descriptor is optional. 

For example:

```javascript
DropletJS.PubSub.publish('ShoppingCart.item.added.SKU23426081350716');
DropletJS.PubSub.publish('ShoppingCart.form.submitted');
DropletJS.PubSub.publish('ShoppingCart.error.detected.INVALID_CREDIT_CARD');

DropletJS.PubSub.publish('CommentBox.key.pressed');
DropletJS.PubSub.publish('CommentBox.comment.submitted');
DropletJS.PubSub.publish('CommentBox.result.returned.SUCCESS');
```

### Listening for messages

When listening for messages, each segment of the message is optional -- a wildcard can be used instead. The more wildcards you use, the more messages the listener can/will respond to.

For example, you can listen for a very specific message. The following listener will only fire when an item with a specific SKU (which appears as the descriptor) is added to the shopping cart:

```javascript
DropletJS.PubSub.listen('ShoppingCart.item.added.SKU23426081350716'); 
```

That's probably not terribly useful though. You probably want something a little more generic, that can respond whenever *any* item is added to the cart. This listener will fire for any `ShoppingCart.item.added` message, regardless of the descriptor.

```javascript
DropletJS.PubSub.listen('ShoppingCart.item.added.*'); 
```

We can actually simplify even more. When a wildcard appears at the end of a message, it can be omitted entirely. Because DropletJS.PubSub is expecting a 4-segment message, it will automatically replace any missing segments with wildcards.

```javascript
// This will respond to any item being added.
DropletJS.PubSub.listen('ShoppingCart.item.added.*');  

// So will this. It's functionally identical to the example above.
DropletJS.PubSub.listen('ShoppingCart.item.added');    

// This will respond to anything that happens with an item, regardless of verb
DropletJS.PubSub.listen('ShoppingCart.item');    

// This will respond to anything that is published from ShoppingCart
DropletJS.PubSub.listen('ShoppingCart');   
```

So when *do* you need to use a wildcard? When it's not at the end of the message.

For example, you might want to listen for error messages from any originator: 

```javascript
DropletJS.PubSub.listen('*.error.detected');
```

Or maybe you want to listen for any time something is clicked in the shopping cart: 

```javascript
DropletJS.PubSub.listen('ShoppingCart.*.clicked');
```

## Examples

coming soon

## API
---
### listen

The `listen` message tells DropletJS.PubSub which message(s) to listen for, and which function to use when handling the message. There are two valid ways to call `listen`:

##### listen('someMessage',messageHandler)

* [REQUIRED] *someMessage:* Message string or array of messages to listen for
* [REQUIRED] *messageHandler:* Function to call when message is published

```javascript
// Listen for one message
DropletJS.PubSub.listen('ShoppingCart.item.added',function(message,payload){
    console.log('Item added');
});
```

```javascript
// Listen for array of messages
var messages = [
    'ShoppingCart.item.added',
    'WishList.item.added',
    'Favorites.item.added'
];

DropletJS.PubSub.listen(messages,function(message,payload){
    console.log('Item added');
});
```

##### listen(configObj)

`configObj` is an object literal with the following properties:

* [REQUIRED] *message:* Message string or array of messages to listen for
* [REQUIRED] *handler:* Function to call when message is published
* [OPTIONAL] *async:* Boolean. False by default. Set to true if handler is asynchronous.

```javascript
DropletJS.PubSub.listen({
    message : 'ShoppingCart.item.added', // can also be an array of messages
    handler : function(message,payload){
        console.log('Item added')
    },
    async : true
});
```

When the handler function is called, it will be passed several arguments ...

```javascript
messageHandler(message,payload)
```

... where `message` is the message that triggered the handler, and `payload` is an arbitrary value (usually an object literal) passed by the `publish()` function. 

In addition, there is a third argument (`callback`) that will be passed to the handler when `async` is true. This can be used to pass results from the asynchronous handler back to the originator of the message.

```javascript
DropletJS.PubSub.listen({
    message : 'ShoppingCart.item.added',
    async : true,
    handler : function(message,payload,callback){
    
        // Async AJAX request
        $.ajax("example.php").done(function(result){
        
            // Pass result of async request to callback
            callback(result);
        });
    }
});

// The onPublish() function is the callback that gets passed to an asynchronous listener
DropletJS.PubSub.publish({
    message : 'ShoppingCart.item.added',
    onPublish : function(result){
        console.log('The result of the listener is ', result);
    }
});
```

---
### once

The `once` message tells DropletJS.PubSub to listen for a message (or messages) one time, and which function to use when handling the message. After the `once` handler has been called, the message is no longer listened for.

`once` is called exactly like `listen` above: either `once('someMessage',messageHandler)` or `once(configObj)`.

---
### publish
##### publish('someMessage',payload)
##### publish(configObj)
---
### stop
##### stop('someMessage')
---
### subscribe
##### subscribe(handler)
##### subscribe(configObj)
---
### unsubscribe
##### unsubscribe(namespace,phase)
##### unsubscribe(configObj)
---
### clear
---
## FAQ

## Questions? Bugs? Suggestions?

Please submit all bugs, questions, and suggestions via the [Issues](https://github.com/wmbenedetto/DropletJS.PubSub/issues) section so everyone can benefit from the answer.

If you need to contact me directly, email warren@transfusionmedia.com.

## MIT License

Copyright (c) 2013 Warren Benedetto <warren@transfusionmedia.com>

Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
