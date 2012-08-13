var _u = require('underscore'),
    util = require('util');

var ResponseMixin = {
    /**
     * Outputs service response
     *
     * @param response
     * @param data
     */
    render:function (response, data) {
        var resp = _u.extend({errorCode:"ERROR_NONE"}, data);
        this.renderJSON(resp, response);
    },

    /**
     * Outputs status code
     *
     * @param response
     * @param code
     */
    renderError:function (response, code) {
        this.renderJSON({errorCode:code}, response);
    },

    renderJSON:function (obj, response) {
        response.writeHead(200, {'Content-Type':'application/json', 'Charset':'utf-8', 'Access-Control-Allow-Origin':'*'});
        response.end(JSON.stringify(obj));
    }
};

exports.ResponseMixin = ResponseMixin;