import {WebSocket, WebSocketServer} from 'ws';

// The WebSocket server is mounted on /ws and emits the following events:
// - welcome: sent to each new connection once it opens.
// - match_created: broadcast to all connected clients when a new match is created.

const HEARTBEAT_INTERVAL = 30_000;

function noop() {}

function sendJson(socket, data) {
    if (socket.readyState !== WebSocket.OPEN) return;
    socket.send(JSON.stringify(data));
}

function broadcastJson(wss, data) {
    if (!wss?.clients?.size) return;

    for (const client of wss.clients) {
        if (client.readyState !== WebSocket.OPEN) continue;
        client.send(JSON.stringify(data));
    }
}

export function attachWebSocketServer(server) {
    const wss = new WebSocketServer({
        server,
        path: '/ws',
        maxPayload: 1024 * 1024, // 1 MB
    });

    const interval = setInterval(() => {
        for (const socket of wss.clients) {
            if (socket.isAlive === false) {
                return socket.terminate();
            }

            socket.isAlive = false;
            socket.ping(noop);
        }
    }, HEARTBEAT_INTERVAL);

    wss.on('error', console.error);

    wss.on('connection', (socket) => {
        socket.isAlive = true;
        socket.on('pong', () => {
            socket.isAlive = true;
        });

        sendJson(socket, { type: 'welcome', message: 'Welcome to the WebSocket server!' });

        socket.on('error', console.error);
        socket.on('close', (code, reason) => {
            const reasonText = reason ? reason.toString() : '';
            console.log(`WebSocket connection closed (${code})${reasonText ? `: ${reasonText}` : ''}`);
        });
    });

    wss.on('close', () => {
        clearInterval(interval);
    });

    function broadcastMatchCreated(match) {
        broadcastJson(wss, { type: 'match_created', data: match });
    }

    return { broadcastMatchCreated };
}
