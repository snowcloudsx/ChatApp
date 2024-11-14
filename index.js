const http = require('http');
const fs = require('fs');


const server = http.createServer((req, res) => {
    if (req.url === '/') {
        fs.readFile(__dirname + '/index.html', (err, data) => {
            if (err) {
                res.writeHead(500);
                res.end('Error loading index.html');
            }else {
                res.writeHead(200, {'Content-Type': 'text/html'});
                res.end(data);
            }
            });
        }
});

const io = require('socket.io')(server);
const port=5000;


io.on('connection', (socket) => {
    socket.on('send name', (user) => {
        io.emit('send name', user);
    });

    socket.on('send message', (chat) => {
        io.emit('send message', chat);
    });
});


server.listen(port, () => {
    console.log(`Server running on port ${port}`);
});