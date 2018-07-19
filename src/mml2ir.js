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
  let segnoExist = false;
  let lastBeat = 0;
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
          value: trackParams.volume = clamp(0, 1, trackParams.volume + number / 64)
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
          value: trackParams.pan = clamp(0, 1, trackParams.pan + number / 64)
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
          value: trackParams[event.name] = clamp(0, 1, trackParams[event.name] + number / 1024)
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
          tempo: tempo = clamp(1, 511, tempo + event.number)
        });
        break;
      case 'segno':
        if (!segnoExist) {
          events.push({
            type: 'meta',
            metaType: 'segno',
            beat,
          });
          segnoExist = true;
        }
        break;
      case 'end':
        lastBeat = event.beat;
        break;
      default:
        events.push(event);
        break;
    }
  }
  events.push({
    type: 'meta',
    metaType: 'endOfMusic',
    beat: lastBeat
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
    accidentals: {},
    timeRatio: 1
  };
  const parallelEvents = [];
  for (const command of commands) {
    while (parallelEvents.length > 0 && parallelEvents[0].beat <= context.beat) {
      const command = parallelEvents.shift();
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
          const originalMacros = context.macros;
          context.macros = boundMacros;
          yield* serialize(commands, context); // endを返すけどいいの？
          context.macros = originalMacros;
        }
        break;
      case 'track':
        context.track = command.number;
        break;
      case 'note':
        {
          const {pitch, pitchTo, length, slur} = command;
          const duration = length2duration(length, context.length) * context.timeRatio;
          const notenum = pitch2notenum(pitch, context);
          let notenumTo = null;
          if (pitchTo) {
            const newContext = {...context};
            [...serialize(pitchTo.preCommands, newContext)];
            notenumTo = pitch2notenum(pitchTo.pitch, newContext);
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
          const duration = length2duration(command.length, context.length) * context.timeRatio;
          let notenums = null;
          if (command.chord) {
            notenums = notenumsFromChord(command.chord, context);
          } else if (command.pitches) {
            notenums = notenumsFromPitches(command.pitches, context);
          }
          for (const notenum of notenums) {
            yield {
              type: 'note',
              track: context.track,
              beat: context.beat,
              notenum,
              notenumTo: null,
              duration,
              gatetime: calcGatetime(context, duration),
              velocity: context.velocity
            };
          }
          context.beat += duration;
        }
        break;
      case 'rest':
        {
          const duration = length2duration(command.length, context.length) * context.timeRatio;
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
        context.octave = clamp(0, 9, context.octave + command.number);
        break;
      case 'quantize':
        context.quantize = command.number / 64;
        break;
      case 'relativeQuantize':
        context.quantize = clamp(0, 1, context.quantize + command.number / 64);
        break;
      case 'absoluteQuantize':
        context.absoluteQuantize = command.number / 192;
        break;
      case 'relativeAbsoluteQuantize':
        context.absoluteQuantize = clamp(0, 1, context.absoluteQuantize + command.number / 192);
        break;
      case 'transpose':
        context.transpose = command.number - 64;
        break;
      case 'relativeTranspose':
        context.transpose = clamp(-64, 64, context.transpose + command.number - 64);
        break;
      case 'key':
        if (command.key) {
          context.accidentals = {
            'C': {},
            'Am': {},
            'G': {f: 1},
            'Em': {f: 1},
            'D': {f: 1, c: 1},
            'Bm': {f: 1, c: 1},
            'A': {f: 1, c: 1, g: 1},
            'F+m': {f: 1, c: 1, g: 1},
            'E': {f: 1, c: 1, g: 1, d: 1},
            'C+m': {f: 1, c: 1, g: 1, d: 1},
            'B': {f: 1, c: 1, g: 1, d: 1, a: 1},
            'G+m': {f: 1, c: 1, g: 1, d: 1, a: 1},
            'F+': {f: 1, c: 1, g: 1, d: 1, a: 1, e: 1},
            'D+m': {f: 1, c: 1, g: 1, d: 1, a: 1, e: 1},
            'C+': {f: 1, c: 1, g: 1, d: 1, a: 1, e: 1, b: 1},
            'A+m': {f: 1, c: 1, g: 1, d: 1, a: 1, e: 1, b: 1},
            'F': {b: -1},
            'Dm': {b: -1},
            'B-': {b: -1, e: -1},
            'Gm': {b: -1, e: -1},
            'E-': {b: -1, e: -1, a: -1},
            'Cm': {b: -1, e: -1, a: -1},
            'A-': {b: -1, e: -1, a: -1, d: -1},
            'Fm': {b: -1, e: -1, a: -1, d: -1},
            'D-': {b: -1, e: -1, a: -1, d: -1, g: -1},
            'B-m': {b: -1, e: -1, a: -1, d: -1, g: -1},
            'G-': {b: -1, e: -1, a: -1, d: -1, g: -1, c: -1},
            'E-m': {b: -1, e: -1, a: -1, d: -1, g: -1, c: -1},
            'C-': {b: -1, e: -1, a: -1, d: -1, g: -1, c: -1, f: -1},
            'A-m': {b: -1, e: -1, a: -1, d: -1, g: -1, c: -1, f: -1},
          }[command.key];
        } else if (command.pitchs) {
          context.accidentals = {};
          for (const pitch of command.pitchs) {
            context.accidentals[pitch.name] = pitch.accidental;
          }
        }
        break;
      case 'velocity':
        context.velocity = command.number / 64;
        break;
      case 'relativeVelocity':
        context.velocity = clamp(0, 1, context.velocity + command.number / 64);
        break;
      case 'group':
        const times = Math.max(1, command.times);
        const rawWholeCommands = [...command.commands, ...command.jointCommands];
        let newContext = {
          ...context,
          beat: 0,
          timeRatio: 1,
        };
        const wholeCommands = Array.from(serialize(rawWholeCommands, newContext));
        const duration = newContext.beat;
        const trueDuration = (command.length.number !== null ? length2duration(command.length, {}) : duration) * context.timeRatio;
        const timeRatio = trueDuration / duration;
        newContext = {
          ...context,
          timeRatio
        };
        for (let i = 0; i < times; ++i) {
          parallelEvents.push(...serialize(command.commands, newContext));
          if (i < times - 1)
            parallelEvents.push(...serialize(command.jointCommands, newContext));
        }
        context.beat = newContext.beat;
        parallelEvents.sort((x, y) => x.beat - y.beat);
        break;
      case 'parallel':
        parallelEvents.push(...serialize([command.command], {...context}));
        parallelEvents.sort((x, y) => x.beat - y.beat);
        break;
      default:
        yield {...command, track: context.track, beat: context.beat};
        break;
    }
  }
  yield* parallelEvents;
  yield {type: 'end', beat: context.beat};
}

function length2duration(length, length2) {
  // TODO: validation
  let number, dots;
  if (length.number !== null) {
    number = length.number;
    dots = length.dots;
  } else {
    number = length2.number;
    if (length.dots) {
      dots = length.dots;
    } else {
      dots = length2.dots;
    }
  }
  let duration = 4 / number;
  duration *= 2 - Math.pow(0.5, dots);
  if (length.tie) {
    duration += length2duration(length.tie, length2);
  }
  return duration;
}

function calcGatetime(context, duration) {
  return Math.max(0.00001, duration * context.quantize - context.absoluteQuantize * 4);
}

function pitch2notenum(pitch, context) {
  const {octave} = context;
  return {c: 0, d: 2, e: 4, f: 5, g: 7, a: 9, b: 11}[pitch.name] +
         (context.accidentals[pitch.name] || 0) +
         pitch.accidental +
         (octave + 1) * 12 +
         context.transpose;
}

function notenumsFromChord(chord, context) {
  let root;
  if (chord.root.name) {
    root = pitch2notenum({
      name: chord.root.name.toLowerCase(),
      accidental: chord.root.accidental
    }, {
      ...context,
      accidentals: {}
    });
  } else {
    root = pitch2notenum(context, { // TODO
      name: 'cdefgab'[chord.root.degree - 1],
      accidental: chord.root.accidental
    });
  }

  const notenums = [];
  let octaveRange = 1;
  notenums.push(root);
  if (chord.third !== void(0))
    notenums.push(root + 4 + chord.third);
  if (chord.fifth !== void(0))
    notenums.push(root + 7 + chord.fifth);
  if (chord.sixth !== void(0))
    notenums.push(root + 9 + chord.sixth);
  if (chord.seventh !== void(0))
    notenums.push(root + 10 + chord.seventh);
  if (chord.ninth !== void(0)) {
    notenums.push(root + 14 + chord.ninth);
    octaveRange = 2;
  }
  if (chord.eleventh !== void(0)) {
    notenums.push(root + 17 + chord.eleventh);
    octaveRange = 2;
  }
  if (chord.thirteenth !== void(0)) {
    notenums.push(root + 21 + chord.thirteenth);
    octaveRange = 2;
  }

  if (0 < chord.inversion) {
    for (let i = 0; i < chord.inversion; ++i)
      notenums[i % notenums.length] += octaveRange * 12;
  } else {
    for (let i = 0; chord.inversion < i; --i)
      notenums[notenums.length - 1 - (-i) % notenums.length] -= octaveRange * 12;
  }
  return notenums;
}

function notenumsFromPitches(pitches, context) {
  let lastNotenum = -1;
  const notenums = [];
  let octave = context.octave;
  for (const pitchOrOctave of pitches) {
    switch (pitchOrOctave.type) {
      case 'octave':
        octave = pitchOrOctave.number;
        lastNotenum = -1;
        break;
      case 'relativeOctave':
        octave = clamp(0, 9, octave + pitchOrOctave.number);
        lastNotenum = -1;
        break;
      default:
        let notenum = pitch2notenum(pitchOrOctave, {
          ...context,
          octave
        });
        while (notenum <= lastNotenum) {
          octave = clamp(0, 9, octave + 1);
          notenum += 12;
        }
        notenums.push(notenum);
        lastNotenum = notenum;
        break;
    }
  }
  return notenums;
}

function keyToKeyRoot(key) {
  return key * (key < 0 ? -5 : 7) % 12;
}

function clamp(min, max, val) {
  return Math.max(min, Math.min(max, val));
}
