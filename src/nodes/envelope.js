import {Node} from './node.js';
import {evalExpr} from './util.js';

export class Envelope extends Node {
  constructor(ac, args) {
    super(ac, args);
    this.modulators = [];
    this.audioParams = [];
    this._endTime = 0;
  }

  addModulator(node) {
    this.modulators.push(node);
  }

  setAudioParam(audioParams) {
    this.audioParams.push(audioParams);
    this.modulators.forEach(x => x.connect(audioParams));
  }

  update(value, time) {
    this.audioParams.forEach(x => x.setValueAtTime(value, time));
  }

  get endTime() {
    return this._endTime;
  }
}

export class FrEnvelope extends Envelope {
  constructor(ac, args) {
    super(ac, args);
    this.expression = args[0];
  }

  stop(time) {
    this._endTime = time;
  }

  frequency(start, time, end, endTime) {
    this.update(evalExpr(this.expression, {f: start}), time);
  }
}

export class LvEnvelope extends Envelope {
  constructor(ac, args) {
    super(ac, args);
    this.expression = args[0];
  }

  start(time) {
    this.update(evalExpr(this.expression, {y: 0.75}), time);
  }

  stop(time) {
    this._endTime = time;
  }

  frequency(start, time, end, endTime) {
  }
}

export class AdsrEnvelope extends Envelope {
  constructor(ac, args) {
    super(ac, args);
    this.level = args[0];
    this.attack = args[1];
    this.decay = args[2];
    this.sustain = args[3];
    this.release = args[4];
  }

  start(time, endTime) {
    this.update(evalExpr(this.expression, {y: 0.75}), time);
  }

  stop(time) {
    this._endTime = time;
  }

  frequency(start, time, end, endTime) {
  }
}
