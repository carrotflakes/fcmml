export default class Scheduler {
  constructor(audioParam) {
    this.audioParam = audioParam;
    this.points = []:
  }

  insertPoint(point) {
    if (this.points.length === 0) {
      this.points.push(point);
    } else {
      //for (var i = 0; i < this.points.length; ++i)
    }
  }

  setValueAtTime(value, time) {
    this.audioParam.setValueAtTime(value, time);
    this.insertPoint({
      type: 'setValue',
      time,
      value
    });
  }

  linearRampToValueAtTime(value, time) {
    this.audioParam.linearRampToValueAtTime(value, time);
    this.insertPoint({
      type: 'linearRampToValue',
      time,
      value
    });
  }

  exponentialRampToValueAtTime(value, time) {
    this.audioParam.exponentialRampToValueAtTime(value, time);
    this.insertPoint({
      type: 'linearRampToValue',
      time,
      value
    });
  }

  setTempo(value, time) {
  }
}
