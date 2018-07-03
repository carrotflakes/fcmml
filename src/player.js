export default class Player {

  constructor() {
    if (typeof webkitAudioContext !== "undefined") {
      this.ac = new webkitAudioContext();
    } else if (typeof AudioContext !== "undefined") {
      this.ac = new AudioContext();
    } else {
      throw new Error("Failed to get AudioContext.");
    }
    this.masterGain = this.ac.createGain();
    masterGain.connect(this.ac.destination);
  }

  play(music) {
    const eventGen = this.seeker(music.events);
    let {value: event, done} = eventGen.next();
    let secondPerBeat = 60 / 120;
    const synthes = [];

    for (const i = 0; i < music.trackNum; ++i)
      synthes = this.newDefaultSynth();

    while (!done) {
      switch (event.type) {
        case 'aaa':
          break;
      }
      {value: event, done} = eventGen.next();
    }
  }

  *seeker(events) {
    let segno = null;
    let i = 0;
    for (; i < events.length; ++i) {
      const event = events[i];
      switch (event.type) {
        case 'segno':
          segno = i;
          break;
        case 'endOfMusic':
          if (segno === null) {
            return;
          }
          i = segno;
          break;
        default:
          yield events[i];
      }
    }
  }

  newDefaultSynth() {
    return null;
  }
}


function volumeToGainValue(v) {
  if (v === 0) {
    return 0;
  }
  return dbToGainValue(-(1 - v) * 3 * 16);

  return (Math.pow(11, v) - 1) / 10;
}

function dbToGainValue(v) {
  return Math.exp(v * Math.LN10 / 20);
}
