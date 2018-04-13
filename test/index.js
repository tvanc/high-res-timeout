import Timeout from '../src/index.js';
import chai    from 'chai';

describe('HighResTimeout', () => {
  const TIMER_DURATION = 25;

  const assert = chai.assert;

  let testInstance;

  beforeEach(() => {
    testInstance = new Timeout(TIMER_DURATION);
  });

  afterEach(() => {
    testInstance.then().catch(() => {});

    testInstance.stop();
    Timeout.stopPolling();
  });

  describe('Promises', () => {
    it('complete() fulfills', () => {
      return testInstance.start();
    });

    it('pause() rejects', (done) => {
      testInstance.then().catch(done);

      testInstance.start().stop();
    });
  });

  describe('Events', () => {
    it(Timeout.EVENT_START, (done) => {
      testInstance
        .on(Timeout.EVENT_START, done)
        .start()
        .start();
    });

    it(Timeout.EVENT_STOP, (done) => {
      testInstance.then().catch(() => {});

      testInstance
        .on(Timeout.EVENT_STOP, done)
        .start()
        .stop()
        .stop();
    });

    it(Timeout.EVENT_COMPLETE, (done) => {
      testInstance
        .on(Timeout.EVENT_COMPLETE, done)
        .start();
    });

    it(Timeout.EVENT_RESET, (done) => {
      testInstance.then().catch(() => {});

      testInstance.on(Timeout.EVENT_RESET, done)
        .start()
        .reset()
        .stop();
    });

    it(Timeout.EVENT_TICK, (done) => {
      testInstance.then().catch(() => {});

      testInstance
        .on(Timeout.EVENT_TICK, () => {
        testInstance.stop();
        assert.equal(Timeout._instances.has(testInstance), false);
        done();
      })
        .start();
    });
  });


  describe('Repetition', () => {
    let timesCompleted = 0;

    it('Repeats', (done) => {
      testInstance.repeat = true;

      testInstance
        .on(Timeout.EVENT_COMPLETE, () => {
          if (timesCompleted > 1) {
            testInstance.repeat = false;
            done();
          }

          timesCompleted += 1;
        })
        .start();
    });
  });


  describe('Properties', () => {
    describe('Static', () => {
      it('polling', () => {
        testInstance.then().catch(() => {});

        assert.strictEqual(Timeout.polling, false, 'No running timeout, so no polling');

        testInstance.start();
        assert.strictEqual(Timeout.polling, true, 'Starting a timeout starts the polling loop');

        testInstance.start();
        Timeout.stopPolling();
        assert.strictEqual(Timeout.polling, false, 'stopPolling() stops polling');

        testInstance.stop();
        assert.strictEqual(Timeout.polling, false, 'Stopping the only timeout stops polling');
      });
    });

    describe('Instance', () => {
      it('running', () => {
        testInstance.then().catch(() => {});

        assert.strictEqual(testInstance.running, false, 'Not running before calling start()');

        testInstance.start();
        assert.strictEqual(testInstance.running, true, 'Running after calling start()');

        testInstance.stop();
        assert.strictEqual(testInstance.running, false, 'Not running after calling stop()');

        testInstance.start();
        Timeout.stopPolling();
        assert.strictEqual(testInstance.running, false, 'stopPolling() pauses timeouts');
      });

      it('progress', (done) => {
        const HALFWAY = 0.5;

        testInstance.start().then().catch(() => {});

        setTimeout(() => {
          assert.typeOf(testInstance.progress, 'number');
          assert.isAtLeast(testInstance.progress, HALFWAY);

          done();
        }, TIMER_DURATION / 2);
      });

      it('duration', (done) => {
        const SAFE_DURATION           = 100,
              HALF_DURATION           = SAFE_DURATION / 2,
              THREE_QUARTERS_DURATION = SAFE_DURATION * 0.75;

        let completed = false;

        // `duration` should be a number equal to TIMER_DURATION
        assert.typeOf(testInstance.duration, 'number');
        assert.equal(testInstance.duration, TIMER_DURATION);

        // `duration` should be a number equal to SAFE_DURATION
        testInstance.duration = SAFE_DURATION;
        assert.typeOf(testInstance.duration, 'number');
        assert.equal(testInstance.duration, SAFE_DURATION);

        // Setting `duration` to at least the time already elapsed should trigger `complete`
        testInstance.start().then(() => {
          completed = true;
        });

        // Halfway through the expected time, change `duration`
        setTimeout(() => {testInstance.duration = HALF_DURATION;}, HALF_DURATION);

        // Check that timer completed before the original `duration` of SAFE_DURATION elapsed
        setTimeout(() => {
          if (completed) {
            done();
          }
        }, THREE_QUARTERS_DURATION);
      });
    });
  });
});
