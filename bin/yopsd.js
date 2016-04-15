#!/usr/bin/env node

var PSD = require('psd');
var fs = require('fs');
var chalk = require('chalk');

var file = process.argv[2] || './examples/images/example.psd';
var path = file.replace(/\.psd$/, '');
var start = new Date();

PSD.open(file).then(function (psd) {
  var fileString = '<div class="container">\n';

  psd.tree().descendants().forEach(function (node) {
    if (node.isGroup()) return true;
    console.log(node.name);
    node.saveAsPng("./output/" + node.name + ".png").catch(function (err) {
      console.log(err.stack);
    });
  });

  fileString += '</div>';

  fs.writeFile(path + '/index.php', fileString, function(err) {
    if (err) {
      console.log(chalk.red.bold("Error while saving %s"), fileHtml);
      return cb(err);
    }

    console.log(chalk.gray("HTML saved to %s"), fileHtml);
    filesProcessed.push(fileHtml);
    cb(null, fileHtml);
  });

}).then(function () {
  console.log("Finished in " + ((new Date()) - start) + "ms");
}).catch(function (err) {
  console.log(err.stack);
});