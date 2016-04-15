#!/usr/bin/env node

var PSD = require('psd');

var file = process.argv[2] || './examples/images/example.psd';
var start = new Date();
var fileString = '<div class="container">\n';



PSD.open(file).then(function (psd) {
  psd.tree().descendants().forEach(function (node) {
    if (node.isGroup()) return true;
    console.log(node.name);
    node.saveAsPng("./output/" + node.name + ".png").catch(function (err) {
      console.log(err.stack);
    });
  });

  fileString += '</div>';
}).then(function () {
  console.log("Finished in " + ((new Date()) - start) + "ms");
}).catch(function (err) {
  console.log(err.stack);
});