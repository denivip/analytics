var config = require('../../config.js'),
    _u = require('underscore'),
    log4js = require('log4js'),
    util = require('util'),
    httpManager = require('./http-manager.js').HTTPManager,
    logger;

module.exports = {
    init:function () {
        log4js.configure('../log4js-worker.json');
        logger = log4js.getLogger('main');
    },

    start:function () {
        this.init();
        httpManager.start();
    },

    stop:function () {
    }
};