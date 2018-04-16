import Timeout from '../src/index.js';
import chai    from 'chai';

describe('HighResTimeout', () => {
  const TIMEOUT_DURATION = 25;

  const assert = chai.assert;

  let testInstance;

  beforeEach(() => {
    testInstance = new Timeout(TIMEOUT_DURATION);
    testInstance.then().catch(() => {});
  });

  afterEach(() => {
    testInstance.stop();
  });

  describe('Promises', () => {
    it('complete() fulfills', () => {
      return testInstance.start();
    });

    it('stop() rejects', (done) => {
      testInstance.then().catch(done);

      testInstance.start().stop();
    });
  });

  describe('Events', () => {
    it(Timeout.EVENT_START, (done) => {
      let secondInstance = new Timeout(TIMEOUT_DURATION);

      testInstance
        .on(Timeout.EVENT_START, () => {
          done();
        })
        .start();

      // `start` should only fire on the instance it was assigned to
      secondInstance.then().catch(() => {});
      secondInstance.start().stop();

      // Calling start() twice should only trigger `start` event once
      testInstance.start();
      testInstance.stop();
    });

    it(Timeout.EVENT_STOP, (done) => {
      testInstance
        .on(Timeout.EVENT_STOP, done)
        .start()
        .stop();

      // Calling stop() twice should only trigger `stop` event once
      testInstance.stop();
    });

    it(Timeout.EVENT_COMPLETE, (done) => {
      testInstance
        .on(Timeout.EVENT_COMPLETE, () => {
          testInstance.stop();
          done();
        })
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
          done();
        })
        .start();
    });
  });


  describe('Properties', () => {
    describe('Static', () => {
      it('polling', () => {
        assert.strictEqual(Timeout.polling, false, 'No running timeout, so no polling');

        testInstance.start();
        assert.strictEqual(Timeout.polling, true, 'Starting a timeout starts the polling loop');

        testInstance.stop();
        assert.strictEqual(Timeout.polling, false, 'Stopping the only timeout stops polling');
      });
    });

    describe('Instance', () => {
      let timesCompleted = 0;

      it('repeat', (done) => {
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

      it('running', () => {
        testInstance.then().catch(() => {});

        assert.strictEqual(testInstance.running, false, 'Not running before calling start()');

        testInstance.start();
        assert.strictEqual(testInstance.running, true, 'Running after calling start()');

        testInstance.stop();
        assert.strictEqual(testInstance.running, false, 'Not running after calling stop()');
      });

      it('progress', (done) => {
        const HALFWAY = 0.5;

        testInstance.start().then().catch(() => {});

        setTimeout(() => {
          assert.typeOf(testInstance.progress, 'number');
          assert.isAtLeast(testInstance.progress, HALFWAY);

          done();
        }, TIMEOUT_DURATION / 2);
      });

      it('duration', (done) => {
        const SAFE_DURATION           = 100,
              HALF_DURATION           = SAFE_DURATION / 2,
              THREE_QUARTERS_DURATION = SAFE_DURATION * 0.75;

        let completed = false;

        // `duration` should be a number equal to TIMER_DURATION
        assert.typeOf(testInstance.duration, 'number');
        assert.equal(testInstance.duration, TIMEOUT_DURATION);

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

        // Check that timeout completed before the original `duration` of SAFE_DURATION elapsed
        setTimeout(() => {
          if (completed) {
            done();
          }
        }, THREE_QUARTERS_DURATION);
      });
    });
  });
});
