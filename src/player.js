import {EventEmitter} from 'events';
import {Synth} from './synth.js';
import {Mixer} from './nodes';
import {SynthBuilder, makeDefaultModel, frequency, tempo} from 'fcsynth';

export default class Player extends EventEmitter {
  constructor(music, opt={}) {
    super();
    this.music = music;

    this.ac = opt.audioContext || new AudioContext();
    this.synthBuilder = new SynthBuilder(this.ac, {
      f: frequency,
      tempo: tempo
    });

    this.mixerMaster = new Mixer(this.ac);
    this.mixerMaster.setParam({
      volume: 0.5,
      pan: 0.5
    }, 0);
    this.mixerMaster.connect(this.ac.destination);

    this.bufferTime = opt.bufferTime || 1; // sec
  }

  init() {
    this.tempo = 120;
    this.tracks = [];
    for (let i = 0; i < this.music.trackNum; ++i) {
      const param = {
        tempo: this.tempo,
        bps: this.tempo / 60,
        volume: 1,
        pan: 0.5,
        portament: 0,
        w: 0,
        x: 0,
        z: 0,
        y: 0.75,
      };
      const mixer = new Mixer(this.ac);
      mixer.setParam(param, 0);
      mixer.connect(this.mixerMaster.getInput());
      const synth = this.synthBuilder.build(makeDefaultModel('y'), mixer.getInput(), param);
      this.tracks[i] = {
        mixer,
        synth,
        param,
        lastNote: null,
      };
    }
    this._stop = false;
    this.beat = 0;
  }

  play() {
    this.init();
    this.playIterator(this.seeker(this.music.events), this.music.jump);
  }

  stop() {
    this._stop = true;
    for (const track of this.tracks) {
      track.synth.forceStop();
    }
    this.emit('stop');
  }

  async playIterator(iterator, jump) {
    let time = this.ac.currentTime + 0.01;
    for (const event of iterator) {
      if (event.beat < this.beat) {
        // segno detected
        this.beat = event.beat;
      }
      const oldBeat = this.beat;
      const dTime = (event.beat - this.beat) * 60 / this.tempo;
      this.beat = event.beat;
      time += dTime;

      if (jump && event.metaType === 'jump') {
        jump = false;
        time = this.ac.currentTime + 0.01;
      }
      if (!(jump && event.type === 'note')) {
        this.handleEvent(event, time);
      }

      // stop notes
      for (const track of this.tracks) {
        for (const note of track.synth.notes) {
          if (!note.stoped && note.noteParams.endBeat <= this.beat) {
            note.off(time - dTime + (note.noteParams.endBeat - oldBeat) * 60 / this.tempo);
            note.stoped = true;
          }
        }
      }

      if (!jump) {
        await sleep((time - this.ac.currentTime - this.bufferTime) * 1000);
      }

      if (this._stop) {
        return;
      }

      // remove stoped notes
      for (const track of this.tracks) {
        track.synth.update(this.ac.currentTime);
      }
    }

    // stop notes
    let musicEndTime = time;
    for (const track of this.tracks) {
      for (const note of track.synth.notes) {
        if (!note.stoped) {
          const endTime = time + (note.noteParams.endBeat - this.beat) * 60 / this.tempo;
          note.off(endTime);
          musicEndTime = Math.max(musicEndTime, endTime);
        }
      }
    }
    await sleep((musicEndTime - this.ac.currentTime) * 1000);
    this.emit('stop');
  }

  handleEvent(event, time) {
    switch (event.type) {
      case 'note':
        {
          const track = this.tracks[event.track];
          const endTime = time + event.gatetime * 60 / this.tempo;
          let note;
          if (event.slurId !== null) {
            note = track.synth.notes.find(n => event.slurId === n.noteParams.id);
          }
          if (note) {
            note.noteParams.endBeat = this.beat + event.gatetime;
            note.noteParams.endTime = endTime;
            // TODO update param
          } else{
            note = track.synth.note(
              {
                id: event.slurId,
                endBeat: this.beat + event.gatetime,
                startTime: time,
                endTime,
                f: event.frequency,
                y: event.velocity,
              });
            note.on(time);
          }
          if (event.frequency === event.frequencyTo &&
              track.param.portament > 0 &&
              track.lastNote) {
            note.frequency(time, track.lastNote.lastFrequency,
                           time + track.param.portament * 60 / this.tempo, event.frequency);
          } else {
            note.frequency(time, event.frequency, endTime, event.frequencyTo);
          }
          note.lastFrequency = event.frequencyTo;
          track.lastNote = note;
        }
        break;
      case 'tempo':
        this.tempo = event.tempo;
        for (const track of this.tracks) {
          /* for (const note of track.notes) {
           *   note.tempo(60 / this.tempo, time);
           * }*/

          track.param.bps = this.tempo / 60;
          track.mixer.setParam(track.param, time);
          track.synth.setTrackParam(time, track.param);
        }
        break;
      case 'param':
        {
          const {track: trackId, name, value} = event;
          const track = this.tracks[trackId];
          track.param[name] = value;
          track.mixer.setParam(track.param, time);
          track.synth.setTrackParam(time, track.param);
        }
        break;
      case 'synth':
        {
          const track = this.tracks[event.track];
          track.synth = this.synthBuilder.build(
            event.model,
            track.mixer.getInput(),
            track.synth.trackParams);
        }
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
}

const sleep = time => new Promise(resolve => setTimeout(resolve, time));
