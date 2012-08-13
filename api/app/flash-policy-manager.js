var fs = require('fs');

var PolicyManager = {
    crossdomain:null,

    getCrossdomain:function (callback) {
        if (this.crossdomain == null) {
            try {
                this.crossdomain = fs.readFileSync('crossdomain.xml', 'utf8');
            } catch (e) {
                console.error('PolicyManager.getCrossdomain error: ' + util.inspect(e));
                this.writeError();
                return;
            }
        }

        callback.call(null, this.crossdomain);
    },

    write:function (response) {
        this.getCrossdomain(function (crossdomain) {
            response.writeHead(200, {'Content-Type':'text/xml'});
            response.end(crossdomain);
        });
    },

    writeError:function () {
        response.writeHead(500);
        response.end();
    }
};

exports.PolicyManager = PolicyManager;