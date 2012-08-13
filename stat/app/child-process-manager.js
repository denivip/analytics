var config = require('../../config.js'),
    _u = require('underscore'),
    log4js = require('log4js'),
    util = require('util'),
    HttpService = require('./http-service').HttpService,
    WsService = require('./ws-service').WsService,
    FlashPolicyService = require('./flash-policy-service').FlashPolicyService,
    CommandService = require('./command-service').CommandService,
    logger;

module.exports = {
    httpService:null,
    wsService:null,
    flashPolicyService:null,

    goingToStop:false,
    closeTimerID:null,
    finishing:null,
    stopAttempts:0,

    init:function () {
        log4js.configure('../log4js-worker.json');
        logger = log4js.getLogger('main');

        // map context
        this.onMessage = _u.bind(this.onMessage, this);
        this.onStop = _u.bind(this.onStop, this);
        this.onFinishingProcess = _u.bind(this.onFinishingProcess, this);
    },

    start:function () {
        this.init();

        logger.info('Child process %d starting ...', process.pid);

        // catch signals
        process.on('SIGINT', this.onStop);

        // start services
        try {
            this.httpService = new HttpService();
            this.httpService.start();

            this.wsService = new WsService();
            this.wsService.start();

            this.flashPolicyService = new FlashPolicyService();
            this.flashPolicyService.start();

            this.commandService = new CommandService();
            this.commandService.start();
        } catch (e) {
            logger.error('Error (child main try/catch): ', util.inspect(e));
        }

        process.on('uncaughtException', function (err) {
            console.error('Unknown error (uncaughtException): ', err);
        });
    },

    onMessage:function (msg) {
        logger.debug('Worker #%d got a msg: %s', process.pid, JSON.stringify(msg));

        if (msg.cmd && msg.cmd == 'markasinvalid' && msg.id) {
            logger.debug('Worker got cmd: %s', msg);
            //View.markAsInvalid(msg.id);
        } else if (msg.cmd && msg.cmd == 'viewviolation') {
            logger.debug('Worker got cmd:', prettyFn(msg));
            //View.viewViolation(msg.info.viewId, msg.info.clientIp, msg.info.oldViewId, msg.to.nodeHostId, msg.to.nodeProcId);
        } else if (msg.cmd && msg.cmd == 'startcleanup') {
            //View.startCleanUp();
        }
    },

    /**
     * Graceful shutdown
     */
    onStop:function () {
        if (this.goingToStop) {
            logger.info("Worker #%d can't stop yet. Waiting for all connections to finish. Meanwhile you can start another instance", process.pid);
        } else {
            logger.info('Worker #%d got SIGINT. Waiting for all connections to finish', process.pid);
            this.goingToStop = true;

            this.httpService.stop();
            this.wsService.stop();
            this.flashPolicyService.stop();

            if (!this.closeTimerID) {
                // check every 2 sec
                this.closeTimerID = setInterval(this.onFinishingProcess, 2 * 1000);

                // check the first time immediately
                this.onFinishingProcess();
            }
        }
    },

    onFinishingProcess:function () {
        var httConnections = this.httpService.getConnectionsCount() ,
            wsConnections = this.wsService.getConnectionsCount(),
            flashConnections = this.flashPolicyService.getConnectionsCount();

        if (this.stopAttempts >= config.stat.maxStopAttempts) {
            logger.info('Worker #%d: stop by max attempts', process.pid);
            process.exit();
        }

        if ((httConnections == 0 && wsConnections == 0 && flashConnections == 0) || (this.stopAttempts >= config.stat.maxStopAttempts)) {
            logger.info('Worker #%d: all clients disconnected! Exiting...', process.pid);
            process.exit();
        }

        logger.info('Worker #%d: waiting for all connections to finish. Meanwhile you can start another instance', process.pid);
        logger.info('Worker #%d: HTTP connections: %d', process.pid, httConnections);
        logger.info('Worker #%d: WS HTTP connections: %d', process.pid, wsConnections);
        logger.info('Worker #%d: Policy connections: %d', process.pid, flashConnections);

        this.stopAttempts++;
    }
};