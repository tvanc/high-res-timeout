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

## Life cycle
### As a Promise
```javascript
timeout.start()
    .then(() => console.log('I am complete!'))
    .catch(() => console.log("I've been stopped!"));
```

### Using events
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

## Development
Use the following command to perform code coverage after each change.
```bash
npm run watch
```

And use the following command to start Browsersync and refresh when the coverage
reports change
```bash
npm run serve
```
