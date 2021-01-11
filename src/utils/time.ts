export default class Timer {
  public startTs: [number, number]
  public endTs: [number, number]
  public duration: {
    nano: number
    ms: number
    s: number
  }
  constructor() {
    this.startTs = [0, 0]
    this.endTs = [0, 0]
    this.duration = {
      nano: 0,
      ms: 0,
      s: 0,
    }
  }

  start() {
    this.startTs = process.hrtime()
  }

  stop() {
    this.endTs = process.hrtime(this.startTs)
    this.duration.nano = this.endTs[0] * 1e9 + this.endTs[1]
    this.duration.ms = this.duration.nano / 1e6
    this.duration.s = this.duration.nano / 1e9
  }
}
