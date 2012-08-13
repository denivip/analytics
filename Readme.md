# DENIVIP Analytics Service

DENIVIP Analytics Service is a Node.JS project that provides service for collecting statistic information from video player.
This is a high-performance, distributed and reliable solution with the horizontal scaling of basic components of the system.

## How to Install

* Clone this project into your directory
* Service use log4js, websocket, mongodb, redis, underscore, deteformat. For installation of this modules execute:

```bash
npm install
```
* Create 2 MongoDB databases: statslog and apiaggregates
* Create MySQL database: stats
* Run Redis.io (ver. not less than 2.2)
* Configure app through config.js file
* Run stat service part

```bash
node stat/index.js
```
* Run api service part

```bash
node api/index.js
```

## How to use

Example code for WebSocket connection:

```js
window.WebSocket = window.WebSocket || window.MozWebSocket;
var wsConnection = new WebSocket('ws://localhost:80'),
                   wsReady = false,
                   user = 'anonimous',
                   contentId = 'sintel',
                   contentType = 'movie',
                   unique = Math.random(),
                   token = '4b5783300334000000000aa9',
                   player = {
                               startTime:0,
                                currentTime:151,
                                stopTime:235,
                                seekTime:202
                            },
                   apiURL = 'http://localhost:443';

wsConnection.onopen = function (event) {
    console.log('WS connected');

    // fire "start" event (the user started watching a movie)
    console.log('start event');
    wsConnection.send('?event=start&userId=' + user + '&contentId=' + contentId + '&contentType=' + contentType + '&position=' + position + '&uniqueId=' + unique + '&token=' + token);

    // fire "stop" event (the user stopped watching a movie)
    console.log('stop event');
    wsConnection.send('?event=stop&userId=' + user + '&contentId=' + contentId + '&contentType=' + contentType + '&position=' + position + '&uniqueId=' + unique + '&token=' + token);
};
```
For more information, look at the `examples/` directory.

### Config file
Stat part of the service:
```js
    stat:{
        numWorkers:8,                       // the number of workers
        pidFile:'/var/run/stat-server.pid', // path to pid-file
        needStartCleanUp:true,              // run cleaning data procedure after service crash
        maxStopAttempts:1,                  // max number of attempts before forced stop
        cuncurViews:2,                      // the number of simultaneous viewing by one userId

        // true - has just one ping event per view and updates it
        // false - multiple ping events per view
        singlePingEvent:true,

        // we allow any custom events, but for sanity it's better to
        // have a list with their names
        allowedCustomEvents:{'seek':1},

        http:{ ... },                       // settings for HTTP GET/POST requests
        ws:{ ... },                         // settings for WebSocket requests
        flashPolicy:{ ... }                 // service for Adobe Flash Policy
    },
```
API part of the service:
```js
    stat:{
        numWorkers:8,                       // the number of workers
        pidFile:'/var/run/api-server.pid',  // path to pid-file
        needStartCleanUp:false,             // must be 'false'
        defaultPageLimit:10,                // default page size for portioned response (in rows)
        maxPageLimit:50,                    // max rows in response

        http:{ ... }                        // settings for HTTP GET/POST requests
    },
```

Project settings:
```js
    project:{
        "4b5783300334000000000aa9":{        // token of the first project
            DbStat:{host:'127.0.0.1', port:27017, name:'statslog', poolSize:10, autoReconnect:true},
            DbAPI:{host:'127.0.0.1', port:27017, name:'apiaggregates', poolSize:10, autoReconnect:true}
        },
        "1afc3300334000000008cdd":{        // token of the second project
            DbStat:{host:'127.0.0.1', port:27017, name:'statslog', poolSize:10, autoReconnect:true},
            DbAPI:{host:'127.0.0.1', port:27017, name:'apiaggregates', poolSize:10, autoReconnect:true}
        }
    },
```

Common settings:
```js
common:{
        redis:{ // settings for Redis.io PUB/SUB
            host:'localhost',
            port:6379,
            apiChannel:'analytics-api',    // channel for API commands
            statChannel:'analytics-stat'   // channel for stat commands
        }
    }
```


### Protocol beetwen view player and service

For each new watching session (event "start") you must send "stop" event.
All parametrs such as userId, uniqueId, contentId, contentType, position are required.

The example of request:
```
?event=start&userid=12345&uniqueId=09887&contentId=PR00999-f4m&conetntType=vod&position=123.45&payload=duration=60000,referer=http://domain.com/afadfadfasdf/23/34/444.f4m
```
where,
* event - one type of event from this list: start, stop, ping, seek, pause, unpause;
* userId - uniq ID of user
* uniqueId - unique ID of watching session
* contentId - ID of watching content
* contentType - content type. Example: vod, live, broadcast, etc
* position - current watching position in sec
* payload - extended data, just store in DB

#### Events

##### start
Send this event for initiation session. Position parameter is 0 or real position from the previous session. Call once for session or you will get an error message:

```
error_double_start_event:close socket before new start event
```
##### ping

You should send this event from time to time for session prolongation. You could send this event between "start" and "stop" events.

#####  stop
You should send this event before stop of the watching session. If the event was not sent by the client applicaton, but the socket was closed, then "stop" event will be generated automatically, if HTTP GET/POST - will not.

##### pause/unpause
Log information about pause and unpause actions.

#### Multiple views
The number of simultaneous sessions from one account configured in the config file. To prevent a greater number of simultaneous views (only for socket connections) under the same userid service to the client application the service can send the message that the application should respond by termination of the session. 

Message Format - 3 fields separated by ;. 
The example: 
```
deny; 94.242.139.195; 1331025374743
```
* The word "deny", meaning the type of message
* IP-address from which you started the other view
* Start time view of another UNIX-time format

The message will be sent only to the old "extra" connection (or more). 
In the event of the number of simultaneous sessions in the database services, it will keep the information of this event.

### HTTP API
Look at the `documents/` directory.

## License 

The MIT License (MIT)
Copyright (c) 2012 DENIVIP Media <info@denivip.ru>

Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.