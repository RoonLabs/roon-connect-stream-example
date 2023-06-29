Roon Connect Stream Example
==


## Quick start guide

### Running this sample

```sh
npm install
node ./test.mjs
```

### Getting it connected to Roon

1. Open Roon
2. In Roon, go to Settings > Extensions
3. This extension should be listed. Enable it by hitting the `Enable` button next to the "Roon Connect Stream Example".
4. Hit the `Settings` button (it's where the `Enable` button used to be located), and select the audio output you want this example to stream to.
5. Go back to Home in Roon make sure Roon has that audio output selected in the bottom bar. This will be useful to see stuff when you start playing audio.


### Using it

Back in the console where you ran this sample:

1. Hit enter a few times to ensure you see the prompt.
2. You can type `play http://strm112.1.fm/dubstep_mobile_mp3` and hit enter. It will take a few seconds to start streaming/buffering, but you should hear Roon playing this stream and see your brand taking over the bottom bar.
3. You can type `help` for more commands.

## Turning this into something real

You will want to modify `test.mjs` and change the following stuff at a minimum:

1) the stuff passed in to `re.init()`
2) the stuff passed to `re.play()`

You will probably want to modify the following:

3) `const logger =`
4) remove all the interactive prompt stuff
