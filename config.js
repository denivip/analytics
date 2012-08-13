module.exports = config = {
    nodeHostId:'node-' + require("os").hostname(),

    stat:{
        numWorkers:2,
        pidFile:'stat-server.pid',
        needStartCleanUp:true,
        maxStopAttempts:1, // *2 sec = 30 sec timeout

        // number of cuncurrent viewing by one userid
        cuncurViews:2,

        // true - has just one ping event per view and updates it
        // false - multiple ping events per view
        singlePingEvent:true,

        // we allow any custom events, but for sanity it's better to
        // have a list with their names
        allowedCustomEvents:{'seek':1},

        http:{
            host:'0.0.0.0',
            port:443,
            timeout:60 * 1000 * 60 // debug value
        },

        ws:{
            host:'0.0.0.0',
            port:81
        },

        flashPolicy:{
            host:'0.0.0.0',
            port:843
        }
    },

    api:{
        numWorkers:2,
        pidFile:'api-server.pid',
        needStartCleanUp:false,
        defaultPageLimit:10,
        maxPageLimit:50,
        http:{
            host:'0.0.0.0',
            port:444,
            timeout:60 * 1000 * 60 // debug value
        }
    },

    project:{
        "4b5783300334000000000aa9":{
            DbStat:{host:'127.0.0.1', port:27017, name:'statslog', poolSize:10, autoReconnect:true},
            DbAPI:{host:'127.0.0.1', port:27017, name:'apiaggregates', poolSize:10, autoReconnect:true},
            DbReport:{host:'127.0.0.1', user:'root', password:'', dbPrefix:'stat'}
        }
    },

    common:{
        redis:{
            host:'127.0.0.1',
            port:6379,
            apiChannel:'analytics-api',
            statChannel:'analytics-stat'
        }
    }
};