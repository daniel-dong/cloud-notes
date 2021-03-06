'use strict';

const path = require('path');
const crypto = require('crypto');

const express = require('express');
const session = require('express-session');
const flash = require('connect-flash');
const bodyParser = require('body-parser');
const moment = require('moment');
const MyFileStore = require('express-session-file-store');

const orm = require('./models/orm');

const app = express();

app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');

app.use(express.static(path.join(__dirname, 'public')));

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({extended: true}));

app.use(session({
    store: new MyFileStore('__tmp__'),
    secret: '0FuzRKhuS8gCMEDhJE8BYOvIi7yRNK6vSYgR8JYzSms',
    name: 'myNote',
    cookie: {maxAge: 1000 * 3600 * 24 * 7},  //一周内免登录
    resave: false,
    saveUninitialized: true
}));
app.use(flash());


function toMultiLines(str, maxWidth) {
    return str.match(new RegExp(`.{1,${maxWidth}}`, 'g')).join('\n');
}

let normalize = (str) => toMultiLines(str, 15);

function setFlashMsg(request, type, msg) {
    request.flash('type', type);
    request.flash('msg', normalize(msg));
}

function getFlashMsg(request) {
    let rawFlash = request.flash();
    if (rawFlash.type && rawFlash.msg) {
        return {
            type: rawFlash.type[0],
            content: rawFlash.msg[0],
        };
    } else {
        return null;
    }
}

function requireLogin(request, response, next) {
    if (!request.session.user) {
        setFlashMsg(request, 'info', '抱歉，您还没有登录');
        return response.redirect('/login');
    } else {
        next();
    }
}

function requireNotLogin(request, response, next) {
    if (request.session.user) {
        setFlashMsg(request, 'info', '您已登录，要登录另一个帐号或注册新帐号，请先退出');
        return response.redirect('/');
    } else {
        next();
    }
}

app.get('/', requireLogin);
app.get('/', function (request, response) {
    app.Note.find({author: request.session.user.username})
        .exec(function (err, allNotes) {
            if (err) {
                console.log(err);
                return response.redirect('/');
            } else {
                response.render('index', {
                    title: '首页',
                    user: request.session.user,
                    notes: allNotes,
                    flashMsg: getFlashMsg(request),
                });
            }
        });
});


function checkUsernamePattern(username) {
    return /^[A-Za-z0-9_]{3,20}$/.test(username);
}

function checkPasswordPattern(password) {
    return (password.length >= 6)
        && /[0-9]/.test(password)
        && /[a-z]/.test(password)
        && /[A-Z]/.test(password);
}


app.get('/register', requireNotLogin);
app.get('/register', function (request, response) {
    response.render('register', {
        user: request.session.user,
        title: '注册',
        flashMsg: getFlashMsg(request),
    });
});

app.post('/register', function (request, response) {
    let username = request.body.username,
        password = request.body.password,
        passwordRepeat = request.body.passwordRepeat;

    if (!checkUsernamePattern(username)) {
        setFlashMsg(request, 'error', '用户名必须是字母、数字、下划线的组合，长度3-20个字符。');
        return response.redirect('/register');
    }

    if (!checkPasswordPattern(password)) {
        setFlashMsg(request, 'error', '密码长度不能少于6，必须同时包含数字、小写字母、大写字母。');
        return response.redirect('/register');
    }

    if (password !== passwordRepeat) {
        setFlashMsg(request, 'error', '两次输入的密码不一致！');
        return response.redirect('/register');
    }

    app.User.findOne({username: username}, function (err, user) {
        if (err) {
            setFlashMsg(request, 'error', 'Unknown error');
            console.log(err);
            return response.redirect('/register');
        }

        if (user) {
            setFlashMsg(request, 'error', '用户名已经存在');
            return response.redirect('/register');
        }

        let md5 = crypto.createHash('md5'),
            md5password = md5.update(password).digest('hex');

        app.User.create({
            username: username,
            password: md5password
        }, function (err, model) {
            if (err) {
                console.log(err);
                return response.redirect('/register');
            }
            setFlashMsg(request, 'success', '注册成功！');
            return response.redirect('/');
        });
    });

});

app.get('/login', requireNotLogin);
app.get('/login', function (request, response) {
    response.render('login', {
        user: request.session.user,
        title: '登录',
        flashMsg: getFlashMsg(request),
    });
});

app.post('/login', function (request, response) {
    let username = request.body.username,
        password = request.body.password;

    if (!checkUsernamePattern(username)) {
        setFlashMsg(request, 'error', '用户名必须是字母、数字、下划线的组合，长度3-20个字符。');
        return response.redirect('/login');
    }

    if (!checkPasswordPattern(password)) {
        setFlashMsg(request, 'error', '密码长度不能少于6，必须同时包含数字、小写字母、大写字母。');
        return response.redirect('/login');
    }

    app.User.findOne({username: username}, function (err, user) {
        if (err) {
            console.log(err);
            return response.redirect('/login');
        }

        if (!user) {
            setFlashMsg(request, 'error', '用户不存在！');
            return response.redirect('/login');
        }

        let md5 = crypto.createHash('md5'),
            md5password = md5.update(password).digest('hex');
        if (user.password !== md5password) {
            setFlashMsg(request, 'error', '密码错误！');
            return response.redirect('/login');
        }

        setFlashMsg(request, 'success', '登录成功！');
        user.password = null;
        delete user.password;
        request.session.user = user;
        return response.redirect('/');
    })
});

app.get('/quit', requireLogin);
app.get('/quit', function (request, response) {
    request.session.user = null;
    setFlashMsg(request, 'success', '您已退出登录');
    return response.redirect('/login');
});

app.get('/post', requireLogin);
app.get('/post', function (request, response) {
    response.render('post', {
        user: request.session.user,
        title: '发布',
        flashMsg: getFlashMsg(request),
    });
});

app.post('/post', function (request, response) {
    app.Note.create({
        title: request.body.title,
        author: request.session.user.username,
        tag: request.body.tag,
        content: request.body.content
    }, function (err, model) {
        if (err) {
            console.log(err);
            return response.redirect('/post');
        }
        return response.redirect('/');
    });

});

app.get('/detail/:id', requireLogin);
app.get('/detail/:id', function (request, response) {
    app.Note.findOne({id: request.params.id})
        .exec(function (err, art) {
            if (err) {
                console.log(err);
                return response.redirect('/');
            }
            if (art) {
                response.render('detail', {
                    title: '笔记详情',
                    user: request.session.user,
                    art: art,
                    moment: moment,
                    flashMsg: getFlashMsg(request),
                })
            }
        })
});

orm.initORM(app);
