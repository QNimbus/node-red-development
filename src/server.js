/* eslint-env node */

/***
 * Start an instance of NodeRED under Express.JS
 ***/

'use strict';

// The TCP port for this systems web interface - picked up from env, package.json or afixed default value
const httpPort = process.env.HTTPPORT || process.env.npm_package_config_httpPort || 1880;
const useHTTPS = process.env.USEHTTPS || process.env.npm_package_config_useHTTPS === 'true' || false;
const listeningAddress = process.env.LISTENINGADDRESS || process.env.npm_package_config_listeningAddress || 'localhost';

const http = useHTTPS ? require('https') : require('http');

const RED = require('node-red');
const express = require('express');
const fs = require('fs');

// NodeRED settings
const nodeREDSettings = require('../settings.js');

if (!(process.env.npm_package_config_nrCredentialSecret === undefined || process.env.npm_package_config_nrCredentialSecret === null)) {
  nodeREDSettings.credentialSecret = process.env.npm_package_config_nrCredentialSecret;
}

if (process.env.npm_package_config_nrUserFolder) {
  nodeREDSettings.userDir = process.env.npm_package_config_nrUserFolder;
}

if (process.env.npm_package_config_nrFlowFile) {
  nodeREDSettings.flowFile = process.env.npm_package_config_nrFlowFile;
}

if (process.env.npm_package_config_nrTitle) {
  nodeREDSettings.editorTheme.page.title = nodeREDSettings.editorTheme.header.title = process.env.npm_package_config_nrTitle;
}

let httpServer;

// Create an Express app
const app = express();

// Add a simple route for static content served from './public'
app.use('/', express.static('./public'));

// Create the http(s) server
if (!useHTTPS) {
  httpServer = http.createServer(app);
} else {
  const privateKey = fs.readFileSync('./server.key', 'utf8');
  const certificate = fs.readFileSync('./server.crt', 'utf8');
  const credentials = {
    key: privateKey,
    cert: certificate
  };
  httpServer = http.createServer(credentials, app);
}

// Initialise the runtime with a server and settings
// @see http://nodered.org/docs/configuration.html
RED.init(httpServer, nodeREDSettings);

// Serve the editor UI from /admin
app.use(nodeREDSettings.httpAdminRoot, RED.httpAdmin);

// Serve the http nodes from /
app.use(nodeREDSettings.httpNodeRoot, RED.httpNode);

httpServer.listen(httpPort, listeningAddress, function() {
  console.info(
    'Express 4 https server listening on %s://%s:%d%s - serving NodeRED',
    useHTTPS ? 'https' : 'http',
    httpServer.address().address.replace('127.0.0.1', 'localhost'),
    httpServer.address().port,
    nodeREDSettings.httpAdminRoot
  );
});

// Start the runtime
RED.start().then(function() {
  console.info('------ Engine started! ------');
});
