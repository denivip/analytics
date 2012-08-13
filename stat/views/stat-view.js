var hub = require('hub'),
    config = require('../../config.js'),
    _u = require('underscore'),
    util = require('util'),
    log4js = require('log4js'),
    Status = require('../../common/app/constants').Status,
    StatModel = require('../../common/models/stat-model').StatModel,
    APIModel = require('../../common/models/api-model').APIModel,
    ObjectID = require('mongodb').ObjectID,
    logger;

/**
 * @constructor
 */
var StatView = function () {
    logger = log4js.getLogger('main');
};

/**
 * @param {Request} req
 * @param {Response} res
 */
StatView.prototype.processRequest = function (req, res) {
    var params = req.params;

    logger.debug('StatView.processRequest, req.params: %s', JSON.stringify(params));

    if (typeof params.query.event != 'undefined') {
        logger.info('StatView.processRequest event: %s', params.query.event);

        switch (params.query.event) {
            case 'start':
                this.start(req, res);
                break;
            case 'stop':
                this.stop(req, res, true);
                break;
            case 'ping':
                this.ping(req, res);
                break;
            case 'seek':
                this.seek(req, res);
                break;
            case 'pause':
            case 'unpause':
                this.pause(req, res, params.query.event);
                break;
            default:
                if (config.stat.allowedCustomEvents.hasOwnProperty(params.query.event)) {
                    this.customEvent(req, res, params.query.event);
                } else {
                    logger.error('StatView.completePostRequest: Unknown event:', params.query.event);
                    res.end();
                }
                break;
        }
    } else {
        logger.error('StatView.processRequest error: missed event param');
    }
};

/**
 * @param {Request} req
 * @param {Response} res
 */
StatView.prototype.start = function (req, res) {
    var self = this,
        params = req.params,
        now = Date.now(),
        model = new StatModel(params.query.token);

    this.isUserBanned(params.query.token, params.query.userId, function (banned) {
        if (!banned) {
            if (req.connection.started) {
                logger.info('StatView.start failed! Client send double start event!');

                // response to socket
                hub.clientsCache[req.id].sock.writeFn('error_double_start_event:close socket before new start event');
                hub.clientsCache[req.id].sock.closeFn();

                model.setDoubleStart(req.id);

                return;
            }

            this.checkViewPolicy(req, res, function (oldView) {
                if (oldView) {
                    logger.warn('StatView.start single view violation! Old view: ', util.inspect(oldView));
                    self.viewViolation(req.id, req.connection.remoteAddress, oldView._id, oldView.nodeHostId, oldView.nodeProcId);
                }
            });

            var obj = {
                _id:req.id,
                userId:params.query.userId,
                uniqueId:params.query.uniqueId,
                clientIp:req.connection.remoteAddress,
                startTime:now,
                contentId:params.query.contentId,
                contentType:params.query.contentType,
                stopPoint:params.query.position ? params.query.position : 0,
                events:{start:{time:now, payload:params.query.payload}},
                status:Status.View.VIEWING,
                nodeHostId:config.nodeHostId,
                nodeProcId:process.pid
            };

            model.save(
                obj,
                function (err) {
                    if (err) {
                        logger.error('StatView.start, could not start view id: %s, error: %s', req.id.toString(), util.inspect(err));
                        req.connection.closeFn();
                    } else {
                        var apimodel = new APIModel(params.query.token);

                        logger.info('StatView.start, new view started with id: %s', req.id);
                        req.connection.started = true;

                        var apiObj = {userId:obj.userId, contentId:obj.contentId, contentType:obj.contentType, date:now, status:Status.View.VIEWING, stopPoint:obj.stopPoint};

                        apimodel.updateView(
                            apiObj,
                            function (err) {
                                if (err) {
                                    logger.error('StatView.start, update failed, userId=%s, contentId=%s:%s, error: %s', obj.userId, obj.contentId, obj.contentType, util.inspect(e));
                                } else {
                                    logger.info('StatView.start, update succeed');
                                }
                                apimodel = null;
                            }
                        );

                        if (res) res.end();
                    }
                    model = null;
                }
            );

            hub.clientsCache[req.id].userId = obj.userId;
            hub.clientsCache[req.id].contentId = obj.contentId;
            hub.clientsCache[req.id].contentType = obj.contentType;
        } else {
            hub.clientsCache[req.id].sock.writeFn('user_banned;user banned by external command');
            hub.clientsCache[req.id].sock.closeFn();
        }
    });
};

/**
 * @param {Request} req
 * @param {Response} res
 * @param {Boolean} isAction
 * @param {Function} callback
 */
StatView.prototype.stop = function (req, res, isAction, callback) {
    logger.debug('StatView.stop id: %s', req.id);

    var params = req.params,
        model = new StatModel(params.query.token),
        now = Date.now(),
        payload = params.query.payload ? params.query.payload : '',
        status = Status.View.STOPPED;

    callback = callback || function () {
    };

    var set = {},
        position = null;

    if (isAction) {
        position = req.params.query.position;
        set = {status:status, stopPoint:position};
    } else {
        set = {status:status};
    }

    model.update({
        '_id':new ObjectID(req.id),
        $or:Status.View.ActiveViewOr // status is in active state
    }, {
        $set:set,
        $push:{'events.stop':{time:now, payload:payload}}
    }, function (err) {
        if (err) {
            logger.error('StatView.stop failed. ID: %s, error: %s', req.id, util.inspect(err));
            req.connection.closeFn();

        } else {
            logger.info('StatView.stop - action completed for ID %s', req.id);

            var cl = hub.clientsCache[req.id],
                apimodel = new APIModel(params.query.token);

            apimodel.close(cl.userId, cl.contentId, cl.contentType, position);
            setTimeout(function () {
                apimodel = null;
            }, 0);

            hub.clientsCache[req.id].sock.closeFn();
            if (res) res.end();
        }
        callback.call(null);

        model = null;
    });
};

/**
 * @param {Request} req
 * @param {Response} res
 */
StatView.prototype.ping = function (req, res) {
    var params = req.params,
        model = new StatModel(params.query.token),
        now = Date.now(),
        payload = params.query.payload ? params.query.payload : '',
        options = {};

    logger.debug('StatView.ping: single ping: %d, id: %s', config.stat.singlePingEvent, req.id);

    if (config.stat.singlePingEvent) {
        options = {
            '$set':{
                'lastPingTime':now,
                'events.pings.0.time':now,
                'events.pings.0.payload':payload
            }
        };
    } else {
        options = {
            '$set':{'lastPingTime':now},
            '$push':{
                'events.pings':{
                    'time':now, payload:payload
                }
            }
        };
    }

    model.update({
            '_id':new ObjectID(req.id),
            $or:Status.View.ActiveViewOr // status is in active state
        },
        options,
        function (err) {
            if (err) {
                logger.error('StatView.ping, id: %s, failed, error: %s', req.id, err);
            } else {
                logger.debug('StatView.ping, id: %s, updated', req.id);
            }
            if (res) res.end();
        }
    )
};

/**
 * @param {Request} req
 * @param {Response} res
 */
StatView.prototype.seek = function (req, res) {

};

/**
 * @param {Request} req
 * @param {Response} res
 */
StatView.prototype.pause = function (req, res) {
    var params = req.params,
        event = params.query.event,
        model = new StatModel(params.query.token),
        now = Date.now(),
        payload = params.query.payload ? params.query.payload : '',
        status = (event == 'pause') ? Status.View.PAUSED : Status.View.VIEWING;

    logger.debug('StatView.pause (event - %s) id: %s', event, req.id);

    model.update({
        '_id':new ObjectID(req.id),
        $or:Status.View.ActiveViewOr // status is in active state
    }, {
        $set:{status:status},
        $push:{'events.pauses':{event:event, time:now, payload:payload}}
    }, function (err) {
        if (err) {
            logger.error('StatView.pause, could not pause. ID: %s, error: %s', req.id, util.inspect(err));

            req.connection.closeFn();
            model = null;
        } else {
            logger.info('StatView.pause - action %s completed for ID %s', event, req.id);

            var apimodel = new APIModel(params.query.token),
                apiObj = {userId:params.query.userId, contentId:params.query.contentId, contentType:params.query.contentType, date:now, status:status, stopPoint:params.query.position};

            apimodel.updateView(
                apiObj,
                function (err) {
                    if (err) {
                        logger.error('StatView.pause, update failed, userId=%s, contentId=%s:%s, error: %s', params.query.userId, params.query.contentId, params.query.contentType, util.inspect(e));
                    } else {
                        logger.info('StatView.pause, update succeed');
                    }

                    apimodel = null;
                }
            );

            if (res) res.end();
            model = null;
        }
    });
};

/**
 *
 * @param {Request} req
 * @param {Response} res
 * @param {Function} callback
 */
StatView.prototype.checkViewPolicy = function (req, res, callback) {

};

/**
 * @param userId
 * @param {Function} callback
 */
StatView.prototype.isUserBanned = function (token, userId, callback) {
    var self = this,
        model = new StatModel(token);

    model.getUserStatus(userId, function (status) {
        callback.call(self, (status == Status.User.BANNED));

        model = null;
    });
};

/**
 * @param userId
 * @param callback
 */
StatView.prototype.rejectUser = function (userId, callback) {
    var req = _u.find(hub.clientsCache, function (item) {
        return item.userId == userId;
    });

    if (typeof req != 'undefined') {
        req.sock.writeFn('user_banned;user banned by external command');
        req.sock.closeFn();
    }
};

exports.StatView = StatView;