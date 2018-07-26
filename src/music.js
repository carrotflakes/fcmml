import mmlParser from './mml.sg';
import {mml2ir} from './mml2ir.js';
import {Synth} from './synth.js';

export class Music {

  constructor(events, trackNum) {
    this.events = events;
    this.trackNum = trackNum;
  }

  static fromMml(mml) {
    const commands = mmlParser(mml);
    const ir = mml2ir(commands);
    return Music.fromIr(ir);
  }

  static fromIr(ir) {
    const {events, trackNum} = buildIr(ir);
    return new Music(events, trackNum);
  }
}

function buildIr(ir) {
  const events = [...ir];
  let trackMaxId = 0;
  for (const i in events) {
    switch (events[i].type) {
      case 'note':
        events[i] = {
          ...events[i],
          frequency: notenum2frequency(events[i].notenum),
          frequencyTo: notenum2frequency(events[i].notenumTo !== null ? events[i].notenumTo : events[i].notenum)
        };
        break;
      case 'synth':
        events[i] = {
          type: 'synth',
          beat: events[i].beat,
          track: events[i].track,
          synth: new Synth(events[i])
        };
        break;
    }
    if (events[i].track !== void(0)) {
      trackMaxId = Math.max(trackMaxId, events[i].track);
    }
  }
  return {
    events,
    trackNum: trackMaxId + 1
  };
}

function notenum2frequency(notenum) {
  return 6.875 * Math.pow(2, (notenum + 3) / 12);
}
