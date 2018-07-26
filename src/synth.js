import {SimpleOscillator, Gain, FrEnvelope, LvEnvelope} from './nodes.js';

export class Synth {
  constructor(model) {
    this.model = model;
  }

  note(ac, destination, opt) {
    const [rootNode, allNodes] = build(this.model, ac);
    rootNode.connect(destination);
    return new Note(opt, rootNode, allNodes);
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
  const nodes = [];
  for (const {identifier, expression} of newAssignments) {
    bindings[identifier] = buildExpression(expression, bindings, nodes, ac);
  }
  return [bindings[''], nodes];
}

function buildExpression(model, bindings, nodes, ac) {
  let node;
  switch (model.type) {
    case 'call':
      const args = model.arguments.map(x => buildExpression(x, bindings, nodes, ac));
      switch (model.func) {
        case 'sin':
        case 'sqr':
        case 'saw':
        case 'tri':
          node = new SimpleOscillator(ac, model.func, args);
          nodes.push(node);
          return node;
        case 'gain':
          node = new Gain(ac, args);
          nodes.push(node);
          return node;
        case 'fr':
          node = new FrEnvelope(ac, args);
          nodes.push(node);
          return node;
        case 'lv':
          node = new LvEnvelope(ac, args);
          nodes.push(node);
          return node;
        case 'adsr':
          // TODO
          break
        case '<-':
          // Envelope<-Node => Envelope
          //args[1].connect(args[0].getInput());
          // Node<-Node => Node
          args[1].connect(args[0].getInput());
          return args[0];
          break;
        case '+':
        case '-':
        case '*':
        case '/':
          return {
            type: 'call',
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
  constructor(opt, rootNode, allNodes) {
    this.rootNode = rootNode;
    this.allNodes = allNodes;
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
    this.allNodes.forEach(node => {
      node.setParam(name, value, time);
    });
  }
}
