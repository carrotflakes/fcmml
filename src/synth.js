import {Node, SimpleOscillator, Gain, Envelope, FrEnvelope, LvEnvelope} from './nodes';

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
    w: {type: 'variable', identifier: 'w'},
    x: {type: 'variable', identifier: 'x'},
    y: {type: 'variable', identifier: 'y'},
    z: {type: 'variable', identifier: 'z'},
  };
  const allNodes = [];
  for (const {identifier, expression} of assignments) {
    bindings[identifier] = buildExpression(expression, bindings, allNodes, ac);
  }
  bindings[''] = buildExpression(body, bindings, allNodes, ac);
  // TODO collectComposedNodes
  return [bindings[''], allNodes];
}

function buildExpression(model, bindings, allNodes, ac) {
  let node;
  switch (model.type) {
    case 'call':
      const args = model.arguments.map(x => buildExpression(x, bindings, allNodes, ac));
      switch (model.func) {
        case 'sin':
        case 'sqr':
        case 'saw':
        case 'tri':
          node = new SimpleOscillator(ac, model.func, args);
          allNodes.push(node);
          return node;
        case 'gain':
          node = new Gain(ac, args);
          allNodes.push(node);
          return node;
        case 'fr':
        case 'lv':
        case 'adsr':
          node = new {
            fr: FrEnvelope,
            lv: LvEnvelope,
            adsr: null,
          }[model.func](ac, args);
          allNodes.push(node);
          return node;
        case '<-':
          const rightNodes = collectComposedNodes(args[1]);
          if (args[0] instanceof Envelope) {
            // Envelope<-Node => Envelope
            for (const node of rightNodes) {
              args[0].addModulator(node);
            }
          } else {
            // Node<-Node => Node
            for (const node of rightNodes) {
              node.connect(args[0].getInput());
            }
          }
          return args[0];
        case '+':
        case '-':
        case '*':
        case '/':
          return {
            type: 'call',
            func: model.func,
            arguments: args
          }
      }
      break;
    case 'identifier':
      return bindings[model.identifier];
    case 'value':
      return model;
  }
}

function collectComposedNodes(expr) {
  if (expr.call === 'call' && expr.func === '+') {
    return [...collectComposedNodes(expr.arguments[0]), ...collectComposedNodes(expr.arguments[1])];
  } else if (expr instanceof Node) {
    return [expr];
  }
}

export class Note {
  constructor(opt, rootNode, allNodes) {
    this.endBeat = opt.endBeat;
    this.param = opt.param;
    this.rootNode = rootNode;
    this.allNodes = allNodes;
    for (const node of this.allNodes) {
      node.start(opt.startTime); // TODO delay
      node.frequency(opt.frequency, opt.startTime, opt.frequencyTo, opt.endTime);
    }
    this.stoped = false;
  }

  stop(time) {
    for (const node of this.allNodes) {
      node.stop(time);
    }
    this.endTime = Math.max(...this.allNodes.filter(n => n instanceof Envelope).map(n => n.endTime));
    // TODO fix ↑
    this.allNodes.forEach(n => n.forceStop(this.endTime));
    this.stoped = true;
  }

  forceStop() {
    this.allNodes.forEach(node => node.forceStop());
  }

  ended(time) {
    return this.endTime <= time;
  }

  tempo(time, spb) {
  }

  setParam(param, time) {
    const overridedParam = {
      ...param,
      ...this.param
    };
    this.allNodes.forEach(node => {
      node.setParam(overridedParam, time);
    });
  }
}
