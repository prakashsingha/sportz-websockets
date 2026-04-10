import {WebSocket, WebSocketServer} from 'ws';

function sendJson(socket, data) {
    if(socket.readyState !== WebSocket.OPEN) return;

    socket.send(JSON.stringify(data));
}

function broadcastJson(wss, data) {
    for(const client of wss.clients) {
        sendJson(client, data);
    }
}

export function attachWebSocketServer(server) {
    const wss = new WebSocketServer({ 
        server,
        path: '/ws',
        maxPayload: 1024 * 1024, // 1 MB
     });

    wss.on('connection', (socket) => {
        sendJson(socket, { type: 'welcome', message: 'Welcome to the WebSocket server!' });

        socket.on('error', console.error);
    });

    function broadcastMatchCreated(match){
        broadcastJson(wss, {type: 'match_created', data: match});
    }

    return {broadcastMatchCreated};

}