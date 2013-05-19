module.exports = cbreak;

var Stream = require('stream');

// set input stream into raw mode
// and handle cbreak mode manually
function cbreak(stdin)
{
  var input = stdin || process.stdin;

  this.readable = true;

  this._src = input;

  this._src.setRawMode(true);

  this._src.on('data', onData.bind(this));

  this._src.on('end', onEnd.bind(this));
}

cbreak.prototype = Object.create(Stream.prototype)

cbreak.prototype.resume = function()
{
  if (this._src) this._src.resume();
};

cbreak.prototype.pause = function()
{
  if (this._src) this._src.pause();
};

cbreak.prototype.pipe = function(dest)
{
  if (!dest.writable) throw new Error('Please provide writable stream as destination for piping.');

  this._dest = dest;
  this.resume();
};

cbreak.prototype.destroy = function()
{
  // do housecleaning chores
  cleanup.call(this);

  this.readable = false;
  if (this._src) this._src.setRawMode(false);
  this.emit('close');
};

// TODO: setEncoding

// --- private

// Handles data, reacts on ^C, ^D and ^Z,
// passes thru everything else
function onData(buff)
{
  // ^C
  if (buff.length == 1 && buff[0] == 3)
  {
    if (this.listeners('SIGINT').length)
    {
      this.emit('SIGINT');
    }
    else
    {
      this._src.setRawMode(false);
      process.kill(process.pid, 'SIGINT');
    }

    return;
  }

  // ^D
  if (buff.length == 1 && buff[0] == 4)
  {
    this._src.pause();
    this._src.setRawMode(false);
    this.emit('end');
    if (this._dest) this._dest.end();
    return;
  }

  // ^Z
  if (buff.length == 1 && buff[0] == 26)
  {
    if (process.platform == 'win32') return;

    if (this.listeners('SIGTSTP').length)
    {
      this.emit('SIGTSTP');
    }
    else
    {
      process.once('SIGCONT', function()
      {
        this._src.setRawMode(true);
        this.resume();
        this.emit('SIGCONT');
      }.bind(this));

      this.pause();
      this._src.setRawMode(false);
      process.kill(process.pid, 'SIGTSTP');
    }

    return;
  }

  // last resort, pass data further
  this.emit('data', buff);
  if (this._dest) this._dest.write(buff);

}

// Handles end of the stream,
// pauses source stream, turns off raw mode
function onEnd()
{
  cleanup.call(this);

  if (this._src)
  {
    this._src.pause();
    this._src.setRawMode(false);
  }
  this.emit('end');
  if (this._dest) this._dest.end();
}

// remove listeners
function cleanup()
{
  if (this._src)
  {
    this._src.removeListner('data', onData.bind(this));
    this._src.removeListner('end', onEnd.bind(this));
  }
}
