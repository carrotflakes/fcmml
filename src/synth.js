import {
  Node,
  SimpleOscillator,
  Gain,
  Envelope,
  FrEnvelope,
  LvEnvelope,
  AdsrEnvelope,
  PercEnvelope,
  Filter,
} from './nodes';
import {interpolateExponentialRamp} from './nodes/util.js';

export class Synth {
  constructor(model) {
    this.model = model;
  }

  note(ac, destination, opt) {
    const [rootNode, allNodes] = build(this.model, ac);
    const rootNodes = collectComposedNodes(rootNode);
    rootNodes.forEach(n => n.connect(destination));
    return new Note(opt, rootNodes, allNodes);
  }
}

function build(model, ac) {
  const {assignments, body} = model;
  const bindings = {
    bps: {type: 'variable', identifier: 'bps'},
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
        case 'perc':
          node = new {
            fr: FrEnvelope,
            lv: LvEnvelope,
            adsr: AdsrEnvelope,
            perc: PercEnvelope,
          }[model.func](ac, args);
          allNodes.push(node);
          return node;
        case 'lpf':
        case 'hpf':
        case 'bpf':
        case 'ncf':
        case 'apf':
        case 'hsf':
        case 'lsf':
        case 'pkf':
          node = new Filter(ac, model.func, args);
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
        default:
          throw new Error('Invalid func: ' + JSON.stringify(model));
      }
      break;
    case 'identifier':
      if (!(model.identifier in bindings)) {
        throw new Error('Identifier not found: ' + JSON.stringify(model.identifier));
      }
      return bindings[model.identifier];
    case 'value':
      return model;
  }
}

function collectComposedNodes(expr) {
  if (expr.type === 'call' && expr.func === '+') {
    return [...collectComposedNodes(expr.arguments[0]), ...collectComposedNodes(expr.arguments[1])];
  } else if (expr instanceof Node) {
    return [expr];
  }
}

export class Note {
  constructor(opt, rootNodes, allNodes) {
    this.id = opt.id;
    this.startTime = opt.startTime;
    this.endTime = opt.endTime;
    this.endBeat = opt.endBeat;
    this.param = opt.param;
    this.lastFrequency = null;
    this.rootNodes = rootNodes;
    this.allNodes = allNodes;
    this.stoped = false;

    for (const node of this.allNodes) {
      node.start(opt.startTime, this);
    }
  }

  frequency(start, startTime, end, endTime) {
    this.lastFrequency = end;
    const clampedEndTime = clamp(0, this.endTime, endTime);
    const clampedEnd = interpolateExponentialRamp(start, end, (clampedEndTime - startTime) / (endTime - startTime));
    for (const node of this.allNodes) {
      node.frequency(start, startTime, clampedEnd, clampedEndTime, this);
    }
  }

  stop(time) {
    for (const node of this.allNodes) {
      node.stop(time, this);
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
    this.param = {
      ...this.param,
      ...param
    };
    this.allNodes.forEach(node => {
      node.setParam(this.param, time, this);
    });
  }
}

function clamp(min, max, val) {
  return Math.max(min, Math.min(max, val));
}
