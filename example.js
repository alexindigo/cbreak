var Cbreak = require('./index.js');
var tty = new Cbreak(process.stdin);

tty.resume();

tty.on('data', function(buff)
{
  console.log('*' + buff + '*');
});

tty.on('end', function()
{
  console.log('Zzzz');
});
