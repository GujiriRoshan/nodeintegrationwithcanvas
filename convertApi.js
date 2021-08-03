var convertapi = require('convertapi')('xAhHvC71xhmbCZXR');


convertapi.convert('pdf', { File: '/path/to/my_file.docx' })
  .then(function(result) {
    // get converted file url
    console.log("Converted file url: " + result.file.url);

    // save to file
    return result.file.save('/path/to/save/file.pdf');
  })
  .then(function(file) {
    console.log("File saved: " + file);
  })
  .catch(function(e) {
    console.error(e.toString());
  });
