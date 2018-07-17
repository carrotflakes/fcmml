export class Synth {
  constructor(model) {
    this.model = model;
  }

  makeOsc(ac, destination) {
    const nodes = [];
    nodes.push(new SimpleOscillator(ac, destination));
    const osc = new Osc(nodes);
    return osc;
  }
}

class Osc {
  constructor(allNodes) {
    this.allNodes = allNodes;
    this.roots = [];
    this.releaseTime = Infinity;
  }

  start(time) {
    for (const node of this.allNodes) {
      node.start(time); // TODO delay
    }
  }

  stop(time) {
    for (const node of this.allNodes) {
      node.stop(time);
    }
    //this.releaseTime = 0;
    //this.releaseTime = Math.max(this.releaseTime, releaseTime);
  }

  frequency(start, time, end, endTime) {
    for (const node of this.allNodes) {
      node.frequency(start, time, end, endTime);
    }
  }

  setParam(name, value, time) {
  }
}

class SimpleOscillator {
  constructor(ac, destination) {
    this.osc = ac.createOscillator();
    this.osc.type = {sin: 'sine', sqr: 'square', saw: 'sawtooth', tri: 'triangle'}['sqr'];
    this.osc.connect(destination);
  }

  start(time) {
    this.osc.start(time); // TODO delay
  }

  stop(time) {
    this.osc.stop(time);
  }

  frequency(start, time, end, endTime) {
    this.osc.frequency.setValueAtTime(start, time);
    this.osc.frequency.exponentialRampToValueAtTime(end, endTime);
  }

  setParam(name, value, time) {
    switch(name) {

        // 
    }
  }

  setParamTo(name, value, time) {
  }
}

class Envelope {
}

export class Mixer {
  constructor(ac, destination) {
    this.gain = ac.createGain();
    this.panner = ac.createStereoPanner();
    this.gain.connect(this.panner);
    this.panner.connect(destination);
  }

  start(time) {
  }

  stop(time) {
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
