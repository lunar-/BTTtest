
/*
 * GET home page.
 */

var mysql	= require('mysql');
var path	= require('path');
var fs		= require('fs');
var uuid	= require('uuid');
var easyimage = require('easyimage');
var async 	= require('async');

//서버용
var pool = mysql.createPool({
	host : '192.168.5.242',
	//port : '3306',
	user : 'udQTSq9usZrVM',
	password : 'pC35QDnmZUZHY',
	database : 'deb628a9d187b463995f54ae23fe6be95'
});


//로컬용
/*var pool = mysql.createPool({
	host : 'localhost',
	//port : '3306',
	user : 'root',
	password : 'dkagh11',
	database : 'BTT_DB'
});

process.env.UPLOAD_PATH = 'upload_image'; // 로컬 pc용 테스트
*/

exports.index = function(req, res){
	res.render('index', { title: 'Base Talk Talk' });
};

// lg 불판 리스트(임시)
exports.board_list = function(req, res){
	res.render('board_list', { title : 'Board list' });
};

//회원가입페이지
exports.user_sign = function(req, res){
	res.render('user_sign', { title : '회원가입' });
};

//로그인페이지
exports.loginform = function(req, res){
	res.render('loginform', { title : '로그인' });
};




// DB 처리

exports.user = function(req, res){
	pool.getConnection(function(pool_err, connection){
		if(pool_err) console.log('pool_err : ', pool_err);
		
		connection.query('SELECT USER_UUID, USER_EMAIL, USER_NICKNAME FROM BTT_USER_INFO where USER_DROPOUT_YN = "N"',
			function(err, rows){
				console.log('rows : ', rows);
	
				res.json({
					RESULT : 'SUCCESS',
					Itemlist : rows
				});
				connection.release();
			}
		);
	});
};


// 불판 글목록 리다이렉트
exports.board_re= function(req, res){
	var team_name = req.params.team;
	var user_id = req.params.user_id;
	var page = req.params.page;
	var ord = req.params.ord;
	
	if(page == undefined) {
		page = 1;
	}
	res.redirect('/board/' + team_name + '/' + ord + '/' + user_id + '/' + page);
};


// 불판 글목록 리스트
exports.board = function(req, res){
	var team_name = req.params.team;
	var user_id = req.params.user_id;
	var page = req.params.page;
	page = parseInt(page, 10);
	var size = 10;
	var begin = (page -1) * size;
	
	if(req.params.ord == 'T'){
		ord = 'ORDER BY BOARD_REGISTER_TIME DESC';
	} else if(req.params.ord == 'P') {
		ord = 'ORDER BY LIKE_QTY DESC';
	}
	var query = 'SELECT U.USER_UUID, U.USER_NICKNAME, U.USER_PICTURE, U.USER_TEAM, B.BOARD_INDEX, '
			+ 'B.BOARD_CONTENT, B.BOARD_REGISTER_TIME, B.BOARD_ATTACH_FILE, '
			+ '(select count(*) from BTT_LIKE_' + team_name + ' where LIKE_BOARD_ID = B.BOARD_INDEX and LIKE_CANCEL_YN = "N") as LIKE_QTY, '
			+ '(select "Y" from BTT_LIKE_LG where LIKE_USER_ID = ? and LIKE_BOARD_ID = B.BOARD_INDEX and LIKE_CANCEL_YN = "N") as LIKE_YN '
			+ 'FROM BTT_BOARD_' + team_name + ' B, BTT_USER_INFO U '
			+ 'WHERE B.BOARD_USER_ID = U.USER_UUID and B.BOARD_DEL_YN = "N" '
			+ ord
			+ ' limit ?, ?';
	
	console.log('query : ', query);
	
	pool.getConnection(function(pool_err, connection){
		connection.query(query,	[user_id, begin, size], function(err, rows){
			//console.log('rows : ', rows);
			/*var board_id = new Array();
			for(var i = 0 ; i < rows.length ; i++){
				board_id.push(rows[i].BOARD_INDEX);
			}
			
			var like_query = 'select LIKE_USER_ID, LIKE_BOARD_ID from BTT_LIKE_' + team_name + ' where LIKE_BOARD_ID in (?) and LIKE_CANCEL_YN = "N"';
			
			connection.query(like_query, [board_id], function(err, likes){
				
				for(var i=0 ; i < rows.length ; i++){
					rows[i].LIKE_LIST = [];
					for(var j=0 ; j < likes.length ; j++){
						if(rows[i].BOARD_INDEX == likes[j].LIKE_BOARD_ID){
							rows[i].LIKE_LIST.push(likes[j].LIKE_USER_ID);
						}
					}
				}
				
				console.log('Like list add.');
			});*/
			
			console.log('BULPAN rows are printed well.');
	
			res.json({
				RESULT : 'SUCCESS',
				CONTENTS : rows
			});
			connection.release();
		});
	});
};

// 불판 글쓰기
exports.board_write = function(req, res){
	var user_id	= req.body.USER_UUID;
	var content	= req.body.BOARD_CONTENT;
	var upfile	= req.files.BOARD_ATTACH_FILE;
	var team_name = req.params.team;
	var saved_file = null;

	var query = 'insert into BTT_BOARD_' + team_name + ' '
		+ '(BOARD_USER_ID, BOARD_CONTENT, BOARD_ATTACH_FILE, BOARD_REGISTER_TIME) '
		+ 'values(?, ?, ?, now())';
	
	console.log('upfile : ', upfile);
	
	async.series([
		function(callback){
			if(upfile != null){
				if(upfile.originalFilename){
					saved_file = imageUpload(upfile, user_id);
				}
			}
			
			
			callback(null, 'imageUpload');
		},
		function(callback){
			//console.log('saved_file : ', saved_file);
			pool.getConnection(function(pool_err, connection){
				connection.query(query,	[user_id, content, saved_file], function(err, result){
					if(err) {
						console.log('err', err);
						res.json({ RESULT : 'FAIL', RESULT_MSG : err });
					} else {
						console.log('result', result);
						res.json({ RESULT : 'SUCCESS' });
					}
					connection.release();	
				});
			});
			
			callback(null, 'insertQuery');
		}]
	);
	
};

// 불판 글 지우기
exports.board_delete = function(req, res){
	var user_id	= req.body.USER_UUID;
	var board_id= req.body.BOARD_INDEX;
	var team_name = req.params.team;
	
	var query = 'update BTT_BOARD_' + team_name + ' set BOARD_DEL_YN = "Y" '
			+ 'where BOARD_USER_ID = ? and BOARD_INDEX = ?';

	console.log('bulpan delete : ', user_id + ' / ' + board_id);
	
	pool.getConnection(function(pool_err, connection){
		connection.query(query,	[user_id, board_id], function(err, result){
			if(err) {
				console.log('err', err);
				res.json({ RESULT : 'FAIL', RESULT_MSG : err });
			} else {
				console.log('result', result);
				res.json({ RESULT : 'SUCCESS' });
			}
			connection.release();
		});
	});
};

// 좋아요 추가 및 취소
exports.board_like = function(req, res){
	var user_id		= req.body.USER_UUID;
	var board_id	= req.body.BOARD_INDEX;
	var team_name	= req.params.team;
	var worktype	= '';
	
	
	var select_query = 'select LIKE_INDEX, LIKE_CANCEL_YN from BTT_LIKE_' + team_name + ' '
			+ 'where LIKE_USER_ID = ? and LIKE_BOARD_ID = ?'; // 해당 글에 유저가 좋아요를 누른적이 있는지 확인.
	
	console.log('++++++board_id :', board_id);
	
	pool.getConnection(function(pool_err, connection){
		if(pool_err) console.log('pool_err : ', pool_err);
		
		connection.query(select_query, [user_id, board_id], function(sel_err, sel_result){
			if(sel_err){
				console.log('sel_err', sel_err);
				res.json({ RESULT : 'FAIL', RESULT_MSG : sel_err });
				
			} else {
				if(sel_result.length == 0){	// 좋아요 이력이 없을 경우 추가
					var insert_query = 'insert into BTT_LIKE_' + team_name + ' (LIKE_USER_ID, LIKE_BOARD_ID) values (?, ?)';
					
					connection.query(insert_query, [user_id, board_id], function(ins_err, ins_result){
						if(ins_err){
							console.log('ins_err', ins_err);
							res.json({ RESULT : 'FAIL', RESULT_MSG : ins_err });
						} else {
							console.log('ins_result', ins_result);
							worktype = 'ADD';
							//res.json({status : 'success'}); // work_type 값을 add 로
						}
					});
				} else { // 좋아요 이력이 있을 경우 삭제(취소)
					var delete_query = 'delete from BTT_LIKE_' + team_name + ' '
							+ 'where LIKE_USER_ID = ? and LIKE_BOARD_ID = ?';
					
					connection.query(delete_query, [user_id, board_id], function(del_err, del_result){
						if(del_err){
							console.log('del_err', del_err);
							res.json({ RESULT : 'FAIL', RESULT_MSG : del_err });
						} else {
							console.log('del_result', del_result);
							worktype = 'CANCEL';
						}
					});
				}
				
				// 좋아요 숫자 카운트
				var count_query = 'select count(*) from BTT_LIKE_' + team_name + ' '
						+ 'where LIKE_BOARD_ID = ?';
				
				connection.query(count_query, [board_id], function(cou_err, cou_result){
					if(cou_err){
						console.log('cou_err', cou_err);
						res.json({ RESULT : 'FAIL', RESULT_MSG : cou_err });
					} else {
						console.log('cou_result', cou_result);
						
						//최종 값 리턴
						res.json({ RESULT : 'SUCCESS', WORKTYPE : worktype, LIKE_QTY : cou_result[0] });
					}
				});
			}
			
			connection.release();
		});
	});
};

// 하이라이트
exports.high = function(req, res){
	var team_name = req.params.team;
	var hdate = req.params.hdate;
	var user_id = req.params.user_id;
	var page = req.params.page;
	page = parseInt(page, 10);
	var size = 10;
	var begin = (page - 1) * size;
	var like = '1';
	
	var query = 'SELECT U.USER_UUID, U.USER_NICKNAME, U.USER_PICTURE, U.USER_TEAM, B.BOARD_INDEX, B.BOARD_USER_ID, '
			+ 'B.BOARD_CONTENT, B.BOARD_REGISTER_TIME, B.BOARD_ATTACH_FILE, '
			+ '(select count(*) from BTT_LIKE_' + team_name + ' where LIKE_BOARD_ID = B.BOARD_INDEX and LIKE_CANCEL_YN = "N") as LIKE_QTY, '
			+ '(select "Y" from BTT_LIKE_LG where LIKE_USER_ID = ? and LIKE_BOARD_ID = B.BOARD_INDEX and LIKE_CANCEL_YN = "N") as LIKE_YN '
			+ 'FROM BTT_BOARD_' + team_name + ' B, BTT_USER_INFO U '
			+ 'WHERE B.BOARD_USER_ID = U.USER_UUID and B.BOARD_DEL_YN = "N" '
			+ 'and (select count(*) from BTT_LIKE_LG where LIKE_BOARD_ID = B.BOARD_INDEX ) >= ' + like + ' '
			+ 'and DATE_FORMAT(BOARD_REGISTER_TIME,"%y%m%d") = ' + hdate + ' '
			+ 'ORDER BY BOARD_REGISTER_TIME DESC'
			+ 'limit ?, ?';
	
	console.log('HIGHLIGHT query : ', query);
	
	pool.getConnection(function(pool_err, connection){
		connection.query(query, [user_id, begin, size],	function(err, rows){
			//console.log('rows : ', rows);
			console.log('HIGHLIGHT rows are printed well.');
	
			res.json({
				RESULT : 'SUCCESS',
				CONTENTS : rows
			});
			connection.release();
		});
	});
};

//회원가입
exports.signup = function(req, res){
	var nick	= req.body.USER_NICKNAME;
	var email	= req.body.USER_EMAIL;
	var pwd		= req.body.USER_PASSWORD;
	var team	= req.body.USER_TEAM;
	var push	= req.body.USER_PUSH_ID;
	
	if((!nick) || (!email) || (!pwd) || (!team) || (!push)) {
		res.json({ RESULT : 'FAIL', RESULT_MSG : 'Params have a null value.' });
	}
	
	var user_id = uuid.v1();
	
	var ins_query = 'insert into BTT_USER_INFO '
					+ '(USER_UUID, USER_NICKNAME, USER_EMAIL, USER_PASSWORD, USER_TEAM, USER_PUSH_ID, USER_SIGNUP_DATE) '
					+ 'VALUES(?, ?, ?, ?, ?, ?, now())';
	
	pool.getConnection(function(pool_err, connection){
		connection.query(ins_query, [user_id, nick, email, pwd, team, push], function(err, result){
			if(err) {
				console.log('err', err);
				res.json({ RESULT : 'FAIL', RESULT_MSG : err });
			} else {
				console.log('result', result);
				res.json({ RESULT : 'SUCCESS', USER_UUID : user_id });
			}
			connection.release();	
		});
	});
};

//메일 중복체크
exports.mail_check = function(req, res){
	var user_mail = req.body.USER_EMAIL;
	var query = 'select count(*) cnt from BTT_USER_INFO where USER_EMAIL = ?';
	//console.log('user_mail', user_mail);
	
	pool.getConnection(function(pool_err, connection){
		connection.query(query, [user_mail], function(err, result){
			if(err) {
				console.log('err', err);
				res.json({ RESULT : 'FAIL', RESULT_MSG : err });
			} else {
				console.log('result', result[0].cnt);
				if(result[0].cnt == 0){
					res.json({ RESULT : 'SUCCESS'});
				} else {
					res.json({
						RESULT : 'FAIL',
						RESULT_MSG : 'This email is already used.'
					});
				}
			}
			connection.release();	
		});
	});
};

//로그인
exports.login = function(req, res){
	var user_mail = req.body.USER_EMAIL;
	var user_pwd	= req.body.USER_PASSWORD;
	var query = 'select count(*) cnt, USER_UUID from BTT_USER_INFO where USER_EMAIL = ? and USER_PASSWORD = ?';
	console.log('으앙 : ', user_mail + ' + ' + user_pwd);
	
	pool.getConnection(function(pool_err, connection){
		connection.query(query, [user_mail, user_pwd], function(err, result){
			if(err) {
				console.log('err', err);
				res.json({ RESULT : 'FAIL', RESULT_MSG : err });
			} else {
				console.log('result', result);
				if(result[0].cnt == 1){
					res.json({
						RESULT		: 'SUCCESS',
						USER_UUID	: result[0].USER_UUID
					});
				} else {
					res.json({
						RESULT		: 'FAIL',
						RESULT_MSG	: 'A wrong password.'
					});
				}
			}
			connection.release();	
		});
	});
};

//회원 정보 불러오기
exports.user_info = function(req, res){
	var user_id = req.body.USER_UUID;
	var query = 'select USER_UUID, USER_NICKNAME, USER_EMAIL, USER_PASSWORD, '
			+ 'USER_TEAM, USER_PICTURE, USER_COMMENT '
			+ 'from BTT_USER_INFO '
			+ 'where USER_UUID = ?';

	pool.getConnection(function(pool_err, connection){
		if(pool_err) console.log('pool_err : ', pool_err);
		
		connection.query(query, [user_id], function(err, result){
			console.log('result : ', result);
			res.json({
				RESULT	: 'SUCCESS',
				CONTENT	: result[0]
			});
			connection.release();
		});
	});
};

//회원 정보 수정
exports.user_modify = function(req, res){
	var user_id = req.body.USER_UUID;
	var user_nick = req.body.USER_NICKNAME;
	var user_mail = req.body.USER_EMAIL;
	var user_pwd = req.body.USER_PASSWORD;
	var user_team = req.body.USER_TEAM;
	var user_comment = req.body.USER_COMMENT;
	var user_pic = req.files.USER_PICTURE;
	
	var saved_file = null;

	var query = 'update BTT_USER_INFO set USER_NICKNAME = ?, USER_EMAIL = ?, USER_PASSWORD = ?, '
				+ 'USER_TEAM = ?, USER_COMMENT = ?, USER_PICTURE = ? '
				+ 'where USER_UUID = ?';
	
	console.log('user_pic : ', user_pic);
	
	async.series([
		function(callback){
			if(user_pic != null){
				if(user_pic.originalFilename){
					saved_file = imageUpload(user_pic, user_id);
				}
			}
			
			callback(null, 'imageUpload');
		},
		function(callback){
			pool.getConnection(function(pool_err, connection){
				connection.query(query,	
						[user_nick, user_mail, user_pwd, user_team, user_comment, saved_file, user_id], 
						function(err, result){
					if(err) {
						console.log('err', err);
						res.json({ RESULT : 'FAIL', RESULT_MSG : err });
					} else {
						console.log('result', result);
						res.json({ RESULT : 'SUCCESS' });
					}
					connection.release();	
				});
			});
			
			callback(null, 'insertQuery');
		}]
	);
};

//회원탈퇴
exports.dropout = function(req, res){
	var user_mail = req.body.USER_EMAIL;
	var user_pwd = req.body.USER_PASSWORD;
	
	var query = 'update BTT_USER_INFO set USER_DROPOUT_YN = "Y", USER_DROPOUT_DATE = now() '
			+ 'where USER_EMAIL = ? and USER_PASSWORD = ?';
		
	pool.getConnection(function(pool_err, connection){
		connection.query(query,	[user_mail, user_pwd], function(err, result){
			if(err) {
				console.log('err', err);
				res.json({ RESULT : 'FAIL', RESULT_MSG : err });
			} else {
				console.log('result', result);
				res.json({ RESULT : 'SUCCESS' });
			}
			connection.release();
		});
	});
};


//바코드 입력
/*exports.barcode = function(req, res){
	//날짜, 경기장, 유저uuid 입력.
	var game_day =  req.body.game_day;
	var game_place = req.body.game_place;
	var user_id = req.body.USER_UUID;
	
	var find_query = 'select GAME_ID, TEAM1, TEAM2 from GAME_SCHEDULE'
				+ 'where GAME_DAY = ? and GAME_PLACE = ?';
	
	var ins_query = 'update BTT_USER_INFO set USER_GAMECODE = ?'
				+ 'where USER_UUID = ?';
	
	//경기일정 테이블에서 파라미터로 경기 검색
	pool.getConnection(function(pool_err, connection){
		connection.query(find_query, [game_day, game_place], function(err, result){
			if(err) {
				console.log('err', err);
				res.json({ RESULT : 'FAIL', RESULT_MSG : err });
			} else {
				console.log('length : ', result.length);
				console.log('result', result);
				res.json({ RESULT : 'SUCCESS' });
			}
			connection.release();
		});
	});
	
	
	//유저 직관 테이블에 경기코드 입력.
	
};*/

function imageUpload(upfile, user_id){
	var saved_file = '';
	var userfolder = path.resolve(process.env.UPLOAD_PATH, user_id);
	//console.log('userfolder', userfolder);
	
	// 유저 id 명의 폴더가 없으면 생성
	if(!fs.existsSync(userfolder)){
		fs.mkdirSync(userfolder);
	}
	
	//이미지 파일 이름을 새로운 uuid로 교체
	var oldFileName = upfile.name;
	var idx = oldFileName.lastIndexOf('.');
	var ext = oldFileName.substring(idx);
	var newFileName = uuid.v1() + ext;
	
	var srcpath = upfile.path;
	var destpath = path.resolve(__dirname, '..', userfolder, newFileName);
	var is = fs.createReadStream(srcpath);
	var os = fs.createWriteStream(destpath);
	is.pipe(os);
	is.on('end', function(){
		fs.unlinkSync(srcpath);

		var srcimg = destpath;
		var destIdx = srcimg.lastIndexOf('.');
		var dextExt = srcimg.substring(destIdx);
		var filename = srcimg.substring(0, destIdx);
		var destimg = filename + '-thum' + dextExt;
		
		easyimage.resize({ src : srcimg, dst : destimg, width : 100, height : 100}, 
			function(err, image){
				if(err){
					console.log('err', err);
					res.json({ RESULT : 'FAIL', RESULT_MSG : err });
				}
		});
	});
	saved_file = '/uploads/' + user_id + '/' + newFileName;
	console.log("saved_file : ", saved_file);
	
	return saved_file;
}

