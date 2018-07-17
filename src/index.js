import {Music} from './music.js';
import Player from './player.js';

//export {Music} from './music.js';
//export * from './player.js';

/*
//const music = Music.fromMml(`cegl2ecl1e`);
const music = Music.fromMml(`
t128
[o6v50l4 $
ccfgaa8a8a2a>cc<afagraa8a8>c<agf8f8drfdcfgafr4]/
[@1o6v40l4
<aa>ceff8f8f2faafdd-crff8f8afed8d8<a>rd<b-a>ceecr4]`)
//@2o3v60l2
//f.f4f.e4d.d4gc4d8e8f.e4dd4<a4b->fc4<b-4a4r4
//  `);
const player = new Player(music);
player.play();
*/


function play() {
  const srcEl = document.getElementById('src');
  const src = srcEl.value;
  const music = Music.fromMml(src);
  console.log(music.events);
  new Player(music).play();
}

document.getElementById('play').onclick = play;
