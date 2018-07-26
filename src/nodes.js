class Node {
  setParam(name, value, time) {
  }
}

export class SimpleOscillator extends Node {
  constructor(ac, type, args) {
    super(ac, args);
    this.osc = ac.createOscillator();
    this.osc.type = {sin: 'sine', sqr: 'square', saw: 'sawtooth', tri: 'triangle'}[type];
    this.env = args[0];
    this.env.setAudioParam(this.osc.frequency);
    this.stack = []; // TODO
  }

  start(time, endTime) {
    this.osc.start(time); // TODO delay
    this.osc.stop(endTime);
  }

  frequency(start, time, end, endTime) {
    //this.osc.frequency.setValueAtTime(start, time);
    //this.osc.frequency.exponentialRampToValueAtTime(end, endTime);
  }

  setParam(name, value, time) {
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


  setParam(name, value, time) {
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


class Envelope extends Node {
  constructor(ac, args) {
    super(ac, args);
    this.audioParams = [];
  }

  setAudioParam(audioParams) {
    this.audioParams.push(audioParams);
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
    this.audioParams.forEach(x => x.setValueAtTime(start, time));
  }
}

export class LvEnvelope extends Envelope {
  constructor(ac, args) {
    super(ac, args);
    this.expression = args[0];
  }

  start(time, endTime) {
  }

  frequency(start, time, end, endTime) {
    this.audioParams.forEach(x => x.setValueAtTime(start, time));
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

  setParam(name, value, time) {
    switch (name) {
      case 'volume':
        this.gain.gain.setValueAtTime(volumeToGainValue(value), time);
        break;
      case 'pan':
        this.panner.pan.setValueAtTime(value * 2 - 1, time);
        break;
    }
  }

  getInput() {
    return this.gain;
  }

  connect(audioNode) {
    this.panner.connect(audioNode);
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
