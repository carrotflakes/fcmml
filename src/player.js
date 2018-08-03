import {Synth} from './synth.js';
import {Mixer} from './nodes';

export default class Player {
  constructor(music, opt={}) {
    this.music = music;

    if (typeof webkitAudioContext !== 'undefined') {
      this.ac = new webkitAudioContext();
    } else if (typeof AudioContext !== 'undefined') {
      this.ac = new AudioContext();
    } else {
      throw new Error("Failed to get AudioContext.");
    }

    this.mixerMaster = new Mixer(this.ac);
    this.mixerMaster.setParam({
      volume: 0.25,
      pan: 0.5
    }, 0);
    this.mixerMaster.connect(this.ac.destination);

    this.bufferTime = opt.bufferTime || 1; // sec
  }

  init() {
    this.tracks = [];
    for (let i = 0; i < this.music.trackNum; ++i) {
      const param = {
        volume: 1,
        pan: 0.5,
        w: 0,
        x: 0,
        z: 0,
        // Do not include f and y.
      };
      const mixer = new Mixer(this.ac);
      mixer.setParam(param, 0);
      mixer.connect(this.mixerMaster.getInput());
      this.tracks[i] = {
        mixer,
        synth: this.defaultSynth(),
        param,
        notes: [],
        lastNote: null,
      };
    }
    this.tempo = 120;
    this._stop = false;
  }

  play() {
    this.init();
    this.playIterator(this.seeker(this.music.events));
  }

  stop() {
    this._stop = true;
    for (const track of this.tracks) {
      for (const note of track.notes) {
        note.forceStop();
      }
    }
  }

  async playIterator(iterator) {
    let time = this.ac.currentTime + 0.01;
    let beat = 0;
    for (const event of iterator) {
      if (event.beat < beat) {
        // segno detected
        beat = event.beat;
      }
      const oldBeat = beat;
      const dTime = (event.beat - beat) * 60 / this.tempo;
      beat = event.beat;
      time += dTime;

      this.handleEvent(event, beat, time);

      // stop notes
      for (const track of this.tracks) {
        for (const note of track.notes) {
          if (!note.stoped && note.endBeat <= beat) {
            note.stop(time - dTime + (note.endBeat - oldBeat) * 60 / this.tempo);
          }
        }
      }

      await sleep((time - this.ac.currentTime - this.bufferTime) * 1000);

      if (this._stop) {
        return;
      }

      // remove stoped notes
      for (const track of this.tracks) {
        track.notes = track.notes.filter(x => !x.ended(this.ac.currentTime));
      }
    }

    // stop notes
    for (const track of this.tracks) {
      for (const note of track.notes) {
        if (!note.stoped) {
          note.stop(time + (note.endBeat - beat) * 60 / this.tempo);
        }
      }
    }
  }

  handleEvent(event, beat, time) {
    switch (event.type) {
      case 'note':
        {
          const track = this.tracks[event.track];
          const endTime = time + event.gatetime * 60 / this.tempo;
          let note;
          if (event.slurId !== null) {
            note = track.notes.find(n => event.slurId === n.id);
          }
          if (note) {
            note.endBeat = beat + event.gatetime;
            note.endTime = endTime;
            note.frequency(event.frequency, time, event.frequencyTo, endTime);
            // TODO update param
          } else {
            note = track.synth.note(
              this.ac,
              track.mixer.getInput(),
              {
                id: event.slurId,
                endBeat: beat + event.gatetime,
                startTime: time,
                endTime,
                frequency: event.frequency,
                frequencyTo: event.frequencyTo,
                param: {
                  ...track.param,
                  f: event.frequency,
                  y: event.velocity,
                },
              });
            track.notes.push(note);
          }
          track.lastNotes = note;
        }
        break;
      case 'tempo':
        this.tempo = event.tempo;
        for (const track of this.tracks) {
          for (const note of track.notes) {
            note.tempo(60 / this.tempo, time);
          }
        }
        break;
      case 'param':
        {
          const {track: trackId, name, value} = event;
          const track = this.tracks[trackId];
          track.param[name] = value;
          track.mixer.setParam(track.param, time);
          for (const note of track.notes) {
            note.setParam(track.param, time);
          }
        }
        break;
      case 'synth':
        this.tracks[event.track].synth = event.synth;
        break;
    }
  }

  *seeker(events) {
    let segno = null;
    for (let i = 0; i < events.length; ++i) {
      switch (events[i].metaType) {
        case 'segno':
          segno = i;
          break;
        case 'endOfMusic':
          if (segno === null) {
            return;
          }
          yield events[i];
          i = segno;
          break;
      }
      yield events[i];
    }
  }

  defaultSynth() {
    return new Synth({
      assignments: [],
      body: {
        func: "<-",
        type: "call",
        arguments: [
          {
            func: "gain",
            arguments: [
              {
                func: "lv",
                arguments: [
                  {
                    identifier: "y",
                    type: "identifier"
                  }
                ],
                type: "call"
              }
            ],
            type: "call"
          },
          {
            func: "sqr",
            arguments: [
              {
                func: "fr",
                arguments: [
                  {
                    identifier: "f",
                    type: "identifier"
                  }
                ],
                type: "call"
              }
            ],
            type: "call"
          }
        ]
      }
    });
  }
}

const sleep = time => new Promise(resolve => setTimeout(resolve, time));
