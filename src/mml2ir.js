export function mml2ir(commands) {
  const events = [];
  const newTrack = () => ({
    volume: 1.0,
    pan: 0.5,
    w: 0.0,
    x: 0.0,
    z: 0.0,
  });
  let tempo = 120;
  const tracks = {
    0: newTrack()
  };
  for (const event of serialize(commands)) {
    const {type, track, beat, number} = event;
    if (track !== void(0) && !(track in tracks))
      tracks[track] = newTrack();
    const trackParams = tracks[track];
    switch (type) {
      case 'volume':
        events.push({
          type: 'param',
          track,
          beat,
          name: 'volume',
          value: trackParams.volume = number / 64
        });
        break;
      case 'relativeVolume':
        events.push({
          type: 'param',
          track,
          beat,
          name: 'volume',
          value: trackParams.volume = clip(0, 1, trackParams.volume + number / 64)
        });
        break;
      case 'pan':
        events.push({
          type: 'param',
          track,
          beat,
          name: 'pan',
          value: trackParams.pan = number / 64
        });
        break;
      case 'relativePan':
        events.push({
          type: 'param',
          track,
          beat,
          name: 'pan',
          value: trackParams.pan = clip(0, 1, trackParams.pan + number / 64)
        });
        break;
      case 'synthParam':
        events.push({
          type: 'param',
          track,
          beat,
          name: event.name,
          value: trackParams[event.name] = number / 1024
        });
        break;
      case 'relativeSynthParam':
        events.push({
          type: 'param',
          track,
          beat,
          name: event.name,
          value: trackParams[event.name] = clip(0, 1, trackParams[event.name] + number / 1024)
        });
        break;
      case 'tempo':
        events.push({
          type: 'tempo',
          beat,
          tempo: tempo = event.number
        });
        break;
      case 'relativeTempo':
        events.push({
          type: 'tempo',
          beat,
          tempo: tempo = clip(1, 511, tempo + event.number)
        });
        break;
      default:
        events.push(event);
        break;
    }
  }
  events.push({
    type: 'meta',
    metaType: 'endOfMusic',
    beat: events[events.length - 1].beat
  });
  return events;
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
    transpose: 0,
  };
  const parallelCommands = [];
  for (const command of commands) {
    while (parallelCommands.length > 0 && parallelCommands[0].beat <= context.beat) {
      const command = parallelCommands.shift();
      if (command.type !== 'end')
        yield command;
    }
    switch (command.type) {
      case 'macroDefinition':
        {
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
        }
        break;
      case 'macro':
        if (!(command.identifier in context.macros))
          throw new Error(`Macro ${command.identifier} is not defined.`);
        {
          const {parameters, commands} = context.macros[command.identifier];
          const boundMacros = {...context.macros};
          // TODO parameters, arguments 長さチェック
          for (let i = 0; i < parameters.length; ++i) {
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
        }
        break;
      case 'track':
        context.track = command.number;
        break;
      case 'note':
        {
          const {pitch, pitchTo, length, slur} = command;
          const duration = length2duration(length || context.length);
          const notenum = pitch2notenum(pitch, context);
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
            notenum,
            notenumTo,
            duration,
            gatetime,
            velocity: context.velocity
          };
          context.beat += duration;
        }
        break;
      case 'polyphonicNote':
        {
          const duration = length2duration(command.length || context.length);
          yield {...command, beat: context.beat};
          context.beat += duration;
          // TODO
        }
        break;
      case 'rest':
        {
          const duration = length2duration(command.length || context.length);
          context.beat += duration;
        }
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
        for (let i = 0; i < times; ++i) {
          for (const command of wholeCommands) {
            if (command.type === 'pipe') {
              if (i === times - 1) {
                context.beat += command.beat * ratio;
                break outer;
              }
              break;
            }
            parallelCommands.push({
              ...command,
              beat: context.beat + command.beat * ratio
            });
          }
          context.beat += trueDuration;
        }
        parallelCommands.sort((x, y) => x.beat - y.beat);
        break;
      case 'parallel':
        parallelCommands.push(...serialize([command.command], {...context}));
        parallelCommands.sort((x, y) => x.beat - y.beat);
        break;
      default:
        yield {...command, track: context.track, beat: context.beat};
        break;
    }
  }
  yield* parallelCommands;
  yield {type: 'end', beat: context.beat};
}

function length2duration(length) {
  // TODO: validation
  let duration = 1 / length.number;
  duration *= 2 - Math.pow(0.5, length.dots);
  return duration;
}

function calcGatetime(context, duration) {
  return Math.max(0.00001, duration * context.quantize - context.absoluteQuantize * 4);
}

function pitch2notenum(pitch, context) {
  const {octave} = context;
  return {c: 0, d: 2, e: 4, f: 5, g: 7, a: 9, b: 11}[pitch.name] + pitch.accidental + (octave + 1) * 12 + context.transpose;
}

function clip(min, max, val) {
  return Math.max(min, Math.min(max, val));
}
