import crypto from "crypto";
import { eq } from "drizzle-orm";
import { db } from "../db/index.js";
import { sessions } from "../db/schema.js";

function parseCookies(cookieHeader) {
  const list = {};
  if (!cookieHeader) return list;
  cookieHeader.split(";").forEach((cookie) => {
    const parts = cookie.split("=");
    list[parts.shift().trim()] = decodeURIComponent(parts.join("="));
  });
  return list;
}

export async function sessionMiddleware(req, res, next) {
  const cookies = parseCookies(req.headers.cookie);
  let sessionId = cookies.session_id;

  let sessionRecord = null;

  if (sessionId) {
    // Try to load from database
    const results = await db.select().from(sessions).where(eq(sessions.id, sessionId)).limit(1);
    if (results.length > 0) {
      sessionRecord = results[0];
    }
  }

  if (!sessionRecord) {
    // Generate new session
    sessionId = crypto.randomUUID();
    const [newSession] = await db
      .insert(sessions)
      .values({
        id: sessionId,
        botState: "welcome",
      })
      .returning();
    
    sessionRecord = newSession;

    // Set cookie
    res.setHeader(
      "Set-Cookie",
      `session_id=${sessionId}; Path=/; HttpOnly; Max-Age=31536000; SameSite=Lax`
    );
  }

  req.session = sessionRecord;
  next();
}
