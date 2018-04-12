import Timer from '../src/index.js';
import chai  from 'chai';

describe('Timer', () => {
  const TIMER_DURATION = 25;

  const assert = chai.assert;

  let timer;

  beforeEach(() => {
    timer = new Timer(TIMER_DURATION);
  });

  afterEach(() => {
    timer.then().catch(() => {});

    timer.stop();
    Timer.stop();
  });

  describe('Promises', () => {
    it('complete() fulfills', () => {
      return timer.start();
    });

    it('stop() rejects', (done) => {
      timer.then().catch(done);

      timer.start().stop();
    });
  });

  describe('Events', () => {
    it(Timer.EVENT_START, (done) => {
      timer
        .on(Timer.EVENT_START, done)
        .start()
        .start();
    });

    it(Timer.EVENT_STOP, (done) => {
      timer.then().catch(() => {});

      timer
        .on(Timer.EVENT_STOP, done)
        .start()
        .stop()
        .stop();
    });

    it(Timer.EVENT_COMPLETE, (done) => {
      timer
        .on(Timer.EVENT_COMPLETE, () => {done();})
        .start();
    });

    it(Timer.EVENT_RESET, (done) => {
      timer.then().catch(() => {});

      timer.on(Timer.EVENT_RESET, () => {done();})
        .start()
        .reset()
        .stop();
    });

    it(Timer.EVENT_TICK, (done) => {
      timer.then().catch(() => {});

      timer
        .on(Timer.EVENT_TICK, () => {
        timer.stop();
        assert.equal(Timer._instances.has(timer), false);
        done();
      })
        .start();
    });
  });


  describe('Repetition', () => {
    let timesCompleted = 0;

    it('Repeats', (done) => {
      timer.repeat = true;

      timer
        .on(Timer.EVENT_COMPLETE, () => {
          if (timesCompleted > 1) {
            timer.repeat = false;
            done();
          }

          timesCompleted += 1;
        })
        .start();
    });
  });


  describe('Properties', () => {
    it('running', () => {
      timer.then().catch(() => {});

      // `running` should be boolean and false
      assert.typeOf(timer.running, 'boolean');
      assert.equal(timer.running, false);

      // `running` should be boolean and true
      timer.start();
      assert.typeOf(timer.running, 'boolean');
      assert.equal(timer.running, true);

      // `running` should be boolean and false again
      timer.stop();
      assert.typeOf(timer.running, 'boolean');
      assert.equal(timer.running, false);
    });

    it('progress', (done) => {
      const HALFWAY = 0.5;

      timer.start().then().catch(() => {});

      setTimeout(() => {
        assert.typeOf(timer.progress, 'number');
        assert.isAtLeast(timer.progress, HALFWAY);

        done();
      }, TIMER_DURATION / 2);
    });

    it('duration', (done) => {
      const SAFE_DURATION           = 100,
            HALF_DURATION           = SAFE_DURATION / 2,
            THREE_QUARTERS_DURATION = SAFE_DURATION * 0.75;

      let completed = false;

      // `duration` should be a number equal to TIMER_DURATION
      assert.typeOf(timer.duration, 'number');
      assert.equal(timer.duration, TIMER_DURATION);

      // `duration` should be a number equal to SAFE_DURATION
      timer.duration = SAFE_DURATION;
      assert.typeOf(timer.duration, 'number');
      assert.equal(timer.duration, SAFE_DURATION);

      // Setting `duration` to at least the time already elapsed should trigger `complete`
      timer.start().then(() => {
        completed = true;
      });

      // Halfway through the expected time, change `duration`
      setTimeout(() => {timer.duration = HALF_DURATION;}, HALF_DURATION);

      // Check that timer completed before the original `duration` of SAFE_DURATION elapsed
      setTimeout(() => {
        if (completed) {
          done();
        }
      }, THREE_QUARTERS_DURATION);
    });
  });
});
