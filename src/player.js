import {Synth, Mixer} from './synth.js';

export default class Player {

  constructor(music, opt={}) {
    this.music = music;

    if (typeof webkitAudioContext !== "undefined") {
      this.ac = new webkitAudioContext();
    } else if (typeof AudioContext !== "undefined") {
      this.ac = new AudioContext();
    } else {
      throw new Error("Failed to get AudioContext.");
    }

    this.mixerMaster = new Mixer(this.ac, this.ac.destination);
    this.mixerMaster.setParam('volume', 0.5, 0);
    this.mixerMaster.setParam('pan', 0.5, 0);

    this.bufferTime = opt.bufferTime || 1; // sec

    this.init();
  }

  init() {
    this.mixers = [];
    this.synthes = [];
    this.oscs = [];
    for (let i = 0; i < this.music.trackNum; ++i) {
      const mixer = new Mixer(this.ac, this.mixerMaster.getInput());
      mixer.setParam('volume', 1, 0);
      mixer.setParam('pan', 0.5, 0);
      this.mixers[i] = mixer;
      this.synthes[i] = this.defaultSynth();
      this.oscs[i] = [];
    }
    this.tempo = 120;
  }

  async play() {
    let time = this.ac.currentTime + 0.01;
    let beat = 0;
    for (const event of this.seeker(this.music.events)) {
      if (event.beat < beat) {
        beat = event.beat;
      }
      const dTime = (event.beat - beat) * 60 / this.tempo;
      beat = event.beat;
      time += dTime;
      await asyncSleep((time - this.ac.currentTime - this.bufferTime) * 1000);
      this.handleEvent(event, time);

      // remove stoped oscs
      
    }
  }

  handleEvent(event, time) {
    switch (event.type) {
      case 'note':
        {
          const {track, gatetime} = event;
          const osc = this.synthes[track].makeOsc(this.ac, this.mixers[track].getInput());
          const endTime = time + gatetime * 60 / this.tempo;
          osc.start(time);
          osc.stop(endTime);
          osc.setParam('v', event.velocity, time);
          osc.setParam('f', event.frequency, time);
          osc.frequency(event.frequency, time, event.frequencyTo, endTime);
          this.oscs[track].push(osc);
        }
        break;
      case 'tempo':
        this.tempo = event.tempo;
        break;
      case 'param':
        {
          const {track, name, value} = event;
          this.mixers[track].setParam(name, value, time);
          for (const osc of this.oscs[track]) {
            osc.setParam(name, value, time);
          }
        }
        break;
      case 'synth':
        {
          const {track, synth} = event;
          this.synthes[track] = synth;
        }
        break;
    }
  }

  *seeker(events) {
    let segno = null;
    for (let i = 0; i < events.length; ++i) {
      switch (events[i].metaType) {
        case 'segno':
          segno = i;
          break;
        case 'endOfMusic':
          if (segno === null) {
            return;
          }
          yield events[i];
          i = segno;
          break;
      }
      yield events[i];
    }
  }

  defaultSynth() {
    return new Synth();
  }
}

const asyncSleep = time => new Promise(resolve => setTimeout(resolve, time));
