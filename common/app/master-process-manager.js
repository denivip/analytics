var config = require('../../config.js'),
    fs = require('fs'),
    cluster = require('cluster'),
    _u = require('underscore'),
    log4js = require('log4js'),
    logger;

module.exports = {
    section:'',
    workers:{},
    needStartCleanUp:true,

    init:function () {
        this.needStartCleanUp = config[this.section]['needStartCleanUp'];

        log4js.configure('../log4js-master.json');
        logger = log4js.getLogger('main');

        // map context
        this.onChildDeath = _u.bind(this.onChildDeath, this);
        this.onWorkerMessage = _u.bind(this.onWorkerMessage, this);
    },

    start:function (section) {
        var numCPUs = require('os').cpus().length,
            numWorkers = config[section]['numWorkers'];

        // config base section
        this.section = section;

        // init service
        this.init();

        // we would recommend to use all cpus
        if (numWorkers != numCPUs) {
            logger.warn('Recommended number of workers are ' + numCPUs);
        }

        try {
            // write pid
            fs.writeFile(config[section]['pidFile'], process.pid.toString());

            // fork child nodes
            this.startWorkers(numWorkers);

            // when child dies
            cluster.on('exit', this.onChildDeath);
        } catch (e) {
            logger.error('Error (master try/catch): ', e);
        }

        process.on('SIGINT', function () {
            // just wait
        });
    },

    startWorkers:function (n) {
        for (var i = 0; i < n; i++) {
            var worker = cluster.fork();

            // make start clean up in views via the first worker
            if (this.needStartCleanUp) {
                worker.send({cmd:'startcleanup'});
                this.needStartCleanUp = false;
            }

            // log starting process
            logger.info('Worker %d started', worker.process.pid);

            // listen worker messages
            worker.on('message', this.onWorkerMessage);
        }
    },

    onChildDeath:function (worker, code, signal) {
        logger.warn('Worker %d died', worker.process.pid);

        if (_u.size(cluster.workers) == 0) {
            setTimeout(function () {
                logger.info('All workers are finished. Close master process.');
                process.exit();
            }, 200);
        }
    },

    onWorkerMessage:function (msg) {
        //TODO: change to cluster.workers!!!!!
        if (msg.cmd && msg.cmd == 'viewviolation' && msg.to && msg.to.nodeProcId) {
            logger.debug('Master got a msg:', msg);

            if (this.workers[msg.to.nodeProcId]) {
                logger.debug('Master send msg to pid', msg.to.nodeProcId);
                this.workers[msg.to.nodeProcId].send(msg);
            } else {
                logger.info('Master could not find process ', msg.to.nodeProcId);

                // master doesnt has a db connection, so send cmd to any child
                for (var w in this.workers) {
                    this.workers[w].send({cmd:'markasinvalid', id:msg.info.oldViewId});
                    break;
                }
            }
        }
    }
};