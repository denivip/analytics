var hub = require('hub'),
    config = require('../../config.js'),
    _u = require('underscore'),
    util = require('util'),
    Status = require('../../common/app/constants').Status,
    CollectionMixin = require('../../common/lib/collection-mixin').CollectionMixin,
    Db = require('mongodb').Db,
    Server = require('mongodb').Server,
    ObjectID = require('mongodb').ObjectID,
    log4js = require('log4js'),
    logger;

var APIModel = function (token) {
    this.contentId = null;
    this.contentType = null;
    this.stopPoint = 0;
    this.date = null;
    this.status = null;

    var project = config.project[token];

    logger = log4js.getLogger('main');
    _u.extend(this, CollectionMixin);

    this.db = new Db(project.DbAPI.name, new Server(project.DbAPI.host, project.DbAPI.port,
        {auto_reconnect:project.DbAPI.autoReconnect, poolSize:project.DbAPI.poolSize}));
};


APIModel.prototype.updateView = function (obj, callback) {
    var self = this;

    this.getViewsCollection(function (err, collection) {
        if (err) {
            logger.error('APIModel.updateView getViewsCollection error:', util.inspect(err));
            self.db.close();
            callback.call(null, err);
        }

        collection.update({userId:obj.userId, contentId:obj.contentId, contentType:obj.contentType}, obj, {safe:true, upsert:true}, function (err) {
                if (err) {
                    callback.call(null, err);

                    logger.error('APIModel.save updateView error:', util.inspect(err));
                    self.db.close();
                }

                callback.call(null, false);
                self.db.close();
            }
        );
    });
};

APIModel.prototype.close = function (userId, contentId, contentType, stopPoint, callback) {
    logger.debug('APIModel.close params: %s, %s, %s, %s', userId, contentId, contentType, stopPoint);
    var self = this;

    callback = callback || function () {
    };

    this.getViewsCollection(function (err, collection) {
        if (err) {
            logger.error('APIModel.close getViewsCollection error:', util.inspect(err));
            callback.call(null, err);
        }
        var set = (stopPoint == null) ? {status:Status.View.STOPPED} : {status:Status.View.STOPPED, stopPoint:stopPoint};
        collection.update(
            {userId:userId, contentId:contentId, contentType:contentType},
            {$set:set},
            {safe:true, upsert:true},
            function (err) {
                if (err) {
                    callback.call(null, err);

                    logger.error('APIModel.stop error:', util.inspect(err));
                    self.db.close();
                }

                callback.call(null, false);
                self.db.close();
            }
        );
    });
};

/**
 * @param userId
 * @param contentId
 * @param contentType
 * @param callback
 */
APIModel.prototype.getStopPoint = function (userId, contentId, contentType, callback) {
    var self = this;

    this.getViewsCollection(function (err, collection) {
        if (err) {
            callback.call(null, err);
        } else {
            collection.findOne(
                {userId:userId, contentId:contentId, contentType:contentType},
                {fields:{stopPoint:1}}, function (err, result) {
                    if (err) {
                        callback.call(null, err);
                    } else {
                        callback.call(null, false, (result) ? result.stopPoint : 0);
                    }

                    self.db.close();
                });
        }
    })
};

/**
 * @param userId
 * @param page
 * @param limit
 * @param callback
 */
APIModel.prototype.getUserViewsHistory = function (userId, page, limit, callback) {
    var self = this;

    this.getViewsCollection(function (err, collection) {
        if (err) {
            callback.call(null, err);
        } else {
            collection.find(
                {userId:userId},
                {
                    fields:{contentId:1, contentType:1, stopPoint:1, date:1},
                    limit:limit,
                    skip:(page - 1) * limit,
                    sort:{date:-1}
                }).toArray(function (err, results) {
                    if (err) {
                        callback.call(null, err);
                    } else {
                        callback.call(null, false, results);
                    }
                    self.db.close();
                });
        }
    })
};

/**
 * @param contentId
 * @param contentType
 * @param callback
 */
APIModel.prototype.getActiveSessionsCountByContent = function (contentId, contentType, callback) {
    var self = this;

    this.getViewsCollection(function (err, collection) {
        if (err) {
            callback.call(null, err);
        } else {
            collection.count({contentId:contentId, contentType:contentType, status:1}, function (err, result) {
                if (err) {
                    callback.call(null, err);
                } else {
                    callback.call(null, false, result);
                }

                self.db.close();
            });
        }
    })
};

/**
 * @param userId
 * @param callback
 */
APIModel.prototype.getUserSessions = function (userId, callback) {
    var self = this;

    this.getViewsCollection(function (err, collection) {
        if (err) {
            callback.call(null, err);
        } else {
            collection.find(
                {userId:userId, status:1},
                {fields:{contentId:1, contentType:1, stopPoint:1}}
            ).toArray(function (err, results) {
                    if (err) {
                        callback.call(null, err);
                    } else {
                        callback.call(null, false, results);
                    }
                    self.db.close();
                });
        }
    })
};

exports.APIModel = APIModel;