var hub = require('hub'),
    config = require('../../config.js'),
    _u = require('underscore'),
    util = require('util'),
    http = require('http'),
    url = require('url'),
    ObjectID = require('mongodb').ObjectID,
    log4js = require('log4js'),
    logger;

var HttpService = function () {
    logger = log4js.getLogger('main');

    this.server = null;
    hub.clientsCache = hub.clientsCache || {};

    this.onRequest = _u.bind(this.onRequest, this);
    this.onListen = _u.bind(this.onListen, this);
    this.onConnection = _u.bind(this.onConnection, this);
    this.onClientError = _u.bind(this.onClientError, this);
    this.onClose = _u.bind(this.onClose, this);

    this.onSocketClose = _u.bind(this.onSocketClose, this);
    this.onSocketTimeout = _u.bind(this.onSocketTimeout, this);

    this.onRequestClose = _u.bind(this.onRequestClose, this);
    this.onRequestEnd = _u.bind(this.onRequestEnd, this);
};

HttpService.prototype.start = function () {
    logger.info('Worker #%d: starting HTTP server...', process.pid);

    // create server
    this.server = http.createServer(this.onRequest);
    this.server.listen(config.stat.http.port, config.stat.http.host, this.onListen);

    // map events
    this.server.on('connection', this.onConnection);
    this.server.on('clientError', this.onClientError);
    this.server.on('close', this.onClose);
};

HttpService.prototype.stop = function () {
    logger.info('Worker #%d: stopping HTTP server...', process.pid);
    this.server.close();
};

HttpService.prototype.getConnectionsCount = function () {
    return this.server.connections;
};

HttpService.prototype.onListen = function (error) {
    if (error) {
        logger.fatal('Worker #%d: HTTP Server listening failed on %s:%d with error: %s',
            process.pid, config.stat.http.host, config.stat.http.port, util.inspect(error));

        process.exit();
    }

    logger.info('Worker #%d: HTTP Server listening on %s:%d', process.pid, config.stat.http.host, config.stat.http.port);
};

HttpService.prototype.onConnection = function (socket) {
    var self = this;

    // connection id
    socket.id = (new ObjectID()).toString();

    logger.info('Worker #%d: new HTTP connection. ID: %s', process.pid, socket.id);

    hub.clientsCache[socket.id] = {sock:socket, userId:null, status:null};

    // map events
    socket.on("close", function () {
        self.onSocketClose(socket);
    });
    socket.setTimeout(config.stat.http.timeout, function () {
        self.onSocketTimeout(socket)
    });
};

HttpService.prototype.onClientError = function (e) {
    logger.error('Worker #%d: http client error - ', process.pid, util.inspect(e));
};

HttpService.prototype.onClose = function () {
    logger.info('Worker #%d: HTTP server has stopped!', process.pid);
};

HttpService.prototype.onRequest = function (req, res) {
    var self = this;
    logger.info('Worker #%d: new request. Total HTTP connections: %d', process.pid, this.getConnectionsCount());

    // prepare request
    req.id = req.socket.id;
    req.connection.writeFn = req.connection.write;
    req.connection.closeFn = req.connection.destroy;
    req.connection.method = req.method;
    req.setEncoding('utf8');

    // map events
    req.on('end', function () {
        self.onRequestEnd(req.id);
    });
    req.on('close', this.onRequestClose);

    // handle GET requests
    if (req.method == 'GET') {
        this.onRequestGET(req, res);
    } else if (req.method == 'POST') {
        // handle POST requests
        this.onRequestPOST(req, res);
    }
};

HttpService.prototype.onRequestClose = function () {
    var self = this;

    setTimeout(function () {
        logger.debug('Worker #%d: HTTP request closed. Total connections: %d', process.pid, self.getConnectionsCount());
    }, 0);
};

HttpService.prototype.onRequestEnd = function (id) {
    logger.debug('Worker #%d: HTTP request for %s ended', process.pid, id);
};

HttpService.prototype.onRequestGET = function (req, res) {
    try {
        var params = url.parse(req.url, true);

        switch (params.pathname) {
            case '/crossdomain.xml':
                PolicyManager.write(res);
                break;
            case '/favicon.ico':
                res.end();
                break;
            default:
                req.params = params;
                req.id = req.connection.id = (new ObjectID()).toString();
                hub.clientsCache[req.id] = {sock:req.connection, userId:null, status:null};

                //View.processRequest(req, res); //TODO: refactoring
                break;
        }
    } catch (e) {
        logger.error('Worker #%d: catch exception for GET req: ', process.pid, util.inspect(e));
        res.end();
    }
};

HttpService.prototype.onRequestPOST = function (req, res) {
    try {
        var buf = '';

        req.on('data', function (chunk) {
            if (chunk) {
                buf += chunk;
                if (buf[chunk.length - 1] == '\n') {
                    req.params = url.parse(buf, true);
                    buf = '';

                    logger.debug('Worker #%d: http handle POST request: ', util.inspect(req.params));
                    //View.processRequest(req, res); // TODO: refactoring
                }
            }
        });
    } catch (e) {
        logger.error('Worker #%d: catch exception for POST req: ', util.inspect(e));
        res.end();
    }
};

HttpService.prototype.onSocketClose = function (socket) {
    logger.info("Worker #%d: HTTP close connection. ID: %s", process.pid, socket.id);

    this.clean(socket);
};

HttpService.prototype.onSocketTimeout = function (socket) {
    logger.info("Worker #%d: HTTP client timeouted. ID: %s", process.pid, socket.id);

    this.clean(socket);
};

HttpService.prototype.clean = function (socket) {
    if (socket.method && socket.method === 'POST') { //TODO: refactoring
        // View.close(socket);
    }
    if (socket && socket.id) {
        delete hub.clientsCache[socket.id];
    }
};

exports.HttpService = HttpService;
