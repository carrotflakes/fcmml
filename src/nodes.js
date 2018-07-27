export class Node {
  setParam(param, time) {
  }

  forceStop() {
  }
}

export class SimpleOscillator extends Node {
  constructor(ac, type, args) {
    super(ac, args);
    this.osc = ac.createOscillator();
    this.osc.type = {sin: 'sine', sqr: 'square', saw: 'sawtooth', tri: 'triangle'}[type];
    this.env = args[0];
    this.env.setAudioParam(this.osc.frequency);
  }

  start(time, endTime) {
    this.osc.start(time); // TODO delay
    this.osc.stop(endTime);
  }

  forceStop() {
    this.osc.stop();
  }

  frequency(start, time, end, endTime) {
    //this.osc.frequency.setValueAtTime(start, time);
    //this.osc.frequency.exponentialRampToValueAtTime(end, endTime);
  }

  setParam(param, time) {
    switch(name) {

        // 
    }
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

  start(time, endTime) {
  }

  frequency(start, time, end, endTime) {
  }


  setParam(param, time) {
    switch(name) {

        // 
    }
  }

  getInput() {
    return this.gain;
  }

  connect(audioNode) {
    this.gain.connect(audioNode);
  }
}


export class Envelope extends Node {
  constructor(ac, args) {
    super(ac, args);
    this.modulators = [];
    this.audioParams = [];
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
}

export class FrEnvelope extends Envelope {
  constructor(ac, args) {
    super(ac, args);
    this.expression = args[0];
  }

  start(time, endTime) {
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

  start(time, endTime) {
    this.update(evalExpr(this.expression, {v: 0.75}), time);
  }

  frequency(start, time, end, endTime) {
  }
}


export class Mixer {
  constructor(ac) {
    this.gain = ac.createGain();
    this.panner = ac.createStereoPanner();
    this.gain.connect(this.panner);
  }

  start(time) {
  }

  setParam(param, time) {
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


function evalExpr(expr, context) {
  switch (expr.type) {
    case 'call':
      const args = expr.arguments.map(x => evalExpr(x, context));
      switch (expr.func) {
        case '+':
          if (args.length === 2) {
            return args[0] + args[1];
          }
        case '-':
          if (args.length === 1) {
            return -args[0];
          } else if (args.length === 2) {
            return args[0] - args[1];
          }
        case '*':
          if (args.length === 2) {
            return args[0] * args[1];
          }
        case '/':
          if (args.length === 2) {
            return args[0] / args[1];
          }
      }
      break;
    case 'variable':
      return context[expr.identifier];
    case 'value':
      return expr.value;
  }
}


function volumeToGainValue(v) {
  if (v <= 0) {
    return 0;
  }
  return dbToGainValue(-(1 - v) * 3 * 16);
}

function dbToGainValue(v) {
  return Math.exp(v * Math.LN10 / 20);
}
