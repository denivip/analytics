var cluster = require('cluster'),
    master = require('../common/app/master-process-manager'),
    child = require('./app/child-process-manager');

if (cluster.isMaster) {
    master.start('api');
} else {
    child.start();
}

process.on('uncaughtException', function (err) {
    console.error('Unknown error (uncaughtException): ', err);
});
