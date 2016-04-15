#!/usr/bin/env node

var PSD = require('psd');
var program = require('commander');
var cp = require('child_process');
var async = require('async');
var fileType = require('file-type');
var readChunk = require('read-chunk');
var chalk = require('chalk');
var mkdirp = require('mkdirp');
var fs = require('fs');

var filesProcessed = [];

// setup Commander program
program
  .version(require('../package.json').version)
  .arguments('<file...>')
  .option('-c, --convert', 'Convert to PNG file named <FILENAME>.png')
  .option('-t, --extracttext', 'Extract txt content to <FILENAME>/<FILENAME>.txt')
  .option('-a, --extractall', 'Extract png content to <FILENAME>/<LAYERNAME>.png')  
  .option('-o, --open', 'Preview file after conversion (triggers -c option)')
  .action(processFiles)
  .parse(process.argv);

// save PNG
function convertFile(filepath, psdPromise, cb) {
  var filePng = filepath.replace(/\.psd$/, '.png');

  psdPromise.then(function(psd) {
    return psd.image.saveAsPng(filePng);
  }).then(function(err) {
    if (err) {
      console.log(chalk.red.bold("Error while saving %s"), filePng);
      return cb(err);
    }

    console.log(chalk.gray("PNG saved to %s"), filePng);
    filesProcessed.push(filePng);
    cb(null, filePng);
  });
}

// extract text from PSD file
function extractTextFromFile(filepath, psdPromise, cb) {
  var fileText = filepath.replace(/\.psd$/, '.php');
  var fileString = '';

  psdPromise.then(function(psd) {

    psd.tree().export().children.forEach(function(child) {

      var layer = new PSDLayer([], child);
      console.log(layer);
      var text = layer.extractText();

      text.forEach(function(t) {
        fileString += '\n<p>' + t.text.replace(/\r/g, '\n') + '</p>';
      });
    });

    fs.writeFile(fileText, fileString, function(err) {
      if (err) {
        console.log(chalk.red.bold("Error while saving %s"), fileText);
        return cb(err);
      }

      console.log(chalk.gray("Text saved to %s"), fileText);
      filesProcessed.push(fileText);
      cb(null, fileText);
    });
  });
}

// extract All from PSD file
function extractAllFromFile(filepath, psdPromise, cb) {

  var fileHtml = filepath.replace(/\.psd$/, '/index.php');
  var fileString = '<div class="container">\n';
  
  psdPromise.then(function(psd) {

    mkdirp(filepath.replace(/\.psd$/, ''), function(err) { 
      console.log(chalk.red.bold(err));
    });

    psd.tree().export().children.forEach(function(child) {
      var layer = new PSDLayer([], child);
      var html = layer.extractAll();

      html.forEach(function(t) {
        fileString += t.html;
      });
    });

 
    fileString += '</div>';

    fs.writeFile(fileHtml, fileString, function(err) {
      if (err) {
        console.log(chalk.red.bold("Error while saving %s"), fileHtml);
        return cb(err);
      }

      console.log(chalk.gray("HTML saved to %s"), fileHtml);
      filesProcessed.push(fileHtml);
      cb(null, fileHtml);
    });
  });
}

// here lies the PSD magic
function processFiles(files, env) {
  async.eachSeries(files, function(filepath, cb) {

    console.log("\nProcessing %s ...", filepath);

    try {
      var buffer = readChunk.sync(filepath, 0, 262);
      var type = fileType(buffer).ext;
      if (type != 'psd') {
        console.log(chalk.red.bold("%s is not a PSD file, type detected : %s"), filepath, type);
        return cb();
      }
    } catch (e) {
      console.log(chalk.red.bold("%s could not be opened with PSD library"), filepath);
      return cb();
    }

    var psdPromise = PSD.open(filepath);
    var asyncTasks = [];

    // convert file to PNG
    if (program.convert || program.open) {
      asyncTasks.push(function(cb) {
        convertFile(filepath, psdPromise, cb);
      });
    }
    // extract text data
    if (program.extracttext) {
      asyncTasks.push(function(cb) {
        extractTextFromFile(filepath, psdPromise, cb);
      });
    }
    // extract Png data
    if (program.extractall) {
      asyncTasks.push(function(cb) {
        extractAllFromFile(filepath, psdPromise, cb);
      });
    }


    async.series(asyncTasks, cb);

  }, processDone);
}


function processDone(err, results) {
  if (err) {
    return console.log(chalk.red("\n\nError processing the files"), err);
  }

  console.log("\n\nThe following files have been created :");
  console.log(chalk.green("- %s"), filesProcessed.join("\n- "));

  if (program.open) {
    var commandLine = getCommandLine();
    console.log(chalk.gray("\nOpening PNG files using command-line tool '%s'"), commandLine);
    cp.spawn(commandLine, filesProcessed.filter(function(filepath){
      return filepath.match(/png$/);
    }), {
        detached: true
      })
      .unref();
  }
  console.log("\n");
}

function getCommandLine() {
  switch (process.platform) {
    case 'darwin':
      return 'open';
    case 'win32':
      return 'start';
    case 'win64':
      return 'start';
    default:
      return 'xdg-open';
  }
}


function PSDLayer(path, element) {
  this.path = path.slice();
  this.path.push(element.name);

  var self = this;

  return {
    extractText: function() {
      var text = [];

      if (typeof element.text !== 'undefined' && element.text !== undefined) {
        text.push({
          path: self.path,
          text: element.text.value || null,
        });
      }

      if (typeof(element.children) !== 'undefined') {
        element.children.forEach(function(child) {
          var layer = new PSDLayer(self.path, child);
          var childText = layer.extractText();
          childText.forEach(function(t) {
            text.push(t);
          });
        });
      }

      return text;
    },
    extractAll: function() {
      var html = [];

      element

      if (typeof element.text !== 'undefined' && element.text !== undefined) {
        console.log('\n<p>' + element.text.value.replace(/\r/g, '\n') + '</p>');

        var d = new Date();
        var n = d.getTime();

        element.image.saveAsPng('/Users/jcsibon/Sites/Projets/gergovie/gergovie/.lutece/sources/' + n + '.png');

        /*
        filepath.replace(/\.psd$/, n + '.png'));
        */

        html.push({
          path: self.path,
          visible: self.visible,
          opacity: self.opacity,
          blendingMode: self.blendingMode,
          name: self.name,
          left: self.left,
          right: self.right,
          top: self.top,
          bottom: self.bottom,
          height: self.height,
          width: self.width,
          html: '\n<p>' + element.text.value.replace(/\r/g, '\n') + '</p>',
//        text: element.text.value || null,
        });
      }

      if (typeof(element.children) !== 'undefined') {
        element.children.forEach(function(child) {
          var layer = new PSDLayer(self.path, child);
          var childText = layer.extractAll();
          childText.forEach(function(t) {
            text.push(t);
          });
        });
      }

      return html;
    }
  }
}
