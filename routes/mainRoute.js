import { Router } from "express";
import bcrypt from "bcrypt";
import { eq, and, desc } from "drizzle-orm";
import { db } from "../db/index.js";
import { users, sessions, orders, orderItems } from "../db/schema.js";
import { sessionMiddleware } from "../middleware/session.js";
import { loginSchema, signupSchema } from "../validators/auth.validator.js";
import { chatMessageSchema } from "../validators/chat.validator.js";
import { handleBotMessage } from "../services/chatbot.js";
import { verifyPayment } from "../services/paystack.js";

const router = Router();

// Apply session middleware globally on all web and API routes
router.use(sessionMiddleware);

// --- Chat Dashboard ---
router.get("/", async (req, res) => {
  let loggedInUser = null;
  if (req.session.userId) {
    const results = await db.select().from(users).where(eq(users.id, req.session.userId)).limit(1);
    if (results.length > 0) {
      loggedInUser = results[0];
    }
  }

  const paymentStatus = req.query.payment || null;
  const paymentRef = req.query.ref || null;

  res.render("chat", {
    user: loggedInUser,
    paymentStatus,
    paymentRef,
  });
});

// --- Chatbot AJAX API ---
router.post("/api/chat", async (req, res) => {
  const { error, value } = chatMessageSchema.validate(req.body);
  if (error) {
    return res.status(400).json({
      success: false,
      message: error.details[0].message,
    });
  }

  try {
    const reply = await handleBotMessage(req.session, value.message, req.headers.host);
    return res.json({
      success: true,
      text: reply.text,
      showPaymentBtn: reply.showPaymentBtn || false,
      paymentUrl: reply.paymentUrl || null,
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      message: "Chatbot encountered an internal error. Please try again.",
    });
  }
});

// --- Auth: Signup ---
router.get("/signup", (req, res) => {
  // If already logged in, redirect to chat
  if (req.session.userId) {
    return res.redirect("/");
  }
  res.render("signup", { errors: null, values: {} });
});

router.post("/signup", async (req, res) => {
  const { error, value } = signupSchema.validate(req.body, { abortEarly: false });
  if (error) {
    const errorMap = {};
    error.details.forEach(d => {
      errorMap[d.context.key] = d.message;
    });
    return res.render("signup", { errors: errorMap, values: req.body });
  }

  try {
    // Check if email already registered
    const existing = await db.select().from(users).where(eq(users.email, value.email)).limit(1);
    if (existing.length > 0) {
      return res.render("signup", {
        errors: { email: "Email is already registered." },
        values: req.body,
      });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(value.password, 10);

    // Insert user
    const [newUser] = await db
      .insert(users)
      .values({
        email: value.email,
        password: hashedPassword,
      })
      .returning();

    // Link device session to this user!
    await db
      .update(sessions)
      .set({ userId: newUser.id })
      .where(eq(sessions.id, req.session.id));

    return res.redirect("/?signup=success");
  } catch (err) {
    return res.render("signup", {
      errors: { system: "Database error occurred during registration. Please try again." },
      values: req.body,
    });
  }
});

// --- Auth: Login ---
router.get("/login", (req, res) => {
  if (req.session.userId) {
    return res.redirect("/");
  }
  res.render("login", { errors: null, values: {} });
});

router.post("/login", async (req, res) => {
  const { error, value } = loginSchema.validate(req.body, { abortEarly: false });
  if (error) {
    const errorMap = {};
    error.details.forEach(d => {
      errorMap[d.context.key] = d.message;
    });
    return res.render("login", { errors: errorMap, values: req.body });
  }

  try {
    const results = await db.select().from(users).where(eq(users.email, value.email)).limit(1);
    if (results.length === 0) {
      return res.render("login", {
        errors: { email: "Invalid email or password." },
        values: req.body,
      });
    }

    const user = results[0];
    const passwordMatch = await bcrypt.compare(value.password, user.password);
    if (!passwordMatch) {
      return res.render("login", {
        errors: { email: "Invalid email or password." },
        values: req.body,
      });
    }

    // Link device session to this user!
    await db
      .update(sessions)
      .set({ userId: user.id })
      .where(eq(sessions.id, req.session.id));

    return res.redirect("/");
  } catch (err) {
    return res.render("login", {
      errors: { system: "Database error during login. Please try again." },
      values: req.body,
    });
  }
});

// --- Auth: Logout ---
router.get("/logout", async (req, res) => {
  if (req.session.id) {
    // Unlink user from device session
    await db
      .update(sessions)
      .set({ userId: null })
      .where(eq(sessions.id, req.session.id));
  }
  res.redirect("/");
});

// --- Paystack Payment Callback ---
router.get("/payment-callback", async (req, res) => {
  const reference = req.query.reference;
  if (!reference) {
    return res.redirect("/?payment=failed&ref=missing");
  }

  try {
    const paymentData = await verifyPayment(reference);

    if (paymentData.status === "success") {
      // Find the corresponding order by reference
      const results = await db
        .select()
        .from(orders)
        .where(eq(orders.paymentReference, reference))
        .limit(1);

      if (results.length > 0) {
        const order = results[0];
        
        // Update status to paid
        await db
          .update(orders)
          .set({ status: "paid" })
          .where(eq(orders.id, order.id));
        
        return res.redirect(`/?payment=success&ref=${reference}`);
      } else {
        return res.redirect("/?payment=failed&ref=notfound");
      }
    } else {
      return res.redirect(`/?payment=failed&ref=${reference}`);
    }
  } catch (err) {
    return res.redirect(`/?payment=failed&ref=${reference}&error=${encodeURIComponent(err.message)}`);
  }
});

export default router;