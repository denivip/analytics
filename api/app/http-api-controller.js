var config = require('../../config.js'),
    _u = require('underscore'),
    ResponseMixin = require('../lib/response-mixin').ResponseMixin,
    HttpAPIView = require('../views/http-api-view'),
    Status = require('../../common/app/constants').Status;

/**
 * HTTP requsts processing
 */
var HttpAPIController = function () {
};

/**
 * Command manager
 *
 * @param req
 * @param res
 * @param urlParts
 */
HttpAPIController.execute = function (req, res, urlParts) {
    var q = urlParts.query;

    // checks token
    if (typeof q.token == 'undefined') {
        this.renderError(res, 'ERROR_TOKEN_IS_REQUIRED');
        return;
    } else {
        if (typeof config.project[q.token] == 'undefined') {
            this.renderError(res, 'ERROR_INVALID_TOKEN');
            return;
        }
    }

    var i = 0,
        method = urlParts.pathname.replace('/', '').split('-').map(function (el) {
            return (i++ != 0) ? el.charAt(0).toUpperCase() + el.substr(1) : el;
        }).join('');

    this[method].call(this, req, res, urlParts);
};

/** 
 *  Params:
 *    userId
 *    contentId
 *    contentType
 *
 * @param req
 * @param res
 * @param urlParts
 */
HttpAPIController.getStopPoint = function (req, res, urlParts) {
    var q = urlParts.query;

    // проверяем - все ли параметры переданы
    if (typeof q.userId == 'undefined' || typeof q.contentId == 'undefined' || typeof q.contentType == 'undefined') {
        this.renderError(res, 'ERROR_INVALID_PARAMS');
    } else {
        HttpAPIView.getStopPoint(q.token, q.userId, q.contentId, q.contentType, res);
    }
};

/**
 *  Params:
 *    userId
 *    page
 *    limit
 *
 * @param req
 * @param res
 * @param urlParts
 */
HttpAPIController.getUserViewsHistory = function (req, res, urlParts) {
    var q = urlParts.query;

    // checks params
    if (typeof q.userId == 'undefined') {
        this.renderError(res, 'ERROR_INVALID_PARAMS');
    } else {
        var page = 1,
            limit = config.api.defaultPageLimit,
            result;

        // page param
        result = this.checkIntParam(q, 'page', false, false, 0);
        if (result != 'ERROR_NONE') {
            this.renderError(res, result);
            return;
        } else {
            page = parseInt(q.page);
        }

        result = this.checkIntParam(q, 'limit', false, false, config.api.maxPageLimit);
        if (result != 'ERROR_NONE') {
            this.renderError(res, result);
            return;
        } else {
            limit = parseInt(q.limit);
            if (!limit) {
                limit = config.api.defaultPageLimit
            }
        }

        HttpAPIView.getUserViewsHistory(q.token, q.userId, page, limit, res);
    }
};

/**
 * @param req
 * @param res
 * @param urlParts
 */
HttpAPIController.getActiveSessionsCountByContent = function (req, res, urlParts) {
    var q = urlParts.query;

    // check params
    if (typeof q.contentId == 'undefined' || typeof q.contentType == 'undefined') {
        this.renderError(res, 'ERROR_INVALID_PARAMS');
    } else {
        HttpAPIView.getActiveSessionsCountByContent(q.token, q.contentId, q.contentType, res);
    }
};

/**
 * @param req
 * @param res
 * @param urlParts
 */
HttpAPIController.getUserSessions = function (req, res, urlParts) {
    var q = urlParts.query;

    // check params
    if (typeof q.userId == 'undefined') {
        this.renderError(res, 'ERROR_INVALID_PARAMS');
    } else {
        HttpAPIView.getUserSessions(q.token, q.userId, res);
    }
};

HttpAPIController.banUser = function (req, res, urlParts) {
    var q = urlParts.query;

    // checks params
    if (typeof q.userId == 'undefined') {
        this.renderError(res, 'ERROR_INVALID_PARAMS');
    } else {
        HttpAPIView.banUser(q.token, q.userId, Status.User.BANNED, res);
    }
};

HttpAPIController.unbanUser = function (req, res, urlParts) {
    var q = urlParts.query;

    // check params
    if (typeof q.userId == 'undefined') {
        this.renderError(res, 'ERROR_INVALID_PARAMS');
    } else {
        HttpAPIView.banUser(q.token, q.userId, Status.User.ACTIVE, res);
    }
};


/**
 * Check parameters
 *
 * @param {Array} params - array of params
 * @param param - param for looking
 * @param {Boolean} required
 * @param {Int} limit = 0 if no limits
 * @return {String} error code. ERROR_NONE if successful.
 */
HttpAPIController.checkIntParam = function (params, param, required, negative, limit) {

    if (typeof params[param] != 'undefined') {
        var value = parseInt(params[param], 10);

        if (!value) {
            return 'ERROR_INVALID_PARAMS';
        }
        if ((!negative) && (value < 0)) {
            return 'ERROR_INVALID_PARAMS';
        }
        if ((limit > 0) && (value > limit)) {
            return 'ERROR_TOO_BIG_LIMIT';
        }

        return 'ERROR_NONE';
    } else {
        if (required) {
            return 'ERROR_MANDATORY_PARAMETER_WAS_MISSING';
        } else {
            return 'ERROR_NONE';
        }
    }

};

_u.extend(HttpAPIController, ResponseMixin);

module.exports = HttpAPIController;