var hub = require('hub'),
    config = require('../../config.js'),
    _u = require('underscore'),
    util = require('util'),
    StatView = require('../views/stat-view').StatView,
    log4js = require('log4js'),
    logger,
    redis = require("redis");

var CommandService = function () {
    this.client = null;
    logger = log4js.getLogger('main');

    this.onMessage = _u.bind(this.onMessage, this);
};

CommandService.prototype.start = function () {
    logger.info('Worker #%d: starting CMD server...', process.pid);

    this.client = redis.createClient(config.common.redis.port, config.common.redis.host);

    this.client.on("error", function (err) {
        logger.error("Worker #%d, Redis error: %s", process.pid, err);
    });

    this.client.on("message", this.onMessage);

    // subsribe to command channel
    this.client.subscribe(config.common.redis.statChannel);
};

CommandService.prototype.stop = function () {
    logger.info('Worker #%d: stopping CMD server...', process.pid);

    this.client.close();
};

CommandService.prototype.onMessage = function (channel, message) {
    var command = JSON.parse(message);

    logger.info('Worker #%d CMD server message: %s', process.pid, message);

    // only known commands
    switch (command.cmd) {
        case 'ban-user':
            this.cmdBanUser(command.userId);
            break;
        default:
            logger.info('Worker #%d CMD server - undefined command: %s', process.pid, command.cmd);
            break;
    }
};

CommandService.prototype.cmdBanUser = function (userId) {
    var view = new StatView();

    view.rejectUser(userId);
};

exports.CommandService = CommandService;