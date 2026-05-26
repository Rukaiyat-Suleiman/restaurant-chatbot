import crypto from "crypto";
import { Session } from "../db/index.js";

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
    // Try to load session from PostgreSQL using Sequelize
    const session = await Session.findByPk(sessionId);
    if (session) {
      sessionRecord = session.get({ plain: true });
    }
  }

  if (!sessionRecord) {
    // Generate new UUID session token
    sessionId = crypto.randomUUID();
    const session = await Session.create({
      id: sessionId,
      botState: "welcome",
    });
    
    sessionRecord = session.get({ plain: true });

    // Set cookie in browser
    res.setHeader(
      "Set-Cookie",
      `session_id=${sessionId}; Path=/; HttpOnly; Max-Age=31536000; SameSite=Lax`
    );
  }

  req.session = sessionRecord;
  next();
}
