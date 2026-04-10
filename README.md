# sportz-websockets

## WebSocket support

This app exposes a WebSocket server at `ws://<host>:<port>/ws`.

Client behavior:
- On connect, the server sends a `welcome` event.
- When a new match is created, the server broadcasts a `match_created` event to all connected clients.

Example event payload:
```json
{
  "type": "match_created",
  "data": {
    "id": 1,
    "homeScore": 0,
    "awayScore": 0,
    "status": "scheduled"
  }
}
```

## Internal API

The HTTP app stores the WS broadcaster at `app.locals.wsBroadcaster`, so request handlers can publish events without introducing a hard dependency on the WebSocket server internals.
