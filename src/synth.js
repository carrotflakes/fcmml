import {SimpleOscillator, Gain, FrEnvelope} from './nodes.js';

export class Synth {
  constructor(model) {
    this.model = model;
  }

  note(ac, destination, opt) {
    const rootNode = build(this.model, ac);
    rootNode.connect(destination);
    return new Note(opt, rootNode);
  }
}

function build(model, ac) {
  const {assignments, body} = model;
  const bindings = {
    f: {type: 'variable', identifier: 'f'},
    v: {type: 'variable', identifier: 'v'},
    w: {type: 'variable', identifier: 'w'},
    x: {type: 'variable', identifier: 'x'},
    z: {type: 'variable', identifier: 'z'},
  };
  const newAssignments = [...assignments, {identifier: '', expression: body}];
  for (const {identifier, expression} of newAssignments) {
    bindings[identifier] = buildExpression(expression, bindings, ac);
  }
  return bindings[''];
}

function buildExpression(model, bindings, ac) {
  switch (model.type) {
    case 'call':
      const args = model.arguments.map(x => buildExpression(x, bindings, ac));
      switch (model.func) {
        case 'sin':
        case 'sqr':
        case 'saw':
        case 'tri':
          return new SimpleOscillator(ac, model.func, args);
          break;
        case 'gain':
          return new Gain(ac, args);
          break;
        case 'fr':
          return new FrEnvelope(ac, args);
          break;
        case 'lv':
          //return new LvEnvelope(ac, args);
          break;
        case 'adsr':
          // TODO
          break
        case '<-':
          // Envelope<-Node => Envelope
          //args[1].connect(args[0].getInput());
          // Node<-Node => Node
          args[1].connect(args[0].getInput());
          break;
        case '+':
        case '-':
        case '*':
        case '/':
          return {
            type: 'func',
            func: model.func,
            arguments: args
          }
          break;
      }
      break;
    case 'identifier':
      return bindings[model.identifier];
    case 'value':
      return model;
  }
}

export class Note {
  constructor(opt, rootNodes) {
    this.rootNode = rootNodes;
    this.allNodes = this.rootNode.collectNodes();
    this.releaseTime = Infinity;
    for (const node of this.allNodes) {
      node.start(opt.startTime, opt.endTime); // TODO delay
      node.frequency(opt.frequency, opt.startTime, opt.frequencyTo, opt.endTime);
    }
    //this.releaseTime = 0;
    //this.releaseTime = Math.max(this.releaseTime, releaseTime);
  }

  ended(time) {
    return false;
  }

  tempo(time, spb) {
  }

  setParam(name, value, time) {
  }
}
