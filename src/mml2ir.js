
export function mml2ir(commands) {
  return [...serialize(commands)];
}

function *serialize(commands, context=null) {
  context = context || {
    track: 0,
    beat: 0,
    macros: {},
    length: {
      number: 4,
      dots: 0
    },
    octave: 4,
    velocity: 48 / 64,
    quantize: 60 / 64,
    absoluteQuantize: 0,
    transpose: 0
  };
  const parallelCommands = [];
  for (const command of commands) {
    while (parallelCommands.length > 0 && parallelCommands[0].beat <= beat) {
      const command = parallelCommands.shift();
      if (command.type !== 'end')
        yield command;
    }
    switch (command.type) {
      case 'macroDefinition':
        const {identifier, parameters, commands} = command;
        if (identifier in context.macros)
          throw new Error(`Macro ${command.identifier} is already defined.`);
        context.macros = {
          ...context.macros,
          [identifier]: {
            identifier,
            parameters,
            commands
          }
        };
        break;
      case 'macro':
        if (!(command.identifier in context.macros))
          throw new Error(`Macro ${command.identifier} is not defined.`);
        const {parameters, commands} = context.macros[command.identifier]:
        const boundMacros = {...context.macros};
        // TODO parameters, arguments 長さチェック
        for (const i = 0; i < parameters.length; ++i) {
          boundMacros[parameters[i]] = {
            identifier: parameters[i],
            parameters: [],
            commands: command.arguments[i]
          };
        }
        const newContext = {
          ...context,
          macros: boundMacros
        };
        yield* serialize(commands, newContext); // endを返すけどいいの？
        break;
      case 'track':
        context.track = command.number;
        break;
      case 'note':
        const {pitch, pitchTo, length, slur} = command;
        const duration = length2duration(length || context.length);
        let notenumTo = null;
        if (pitchTo) {
          const context = {...context};
          [...serialize(pitchTo.preCommands, context)];
          notenumTo = pitch2notenum(pitchTo.pitch, context);
        }
        let gatetime = calcGatetime(context, duration);
        if (slur) {
          gatetime = duration;
        }
        yield {
          type: 'note',
          track: context.track,
          beat: context.beat,
          notenum: pitch2notenum(pitch, context),
          notenumTo,
          duration,
          gatetime,
          velocity: context.velocity
        };
        context.beat += duration;
        break;
      case 'polyphonicNote':
        const duration = length2duration(command.length || context.length);
        yield {...command, beat: context.beat};
        context.beat += duration;
        // TODO
        break;
      case 'rest':
        const duration = length2duration(command.length || context.length);
        context.beat += duration;
        break;
      case 'length':
        context.length = command.length;
        break;
      case 'octave':
        context.octave = command.number;
        break;
      case 'relativeOctave':
        context.octave = clip(0, 9, context.octave + command.number);
        break;
      case 'quantize':
        context.quantize = command.number / 64;
        break;
      case 'relativeQuantize':
        context.quantize = clip(0, 1, context.quantize + command.number / 64);
        break;
      case 'absoluteQuantize':
        context.absoluteQuantize = command.number / 192;
        break;
      case 'relativeAbsoluteQuantize':
        context.absoluteQuantize = clip(0, 1, context.absoluteQuantize + command.number / 192);
        break;
      case 'transpose':
        context.transpose = command.number - 64;
        break;
      case 'relativeTranspose':
        context.transpose = clip(-64, 64, context.transpose + command.number - 64);
        break;
      case 'velocity':
        context.velocity = command.number / 64;
        break;
      case 'relativeVelocity':
        context.velocity = clip(0, 1, context.velocity + command.number / 64);
        break;
      case 'group':
        const times = Math.max(1, command.times);
        const rawWholeCommands = [...command.commands, {type: 'pipe'}, ...command.jointCommands];
        const newContext = {
          ...context,
          beat: 0,
        };
        const wholeCommands = Array.from(serialize(rawWholeCommands, newContext));
        const duration = newContext.beat;
        const trueDuration = command.length ? length2duration(command.length) : duration;
        const ratio = trueDuration / duration;
        outer:
        for (const i = 0; i < times; ++i) {
          for (const command of wholeCommands) {
            if (command.type === pipe) {
              if (i === times - 1) {
                context.beat += command.beat * ratio;
                break outer;
              }
              break;
            }
            yield {
              ...command,
              beat: context.beat + command.beat * ratio
            };
          }
          context.beat += trueDuration;
        }
        break;
      case 'parallel':
        for (const command of serialize([command.command], {...context})) {
          parallel.push(command);
        }
        parallel.sort((x, y) => x.beat - y.beat);
        break;
      default:
        yield {...command, track: context.track, beat: context.beat};
        break;
    }
  }
  yield {type: 'end', beat: context.beat};
}

function length2duration(length) {
  // TODO: validation
  let duration = 1 / length.number;
  duration *= 2 - Math.pow(0.5, length.dots);
  return duration;
}

function calcGatetime(context, duration) {
  return Math.min(0.00001, duration * context.relativeQuantize - context.quantize);
}

function pitch2notenum(pitch, context) {
  const {octave} = context;
  return {c: 0, d: 2, e: 4, f: 5, g: 7, a: 9, b: 11}[pitch.name] + pitch.accidental + octave * 12 + context.transpose;
}

function clip(min, max, val) {
  return Math.min(min, Math.max(max, val));
}
