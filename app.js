const express = require('express');
const app = express();
const socketIO = require('socket.io');
const http = require('http')
const httpServer = http.createServer(app);
const io = socketIO(httpServer);
const { v4: uuidv4 } = require('uuid');
const { cursorTo } = require('readline');
app.set('view engine', 'ejs');

app.get('/', (req, res) => {
    return res.render('index');
})
app.get('*', (req, res) => {
    return res.redirect('/');
})

let waitingUser = [];
const usersId = [], usersName = [];
let roomIdObj = {};  //it store socket id1 & 2 with room Id
let sockettoroom = {};
let cnt = 0;
//har do user ke liye ek room create kr ke join karwayege.
io.on('connection', (socket) => {
    socket.on('newUserJoined', () => {
        cnt++;
        io.emit('totalUser', cnt);
    })
    socket.on('joinroom', (username) => {

        if (usersId.indexOf(socket.id) == -1) {
            usersId.push(socket.id);
            usersName.push(username);
        }
        if (waitingUser.length == 0) {
            waitingUser.push(socket);
            return;
        } else {
            const newUser = socket;
            const roomId = uuidv4();
            const waitinguser = waitingUser.pop();
            const ind = usersId.indexOf(waitinguser.id);
            if (ind == -1) {
                waitingUser = [];
                waitingUser.push(socket);
                return;
            }
            const waitingusername = usersName[ind];
            waitinguser.join(roomId);
            newUser.join(roomId);
            io.to(roomId).emit('joinedInRoom', roomId);
            socket.emit('connectedTo', waitingusername);
            socket.broadcast.to(roomId).emit('connectedTo', username);
            let id1 = newUser.id, id2 = waitinguser.id;
            roomIdObj[roomId] = { id1, id2 };
            sockettoroom[id1] = roomId;
            sockettoroom[id2] = roomId;
        }

    })

    socket.on('chatMessage', (data) => {
        const roomId = data.roomId;
        const message = data.val;
        socket.broadcast.to(roomId).emit('messageFromServer', message);
    })
    socket.on('typing', () => {
        let roomId = sockettoroom[socket.id];
        socket.broadcast.to(roomId).emit('typing');
    })
    socket.on('disconnect', () => {
        if (cnt > 0)
            cnt--;
        io.emit('totalUser', cnt);
        const i = socket.id;
        const tempInd = usersId.indexOf(i);
        if (tempInd != -1) {
            let name = usersName[tempInd];
            usersId.splice(tempInd, 1);
            usersName.splice(tempInd, 1);
        }
        let roomId = sockettoroom[i];
        if (roomId == undefined) return;

        let socketIds = roomIdObj[roomId];
        let s1 = socketIds.id1;
        let s2 = socketIds.id2;
        const socket1 = io.sockets.sockets.get(s1);
        const socket2 = io.sockets.sockets.get(s2);
        if (socket1) {
            socket.broadcast.to(roomId).emit('createNew');
            socket1.leave(roomId);
        }
        else if (socket2) {
            socket.broadcast.to(roomId).emit('createNew');
            socket2.leave(roomId);
        }
    })

    // socket.on('changeConnection', () => {
    //     const i = socket.id;
    //     const tempInd = usersId.indexOf(i);
    //     // if (tempInd != -1) {
    //     //     let name = usersName[tempInd];
    //     //     usersId.splice(tempInd, 1);
    //     //     usersName.splice(tempInd, 1);
    //     // }
    //     let roomId = sockettoroom[i];
    //     if (roomId == undefined || roomId == null) return;

    //     // let socketIds = roomIdObj[roomId];
    //     // let s1 = socketIds.id1;
    //     // let s2 = socketIds.id2;
    //     // const socket1 = io.sockets.sockets.get(s1);
    //     // const socket2 = io.sockets.sockets.get(s2);
    //     // if (socket1) {
    //     //     console.log(usersName[s1]);
    //     //     socket.broadcast.to(roomId).emit('createNew');
    //     //     socket1.leave(roomId);
    //     // }
    //     // if (socket2) {
    //     //     console.log(usersName[s2]);
    //     //     socket.broadcast.to(roomId).emit('createNew');
    //     //     socket2.leave(roomId);
    //     // }
    //     const tempsocket = io.sockets.sockets.get(i);
    //     if (tempsocket) {
    //         socket.broadcast.to(roomId).emit('createNew');
    //         tempsocket.leave(roomId);
    //     }

    //     socket.emit('jointonew');
    // })
})


httpServer.listen(3000, () => {
    console.log("Server is running on port 3000");
})