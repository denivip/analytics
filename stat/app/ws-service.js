var hub = require('hub'),
    config = require('../../config.js'),
    _u = require('underscore'),
    util = require('util'),
    http = require('http'),
    url = require('url'),
    WebSocketServer = require('websocket').server,
    StatView = require('../views/stat-view').StatView,
    ObjectID = require('mongodb').ObjectID,
    log4js = require('log4js'),
    logger;

var WsService = function () {
    logger = log4js.getLogger('main');
    this.server = null;
    hub.clientsCache = hub.clientsCache || {};

    this.onListen = _u.bind(this.onListen, this);
    this.onRequest = _u.bind(this.onRequest, this);
    this.onMessage = _u.bind(this.onMessage, this);
    this.onClose = _u.bind(this.onClose, this);
};

WsService.prototype.start = function () {
    logger.info('Worker #%d: starting WebSocket server...', process.pid);

    var httpServer = http.createServer(function (req, res) {
        res.writeHead(404);
        res.end();
    });

    httpServer.listen(config.stat.ws.port, config.stat.ws.host, this.onListen);

    this.server = new WebSocketServer({
        httpServer:httpServer,
        autoAcceptConnections:false
    });

    // map WS events
    this.server.on('request', this.onRequest);

    // map HTTP events
    httpServer.on('close', function () {
        logger.info('Worker #%d: WS HTTP server has stopped', process.pid);
    });
};

WsService.prototype.stop = function () {
    logger.info('Worker #%d: stopping WebSocket server...', process.pid);
    this.server.unmount();
};

WsService.prototype.getConnectionsCount = function () {
    return this.server.connections.length;
};

WsService.prototype.onListen = function (error) {
    if (error) {
        logger.fatal('Worker #%d: WS HTTP Server listening failed on %s:%d with error: %s',
            process.pid, config.stat.ws.host, config.stat.ws.port, util.inspect(error));

        process.exit();
    }

    logger.info('Worker #%d: WS HTTP Server listening on %s:%d', process.pid, config.stat.ws.host, config.stat.ws.port);
};

WsService.prototype.onRequest = function (req) {
    var self = this,
        conn = req.accept();

    conn.id = (new ObjectID()).toString();
    req.id = conn.id;
    req.connection = conn.socket;
    conn.writeFn = conn.sendUTF;
    conn.closeFn = conn.drop;
    hub.clientsCache[conn.id] = {sock:conn, userId:null, status:null};

    logger.info('Worker #%d: new WS request. ID: %s. Total: %d', process.pid, req.id, this.getConnectionsCount());

    // map events
    conn.on('message', function (msg) {
        self.onMessage(req, conn, msg)
    });
    conn.on('close', function (reasonCode, desc) {
        self.onClose(req, conn, reasonCode, desc)
    });
};

WsService.prototype.onMessage = function (req, res, msg) {
    if (msg.type === 'utf8') {
        var view = new StatView();
        req.params = url.parse(msg.utf8Data, true);

        view.processRequest(req, null); //TODO: is it right?
        logger.debug('Worker #%d: WS id #%s got msg: %s', process.pid, req.id, JSON.stringify(msg));
    }
};

WsService.prototype.onClose = function (req, res, reasonCode, desc) {
    logger.debug('Worker #%d: WS id #%s closed with code: %s, desc: %s', process.pid, req.id, reasonCode, JSON.stringify(desc));

    if (typeof hub.clientsCache[req.id] != 'undefined' && typeof hub.clientsCache[req.id].action == 'undefined') {
        hub.clientsCache[req.id].action = 'closing';

        var view = new StatView();

        view.stop(req, null, false, function () {
            delete hub.clientsCache[req.id];
        });
    }
};


exports.WsService = WsService;