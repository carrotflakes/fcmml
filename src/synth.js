import {SimpleOscillator, Gain} from './nodes.js';

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

function build(expression) {
  switch (expression.type) {
    case 'func':
      break;
    case 'identifier':
      break;
    case 'func':
      break;
  }
}

export class Osc {
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
