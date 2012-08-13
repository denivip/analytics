var config = require('../../config.js'),
    http = require("http"),
    url = require('url'),
    _u = require('underscore'),
    ResponseMixin = require('../lib/response-mixin').ResponseMixin,
    PolicyManager = require('./flash-policy-manager').PolicyManager,
    HttpAPI = require('./http-api-controller');

var HTTPManager = {
    server:null,

    start:function () {
        var self = this;

        this.server = http.createServer(
            function (req, res) {
                var urlParts = url.parse(req.url, true);

                switch (urlParts.pathname) {
                    case '/crossdomain.xml':
                        PolicyManager.write(res);
                        break;
                    case '/favicon.ico':
                        res.end();
                        break;

                    // API
                    case '/get-views':
                    case '/get-views-grouped':
                    case '/get-stop-point':
                    case '/get-user-views-history':
                    case '/get-active-sessions-count-by-content':
                    case '/get-user-sessions':
                    case '/ban-user':
                    case '/unban-user':
                        HttpAPI.execute(req, res, urlParts);
                        break;

                    default:
                        self.renderError(res, 'ERROR_UNKNOWN_REQUEST');
                        break;
                }
            }).listen(config.api.http.port, config.api.http.host, function () {
                console.log('Listening HTTP on ' + config.api.http.host + ':' + config.api.http.port);
            });
    },

    stop:function (cb) {
        cb = cb || function () {
        };

        this.server.close(cb);
    }
};

_u.extend(HTTPManager, ResponseMixin);


exports.HTTPManager = HTTPManager;