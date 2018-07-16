export class Synth {
  constructor(model) {
    this.model = model;
  }

  makeOsc(ac, destination) {
    const nodes = [];
    const osc = Osc(nodes);
    return osc;
  }
}

class Osc {

  constructor() {
    this.allNodes = [];
  }

  start(time) {
    this.osc.start(time); // TODO delay
  }

  stop(time) {
    this.osc.stop(time);
  }

  setParam(name, value, time) {
    switch(name) {

        // 
    }
  }
}

class SimpleOscillator {

  constructor(ac, destination) {
    this.osc = ac.createOscillator();
    this.osc.type = {sin: "sine", sqr: "square", saw: "sawtooth", tri: "triangle"}["sine"];
    this.osc.connect(destination);
  }

  start(time) {
    this.osc.start(time); // TODO delay
  }

  stop(time) {
    this.osc.stop(time);
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
