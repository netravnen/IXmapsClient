/* jslint node: true, esnext: true, browser: true */

"use strict";

var React = require('react');

var remote = window.electro.require('remote'), processor = remote.require('./lib/processor.js');

var InputForm = require('./InputForm.jsx');
var trsets, messages = [], debug = false;

module.exports = function() {
  render();
  remote.require('./lib/trset.js').getTrsets((err, res) => {
    trsets = res;
    render();
  });
};

function render() {
  let sendMessages = [];
  for (let i = 0; i < messages.length; i++) {
    var m = messages[i];
    if (debug || ['info', 'end', 'error', 'done', 'submitted'].indexOf(m.type) > -1 || i == messages.length - 1) {
      sendMessages.push(m);
    }
  }
  React.render(<InputForm caller={{submitTrace, toggleDebug}} trsets={trsets} messages={sendMessages} />, document.getElementById('main'));
}

function send(type, message) {
  console.log(type + ': ' + message.toString());
  messages.push({ type, message});
  render();
}

function submitTrace(options) {
  send('info', JSON.stringify(options));
  processor.submitTraceOptions(options, send);
}

function toggleDebug(e) {
  debug = e.target.checked;
  render();
}
