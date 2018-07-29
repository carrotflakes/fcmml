import {evalExpr, volumeToGainValue} from './util.js';

export class Node {
  start(time, note) {
  }

  stop(time, note) {
  }

  forceStop(time) {
  }

  frequency(start, time, end, endTime, note) {
  }

  setParam(param, time, note) {
  }
}


export class SimpleOscillator extends Node {
  constructor(ac, type, args) {
    super(ac, args);
    this.osc = ac.createOscillator();
    this.osc.type = {sin: 'sine', sqr: 'square', saw: 'sawtooth', tri: 'triangle'}[type];
    this.env = args[0];
    this.env.setAudioParam(this.osc.frequency);
    this.delayExpr = args[1];
  }

  start(time, note) {
    const delay = this.delayExpr ? evalExpr(this.delayExpr, note.param) : 0;
    this.osc.start(time + delay);
  }

  forceStop(time) {
    this.osc.stop(time);
  }

  getInput() {
    return null;
  }

  connect(audioNode) {
    this.osc.connect(audioNode);
  }
}


export class Gain extends Node {
  constructor(ac, args) {
    super(ac, args);
    this.gain = ac.createGain();
    this.env = args[0];
    this.env.setAudioParam(this.gain.gain);
  }

  getInput() {
    return this.gain;
  }

  connect(audioNode) {
    this.gain.connect(audioNode);
  }
}


export class Mixer {
  constructor(ac) {
    this.gain = ac.createGain();
    this.panner = ac.createStereoPanner();
    this.gain.connect(this.panner);
  }

  setParam(param, time, note) {
    for (const [key, value] of Object.entries(param)) {
      switch (key) {
        case 'volume':
          this.gain.gain.setValueAtTime(volumeToGainValue(value), time);
          break;
        case 'pan':
          this.panner.pan.setValueAtTime(value * 2 - 1, time);
          break;
      }
    }
  }

  getInput() {
    return this.gain;
  }

  connect(audioNode) {
    this.panner.connect(audioNode);
  }
}
