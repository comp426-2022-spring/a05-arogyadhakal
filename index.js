// Place your server entry point code here

const http = require('http')

const express = require('express');
const app = express()

app.use(express.json());
const fs = require('fs')
const morgan = require('morgan')
const db = require('../a05-arogyadhakal/src/services/database')
const args = require('minimist')(process.argv.slice(2))
const md5 = require('md5')

app.use(express.static('./public'));

const help = (`
    server.js [options]

  --por		Set the port number for the server to listen on. Must be an integer
              	between 1 and 65535.

  --debug	If set to true, creates endlpoints /app/log/access/ which returns
              	a JSON access log from the database and /app/error which throws 
              	an error with the message "Error test successful." Defaults to 
		false.

  --log		If set to false, no log files are written. Defaults to true.
		Logs are always written to database.

  --help	Return this message and exit.

`)

if (args.help || args.h){
    console.log(help)
    process.exit(0)
}

args['port'];
const port = args.port || process.env.PORT || 5555
args['debug'];
args['log'];
args['help'];

app.listen(port, () => {
    console.log('App listening on port %PORT%'.replace('%PORT%',port))
});

if (args.log == 'true'){
    const writeStream = fs.createWriteStream('access.log', {flags: 'a'})
    app.use(morgan('combined', {stream: writeStream}))
}

app.use((req, res, next) => {
    let logdata = {
      remoteaddr: req.ip,
      remoteuser: req.user,
      time: Date.now(),
      method: req.method,
      url: req.url,
      protocol: req.protocol,
      httpversion: req.httpVersion,
      secure: req.secure,
      status: res.statusCode,
      referer: req.headers['referer'],
      useragent: req.headers['user-agent']
    }
    const stmt = db.prepare(`INSERT INTO accesslog (remoteaddr, remoteuser, time, method, url,  protocol, httpversion, secure, status, referer, useragent) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`)
    const info = stmt.run(logdata.remoteaddr.toString(), logdata.remoteuser, logdata.time, logdata.method.toString(), logdata.url.toString(), logdata.protocol.toString(), logdata.httpversion.toString(), logdata.secure.toString(), logdata.status.toString(), logdata.referer, logdata.useragent.toString())
    next()
})

if (args.debug){
    app.get('/app/log/access', (req, res) => {
        try{
            const stmt = db.prepare('SELECT * FROM accesslog').all()
            res.status(200).json(stmt)
        }
        catch (er){
            console.error(er)
        }
    })
    app.get('/app/error', (req, res) => {
        res.status(500)
        throw new Error('Error test successful.')
    })
}

app.get('/app/', (req, res) => {
    // Respond with status 200
        res.statusCode = 200;
    // Respond with status message "OK"
        res.statusMessage = 'OK';
        res.writeHead( res.statusCode, { 'Content-Type' : 'text/plain' });
        res.end(res.statusCode+ ' ' +res.statusMessage)
    })

app.post('/app/flip/', (req, res) => {
    res.status(200).json({'flip': coinFlip()})
});

app.post('/app/flips/', (req, res) => {
	const flips = coinFlips(req.body.number)
    res.status(200).json({'raw': flips, 'summary': countFlips(flips)})
});

app.post('/app/flip/call/heads', (req, res) => {
	const flip = flipACoin('heads');
    res.status(200).json({ 'call' : flip.call, 'flip': flip.flip, 'result': flip.result});
});

// Define tails endpoint
app.post('/app/flip/call/tails', (req, res) => {
	const flip = flipACoin('tails');
    res.status(200).json({ 'call' : flip.call, 'flip': flip.flip, 'result': flip.result});
});


app.use(function(req, res){
    res.status(404).send('404 NOT FOUND')
});



function coinFlip() {
    let number = Math.random();
    let output = number > .5 ? "heads" : "tails"
    return output
  
  }

function coinFlips(flips) {
  let result = []
  for (let i = 0; i < flips; i++){
      result[i] = coinFlip()
  }
  return result
}

function countFlips(array) {
  let output = {}
  if (array.length == 1 && array[0] == 'heads'){
    output = {
      heads: 1
    };

  }
  else if (array.length == 1 && array[0] == 'tails'){
    output = {
      tails: 1
    };
  }
  else{
    output = {
      tails: 0,
      heads: 0
    };
    for (let i = 0; i < array.length; i++){
      array[i] == 'heads' ? output.heads += 1 : output.tails += 1
    }
  }

  return output;

}

function flipACoin(call) {
  let flip = coinFlip();
  let result = {
    call: call,
    flip: flip,
    result: (flip == call) ? "win" : "lose"
  };
  return result;
}