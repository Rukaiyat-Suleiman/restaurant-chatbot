import { eq, and, desc } from "drizzle-orm";
import { db } from "../db/index.js";
import { sessions, orders, orderItems, users } from "../db/schema.js";
import { getMenuItemByNumber, getOptionByNumber, MENU } from "./menu.js";
import { initializePayment } from "./paystack.js";

const WELCOME_TEXT = `*Ruki Restaurant ChatBot*
Welcome! Please choose an option by typing the number:

Select *1* to Place an order
Select *97* to view current order
Select *98* to see order history
Select *99* to checkout order
Select *0* to cancel order`;

function formatMoney(cents) {
  return `$${(cents / 100).toFixed(2)}`;
}

export async function handleBotMessage(session, userMessage, reqHost) {
  const input = userMessage.trim();
  const state = session.botState || "welcome";
  
  // Helper to fetch the current pending order
  async function getPendingOrder() {
    let orderList;
    if (session.userId) {
      orderList = await db
        .select()
        .from(orders)
        .where(and(eq(orders.userId, session.userId), eq(orders.status, "pending")))
        .orderBy(desc(orders.id))
        .limit(1);
    } else {
      orderList = await db
        .select()
        .from(orders)
        .where(and(eq(orders.sessionId, session.id), eq(orders.status, "pending")))
        .orderBy(desc(orders.id))
        .limit(1);
    }
    return orderList[0] || null;
  }

  // Helper to get or create a pending order
  async function getOrCreatePendingOrder() {
    let order = await getPendingOrder();
    if (!order) {
      const [newOrder] = await db
        .insert(orders)
        .values({
          sessionId: session.id,
          userId: session.userId || null,
          status: "pending",
          totalPrice: 0,
        })
        .returning();
      order = newOrder;
    }
    return order;
  }

  // Global command checking - User can type global numbers from anywhere except during options customization
  if (state === "welcome" || state === "menu" || state === "checkout") {
    if (input === "1") {
      // Show menu
      await db.update(sessions).set({ botState: "menu" }).where(eq(sessions.id, session.id));
      return {
        text: `*Ruki Restaurant Menu*
Select a number to view details and add to your order:

Select *10* for Double Cheeseburger ($12.99)
Select *11* for Pepperoni Pizza ($14.99)
Select *12* for Caesar Salad ($8.99)
Select *13* for Chocolate Fudge Cake ($5.99)
Select *14* for Iced Latte ($3.99)

Or type *0* to return to the Main Menu.`,
      };
    }

    if (input === "97") {
      // See current order
      const order = await getPendingOrder();
      if (!order) {
        return { text: `*Current Order*\nYour order is currently empty.\n\nSelect *1* to Place an order.` };
      }

      const items = await db.select().from(orderItems).where(eq(orderItems.orderId, order.id));
      if (items.length === 0) {
        return { text: `*Current Order*\nYour order is currently empty.\n\nSelect *1* to Place an order.` };
      }

      let summary = `*Your Current Order (Pending)*\n`;
      items.forEach((item, idx) => {
        const optionStr = item.options ? ` (${item.options})` : "";
        summary += `${idx + 1}. **${item.itemName}**${optionStr} - ${item.quantity}x ${formatMoney(item.unitPrice)}\n`;
      });
      summary += `\n**Total Price: ${formatMoney(order.totalPrice)}**\n\nSelect *99* to checkout\nSelect *0* to cancel this order\nSelect *1* to add more items`;
      return { text: summary };
    }

    if (input === "98") {
      // See order history
      let pastOrders;
      if (session.userId) {
        pastOrders = await db
          .select()
          .from(orders)
          .where(and(eq(orders.userId, session.userId), eq(orders.status, "paid")))
          .orderBy(desc(orders.id));
      } else {
        pastOrders = await db
          .select()
          .from(orders)
          .where(and(eq(orders.sessionId, session.id), eq(orders.status, "paid")))
          .orderBy(desc(orders.id));
      }

      if (pastOrders.length === 0) {
        return { text: `*Order History*\nYou have no paid order history on this device.\n\nTip: You can login/signup to link your persistent order history!` };
      }

      let history = `*Your Order History*\n\n`;
      for (const order of pastOrders) {
        const items = await db.select().from(orderItems).where(eq(orderItems.orderId, order.id));
        const itemNames = items.map(i => `${i.itemName}${i.options ? ` (${i.options})` : ""}`).join(", ");
        const dateStr = new Date(order.createdAt).toLocaleDateString();
        const schedStr = order.scheduledFor ? ` Scheduled: ${new Date(order.scheduledFor).toLocaleTimeString()}` : "";
        history += `**${dateStr}** - Total: ${formatMoney(order.totalPrice)} - Paid [Ref: ${order.paymentReference.slice(-6)}]${schedStr}\nItems: ${itemNames}\n\n`;
      }
      history += `Select *1* to place a new order.`;
      return { text: history };
    }

    if (input === "99") {
      // Checkout order
      const order = await getPendingOrder();
      if (!order) {
        return { text: `*Checkout Failed*\nNo order to place.\n\nSelect *1* to Place an order!` };
      }

      const items = await db.select().from(orderItems).where(eq(orderItems.orderId, order.id));
      if (items.length === 0) {
        return { text: `*Checkout Failed*\nNo order to place.\n\nSelect *1* to Place an order!` };
      }

      // Transition to checkout scheduling selection
      await db.update(sessions).set({ botState: "checkout" }).where(eq(sessions.id, session.id));
      return {
        text: `*Order Checkout - Total: ${formatMoney(order.totalPrice)}*
Would you like to schedule this order or order it immediately?

Select *70* to Pay and Order Now
Select *71* to Schedule for in 30 minutes
Select *72* to Schedule for in 1 hour
Select *73* to Schedule for in 2 hours

Select *74* to cancel checkout and return`,
      };
    }

    if (input === "0") {
      // Cancel order
      const order = await getPendingOrder();
      if (!order) {
        await db.update(sessions).set({ botState: "welcome" }).where(eq(sessions.id, session.id));
        return { text: `*Cancel Order*\nYou don't have any active order.\n\n${WELCOME_TEXT}` };
      }

      // Update status to cancelled
      await db.update(orders).set({ status: "cancelled" }).where(eq(orders.id, order.id));
      await db.update(sessions).set({ botState: "welcome" }).where(eq(sessions.id, session.id));
      return { text: `*Order Cancelled*\nYour active order has been cancelled successfully.\n\n${WELCOME_TEXT}` };
    }
  }

  // State-specific processing
  if (state === "menu") {
    const itemNum = parseInt(input, 10);
    const item = getMenuItemByNumber(itemNum);
    if (!item) {
      return {
        text: `*Invalid Input*
Please select a valid menu number (10 - 14) or select *0* to return to main options.`,
      };
    }

    // Transition to item options
    await db
      .update(sessions)
      .set({ botState: "item_options", currentItemId: item.id })
      .where(eq(sessions.id, session.id));

    let optionsText = `*${item.name} (${formatMoney(item.price)})*
Customize your item by selecting an option number:

`;
    Object.entries(item.options).forEach(([code, opt]) => {
      const priceStr = opt.price > 0 ? ` (+${formatMoney(opt.price)})` : " (Free)";
      optionsText += `Select *${code}* for **${opt.name}**${priceStr}\n`;
    });
    optionsText += `\nSelect *${item.backOption}* to go back to the Menu`;

    return { text: optionsText };
  }

  if (state === "item_options") {
    const currentItem = getMenuItemByNumber(session.currentItemId);
    if (!currentItem) {
      await db.update(sessions).set({ botState: "welcome", currentItemId: null }).where(eq(sessions.id, session.id));
      return { text: `An error occurred. Returning to the main menu.\n\n${WELCOME_TEXT}` };
    }

    const optNum = parseInt(input, 10);
    if (optNum === currentItem.backOption) {
      // Go back to menu state
      await db.update(sessions).set({ botState: "menu", currentItemId: null }).where(eq(sessions.id, session.id));
      return {
        text: `*Ruki Restaurant Menu*
Select a number to view details and add to your order:

Select *10* for Double Cheeseburger ($12.99)
Select *11* for Pepperoni Pizza ($14.99)
Select *12* for Caesar Salad ($8.99)
Select *13* for Chocolate Fudge Cake ($5.99)
Select *14* for Iced Latte ($3.99)

Or type *0* to return to the Main Menu.`,
      };
    }

    const selectedOption = getOptionByNumber(session.currentItemId, optNum);
    if (!selectedOption) {
      let optionsText = `*Invalid Option*
Please select one of the listed numbers:

`;
      Object.entries(currentItem.options).forEach(([code, opt]) => {
        optionsText += `Select *${code}* for **${opt.name}** (+${formatMoney(opt.price)})\n`;
      });
      optionsText += `\nSelect *${currentItem.backOption}* to go back to the Menu`;
      return { text: optionsText };
    }

    // Add to order!
    const order = await getOrCreatePendingOrder();
    const finalPrice = currentItem.price + selectedOption.price;

    await db.insert(orderItems).values({
      orderId: order.id,
      itemName: currentItem.name,
      quantity: 1,
      unitPrice: finalPrice,
      options: selectedOption.name !== "Plain" ? selectedOption.name : null,
    });

    // Update total price of the order
    await db
      .update(orders)
      .set({ totalPrice: order.totalPrice + finalPrice })
      .where(eq(orders.id, order.id));

    // Reset bot state to welcome
    await db.update(sessions).set({ botState: "welcome", currentItemId: null }).where(eq(sessions.id, session.id));

    return {
      text: `Added **1x ${currentItem.name}**${selectedOption.name !== "Plain" ? ` with ${selectedOption.name}` : ""} to your order!

Select *1* to add more items
Select *97* to view your current cart
Select *99* to checkout and place your order`,
    };
  }

  if (state === "checkout") {
    if (input === "74") {
      // Go back
      await db.update(sessions).set({ botState: "welcome" }).where(eq(sessions.id, session.id));
      return { text: `Returning to Main Menu.\n\n${WELCOME_TEXT}` };
    }

    if (["70", "71", "72", "73"].includes(input)) {
      const order = await getPendingOrder();
      if (!order) {
        await db.update(sessions).set({ botState: "welcome" }).where(eq(sessions.id, session.id));
        return { text: `Your order was empty. Returning to Main Menu.\n\n${WELCOME_TEXT}` };
      }

      let scheduledFor = null;
      let durationStr = "immediately";
      if (input === "71") {
        scheduledFor = new Date(Date.now() + 30 * 60 * 1000);
        durationStr = "in 30 minutes";
      } else if (input === "72") {
        scheduledFor = new Date(Date.now() + 60 * 60 * 1000);
        durationStr = "in 1 hour";
      } else if (input === "73") {
        scheduledFor = new Date(Date.now() + 120 * 60 * 1000);
        durationStr = "in 2 hours";
      }

      // If scheduled, update order
      if (scheduledFor) {
        await db.update(orders).set({ scheduledFor }).where(eq(orders.id, order.id));
      }

      // Initialize Paystack payment
      const userEmail = session.userId
        ? (await db.select().from(users).where(eq(users.id, session.userId)))[0]?.email
        : `guest_${session.id}@ruki-chatbot.com`;

      const callbackUrl = `http://${reqHost}/payment-callback`;
      
      try {
        const paystackData = await initializePayment(userEmail, order.totalPrice, callbackUrl);
        
        // Save the reference on the order
        await db
          .update(orders)
          .set({ paymentReference: paystackData.reference })
          .where(eq(orders.id, order.id));

        // Reset state so after payment callback they start fresh
        await db.update(sessions).set({ botState: "welcome" }).where(eq(sessions.id, session.id));

        return {
          text: `*Complete Your Payment*
Your order has been checked out successfully! 

Order Delivery/Collection: **${durationStr}**
Amount Due: **${formatMoney(order.totalPrice)}**

Please pay using the link below to complete your order.`,
          showPaymentBtn: true,
          paymentUrl: paystackData.authorization_url,
        };
      } catch (err) {
        return {
          text: `*Payment Initialization Failed*\n${err.message}\n\nPlease try again by selecting *99* or cancel using *0*.`,
        };
      }
    }

    return {
      text: `*Invalid Selection*
Please select one of the options:
Select *70* to Pay and Order Now
Select *71* to Schedule for in 30 minutes
Select *72* to Schedule for in 1 hour
Select *73* to Schedule for in 2 hours
Select *74* to return`,
    };
  }

  // Catch-all
  await db.update(sessions).set({ botState: "welcome" }).where(eq(sessions.id, session.id));
  return { text: WELCOME_TEXT };
}
