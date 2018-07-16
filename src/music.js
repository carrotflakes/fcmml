import mmlParser from './mml.sg';
import mml2ir from './mml2ir.js';

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
    const rir = ir2rir(ir);
    return new Music(rir);
  }
}

function ir2rir(ir) {
    let secondPerBeat = 60 / 120;

}
