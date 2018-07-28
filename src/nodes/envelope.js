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

  setValueAtTime(value, time) {
    this.audioParams.forEach(x => x.setValueAtTime(value, time));
  }

  exponentialRampToValueAtTime(value, time) {
    this.audioParams.forEach(x => x.exponentialRampToValueAtTime(value, time));
  }

  cancelScheduledValues(time) {
    this.audioParams.forEach(x => x.cancelScheduledValues(time));
  }

  stop(time) {
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

  frequency(start, time, end, endTime, param) {
    this.setValueAtTime(evalExpr(this.frequecyExpr, {
      ...param,
      f: start
    }), time);
    this.exponentialRampToValueAtTime(evalExpr(this.frequecyExpr, {
      ...param,
      f: end
    }), endTime)
  }
}

export class LvEnvelope extends Envelope {
  constructor(ac, args) {
    super(ac, args);
    this.levelExpr = args[0];
  }

  start(time, param) {
    this.setValueAtTime(evalExpr(this.levelExpr, param), time);
  }

  setParam(param, time) {
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

  start(time, param) {
    this.startTime = time; // XXX
    this.level = evalExpr(this.levelExpr, param);
    this.attack = clamp(0, Infinity, evalExpr(this.attackExpr, param) * 0.001);
    this.decay = clamp(0, Infinity, evalExpr(this.decayExpr, param) * 0.001);
    this.sustain = clamp(0, 1, evalExpr(this.sustainExpr, param));
    this.release = clamp(0, Infinity, evalExpr(this.releaseExpr, param) * 0.001);

    this.setValueAtTime(0, time);
    this.exponentialRampToValueAtTime(this.level, time + this.attack);
    this.exponentialRampToValueAtTime(this.level * this.sustain, time + this.attack + this.decay);
  }

  stop(time, param) {
    this._endTime = time + this.release;

    this.cancelScheduledValues(time);
    if (time <= this.startTime + this.attack) {
      //this.exponentialRampToValueAtTime(this.level *
    }
  }
}


function clamp(min, max, val) {
  return Math.max(min, Math.min(max, val));
}
