var config = require('../../config.js'),
    _u = require('underscore'),
    Db = require('mongodb').Db,
    Server = require('mongodb').Server;

var APIModel = function (token) {
    this.contentId = null;
    this.contentType = null;
    this.stopPoint = 0;
    this.date = null;
    this.status = null;

    var project = config.project[token];

    this.db = new Db(project.DbAPI.name, new Server(project.DbAPI.host, project.DbAPI.port,
        {auto_reconnect:project.DbAPI.autoReconnect, poolSize:project.DbAPI.poolSize}));
};

/**
 * @param userId
 * @param contentId
 * @param contentType
 * @param callback
 */
APIModel.prototype.getStopPoint = function (userId, contentId, contentType, callback) {
    this.getViewsCollection(function (err, collection) {
        if (err) {
            callback.call(null, err);
        } else {
            collection.findOne(
                {userId:userId, contentId:contentId, contentType:contentType, status:2},
                {fields:{stopPoint:1}}, function (err, result) {
                    if (err) {
                        callback.call(null, err);
                    } else {
                        callback.call(null, false, (result) ? result.stopPoint : 0);
                    }
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
            });
        }
    })
};

/**
 * @param userId
 * @param callback
 */
APIModel.prototype.getUserSessions = function (userId, callback) {
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
                });
        }
    })
};


// Service methods
APIModel.prototype.getViewsCollection = function (callback) {
    this.getCollection('views', function (err, collection) {
        callback.call(null, err, collection);
    });
};

APIModel.prototype.getGroupedViewsCollection = function (callback) {
    this.getCollection('groupedViews', function (err, collection) {
        callback.call(null, err, collection);
    });
};

APIModel.prototype.getGroupedViewsCollection = function (callback) {
    this.getCollection('groupedViews', function (err, collection) {
        callback.call(null, err, collection);
    });
};

APIModel.prototype.getCollection = function (name, callback) {
    this.db.open(function (err, db) {
        if (err) {
            callback.call(null, err);
        } else {
            db.collection(name, function (err, collection) {
                callback.call(null, err, collection);
            });
        }
    });
};

exports.APIModel = APIModel;