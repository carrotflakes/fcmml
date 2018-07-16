import {Synth} from './synth.js';

export default class Player {

  constructor() {
    if (typeof webkitAudioContext !== "undefined") {
      this.ac = new webkitAudioContext();
    } else if (typeof AudioContext !== "undefined") {
      this.ac = new AudioContext();
    } else {
      throw new Error("Failed to get AudioContext.");
    }

    this.masterGain = this.ac.createGain();
    this.masterGain.connect(this.ac.destination);
    this.masterGain.gain.value = 0.5; // 音小さめに
  }

  play(music) {
    const synthes = [];
    const oscs = [];
    for (const i = 0; i < music.trackNum; ++i) {
      synthes[i] = this.defaultSynth();
      oscs[i] = [];
    }

    const eventGen = this.seeker(music.events);
    let {value: event, done} = eventGen.next();

    while (!done) {
      switch (event.type) {
        case 'note':
          const {track, time} = event;
          const osc = synthes[track].makeOsc(this.ac, this.masterGain);
          osc.start(time); // TODO
          oscs[track].push(osc);
          break;
        case 'param':
          const {track, time, name, value} = event;
          for (const osc of oscs[track]) {
            osc.setParam(name, value, time);
          }
          break;
        case 'synth':
          const {track, time, synth} = event;
          synthes[track] = synth;
          break;
      }
      {value: event, done} = eventGen.next();
    }
  }

  *seeker(events) {
    let segno = null;
    for (let i = 0; i < events.length; ++i) {
      const event = events[i];
      switch (event.metaType) {
        case 'segno':
          segno = i;
          break;
        case 'endOfMusic':
          if (segno === null) {
            return;
          }
          i = segno;
          break;
        default:
          yield events[i];
      }
    }
  }

  defaultSynth() {
    return new Synth();
  }
}


function volumeToGainValue(v) {
  if (v === 0) {
    return 0;
  }
  return dbToGainValue(-(1 - v) * 3 * 16);

  return (Math.pow(11, v) - 1) / 10;
}

function dbToGainValue(v) {
  return Math.exp(v * Math.LN10 / 20);
}
