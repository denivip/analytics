var config = require('../../config.js'),
    _u = require('underscore'),
    util = require('util'),
    net = require('net'),
    url = require('url'),
    PolicyManager = require('../../common/app/flash-policy-manager').PolicyManager,
    log4js = require('log4js'),
    logger;

var FlashPolicyService = function () {
    logger = log4js.getLogger('main');
    this.server = null;
};

FlashPolicyService.prototype.start = function () {
    logger.info('Worker #%d: starting FlashPolicy server...', process.pid);

    this.server = net.createServer(function (socket) {
        socket.on('error', function (e) {
            logger.error('Worker #%d: FlashPolicy server socket error: %s', process.pid, util.inspect(e));
        });

        logger.info('Worker #%d: FlashPolicy requested. IP: %s', process.pid, socket.remoteAddress);
        PolicyManager.getCrossdomain(function (data) {
            socket.end(data, 'utf8');
        });
    });

    this.server.on('close', function () {
        logger.info('Worker #%d: FlashPolicy server has stopped', process.pid);
    });

    this.server.listen(config.stat.flashPolicy.port, config.stat.flashPolicy.host, function (err) {
        if (err) {
            logger.fatal('Worker #%d: FlashPolicy server listening failed on %s:%d with error: %s',
                process.pid, config.stat.flashPolicy.host, config.stat.flashPolicy.port, util.inspect(err));

            process.exit();
        }

        logger.info('Worker #%d: FlashPolicy Server listening on %s:%d', process.pid, config.stat.flashPolicy.host, config.stat.flashPolicy.port);
    });
};

FlashPolicyService.prototype.stop = function () {
    logger.info('Worker #%d: stopping FlashPolicy server...', process.pid);

    this.server.close();
};

FlashPolicyService.prototype.getConnectionsCount = function () {
    return this.server.connections;
};

exports.FlashPolicyService = FlashPolicyService;