import { Router } from "express";
import { db } from "../db/db.js";
import { commentary } from "../db/schema.js";
import { matchIdParamSchema } from "../validation/matches.js";
import { createCommentarySchema, listCommentaryQuerySchema } from "../validation/commentary.js";
import { desc, eq } from "drizzle-orm";
import { create } from "domain";

const MAX_LIMIT = 100;
export const commentaryRouter = Router({ mergeParams: true });

commentaryRouter.get("/", async (req, res) => {
  // @ts-ignore
  const paramsResult = matchIdParamSchema.safeParse({ id: req.params.id });
  if (!paramsResult.success) {
    return res.status(400).json({ error: "Invalid matchId", details: paramsResult.error.issues });
  }

  const queryResult = listCommentaryQuerySchema.safeParse(req.query);
  if (!queryResult.success) {
    return res.status(400).json({ error: "Invalid query", details: queryResult.error.issues });
  }

  const limit = Math.min(queryResult.data.limit ?? MAX_LIMIT, MAX_LIMIT);

  try {
    const data = await db
      .select()
      .from(commentary)
      .where(eq(commentary.matchId, paramsResult.data.id))
      .orderBy(desc(commentary.createdAt))
      .limit(limit);

    return res.status(200).json({ data });
  } catch (error) {
    return res.status(500).json({ error: "Failed to retrieve commentary", details: JSON.stringify(error) });
  }
});

commentaryRouter.post("/", async (req, res) => {
  // @ts-ignore
  const paramsResult = matchIdParamSchema.safeParse({ id: req.params.id });
  if (!paramsResult.success) {
    return res.status(400).json({ error: "Invalid matchId", details: paramsResult.error.issues });
  }
  
  const bodyResult = createCommentarySchema.safeParse(req.body);
  if (!bodyResult.success) {
    return res.status(400).json({ error: "Invalid input", details: bodyResult.error.issues });
  }

  const { ...commentaryData } = bodyResult.data;

  try {
    const [createdCommentary] = await db.insert(commentary).values({
      matchId: paramsResult.data.id,
      ...commentaryData,
    }).returning();

    if(res.app.locals.broadcastCommentary) {
      res.app.locals.broadcastCommentary(createdCommentary.matchId, createdCommentary);
    }

    return res.status(201).json({ data: createdCommentary, message: "Commentary created" });
  } catch (error) {
    return res.status(500).json({ error: "Failed to create commentary", details: JSON.stringify(error) });
  }
});