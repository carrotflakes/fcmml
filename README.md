# fcmml
Musical library for JavaScript with Web Audio API.
Fcmml can play text written in Music Macro Language (MML).

# Usage
``` js
const mml = `cde`;
const music = fcmml.Music.fromMml(mml);
const player = new fcmml.Player(music);
player.play();
```

# API

## class `Music`
`Music` class represents a music.

### `Music.fromMml(mml)`
Returns `Music` instance from a string as MML.

## class `Player`
`Player` is required to play `Music` instance.

### `new Player(music)`
`Player` constructor takes a `Music` instance.

### `player.play()`
Plays the music from the beginning.

### `player.stop()`
Stops the music.

# Author

* carrotflakes (carrotflakes@gmail.com)

# Copyright

Copyright (c) 2019 carrotflakes (carrotflakes@gmail.com)
