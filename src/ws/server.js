// @ts-nocheck
import {WebSocket, WebSocketServer} from 'ws';

// The WebSocket server is mounted on /ws and emits the following events:
// - welcome: sent to each new connection once it opens.
// - match_created: broadcast to all connected clients when a new match is created.

const HEARTBEAT_INTERVAL = 30_000;

const matchSubscribers = new Map();

function subscribe(matchId, socket) {
    if (!matchSubscribers.has(matchId)) {
        matchSubscribers.set(matchId, new Set());
    }
    matchSubscribers.get(matchId).add(socket);
}

function unsubscribe(matchId, socket) {
    const subscribers = matchSubscribers.get(matchId);

    if (!subscribers) return;
    subscribers.delete(socket);

    if (subscribers.size === 0) {
        matchSubscribers.delete(matchId);
    }
}

function cleanupSubscriptions(socket) {
    for (const matchId of socket.subscriptions) {
        unsubscribe(matchId, socket);
    }
}

function broadcastToMatch(matchId, data) {
    const subscribers = matchSubscribers.get(matchId);
    if (!subscribers || subscribers.size===0) return;

    const message = JSON.stringify(data);;
    for (const client of subscribers) {
        if (client.readyState !== WebSocket.OPEN) continue;
        client.send(message);
    }
}

function noop() {}

function sendJson(socket, data) {
    if (socket.readyState !== WebSocket.OPEN) return;
    socket.send(JSON.stringify(data));
}

function broadcastToAll(wss, data) {
    if (!wss?.clients?.size) return;

    for (const client of wss.clients) {
        if (client.readyState !== WebSocket.OPEN) continue;
        client.send(JSON.stringify(data));
    }
}

function handleMessage(socket, data) {
    let parsed;
    try {
        parsed = JSON.parse(data);
    } catch (err) {
        console.error('Failed to parse message:', err);
        sendJson(socket, { type: 'error', message: 'Invalid JSON format' });
        return;
    }

    if (parsed?.type === 'subscribe' && Number.isInteger(parsed.matchId)) {
        subscribe(parsed.matchId, socket);
        socket.subscriptions.add(parsed.matchId);
        sendJson(socket, { type: 'subscribed', matchId: parsed.matchId });
    } else if (parsed?.type === 'unsubscribe' && Number.isInteger(parsed.matchId)) {
        unsubscribe(parsed.matchId, socket);
        socket.subscriptions.delete(parsed.matchId);
        sendJson(socket, { type: 'unsubscribed', matchId: parsed.matchId });
    } else {
        console.warn('Unknown message type:', parsed.type);
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
        socket.subscriptions = new Set();
        socket.on('message', (data) => handleMessage(socket, data));
        sendJson(socket, { type: 'welcome', message: 'Welcome to the WebSocket server!' });

        socket.on('error', (err) => {
            socket.terminate();
        });

        socket.on('close', () => {
            cleanupSubscriptions(socket);
        });
    });

    wss.on('close', () => {
        clearInterval(interval);
    });

    function broadcastMatchCreated(match) {
        broadcastToAll(wss, { type: 'match_created', data: match });
    }

    function broadcastCommentary(matchId, comment) {
        broadcastToMatch(matchId, { type: 'commentary', data: comment });
    }
    return { broadcastMatchCreated, broadcastCommentary};
}
