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
