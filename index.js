/*
 * @Author: 菱 admin@example.com
 * @Date: 2023-08-27 12:33:18
 * @LastEditors: error: error: git config user.name & please set dead value or install git && error: git config user.email & please set dead value or install git & please set dead value or install git
 * @LastEditTime: 2023-11-16 18:24:40
 * @FilePath: \SCUM\socket.js
 * @Description: 这是默认设置,请设置`customMade`, 打开koroFileHeader查看配置 进行设置: https://github.com/OBKoro1/koro1FileHeader/wiki/%E9%85%8D%E7%BD%AE
 */
const express = require("express")
const app = express()
const http = require("http")
const cors = require("cors")
const server = http.createServer(app)
const socketio = require("socket.io")
const Joi = require('joi')

const io = socketio(server, {
    maxHttpBufferSize: 1024 * 10240
})
var mongo = require('mongodb').MongoClient;
const { ObjectId } = require('mongodb');
const stringRandom = require('string-random');

var url = 'mongodb://robot:kkBzWJxeFDbYEKdi@10.0.0.9:27017/?authSource=robot';
const dbName = 'robot';
const op = {
    useNewUrlParser: true
}
const client = new mongo(url, op);
const db = client.db(dbName);

client.connect();

app.use(cors())
app.use(express.json({ limit: "10240kb" }))

server.listen(5786, () => {
    console.log("机器人服务");
})

let sockets = {}

let types = [
    "message",
    "Mouse",
    "Keyboard",
    "Clipboard",
    "Screen"
]

io.on("connection", async (socket) => {
    // socket
    console.log(`一个客户端已连接：${socket.id}`);
    console.log(socket.handshake.auth.token);
    let querySelkey = await db.collection("account").findOne({ selkey: socket.handshake.auth.token })

    if (querySelkey) {

        sockets[querySelkey.selkey] = {
            socketid: socket.id,
            selkey: querySelkey.selkey,
            name: querySelkey.nickname,
            username: querySelkey.username,
            run: false
        }
        console.log("验证正确");
        socket.emit("system", "connect", "连接成功")
        socket.emit(querySelkey.selkey, "TP", querySelkey.tp)

        socket.emit(querySelkey.selkey, "message", "等待操作输入", (responses) => {
            console.log(responses); // one response per client
        })

        let code = await db.collection("app").findOne({ selkey: querySelkey.selkey })
        if (code) {
            socket.emit(querySelkey.selkey, "TP", code.name)
            socket.emit(querySelkey.selkey,"cloudRun",{
                code: code.data.code,
                data: code.data,
                wait: 0.3
            })
            // socket.disconnect()
        }

    } else {
        socket.disconnect()
        console.log("验证失败关闭连接");
    }


    socket.on("disconnect", (e) => {
        console.log(`一个客户端断开连接`, socket.id);
        for (const key in sockets) {
            if (sockets[key].socketid == socket.id) {
                delete sockets[key]
            }
        }
    })
})

app.get("/config", (req, res) => {
    res.send({
        version: "1.0.0",
        mainUrl: "http://baidu.com",
        AD: "https://www.jq22.com/demo/jquery-lunbotu-150202204549/images/pic_03.jpg",
        title: "小零机器人",
        author: "Zero QQ:1260067702",
        ws: "ws://robot.if9.cc:5786",
        // ws: "ws://10.0.0.18:9000",
    })
})
app.post("/api/robotreg", async (req, res) => {
    console.log(req.body);
    if (!req.body) {
        res.send({
            code: 201,
            msg: "error",
            data: {}
        })
        return
    }
    if (!req.body.username || req.body.username == "" || req.body.username < 6) {
        res.send({
            code: 201,
            msg: "error",
            data: {}
        })
        return
    }
    if (!req.body.password || req.body.password == "" || req.body.password < 6) {
        res.send({
            code: 202,
            msg: "error",
            data: {}
        })
        return
    }
    if (!req.body.nickname || req.body.nickname == "" || req.body.nickname.length < 3) {
        res.send({
            code: 203,
            msg: "error",
            data: {}
        })
        return
    }

    let queryreg = await db.collection("account").findOne({ username: req.body.username })
    console.log(queryreg);
    if (queryreg) {
        res.send({
            code: 204,
            msg: "用户名已被注册",
            data: {}
        })
        return
    }
    let selkey = stringRandom(30)
    let reg = await db.collection("account").insertOne({
        username: req.body.username,
        password: req.body.password,
        nickname: req.body.nickname,
        selkey,
        tp: "SCUM"
    })
    console.log(reg);
    if (reg.acknowledged) {
        res.send({
            code: 200,
            msg: "注册成功",
            data: {
            }
        })
    } else {
        res.send({
            code: 205,
            msg: "注册失败",
            data: {
                // selkey: stringRandom(30)
            }
        })
    }

})

app.post("/api/robotLogin", async (req, res) => {
    console.log(req.body);
    let schema = Joi.object({
        username: Joi.string().min(6).max(11).required().error(new Error("用户名不合法")),
        password: Joi.string().min(6).max(11).required().error(new Error("密码不合法"))
    })

    let { error } = schema.validate(req.body, { allowUnknown: true, abortEarly: true })
    console.log(error);
    if (error) {
        console.log("表单错误");
        res.send({
            code: 500,
            data: {},
            msg: error.message
        })
        return
    }
    let login = await db.collection("account").findOne({
        username: req.body.username,
        password: req.body.password
    })
    console.log(login);
    if (login) {
        res.send({
            code: 200,
            msg: "登录成功",
            data: {
                selkey: login.selkey
            }
        })
    } else {
        res.send({
            code: 203,
            msg: "登录失败",
            data: {}
        })
    }


})

app.get("/api/robotList", (req, res) => {
    console.log("获取机器人在线列表");
    res.send({
        code: 200,
        msg: "机器人列表",
        data: sockets
    })
})

app.post("/api/message", (req, res) => {
    console.log(req.query);
    console.log(req.body);
    if (!req.query || !req.body || !req.query.selkey) {
        res.send({
            code: 201,
            msg: "参数错误",
            data: {}
        })
        return
    }
    if (!sockets[req.query.selkey]) {
        res.send({
            code: 202,
            msg: "机器人不在线",
            data: {}
        })
        return
    }
    // console.log();
    if (!req.body.type) {
        res.send({
            code: 205,
            msg: "参数错误",
            data: {}
        })
        return
    }

    if (sockets[req.query.selkey].run) {
        res.send({
            code: 203,
            msg: "操作中",
            data: {}
        })
        return
    }

    if (types.filter(i => {
        if (i == req.body.type) return true
    })) {
        console.log(`机器人空闲:${req.query.selkey}`);
        sockets[req.query.selkey].run = true
        io.timeout(req.body.timeout ? req.body.timeout : 20000).to(sockets[req.query.selkey].socketid).emit(req.query.selkey, req.body.type, {
            code: req.body.code,
            data: req.body.data,
            wait: 0.3
        }, (err, responses) => {
            console.log("机器人回调");
            console.log(responses, err); // one response per client
            if (err) {
                res.send({
                    code: 202,
                    msg: "消息处理错误",
                    data: responses
                })
                if (sockets[req.query.selkey]) {
                    sockets[req.query.selkey].run = false
                }
                return
            }
            if (responses) {
                res.send({
                    code: 200,
                    msg: "消息处理完成",
                    data: responses
                })
            } else {
                res.send({
                    code: 200,
                    msg: "无反回数据",
                    data: responses
                })
            }
            if (sockets[req.query.selkey]) {
                sockets[req.query.selkey].run = false
            }
        })

    } else {
        res.send({
            code: 204,
            msg: "操作类型错误",
            data: {}
        })
    }
})

app.post("/api/getCode", async (req, res) => {
    if (!req.query || !req.query.selkey) {
        res.send({
            code: 500,
            data: {},
            msg: "密钥错误"
        })
        return
    }

    let app = await db.collection("app").findOne({ selkey: req.query.selkey })
    if (app) {
        res.send({
            code: 200,
            data: app,
            msg: "拉取成功"
        })
    } else {
        res.send({
            code: 500,
            data: {},
            msg: "拉取错误"
        })
    }
})

app.post("/api/setCode", async (req, res) => {
    console.log(req.body);
    if (!req.query || !req.query.selkey) {
        res.send({
            code: 500,
            data: {},
            msg: "密钥错误"
        })
        return
    }

    let app = await db.collection("app").findOne({ selkey: req.query.selkey })
    if (app) {
        await db.collection("app").updateOne({ selkey: req.query.selkey }, { $set: req.body })
        res.send({
            code: 200,
            msg: "提交成功"
        })
    } else {
        res.send({
            code: 500,
            data: {},
            msg: "提交失败"
        })
    }
})