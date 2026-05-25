import "dotenv/config";

const PAYSTACK_SECRET_KEY = process.env.PAYSTACK_KEY;

export async function initializePayment(email, amountInCents, callbackUrl) {
  if (!PAYSTACK_SECRET_KEY) {
    throw new Error("Paystack secret key is not configured in .env file (PAYSTACK_KEY).");
  }

  const response = await fetch("https://api.paystack.co/transaction/initialize", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${PAYSTACK_SECRET_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      email,
      amount: amountInCents, // Paystack amount is in kobo (cents)
      callback_url: callbackUrl,
    }),
  });

  const result = await response.json();
  if (!result.status) {
    throw new Error(result.message || "Failed to initialize payment with Paystack");
  }

  return result.data; // contains authorization_url, reference, access_code
}

export async function verifyPayment(reference) {
  if (!PAYSTACK_SECRET_KEY) {
    throw new Error("Paystack secret key is not configured in .env. (PAYSTACK_KEY)");
  }

  const response = await fetch(`https://api.paystack.co/transaction/verify/${reference}`, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${PAYSTACK_SECRET_KEY}`,
    },
  });

  const result = await response.json();
  if (!result.status) {
    throw new Error(result.message || "Failed to verify payment reference");
  }

  return result.data; // contains status ('success', etc.), amount, metadata, reference
}
