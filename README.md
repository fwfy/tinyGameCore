# tinyGameCore
A game engine written in JS for HTML5/JS games in the browser.

# Get started
To get started with tinyGameCore, you can use the below code to load it in via jsdelivr:  
`<script src="https://cdn.jsdelivr.net/gh/fwfy/tinyGameCore/tinygamecore.js"></script>`
Then, you need to provide tinyGameCore with a `<canvas>` element to draw on, by doing `tinyGameCore.useCanvas("game_canvas");`. Make sure to replace "game_canvas" with the actual DOM ID of your canvas.

By default, tinyGameCore will scale the canvas to fit the screen (assuming no margins). You might not want this, so to disable it, you can set the `tinyGameCore.resize` property to `false`. Keep in mind that the playarea will always scale to the canvas, and this cannot be disabled. Make sure to try not to scale down the canvas after you've started tinyGameCore, as this can cause some sprites to get stuck outside the border.
  
The default `keyActions` assume that you want WASD for movement, and nothing else. If you want to use alternative movement keys, or add more keys, read [the section on the `keyActions` property](#how-to-use-keyactions)

Now that `tinyGameCore.ctx` is set, you are ready to start the game loop. To do that, run `tinyGameCore.start()`. A full example looks like this:

```html
<head>
    <title>tinyGameCore demo</title>
    <script src="https://cdn.jsdelivr.net/gh/fwfy/tinyGameCore/tinygamecore.js"></script>
    <script src="index.js" defer></script>
</head>
<body>
    <canvas id="game_canvas" width=500 height=500></canvas>
</body>
```

index.js:
```js
tinyGameCore.useCanvas("game_canvas");
tinyGameCore.start();
```

# How to use keyActions
So, you have a game now. That's great! But it could be greater.

Let's say you wanted to make a pause feature. When you press `P`, the game should pause, press it, and it will unpause again.

To make a new keybind, you need to set a property on the `tinyGameCore.keyActions` object with the same name as the key you wish to use to trigger it.

```js
tinyGameCore.keyActions.p = {}
```

Right now, this will do nothing, as the object is empty. Let's fix that, by adding a property called `fn`, which will run when the key is pressed.

```js
tinyGameCore.keyActions.p = {
    fn: _ => {
        // Is the game running?
        if(tinyGameCore.running) {
            // If so, stop the game loop.
            tinyGameCore.stop();
        } else {
            // Otherwise, start the game loop
            tinyGameCore.start();
        }
    }
}
```

There we go! That should be it, right?

Well, kinda. The above code will work, but it will execute once for *every single frame* the key is held down. Even if you were to lightly tap the `P` key, it would most likely end up pausing and unpausing the game several times.

To alleviate this problem, you just need to set the `singlefire` property of the `keyActions.p` object to true. So now, here is the full code for a pause button, that will only run once on the first frame it's pressed.

```js
tinyGameCore.keyActions.p = {
    fn: _ => {
        // Is the game running?
        if(tinyGameCore.running) {
            // If so, stop the game loop.
            tinyGameCore.stop();
        } else {
            // Otherwise, start the game loop
            tinyGameCore.start();
        }
    },
    singlefire: true
}
```

*The above is only a simple example on how you could use the `keyActions` object. You can really make it run any code you want, with no limitations, at the press of a button*