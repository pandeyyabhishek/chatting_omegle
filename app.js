const express = require('express');
const app = express();
const socketIO = require('socket.io');
const http = require('http')
const httpServer = http.createServer(app);
const io = socketIO(httpServer);
const { v4: uuidv4 } = require('uuid');
app.set('view engine', 'ejs');

app.get('/', (req, res) => {
    return res.render('index');
})

let waitingUser = [];
const usersId = [], usersName = [];
let roomIdObj = {};  //it store socket id1 & 2 with room Id
let sockettoroom = {};
//har do user ke liye ek room create kr ke join karwayege.
io.on('connection', (socket) => {

    socket.on('joinroom', (username) => {
        // console.log("--------------------req for new connection-------------------------");
        if (usersId.indexOf(socket.id) == -1) {
            // console.log("pushing data in server id & name,");
            usersId.push(socket.id);
            usersName.push(username);
        }
        if (waitingUser.length == 0) {
            // console.log("waiting me   hu");
            waitingUser.push(socket);
            return;
        } else {
            // console.log("me kisi or ke sath join krne wala hun..");
            const roomId = uuidv4();
            const waitinguser = waitingUser.pop();
            const newUser = socket;
            const waitingusername = usersName[usersId.indexOf(waitinguser.id)];
            waitinguser.join(roomId);
            newUser.join(roomId);
            // console.log("me is ke sath joinkrunga", waitingusername);
            io.to(roomId).emit('joinedInRoom', roomId);
            socket.emit('connectedTo', waitingusername);
            socket.broadcast.to(roomId).emit('connectedTo', username);
            let id1 = newUser.id, id2 = waitinguser.id;
            // console.log("ids:", id1, id2);
            roomIdObj[roomId] = { id1, id2 };

            sockettoroom[id1] = roomId;
            sockettoroom[id2] = roomId;
            // console.log(sockettoroom);
        }

    })

    socket.on('chatMessage', (data) => {
        const roomId = data.roomId;
        const message = data.val;
        socket.broadcast.to(roomId).emit('messageFromServer', message);
    })

    socket.on('disconnect', () => {
        // console.log("one socket is disconnected");
        // console.log(usersName);
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
        // console.log(socket.id);
        if (socket1) {
            socket.broadcast.to(roomId).emit('createNew');
            socket1.leave(roomId);
            // waitingUser.push(socket1)
            // console.log(`Socket ${s1} has left room ${roomId}`);
        }
        else if (socket2) {
            socket.broadcast.to(roomId).emit('createNew');
            socket2.leave(roomId);
            // waitingUser.push(socket2)
            // console.log(`Socket ${s2} has left room ${roomId}`);

        }
    })
})
httpServer.listen(3000, () => {
    console.log("Server is running on port 3000");
})