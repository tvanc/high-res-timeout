# High Res Timeout

A high-resolution, object-oriented replacement for setTimeout() and setInterval().
Good for animations, progress indicators, carousels, you name it.

## Simple timeouts
### As a Promise
<pre>
timeout.start().then(() => console.log('Hello world!'));
</pre>
### Using events
<pre>
timeout.start().on('complete', () => console.log('Hello world'));
</pre>

### Timeout with progress
<pre>
timeout.start().on('tick', () => {
  const elm = document.getElementById('progress');
  elm.innerHTML = (timeout.progress * 100).toFixed(0) + '%';
});
</pre>

## Development
Use the following command to perform code coverage after each change
<pre>
npm run watch
</pre>

And use the following command to start Browsersync and refresh when the coverage
reports change
<pre>
npm run serve
</pre>
