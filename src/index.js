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
   * All instances HighResTimeout
   * @type {Set<HighResTimeout>}
   * @private
   */
  static _instances = new Set();

  /**
   * Starts a requestAnimationFrame() loop which polls the registry for completed timeouts.
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

    const poll = (timestamp) => {
      this._nextFrameId = requestAnimationFrame(poll);

      this._instances.forEach((instance) => {
        instance._tick(timestamp);

        // `tick` handler may have called stop()
        if (this._instances.has(instance) && timestamp > instance._targetTime) {
          instance.complete();

          // `complete` handler may have called stop()
          if (this._instances.has(instance)) {
            if (instance.repeat) {
              instance.reset().start();
            }
            else {
              this._removeInstance(instance);
            }
          }
        }
      });
    };

    poll(performanceDotNow());

    return this;
  }

  /**
   * Stop the requestAnimationFrame() polling loop.
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
   * @param timeout
   * @returns {HighResTimeout}
   * @private
   */
  static _removeInstance (timeout) {
    this._instances.delete(timeout);

    if (!this._instances.size) {
      this._stopPolling();
    }

    return this;
  }

  /**
   * Adds a instance to the registry that is checked in each iteration of the
   * requestAnimationFrame() loop.
   *
   * @param timeout
   * @returns {HighResTimeout}
   * @private
   */
  static _addInstance (timeout) {
    this._instances.add(timeout);

    return this;
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
   * start() was called and when this instance will fulfill.
   */
  get progress () {
    if (this.running) {
      return (performanceDotNow() - this._startTime) / this._duration;
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
   * Treat instances of HighResTimeout like a Promise.
   * @param args
   * @returns {Promise}
   */
  then (...args) {
    // eslint-disable-next-line prefer-spread
    return this._promise.then.apply(this._promise, args);
  }

  /**
   * Trigger the timeout ahead of time, or at any time for that matter. Calling this will
   * fulfill the promise, so any handlers attached via then() will be triggered.
   *
   * @returns {HighResTimeout}
   */
  complete () {
    this._running = false;
    this._resolvePromise();

    this.emit(this.constructor.EVENT_COMPLETE);

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
   * Reset the timeout. If the timeout is running, which is to say the timeout has been
   * started and has not completed or been stopped, then the timeout will continue running.
   * If the timeout is not currently running, the timeout will continue to not be running.
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
