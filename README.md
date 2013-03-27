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

DropletJS.PubSub doesn't force you to commit to any particular event naming scheme, nor does it limit you to a restricted list of possible events. 

Instead, it allows you to publish and listen for any arbitrary string, so you can use whatever is right for your app.

## Questions? Bugs? Suggestions?

Please submit all bugs, questions, and suggestions via the [Issues](https://github.com/wmbenedetto/DropletJS.PubSub/issues) section so everyone can benefit from the answer.

If you need to contact me directly, email warren@transfusionmedia.com.

## MIT License

Copyright (c) 2013 Warren Benedetto <warren@transfusionmedia.com>

Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
