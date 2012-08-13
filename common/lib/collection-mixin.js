var CollectionMixin = {
    getStatsCollection:function (callback) {
        this.getCollection('stats', function (err, collection) {
            callback.call(null, err, collection);
        });
    },

    getViewsCollection:function (callback) {
        this.getCollection('views', function (err, collection) {
            callback.call(null, err, collection);
        });
    },

    getGroupedViewsCollection:function (callback) {
        this.getCollection('groupedViews', function (err, collection) {
            callback.call(null, err, collection);
        });
    },

    getUsersCollection:function (callback) {
        this.getCollection('users', function (err, collection) {
            callback.call(null, err, collection);
        });
    },

    getCollection:function (name, callback) {
        this.db.open(function (err, db) {
            if (err) {
                this.db.close();
                callback.call(null, err);
            } else {
                db.collection(name, function (err, collection) {
                    callback.call(null, err, collection);
                });
            }
        });
    }
};

exports.CollectionMixin = CollectionMixin;