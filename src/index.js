import requestAnimationFrame, { cancel as cancelAnimationFrame } from 'raf';
import performanceDotNow                                         from 'performance-now';
import EventEmitter                                              from 'events';


/**
 *
 */
export default class HighResTimeout extends EventEmitter {
  // @formatter:off
  static get EVENT_TICK () { return 'tick'; }
  static get EVENT_STOP () { return 'stop'; }
  static get EVENT_START () { return 'start'; }
  static get EVENT_RESET () { return 'reset'; }
  static get EVENT_COMPLETE () { return 'complete'; }
  // @formatter:on

  /**
   * All instances of HighResTimeout
   *
   * @type {Set<HighResTimeout>}
   * @private
   */
  static _instances = new Set();

  /**
   * Starts polling _instances for completed timeouts via a requestAnimationFrame() loop.
   * Completed timeouts resolve their promises and emit a 'complete' event.
   *
   * Calling this twice will have no effect.
   *
   * @returns {HighResTimeout}
   * @private
   */
  static _startPolling () {
    if (this._nextFrameId) {
      return this;
    }

    const poll = (pollingTimestamp) => {
      this._tickTimestamp = pollingTimestamp;
      this._nextFrameId = requestAnimationFrame(poll);

      this._instances.forEach((instance) => {
        instance.emit(this.EVENT_TICK);

        // `tick` handler may have called stop()
        if (instance._running && pollingTimestamp >= instance._targetTime) {
          // complete() will restart if necessary
          instance.complete();

          if (!instance._running) {
            this._removeInstance(instance);
          }
        }
      });
    };

    poll(performanceDotNow());

    return this;
  }

  /**
   * Stop the polling loop.
   * @private
   *
   * @returns {HighResTimeout}
   */
  static _stopPolling () {
    cancelAnimationFrame(this._nextFrameId);
    this._nextFrameId = undefined;

    return this;
  }

  /**
   * Don't use the static _addInstance() or _removeInstance() directly.
   * Instead, use start() and stop() on timeout instances
   *
   * @param instance
   * The timeout instance to be removed.
   *
   * @returns {HighResTimeout}
   * @private
   */
  static _removeInstance (instance) {
    this._instances.delete(instance);

    if (!this._instances.size) {
      this._stopPolling();
    }

    return this;
  }

  /**
   * Adds an instance to the polling set.
   *
   * @param timeout
   * @returns {HighResTimeout}
   * @private
   */
  static _addInstance (timeout) {
    this._instances.add(timeout);

    return this;
  }

  static get tickTimestamp () {
    return this._tickTimestamp;
  }

  /**
   * Read-only property indicating whether the polling loop is running.
   * @returns {boolean}
   */
  static get polling () {
    return !!this._nextFrameId;
  }

  get duration () {
    return this._duration;
  }

  /**
   * Sets timeout duration, with logic for taking into account the amount of time already elapsed
   * in the current cycle.
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
   * start() was called and when this instance will fulfill. This number changes with each tick.
   *
   * If you get exactly 1 then the timeout will complete during the current tick.
   */
  get progress () {
    if (this._running) {
      return Math.min((HighResTimeout._tickTimestamp - this._startTime) / this._duration, 1);
    }

    return (this._duration - this._delay) / this._duration;
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

    // If the timeout is interrupted before completing, delay will be the amount left to wait
    this._delay = duration;

    this._running = false;

    this._promise = new Promise((resolve, reject) => {
      this._resolvePromise = resolve;
      this._rejectPromise  = reject;
    });
  }

  /**
   * Trigger the timeout ahead of time, or at any time for that matter. Calling this will
   * fulfill the promise, so any handlers attached via then() will be triggered.
   *
   * @returns {HighResTimeout}
   */
  complete () {
    this._running = this.repeat;
    this._resolvePromise();

    this.emit(this.constructor.EVENT_COMPLETE);

    // `complete` handler may have called stop()
    if (this.repeat && this._running) {
      this._restart();
    }

    return this;
  }

  /**
   * Stop the timeout. Calling this method will cause the underlying Promise to be
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
   * @returns {HighResTimeout}
   */
  stop () {
    if (!this._running) {
      return this;
    }
    const now = performanceDotNow();

    this._delay = this._duration - (now - this._startTime);
    this.constructor._removeInstance(this);

    this._running = false;

    this._rejectPromise();

    this.emit(this.constructor.EVENT_STOP);

    return this;
  }

  /**
   * Start this timeout. Calling this method will result in the `start` event being triggered.
   *
   * @returns {HighResTimeout}
   */
  start () {
    if (this._running) {
      return this;
    }

    this._startTime  = performanceDotNow();
    this._targetTime = this._startTime + this._delay;
    this._running    = true;

    this.constructor._addInstance(this);
    this.constructor._startPolling();

    this.emit(this.constructor.EVENT_START);

    return this;
  }

  /**
   * Reset the timeout. This method neither starts nor stops the timeout.
   *
   * @returns {HighResTimeout}
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
   * Treat instances of HighResTimeout like a Promise.
   * @param args
   * @returns {Promise}
   */
  then (...args) {
    // eslint-disable-next-line prefer-spread
    return this._promise.then.apply(this._promise, args);
  }

  /**
   * Restarts the timeout. This method is much like reset() with start() tacked on,
   * with some key differences to make it more suitable for implementing repetition:
   * - Works around "drift" introduced during polling.
   * - Does not emit `reset` or `start` events.
   *
   * @private
   */
  _restart () {
    this._startTime = this._targetTime;
    this._targetTime = this._startTime + this._duration;
    this._delay = this._duration;

    this._running = true;

    this.constructor._addInstance(this);
    this.constructor._startPolling();
  }
}
