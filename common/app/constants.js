var Status = {
    View:{
        VIEWING:1,          // active
        STOPPED:2,          // normally stopped by player
        PAUSED:3,           // viewing is paused
        CLOSED_BY_CLIENT:4, // connection closed abnormally by a client
        EXTERNAL_BAN:5,     // banned by external cmd via pubsub

        VIEW_VIOLATION:100, // multi-viewing detected
        INVALID:200,        // connection was closed due to our error(node crash, network failure etc)
        DOUBLE_START:210,   // client sent double start event

        // just handy helpers for Mongo queries
        ActiveView:[1, 3],
        ActiveViewOr:[
            {status:1},
            {status:3}
        ]
    },
    User:{
        ACTIVE:1,
        BANNED:2
    }
};

exports.Status = Status;