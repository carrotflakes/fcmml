import mmlParser from "mml.sg";

class Music {

  constructor(events, trackNum) {
    this.events = events;
    this.trackNum = trackNum;
  }

  static fromMml(mml) {
    const commands = mmlParser(mml);
    const events = commands2events(commands);
    return new Music(events);
  }
}

function commands2events(commands) {
  const events = [];
  const context = {
    trackNo: 0,
    time: 0,
    length: {number: 4},
    relativeQuantize: 60, // /64
    quantize: 0, // /192
    octave: 4,
  };

  function calcLength(context, length) {
    if (length === null) {
      return context.length;
    } else {
      let duration = 1 / length.number;
      duration *= 2 - Math.pow(0.5, length.dots);
      return duration;
    }
  }

  function calcDuration(context, length) {
    return Math.min(0, length * (context.relativeQuantize / 64) - (context.quantize / 192));
  }

  while (commands.length > 0) {
    const command = commands.shift();
    switch (command.type) {
      case "note":
        const length = calcLength(context, command.length);
        const duration = calcDuration(context, length);
        events.push({
          startTime: context.time,
          endTime: context.time + duration,
          notenum
        });
        context.time += length;
        break;
      case "polyphonicNote":
        break;
      case "rest":
        const length = calcLength(context, command.length);
        context.time += length;
        break;
      case "length":
        context.length = command;
        break;
      case "relativeOctave":
        break;
      case "octave":
        break;
      case "relativeTempo":
        break;
      case "tempo":
        break;
      case "relativeOctave":
        break;
      case "octave":
        break;

      case "newTrack":
        context.trackNo += 1;
        context.time = 0;
        break;
    }
  }
}
