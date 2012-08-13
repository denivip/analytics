var hub = require('hub'),
    config = require('../../config.js'),
    _u = require('underscore'),
    util = require('util'),
    Status = require('../app/constants').Status,
    CollectionMixin = require('../lib/collection-mixin').CollectionMixin,
    Db = require('mongodb').Db,
    Server = require('mongodb').Server,
    ObjectID = require('mongodb').ObjectID,
    log4js = require('log4js'),
    logger;

/**
 * @param token 
 * @constructor
 */
var StatModel = function (token) {
    var project = config.project[token];

    logger = log4js.getLogger('main');
    _u.extend(this, CollectionMixin);

    this.db = new Db(project.DbStat.name, new Server(project.DbStat.host, project.DbStat.port,
        {auto_reconnect:false, poolSize:project.DbStat.poolSize}));
};

StatModel.prototype.setDoubleStart = function (id) {
    this.update({
        '_id':new ObjectID(id)
    }, {
        $set:{status:Status.View.DOUBLE_START}
    }, function (err) {
        if (err) {
            logger.error('StatModel.setDoubleStart error:', util.inspect(err));
        }
    });
};

StatModel.prototype.save = function (obj, callback) {
    var self = this;

    this.getStatsCollection(function (err, collection) {
        if (err) {
            logger.error('StatModel.save getStatsCollection error:', util.inspect(err));
            callback.call(null, err);
        }

        if (typeof obj['_id'] != 'undefined') {
            obj['_id'] = new ObjectID(obj._id);
        }

        collection.update({_id:obj._id}, obj, {safe:true, upsert:true}, function (err, objects) {
                if (err) {
                    logger.error('StatModel.save update error:', util.inspect(err));
                    self.db.close();
                    callback.call(null, err);
                }

                self.db.close();
                callback.call(null, false);
            }
        );
    });
};

StatModel.prototype.update = function (criteria, obj, callback) {
    var self = this;

    this.getStatsCollection(function (err, collection) {
        if (err) {
            logger.error('StatModel.update getStatsCollection error:', util.inspect(err));
            callback.call(null, err);
        }

        collection.update(criteria, obj, {safe:true}, function (err, objects) {
                if (err) {
                    logger.error('StatModel.update error:', util.inspect(err));
                    self.db.close();
                    callback.call(null, err);
                }

                self.db.close();
                callback.call(null, false);
            }
        );
    });
};

StatModel.prototype.getUserStatus = function (userId, callback) {
    var self = this;

    this.getUsersCollection(function (err, collection) {
        if (err) {
            logger.error('StatModel.getUserStatus error:', util.inspect(err));
            callback.call(null, err);
        }

        collection.findOne({userId:userId}, {status:1}, function (err, user) {
            if (err) {
                logger.error('StatModel.getUserStatus error:', util.inspect(err));
                self.db.close();
                callback.call(null, err);
            }

            self.db.close();

            callback.call(null, (user) ? user.status : null);
        });
    });
};

StatModel.prototype.setUserStatus = function (userId, status, callback) {
    var self = this;

    this.getUsersCollection(function (err, collection) {
        if (err) {
            logger.error('StatModel.setUserStatus error:', util.inspect(err));
            callback.call(null, err);
        }

        collection.update({userId:userId}, {$set:{status:status}}, {upsert:true}, function (err) {
            if (err) {
                logger.error('StatModel.setUserStatus error:', util.inspect(err));
                self.db.close();
                callback.call(null, err);
            }

            self.db.close();
            callback.call(null, false);
        });
    });
};

_u.extend(StatModel, CollectionMixin);
exports.StatModel = StatModel;