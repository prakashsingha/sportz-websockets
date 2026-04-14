import AgentAPI from 'apminsight';
AgentAPI.config();

import express from 'express';
import http from 'http';
import {matchRouter} from './routes/matches.js';
import {attachWebSocketServer} from './ws/server.js';
import { commentaryRouter } from './routes/commentaries.js';


const PORT = process.env.PORT || 8000;
const HOST = process.env.HOST || '0.0.0.0';

const app = express();
const server = http.createServer(app);
const {broadcastMatchCreated, broadcastCommentary} = attachWebSocketServer(server);
app.locals.wsBroadcaster = broadcastMatchCreated; // Make the broadcast function available in routes
app.locals.broadcastCommentary = broadcastCommentary; // Make the commentary broadcast function available in routes

app.use(express.json());

app.use('/matches', matchRouter);
app.use('/matches/:id/commentaries',commentaryRouter);

// @ts-ignore
server.listen(PORT, HOST, () => {
  const baseUrl = HOST === '0.0.0.0' ? `http://localhost:${PORT}` : `http://${HOST}:${PORT}`;

  console.log(`Server is running on ${baseUrl}`);
  console.log(`WebSocket server is available at ws://${HOST === '0.0.0.0' ? `localhost:${PORT}` : `${HOST}:${PORT}`}/ws`);
}); 

