import {Node} from './node.js';
import {evalExpr} from './util.js';

export class Filter extends Node {
  constructor(ac, type, args) {
    super(ac, args);
    this.filter = ac.createBiquadFilter();
    switch (type) {
      case 'lpf':
      case 'hpf':
      case 'bpf':
      case 'ncf':
      case 'apf':
        this.filter.type = {lpf: "lowpass", hpf: "highpass", bpf: "bandpass", ncf: "notch", apf: "allpass"}[type];
        this.freqEnv = args[0];
        this.QEnv = args[1];
        this.freqEnv.setAudioParam(this.filter.frequency);
        this.QEnv.setAudioParam(this.filter.Q);
        break;
      case 'lsf':
      case 'hsf':
        this.filter.type = {lsf: "lowshelf", hpf: "highshelf"}[type];
        this.freqEnv = args[0];
        this.gainEnv = args[1];
        this.freqEnv.setAudioParam(this.filter.frequency);
        this.gainEnv.setAudioParam(this.filter.gain);
        break;
      case 'pkf':
        this.filter.type = 'peaking';
        this.freqEnv = args[0];
        this.QEnv = args[1];
        this.gainEnv = args[2];
        this.freqEnv.setAudioParam(this.filter.frequency);
        this.QEnv.setAudioParam(this.filter.Q);
        this.gainEnv.setAudioParam(this.filter.gain);
    }
  }

  getInput() {
    return this.filter;
  }

  connect(audioNode) {
    this.filter.connect(audioNode);
  }
}
