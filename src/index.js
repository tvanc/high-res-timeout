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
   * All instances HighResTimeout
   * @type {Set<Timer>}
   * @private
   */
  static _instances = new Set();

  /**
   * Starts a requestAnimationFrame() loop which polls the registry for completed timeouts.
   * Completed timeouts resolve their promises and emit a 'complete' event.
   *
   * Calling this twice will have no effect.
   *
   * @returns {Timer}
   * @private
   */
  static startPolling () {
    if (this._nextFrameId) {
      return this;
    }

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
   * Stop the requestAnimationFrame() loop.
   * @returns {Timer}
   */
  static stopPolling () {
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
      this.stopPolling();
    }

    return this;
  }

  /**
   * Adds a instance to the registry that is checked in each iteration of the
   * requestAnimationFrame() loop.
   *
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
   * A float between 0 and 1 indicating how much of the total time has elapsed between when
   * start() was called and when this instance will fulfill.
   */
  get progress () {
    return Math.min((performanceDotNow() - this._startTime) / this._duration, 1);
  }

  /**
   * Read-only property for checking whether this HighResTimeout instance is currently running.
   * @returns {boolean}
   */
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

  /**
   * Treat instances of HighResTimeout like a Promise.
   * @param args
   * @returns {Promise}
   */
  then (...args) {
    return this._promise.then.apply(this._promise, args);
  }

  /**
   * Trigger the timer ahead of time, or at any time for that matter. Calling this will
   * fulfill the promise, so any handlers attached via then() will be triggered.
   *
   * @returns {Timer}
   */
  complete () {
    this._running = false;
    this._resolvePromise();

    this.emit(this.constructor.EVENT_COMPLETE);

    return this;
  }

  /**
   * Pause this timeout. Calling this method will cause the underlying Promise to be
   * rejected, causing any rejection handlers to be triggered. If this is undesirable, use the
   * `complete` and `stop` events instead of the Promise model.
   *
   * Subsequent calls to start() will use the time remaining to completion. For example, if you
   * create an instance of HighResTimeout with a duration of 100ms, call start(), and then
   * after 75ms call stop(), there will be a delay of 25ms instead of 100ms after the next call to
   * start(). If the instance is set to repeat, subsequent cycles will use the original duration of
   * 100ms.
   *
   * To also reset the timeout, call stop() and then call reset()
   * <code>timeout.stop().reset();</code>
   * @returns {Timer}
   */
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

  /**
   * Start this timeout. Calling this method will result in the `start` event being triggered.
   * @returns {Timer}
   */
  start () {
    if (this._running) {
      return this;
    }

    this._startTime  = performanceDotNow();
    this._targetTime = this._startTime + this._delay;

    this.constructor._addInstance(this);

    this._running = true;

    this.constructor.startPolling();

    this.emit(this.constructor.EVENT_START);

    return this;
  }

  /**
   * Reset the timeout. If the timeout is running, which is to say the timeout has been
   * started and has not completed or been stopped, then the timeout will continue running.
   * If the timeout is not currently running, the timeout will continue to not be running.
   * @returns {Timer}
   */
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

  /**
   * Triggers the tick event. This indicates that a cycle of the requestAnimationFrame() loop
   * is about to complete. Note that, as long as the timeout completes organically
   * (as in, by waiting and not manually calling complete()), the `tick` event will always fire
   * before `complete`.
   * @private
   */
  _tick () {
    this.emit(this.constructor.EVENT_TICK);
  }
}
