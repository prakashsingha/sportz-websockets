import { Router } from "express";
import {db} from "../db/db.js";
import { matches } from "../db/schema.js";
import { createMatchSchema, listMatchesQuerySchema } from "../validation/matches.js";
import { getMatchStatus } from "../utils/match-status.js";
import { desc } from "drizzle-orm";

export const matchRouter = Router();

// Get all matches
matchRouter.get("/", async (req, res) => {
  const parsedData = listMatchesQuerySchema.safeParse(req.query);
  if(!parsedData.success) {
    return res.status(400).json({ error: 'Invalid input', details: parsedData.error.issues });
  }

  const limit = parsedData.data.limit || 100;

  try {
    const data = await db.select()
    .from(matches)
    .orderBy((desc(matches.createdAt)))
    .limit(limit);

    res.status(200).json({ data });

  } catch (error) {
    return res.status(500).json({ error: 'Failed to retrieve matches', details: JSON.stringify(error) });
  }
});

matchRouter.post("/", async (req, res) => {
  const parsedData = createMatchSchema.safeParse(req.body);

  if (!parsedData.success) {
    return res.status(400).json({ error: 'Invalid input', details: parsedData.error.issues });
  }

  const { startTime, endTime, homeScore, awayScore } = parsedData.data;

  try {
    const [event] = await db.insert(matches).values({
      ...parsedData.data,
      startTime: new Date(startTime),
      endTime: new Date(endTime),
      homeScore: homeScore ?? 0,
      awayScore: awayScore ?? 0,
      status: getMatchStatus(startTime, endTime),
    }).returning();

    const broadcastMatchCreated = res.app.locals.wsBroadcaster;
    if (typeof broadcastMatchCreated === 'function') {
      broadcastMatchCreated(event);
    }

    return res.status(201).json({ data: event, message: "Match created" });
  } catch (error) {
    return res.status(500).json({ error: 'Failed to create a match', details: JSON.stringify(error) });
  }
});