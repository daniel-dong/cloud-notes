'use strict';

const Waterline = require('waterline');
const mongoAdapter = require('sails-mongo');
const mysqlAdapter = require('sails-mysql');

const adapters = {
    mongo: mongoAdapter,
    mysql: mysqlAdapter,
};

const connections = {
    mongo: {
        adapter: 'mongo',
        url: 'mongodb://localhost:27017/notes'
    },
    mysql: {
        adapter: 'mysql',
        url: 'mysql://root:123@localhost/notes',
        charset: 'utf8',
        collation: 'utf8_unicode_ci'
    }
};

const User = Waterline.Collection.extend({
    identity: 'user',
    connection: 'mysql',    //此处可改变数据库后端
    schema: true,
    attributes: {
        username: {
            type: 'string',
            required: true
        },
        password: {
            type: 'string',
            required: true
        },
        createTime: {
            type: 'date'
        }
    },

    beforeCreate(value, callback) {
        value.createTime = new Date();
        return callback();
    }
});

const Note = Waterline.Collection.extend({
    identity: 'note',
    connection: 'mysql',    //此处可改变数据库后端
    schema: true,
    attributes: {
        title: {
            type: 'string',
            required: true
        },
        author: {
            type: 'string',
            required: true
        },
        tag: {
            type: 'string',
            required: true
        },
        content: {
            type: 'string',
            required: true
        },
        createTime: {
            type: 'date'
        }
    },

    beforeCreate(value, callback) {
        value.createTime = new Date();
        return callback();
    }
});

const orm = new Waterline();
orm.loadCollection(User);
orm.loadCollection(Note);

const config = {
    adapters: adapters,
    connections: connections
};

exports.initORM = function (app) {
    orm.initialize(config, function (err, models) {
        if (err) {
            console.error('Failed to initialize ORM', err);
            throw err;
        } else {
            console.log('ORM initialized');
            app.User = models.collections.user;
            app.Note = models.collections.note;

            app.listen(3000, function () {
                console.log('App is running on port 3000 ...');
            });
        }
    });
};
