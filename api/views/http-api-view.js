var config = require('../../config'),
    _u = require('underscore'),
    ResponseMixin = require('../lib/response-mixin').ResponseMixin,
    APIModel = require('../../common/models/api-model').APIModel,
    StatModel = require('../../common/models/stat-model').StatModel,
    redis = require("redis"),
    client = redis.createClient(config.common.redis.port, config.common.redis.host);

/**
 * Main View
 */
var HttpAPIView = function () {
};


/**
 * This method outputs a latest stop point for a given content viewed by a specific user.
 *
 * @param userId
 * @param contentId
 * @param contentType
 * @param res response object
 */
HttpAPIView.getStopPoint = function (token, userId, contentId, contentType, res) {
    var self = this,
        model = new APIModel(token);

    model.getStopPoint(userId, contentId, contentType, function (err, stopPoint) {
        if (err) {
            self.renderError(res, 'ERROR_DB');
            console.error(err);
        } else {
            self.render(res, {stopPoint:stopPoint});
        }

        model = null;
    });
};

/**
 * This method outputs the browsing history for the specified user.
 *
 * @param userId
 * @param {Int} page текущая страница
 * @param {Int} limit количество результатов в выдаче
 * @param res response object
 */
HttpAPIView.getUserViewsHistory = function (token, userId, page, limit, res) {
    var self = this,
        model = new APIModel(token);

    model.getUserViewsHistory(userId, page, limit, function (err, history) {
        if (err) {
            self.renderError(res, 'ERROR_DB');
            console.error(err);
        } else {
            self.render(res, {history:history, page:page, limit:limit});
        }

        model = null;
    });
};

/**
 * This method outputs active sessions for the specified content
 *
 * @param contentId
 * @param contentType
 * @param res
 */
HttpAPIView.getActiveSessionsCountByContent = function (token, contentId, contentType, res) {
    var self = this,
        model = new APIModel(token);

    model.getActiveSessionsCountByContent(contentId, contentType, function (err, sessions) {
        if (err) {
            self.renderError(res, 'ERROR_DB');
            console.error(err);
        } else {
            self.render(res, {contentId:contentId, contentType:contentType, sessions:sessions});
        }

        model = null;
    });
};

/**
 * This method outputs the number of active sessions of the specified user
 *
 * @param userId
 * @param res
 */
HttpAPIView.getUserSessions = function (token, userId, res) {
    var self = this,
        model = new APIModel(token);

    model.getUserSessions(userId, function (err, sessions) {
        if (err) {
            self.renderError(res, 'ERROR_DB');
            console.error(err);
        } else {
            self.render(res, {userId:userId, sessions:sessions});
        }

        model = null;
    });
};

/**
 * This command prevents a user with a specified ID from viewing the content
 *
 * @param token
 * @param userId
 * @param res
 */
HttpAPIView.banUser = function (token, userId, status, res) {
    var self = this,
        model = new StatModel(token);

    model.setUserStatus(userId, status, function (err) {
        if (err) {
            self.renderError(res, 'ERROR_DB');
            console.error(err);
        } else {
            self.render(res, {});
        }

        model = null;
    });

    client.publish(config.common.redis.statChannel, JSON.stringify({
        cmd:'ban-user',
        userId:userId
    }));
};

/**
 * Service methods for JSON output
 */
_u.extend(HttpAPIView, ResponseMixin);

module.exports = HttpAPIView;