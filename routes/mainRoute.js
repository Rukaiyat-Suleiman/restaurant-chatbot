import { Router } from "express";
import bcrypt from "bcrypt";
import { User, Session, Order } from "../db/index.js";
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
    const user = await User.findByPk(req.session.userId);
    if (user) {
      loggedInUser = user.get({ plain: true });
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
    console.error("Chatbot API Error:", err.message);
    return res.status(500).json({
      success: false,
      message: "Chatbot encountered an internal error. Please try again.",
    });
  }
});

// --- Auth: Signup ---
router.get("/signup", (req, res) => {
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
    const existing = await User.findOne({ where: { email: value.email } });
    if (existing) {
      return res.render("signup", {
        errors: { email: "Email is already registered." },
        values: req.body,
      });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(value.password, 10);

    // Insert user
    const newUser = await User.create({
      email: value.email,
      password: hashedPassword,
    });

    // Link device session to this user!
    await Session.update(
      { userId: newUser.id },
      { where: { id: req.session.id } }
    );

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
    const user = await User.findOne({ where: { email: value.email } });
    if (!user) {
      return res.render("login", {
        errors: { email: "Invalid email or password." },
        values: req.body,
      });
    }

    const passwordMatch = await bcrypt.compare(value.password, user.password);
    if (!passwordMatch) {
      return res.render("login", {
        errors: { email: "Invalid email or password." },
        values: req.body,
      });
    }

    // Link device session to this user!
    await Session.update(
      { userId: user.id },
      { where: { id: req.session.id } }
    );

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
    await Session.update(
      { userId: null },
      { where: { id: req.session.id } }
    );
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
      const order = await Order.findOne({ where: { paymentReference: reference } });

      if (order) {
        // Update status to paid
        await Order.update(
          { status: "paid" },
          { where: { id: order.id } }
        );
        
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