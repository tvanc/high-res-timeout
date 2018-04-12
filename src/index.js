import requestAnimationFrame, { cancel as cancelAnimationFrame } from 'raf';
import performanceDotNow                                         from 'performance-now';
import EventEmitter                                              from 'events';


/**
 *
 */
export default class Timer extends EventEmitter {
  // @formatter:off
  static get EVENT_TICK () { return 'tick'; }
  static get EVENT_STOP () { return 'stop'; }
  static get EVENT_START () { return 'start'; }
  static get EVENT_RESET () { return 'reset'; }
  static get EVENT_COMPLETE () { return 'complete'; }
  // @formatter:on

  /**
   * @type {Set<Timer>}
   * @private
   */
  static _instances = new Set();

  /**
   * @returns {Timer}
   * @private
   */
  static start () {
    const poll = (timestamp) => {
      this._instances.forEach((instance) => {
        instance._tick(timestamp);

        if (timestamp > instance._targetTime) {
          instance.complete();

          if (instance.repeat) {
            instance.reset();
          }
          else {
            this._removeInstance(instance);
          }
        }
      });

      this._nextFrameId = requestAnimationFrame(poll);
    };

    poll(performanceDotNow());

    return this;
  }

  /**
   * Calling stop statically stops all timers.
   * @returns {Timer}
   */
  static stop () {
    cancelAnimationFrame(this._nextFrameId);
    this._nextFrameId = undefined;

    return this;
  }

  /**
   * Don't use the static _addInstance() or _removeInstance() directly.
   * Instead, use start() and stop() on Timer instances
   * @param timer
   * @returns {Timer}
   * @private
   */
  static _removeInstance (timer) {
    this._instances.delete(timer);

    if (!this._instances.size) {
      this.stop();
    }

    return this;
  }

  /**
   * @param timer
   * @returns {Timer}
   * @private
   */
  static _addInstance (timer) {
    this._instances.add(timer);

    return this;
  }

  get duration () {
    return this._duration;
  }

  /**
   * A new duration will affect the current cycle, so this setter takes into account the time
   * already elapsed during the current cycle.
   *
   * @param {Number} duration
   */
  set duration (duration) {
    this._duration = duration;
    this._delay    = duration;

    if (this._running) {
      const timestamp = performanceDotNow();

      this._delay      = duration - (timestamp - this._startTime);
      this._targetTime = timestamp + this._delay;
    }
  }

  /**
   * @returns {number}
   * A float between 0 and 1
   */
  get progress () {
    return Math.min((performanceDotNow() - this._startTime) / this._duration, 1);
  }

  get running () {
    return this._running;
  }

  /**
   * Constructor.
   * @param duration
   * @param repeat
   */
  constructor (duration, repeat = false) {
    super();

    // The total time to wait
    this._duration = duration;
    this.repeat    = repeat;

    // If the timer is interrupted before completing, delay will be the amount left to wait
    this._delay = duration;

    this._running = false;

    this._promise = new Promise((resolve, reject) => {
      this._resolvePromise = resolve;
      this._rejectPromise  = reject;
    });
  }

  then (...args) {
    // eslint-disable-next-line prefer-spread
    return this._promise.then.apply(this._promise, args);
  }

  /**
   * Trigger the timer ahead of time, or at any time for that matter.
   * @returns {Timer}
   */
  complete () {
    this._running = false;
    this._resolvePromise();

    this.emit(this.constructor.EVENT_COMPLETE);

    return this;
  }

  stop () {
    if (!this._running) {
      return this;
    }

    Timer._removeInstance(this);

    this._delay   = performanceDotNow() - this._startTime;
    this._running = false;

    this._rejectPromise();

    this.emit(this.constructor.EVENT_STOP);

    return this;
  }

  start () {
    if (this._running) {
      return this;
    }

    this._startTime  = performanceDotNow();
    this._targetTime = this._startTime + this._delay;

    this.constructor._addInstance(this);

    this._running = true;

    this.constructor.start();

    this.emit(this.constructor.EVENT_START);

    return this;
  }

  reset () {
    const timestamp = performanceDotNow();

    this._delay      = this._duration;
    this._targetTime = timestamp + this._duration;

    if (this._running) {
      this._startTime = timestamp;
    }

    this.emit(this.constructor.EVENT_RESET);

    return this;
  }

  _tick () {
    this.emit(this.constructor.EVENT_TICK);
  }
}
