# High Res Timeout

A high-resolution, object-oriented replacement for setTimeout() and setInterval().
Good for animations, progress indicators, carousels, you name it.

## Installation
```bash
npm install --save-dev high-res-timeout
```

## Usage

### Simple timeout
```javascript
import HighResTimeout from 'high-res-timeout';
const timeout = new HighResTimeout(250);
```

### Repeating timeout (setInterval)
```javascript
import HighResTimeout from 'high-res-timeout';
const interval = new HighResTimeout(250, true);
```

### Lifecycle callbacks

#### As a Promise
```javascript
timeout.start()
    .then(() => console.log('I am complete!'))
    .catch(() => console.log("I've been stopped!"));
```

#### Events
```javascript
timeout.start()
    .on('complete', () => console.log('I am complete!'))
    .on('stop', () => console.log("I've stopped!"))
    .on('start', () => console.log("I've started!"))
    .on('reset', () => console.log("I've been reset!"))
    .on('tick', () => {
    	console.log(`I'm ${(timeout.progress * 100).toFixed(0))}% done`)
    });
```

### Methods and properties
#### Instance methods

| Method        | Chainable | Description   |
| ------------- | --------- | ------------- |
| start()       | &check;   | Starts the timeout. Takes into account time elapsed between previous calls to `start()` and `stop()`. |
| stop()        | &check;   | Stops the timeout. |
| reset()       | &check;   | Resets the timeout.  |
| complete()    | &check;   | Completes the timeout as if it had completed organically.  |
| then()        | &cross;   |  Attach a callback that will be called when the timeout completes. Returns a Promise. |

#### Instance properties

| Property | Readable | Writable | Description |
|----------|----------|----------|-------------|
| duration | &check; | &check; | Get/set timeout duration. |
| progress | &check; | &cross; | Float between 0 and 1 indicating how much of the timeout's duration has elapsed. |
| running  | &check; | &cross; | Whether the timeout is currently counting down. |


## Development
Use the following commands to perform code coverage after each change and to open a Browsersync tab to the coverage
reports.
```bash
npm run watch
npm run serve
```
