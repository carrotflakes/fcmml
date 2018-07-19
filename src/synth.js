import {SimpleOscillator, Gain} from './nodes.js';

export class Synth {
  constructor(model) {
    this.model = model;
  }

  note(ac, destination, opt) {
    const nodes = [];
    nodes.push(new SimpleOscillator(ac, destination));
    const note = new Note(opt, nodes);
    return note;
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

export class Note {
  constructor(opt, allNodes) {
    this.allNodes = allNodes;
    this.roots = [];
    this.releaseTime = Infinity;
    for (const node of this.allNodes) {
      node.start(opt.startTime); // TODO delay
      node.stop(opt.endTime);
      node.frequency(opt.frequency, opt.startTime, opt.frequencyTo, opt.endTime);
    }
    //this.releaseTime = 0;
    //this.releaseTime = Math.max(this.releaseTime, releaseTime);
  }

  ended() {
    return false;
  }

  tempo(time, spb) {
  }

  setParam(name, value, time) {
  }
}
