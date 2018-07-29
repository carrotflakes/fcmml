import {Node} from './node.js';
import {evalExpr, interpolateExponentialRamp} from './util.js';

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

  setValueAtTime(value, time) {
    this.audioParams.forEach(x => x.setValueAtTime(value, time));
  }

  exponentialRampToValueAtTime(value, time) {
    this.audioParams.forEach(x => x.exponentialRampToValueAtTime(value, time));
  }

  cancelScheduledValues(time) {
    this.audioParams.forEach(x => x.cancelScheduledValues(time));
  }

  stop(time, note) {
    this._endTime = time;
  }

  get endTime() {
    return this._endTime;
  }
}

export class FrEnvelope extends Envelope {
  constructor(ac, args) {
    super(ac, args);
    this.frequecyExpr = args[0];
  }

  frequency(start, time, end, endTime, note) {
    this.setValueAtTime(evalExpr(this.frequecyExpr, {
      ...note.param,
      f: start
    }), time);
    this.exponentialRampToValueAtTime(evalExpr(this.frequecyExpr, {
      ...note.param,
      f: end
    }), endTime)
  }
}

export class LvEnvelope extends Envelope {
  constructor(ac, args) {
    super(ac, args);
    this.levelExpr = args[0];
  }

  start(time, note) {
    this.setValueAtTime(evalExpr(this.levelExpr, note.param), time);
  }

  setParam(param, time, note) {
    this.setValueAtTime(evalExpr(this.levelExpr, param), time);
  }
}

export class AdsrEnvelope extends Envelope {
  constructor(ac, args) {
    super(ac, args);
    this.levelExpr = args[0];
    this.attackExpr = args[1];
    this.decayExpr = args[2];
    this.sustainExpr = args[3];
    this.releaseExpr = args[4];
  }

  start(time, note) {
    const param = note.param;
    this.level = evalExpr(this.levelExpr, param);
    this.attack = clamp(TIME_EPS, Infinity, evalExpr(this.attackExpr, param) * 0.001);
    this.decay = clamp(TIME_EPS, Infinity, evalExpr(this.decayExpr, param) * 0.001);
    this.sustain = clamp(GAIN_EPS, 1, evalExpr(this.sustainExpr, param));
    this.release = clamp(TIME_EPS, Infinity, evalExpr(this.releaseExpr, param) * 0.001);

    this.setValueAtTime(GAIN_EPS, time);
    this.exponentialRampToValueAtTime(this.level, time + this.attack);
    this.exponentialRampToValueAtTime(this.level * this.sustain, time + this.attack + this.decay);
  }

  stop(time, note) {
    const param = note.param;
    this._endTime = time + this.release;

    this.cancelScheduledValues(time);
    if (time <= note.startTime + this.attack) {
      const v = this.level * interpolateExponentialRamp(GAIN_EPS, 1, (time - note.startTime) / this.attack);
      this.exponentialRampToValueAtTime(v, time);
    } else if (time < note.startTime + this.attack + this.decay) {
      const v = this.level * interpolateExponentialRamp(1, this.sustain, (time - note.startTime - this.attack) / this.decay);
      this.exponentialRampToValueAtTime(v, time);
    } else {
      this.setValueAtTime(this.level * this.sustain, time);
    }
    this.exponentialRampToValueAtTime(0 < this.level ? GAIN_EPS : -GAIN_EPS, this._endTime);
  }
}


function clamp(min, max, val) {
  return Math.max(min, Math.min(max, val));
}

const TIME_EPS = 0.0000001;
const GAIN_EPS = 0.01
