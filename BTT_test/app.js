
/**
 * Module dependencies.
 */

var express = require('express');
var routes = require('./routes');
var user = require('./routes/user');
var http = require('http');
var path = require('path');

var app = express();

// all environments
app.set('port', process.env.PORT || 3000);
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');
app.use(express.favicon());
app.use(express.logger('dev'));
app.use(express.bodyParser());
app.use(express.methodOverride());
app.use(app.router);
app.use(express.static(path.join(__dirname, 'public')));

//이미지 업로드용
app.use('/uploads', express.directory(path.join(__dirname, 'uploads')));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// development only
if ('development' == app.get('env')) {
  app.use(express.errorHandler());
}

app.get('/', routes.index);
//app.get('/users', user.list);
app.get('/board/:team/:ord/:user_id', routes.board_re);
app.get('/board/:team/:ord/:user_id/:page', routes.board);
app.post('/board/write/:team', routes.board_write);
app.post('/board/delete/:team', routes.board_delete);
app.post('/board/like/:team', routes.board_like);
app.get('/high/:team/:hdate/:user_id/:page', routes.high);
app.post('/signup', routes.signup);
app.post('/email', routes.mail_check);
app.post('/login', routes.login);
app.post('/user/info', routes.user_info);
app.post('/user/modify', routes.user_modify);
app.post('/dropout', routes.dropout);

app.get('/user', routes.user);
app.get('/board_list', routes.board_list);
app.get('/user_sign', routes.user_sign);
app.get('/loginform', routes.loginform);

http.createServer(app).listen(app.get('port'), function(){
  console.log('Express server listening on port ' + app.get('port'));
});
