/*

# Transmit a completed trace

Run trace, send metadata, and for traceroute type, send submissions

*/
/* jslint node: true, esnext: true */

'use strict';

var request = require('request'), net = require('net'), dns = require('dns'), _ = require('lodash');

var socketTrace = require('./socket-trace.js');

var SUBMIT_URI = 'http://www.ixmaps.ca/application/controller/gather_tr.php';
var platformTraceroute = require('../lib/platform-traceroute.js');
//var SUBMIT_URI = 'http://zooid.org/post.php';

// start the trace
exports.doTrace = function(options, send) {
  let results = {}, expected = 2,
    finished = function(platform, result) {
      results[platform] = result;
      if (Object.keys(results) < expected) {
        return;
      }
      submitTrace(options, Object.keys(results).map(function(r) { return results[r]; }), function(err, res, body) {
        if (!err && res.statusCode == 200) {
          send('submitted', body);
        } else {
          send('submitted-error', err, res, body);
        }
      });
    },
    rawProcessor = {
      hops: [],
      p: 0,

      error: function(error) {
        send('error', error);
      },
      hop: function(err, hop) {
        this.hops.push(hop);
        send('hop', hop);
      },
      pass: function(err, pass) {
        this.p++;
        send('pass', this.p);
      },
      done: function(err, res) {
        send('done', res);
        finished('ixjs 0.0.1', { protocol: 'icmp', tr_data: this.hops });
      }
    },
    platformProcessor = {
      data: function(output) {
        send('output', output);
      },
      end: function(output) {
        send('end', output);
        finished('platform', { protocol: 'icmp', tr_data: output });
      },
      error: function(err) {
        send('error', err);
      }
    },
    runTrace = function() {
      expected = 1;
      socketTrace(options, rawProcessor);
      if (options.include_platform_traceroute) {
        expected = 2;
        platformTraceroute(options, platformProcessor);
      }
    };
  console.log('options', JSON.stringify(options, null, 2));

  var net = require('net'), dns = require('dns');
  if (!net.isIP(options.dest)) {
    // resolve a symobolic address
    dns.resolve4(options.dest, function(err, addresses) {
      if (err) {
        send('error', 'cannot resolve host');
      } else {
        options.dest_ip = addresses[0];
        runTrace();
      }
    });
  } else {
    options.dest_ip = options.dest;
    runTrace();
  }
};

// submit hops with options to the server
function submitTrace(options, results, cb) {
  let submission = {
    timeout: options.timeout,
    queries: options.queries,
    dest: options.dest,
    dest_ip: options.dest_ip,
    submitter: options.submitter,
    postal_code: options.postalcode,
    maxhops: options.maxhops,
    os: require('os').type(),
    traceroute_submissions: []
  };
  results.forEach(function(result) {
    submission.traceroute_submissions.push({
      client: result.client,
      protocol: 'icmp',
      tr_data: result.tr_data
    });
  });

  if (GLOBAL.debug) console.log('submitting', submission);
  require('fs').writeFileSync('submitTR.json', JSON.stringify(submission, null, 2));
  if (options.nosubmit) {
    return;
  }
  console.log('SUBMITTRACE post', JSON.stringify(submission, null, 2));
  request.post(SUBMIT_URI, {form: submission}, cb);
}