# DropletJS.PubSub

DropletJS.PubSub is an advanced JavaScript event library, specifically designed for building highly complex web apps.

## Why DropletJS.PubSub?

There are literally dozens of JavaScript event frameworks, and most of them do the same basic things: events get published, and listeners handle the events. Pretty simple.

So why should you use DropletJS.PubSub? Well, if all you need is publishers and listeners, you shouldn't. 

Instead, you should use Backbone, or jQuery, or EventEmitter, or any of the other popular solutions. They're more widely implemented, they're probably faster, and they may already be available in your app (like if you're already using Backbone or jQuery anyway).

However, if you've used any of those solutions and have found them lacking, then you should take DropletJS.PubSub out for a spin.

## Core principles

There are a few core principles behind DropletJS.PubSub that may make it the right choice for your app:

### Standalone

DropletJS.PubSub doesn't have any dependencies, and clocks in at a slim **~1.8k** (minified and gzipped). If size matters to your app, you might not want to incur the download overhead of a larger library like Backbone or jQuery, when all you really need is the event functionality.

### Unobtrusive

Many event libraries (i.e. Backbone) work by modifying or extending existing objects with additional methods. This can cause collisions with existing methods, leading to unintended consequences or unexpected bugs.

In contrast, DropletJS.PubSub is a standalone event aggregator. It doesn't alter your objects in any way. In fact, it doesn't even care about your objects. All it cares about are messages and callback functions (listeners).

That means you don't have to worry about memory leaks caused by some lingering object reference tied up in the internals of your event library.

### Unopinionated

DropletJS.PubSub doesn't force you to commit to any particular event naming scheme, nor does it limit you to a restricted list of possible events. Instead, it allows you to publish and listen for any arbitrary string, so you can use whatever is right for your app.

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

## Questions? Bugs? Suggestions?

Please submit all bugs, questions, and suggestions via the [Issues](https://github.com/wmbenedetto/DropletJS.PubSub/issues) section so everyone can benefit from the answer.

If you need to contact me directly, email warren@transfusionmedia.com.

## MIT License

Copyright (c) 2013 Warren Benedetto <warren@transfusionmedia.com>

Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
