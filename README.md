# High Res Timeout

A high-resolution, object-oriented replacement for setTimeout() and setInterval().
Good for animations, progress indicators, carousels, you name it.

## Simple timeouts
### As a Promise
    timeout.start().then(() => console.log('Hello world!'));

### Using events
    timeout.start().on('complete', () => console.log('Hello world'));

### Timeout with progress
    timeout.start().on('tick', () => {
      const elm = document.getElementById('progress');
      elm.innerHTML = (timeout.progress * 100).toFixed(0) + '%';
    });

## Development
Use the following command to perform code coverage after each change.

    npm run watch

And use the following command to start Browsersync and refresh when the coverage
reports change

    npm run serve

