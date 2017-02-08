#! /usr/bin/env node
var https = require('https')
var pem = require('pem')
var request = require('request')
var minimist = require('minimist')

var CERT_OPTIONS = { days: 7, selfSigned: true }
var args = minimist(process.argv.slice(2))
if (args.h || args['?'] || args.help || args._.length < 1) {
  console.error('Usage: dev-https [<port>:]<url> [<port2>:]<url2> …')
  process.exit(1)
}

var port = 4430;
var hosts = args._.map( (arg) => {
  var match = arg.match(/^((\d+):)?(.*)/);
  return {
    baseUrl: match[3],
    port: match[2] || port++
  }
});

function createCert (callback) {
  pem.createCertificate(CERT_OPTIONS, created)

  function created (err, keys) {
    if (err) {
      return callback(err)
    }

    return callback(null, {
      key: keys.serviceKey,
      cert: keys.certificate
    })
  }
}

createCert(created)

function created (err, cert) {
  if (err) {
    throw err
  }

  hosts.forEach( (host, index) => {
    var opts = {
      key: cert.key,
      cert: cert.cert,
      port: host.port
    }
    var server = https.createServer(opts, (req, res) => {
      var requestHeaders = {}
      Object.keys(req.headers).forEach( (key) => {
        if (key.toLowerCase !== 'host') {
          requestHeaders[key] = req.headers[key]
        }
      })

      var requestOpts = {
        url: host.baseUrl + req.url,
        method: req.method,
        headers: requestHeaders
      }

      var proxyReq = request(requestOpts);
      req.pipe(proxyReq).pipe(res);
    });
    server.listen(opts.port, (err) => {
      if (err) {
        console.log(err);
      }
      console.log('Listening on https://localhost:' + opts.port);
      console.log('Proxying requests to ' + host.baseUrl);
    });
  });
}

