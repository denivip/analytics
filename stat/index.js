var cluster = require('cluster'),
    master = require('../common/app/master-process-manager'),
    child = require('./app/child-process-manager');

// node cluster
if (cluster.isMaster) {
    master.start('stat');
} else {
    child.start();
}

process.on('uncaughtException', function (err) {
    console.error('Unknown error (uncaughtException): ', err);
});
