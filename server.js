
var static = require('node-static');

// Create a node-static server instance to serve the './public' folder
var file = new static.Server('./public', { cache: false });

require('http').createServer(function (request, response) {
    request.addListener('end', function () {
        file.serve(request, response);
    }).resume();
}).listen(80);
