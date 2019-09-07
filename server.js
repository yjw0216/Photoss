const express = require('express')
const app = express()
//app.listen(3000)
var server = require('http').createServer(app);
var io = require('socket.io').listen(server);
server.listen(3000,function(){
    console.log('socekt io server listening on port 3000')
})
const connections = [];
//var socketId ='';
var globalSenderId='';
var globalReceiverId='';
io.sockets.on('connection', function(socket) {
    connections.push(socket);
    var userSocket = socket.id;
    var sql="UPDATE test.account SET socketId = ? WHERE (id = ?);"
    //console.log('여기가메인'+userId+userSocket);
    //console.log(gol)
    connection.query(sql,[userSocket,globalSenderId],function(err,result){
        if (err) {
            throw err;
        }
        
    });
        

    console.log(' %s sockets is connected', connections.length);
    for(i=0;i<connections.length;i++){
        console.log((i+1)+"번째 회원: "+connections[i].id);
        
    }
    //console.log('현재 연결된 회원',socket.id);

    // 접속한 클라이언트의 정보가 수신되면
    socket.on('disconnect', () => {
        connections.splice(connections.indexOf(socket), 1);
     });
    //socket.emit('news', { hello: 'world' });

    socket.on('message special user', function(data) {
        for(i=0;i<connections.length;i++){
            console.log('special')
            console.log((i+1)+"번째 회원: "+connections[i].id);
            
        }
        //console.log(connections[0].id)
        var sql="SELECT socketId FROM test.account WHERE (id = ?);"
        //console.log('여기가메인'+userId+userSocket);
        connection.query(sql,globalReceiverId,function(err,result){
            if (err) {
                throw err;
            }
            console.log('메세지'+result[0].socketId)
            io.to(result[0].socketId).emit('message', 'tmp');
        });
        
        //console.log(data);
    
     });
     socket.on('reMessage', (data) => {
        console.log(data);
        if(data==true){
            var sql="SELECT socketId FROM test.account WHERE (id = ?);"
            //console.log('여기가메인'+userId+userSocket);

            connection.query(sql,'11',function(err,result){
                if (err) {
                    throw err;
                }
                console.log('리메세지'+result[0].socketId)
                io.to(result[0].socketId).emit('locate',data);
            });
            
        }
     });
});

var path = require('path'); 
var mysql      = require('mysql');
var request = require('request');
const bodyParser= require('body-parser')
const multer = require('multer');
var fs = require("fs");
var jwt = require('jsonwebtoken');
var auth = require('./auth');
var connection = mysql.createConnection({
    host     : 'database-3.cntdwybawmyt.ap-southeast-1.rds.amazonaws.com',
    user     : 'photoss',
    password : '1234567890',
    router: '3306',
    database : 'test'
});

connection.connect();

app.set('views', __dirname + '/views');
app.set('view engine', 'ejs');

app.use(bodyParser.urlencoded({extended: true}))
app.use(express.json());
app.use(express.urlencoded({extended : false}));
app.use(express.static(path.join(__dirname, 'public')));

var storage = multer.diskStorage({
    destination: function (req, file, cb) {
      cb(null, 'public/uploads')
    },
    filename: function (req, file, cb) {
      cb(null, file.originalname)
    }
})
   
var upload = multer({ storage: storage })

app.get('/', function (req, res) {
    res.render('login')
})

app.post('/login', function (req, res) {
    var userEmail = req.body.userEmail;
    var userPass = req.body.userPass;
    var sql = "SELECT * FROM test.account WHERE email = ?";
    connection.query(sql, userEmail, function (err, result) {
        if (err) {
            throw err;
        }
        else {
            if (result.length > 0) {
                var tokenKey = "f$i1nt#ec1hT@oke1n!Key";  //auth.js에 있는 token key와 동일
                if (result[0].password == userPass) {
                    globalSenderId=result[0].id
                    jwt.sign(
                        {
                        userName: result[0].name,
                        userId: result[0].id,
                        },
                        tokenKey,
                        {
                        expiresIn: '1d',
                        issuer: 'fintech.admin',
                        subject: 'user.login.info'
                        },
                        function (err, token) {
                        res.json(token)
                        }
                    )
                }
                else{
                    res.json(2)
                }
            }
            else{
                res.json(3)
            }
        }
    })
})

app.get('/main', auth, function (req, res) {
    res.render('main');
    var userId = req.decoded.userId;
    
})

app.post('/uploadfile', auth, upload.single('myFile'), (req, res, next) => {
    var userId = req.decoded.userId;
    var ip = require("ip");
    const file = req.file;
    
    var result = {
        isFace:true,
        isUser:true,
        receiver:'',
        sender:'',
        senderUrl:'',
        url:''
    }

    if (!file) {
      const error = new Error('Please upload a file')
      error.httpStatusCode = 400
      res.redirect('/main?isFile=false');
      return next(error)
    }

    var option = {
        method : "POST",
        url : "http://172.20.10.4:5000/sendImg",
        form : {
            ImgPath : "http://"+ip.address()+":3000/uploads/"+ file.originalname,
            originalname : file.originalname,
            userId : userId
        }   
    }

    request(option, function(err, response, body){
        if(err) throw err;
        else {
            if(JSON.parse(body)[0] == 'none'){
                result.isFace = false;
                res.send(result)
            }
            else{
                connection.query("SELECT * FROM test.account where id='"+JSON.parse(body)[0]+"'", function(err, receiver, fields){
                    globalReceiverId=JSON.parse(body)[0];
                    if (err) throw err;
                    else if(receiver.length == 0){
                        result.isUser = false;
                        res.send(result)
                    }
                    else{
                        connection.query("SELECT * FROM test.account where id='"+userId+"'", function(err, sender, fields){
                            
                            result.receiver = receiver[0];
                            result.sender = sender[0];
                            result.senderUrl = JSON.parse(body)[2];
                            result.url = JSON.parse(body)[1];
                            res.send(result)
                        })
                    }
                })
            }
        }
    })        
    return(res)
})

app.get('/remit', function(req,res){
    var receiverName = req.query.receiverName;
    var receiverAccount = req.query.receiverAccount;
    var receiverBank = req.query.receiverBank;
    var senderName = req.query.senderName;
    var senderAccount = req.query.senderAccount;
    var senderBank = req.query.senderBank;
    var senderUrl = req.query.senderUrl;
    var url = req.query.url;
    
    res.render('remit', {
        receiverName : receiverName, 
        receiverAccount : receiverAccount,
        receiverBank : receiverBank,
        senderName : senderName,
        senderAccount : senderAccount,
        senderBank : senderBank,
        senderUrl: senderUrl, 
        url: url
    });
})

app.post('/remitMoney', auth, function(req,res){
    var userId = req.decoded.userId;
    var remitMoney = req.body.remitMoney;
    remitMoney = parseInt(remitMoney);
    var receiverName = req.body.receiverName;
    var senderName = req.body.senderName;

    connection.query("SELECT amount FROM test.account where id = "+userId+";", function(err, senderAmount, fields){
        var senderMoney = senderAmount[0].amount;
        if (senderMoney >= remitMoney){
            // 송금
            var senderUpdateMoney = senderMoney-remitMoney;
            connection.query("UPDATE test.account SET amount = ? WHERE (id = ?);",[senderUpdateMoney,userId] ,function(err, result, fields){
                connection.query("select amount from test.account where name = ?;",receiverName, function(err, receiverAmount, fields){
                    var receiverUpdateMoney = remitMoney + receiverAmount[0].amount;
                    connection.query("update test.account SET amount =? where (name = ?);",[receiverUpdateMoney,receiverName] ,function(err, result, fields){
                        res.json(true);
                    })
                })
            })
        }
        else{
            // 잔액 부족
            res.json(false);
        }
    })
})

app.get('/connect', function (req, res) {
    res.render('connect')
})

app.post('/changePre', auth, function (req, res) {
    var userId = req.decoded.userId;
    connection.query("UPDATE `test`.`account` SET `preference` = '"+req.body.pre+"' WHERE (`id` = '"+userId+"');", function(err, sender, fields){
    })
    connection.query("SELECT `preference` FROM test.account where id='"+userId+"'", function(err, sender, fields){
        res.render('main', {preference: sender[0].preference});
    })
})

app.get('/mypage', function (req, res) {
    res.render('mypage')
})

app.post('/getUserInfo', auth, function(req, res){
    var userId = req.decoded.userId;
    var sql = "SELECT * FROM test.account WHERE id = ?";

    connection.query(sql, userId, function(err, result){
        if(err){
            throw err;
        }
        else{
            if(result.length > 0){
                res.json(result);
            }
        }
    })
})

app.post('/getModify', auth, function(req, res){
    var id = req.decoded.userId;
    var userId = req.body.userId;
    var userName = req.body.userName;
    var userEmail = req.body.userEmail;
    var userPass = req.body.userPass;
    var sql = "UPDATE test.account SET id = ?, name = ?, "
    + "email = ?, password = ? WHERE id = ?";

    connection.query(sql, [userId, userName, userEmail, userPass, id], function(err, result){
        if(err){
            throw err;
        }
        else{
            res.json(1);
        }
    })
})

app.get('/account', function (req, res) {
    res.render('account')
})

app.get('/getBalance', auth, function (req, res) {
    //jwt에서 userId값을 가져옴
    var userId = req.decoded.userId;
    //핀테크이용번호
    var finusernum = req.query.finusernum;
    //현재날짜
    var d = new Date();
    var yyyy = d.getFullYear(); var mm = d.getMonth() + 1; var dd = d.getDate();
    var hh = d.getHours(); var mi = d.getMinutes(); var sec = d.getSeconds();
    if (dd < 10) dd = '0' + dd; if (mm < 10) mm = '0' + mm; if (hh < 10) hh = '0' + hh;
    if (mi < 10) mi = '0' + mi; if (sec < 10) sec = '0' + sec;
    var tran_dtime = yyyy + mm + dd + hh + mi + sec;

    var getTokenUrl = "https://testapi.open-platform.or.kr/v1.0/account/balance?fintech_use_num="
        + finusernum
        + "&tran_dtime="
        + tran_dtime;
    var sql = "SELECT * FROM test.account WHERE id = ?"

    connection.query(sql, [userId], function (err, result) {    
        var accessToken = result[0].accessToken;
        var option = {
            method: "GET",
            url: getTokenUrl,
            headers: {
                Authorization: "Bearer " + accessToken
            }
        }
        request(option, function (err, response, body) {
            if (err) throw err;
            else {
                res.json(JSON.parse(body).balance_amt);
            }
        })
    });
})

app.get('/mainAccount', auth, function (req, res) {
    //jwt에서 userId값을 가져옴
    var userId = req.decoded.userId;
    //핀테크이용번호
    var i = parseInt(req.query.i);
    //현재날짜
    var d = new Date();
    var yyyy = d.getFullYear(); var mm = d.getMonth() + 1; var dd = d.getDate();
    var hh = d.getHours(); var mi = d.getMinutes(); var sec = d.getSeconds();
    if (dd < 10) dd = '0' + dd; if (mm < 10) mm = '0' + mm; if (hh < 10) hh = '0' + hh;
    if (mi < 10) mi = '0' + mi; if (sec < 10) sec = '0' + sec;
    var tran_dtime = yyyy + mm + dd + hh + mi + sec;

    var getTokenUrl = "https://testapi.open-platform.or.kr/user/me?user_seq_no=1100035344"

    var sql = "SELECT * FROM test.account WHERE id = ?"
    connection.query(sql, [userId], function (err, result) {    
        var accessToken = result[0].accessToken;
        var option = {
            method: "GET",
            url: getTokenUrl,
            headers: {
                Authorization: "Bearer " + accessToken
            }
        }
        request(option, function (err, response, body) {
            if (err) throw err;
            else {
                var bank = JSON.parse(body).res_list[i].bank_name;
                var account = JSON.parse(body).res_list[i].account_num_masked;
                var sql2 = "UPDATE test.account SET bank = ?, account = ? WHERE id = ?";
                connection.query(sql2, [bank, account, userId], function (err, result){
                    res.send(JSON.parse(body).balance_amt);
                })
            }
        })
    });
})

//본인 계좌 연동 정보 가져와서 출력
app.post("/getUser", auth, function (req, res) {
    //jwt에서 userId값을 가져옴
    var userId = req.decoded.userId;
    var sql = "SELECT * FROM test.account WHERE id = ?"
    connection.query(sql, [userId], function (err, result) {
        var userseqnum = result[0].userseqnum;
        var accessToken = result[0].accessToken;
        var getTokenUrl = "https://testapi.open-platform.or.kr/user/me?user_seq_no=" + userseqnum;
        var option = {
            method: "GET",
            url: getTokenUrl,
            headers: {
            Authorization: "Bearer " + accessToken
            }
        };
        request(option, function (err, response, body) {
            if (err) throw err;
            else {
                res.json(JSON.parse(body));
            }
        })
    });
})

