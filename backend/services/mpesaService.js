const axios = require("axios");

function normalizePhone(value) {
  const raw = String(value || "").replace(/\s+/g, "");
  if (/^2547\d{8}$/.test(raw)) return raw;
  if (/^07\d{8}$/.test(raw)) return "254" + raw.slice(1);
  if (/^\+2547\d{8}$/.test(raw)) return raw.slice(1);
  return null;
}

function timestamp() {
  const d = new Date();
  const pad = n => String(n).padStart(2, "0");
  return `${d.getFullYear()}${pad(d.getMonth()+1)}${pad(d.getDate())}${pad(d.getHours())}${pad(d.getMinutes())}${pad(d.getSeconds())}`;
}

async function getAccessToken() {
  const auth = Buffer.from(
    `${process.env.MPESA_CONSUMER_KEY}:${process.env.MPESA_CONSUMER_SECRET}`
  ).toString("base64");

  const response = await axios.get(
    process.env.MPESA_OAUTH_URL,
    { headers: { Authorization: `Basic ${auth}` }, timeout: 15000 }
  );

  return response.data.access_token;
}

async function initiateStkPush({ payment, package: pkg, phone }) {
  if (process.env.DEMO === "true") {
    return {
      demo: true,
      status: "success",
      merchantRequestId: `DEMO-MERCHANT-${payment.id}`,
      checkoutRequestId: `DEMO-CHECKOUT-${payment.id}`,
      receipt: `DEMO${payment.id}`,
      customerMessage: "Demo payment completed."
    };
  }

  for (const key of ["MPESA_CONSUMER_KEY", "MPESA_CONSUMER_SECRET", "MPESA_PASSKEY", "MPESA_SHORTCODE", "MPESA_CALLBACK_URL"]) {
    if (!process.env[key]) throw new Error(`Missing environment variable: ${key}`);
  }

  const token = await getAccessToken();
  const time = timestamp();
  const password = Buffer.from(
    `${process.env.MPESA_SHORTCODE}${process.env.MPESA_PASSKEY}${time}`
  ).toString("base64");

  const body = {
    BusinessShortCode: process.env.MPESA_SHORTCODE,
    Password: password,
    Timestamp: time,
    TransactionType: "CustomerPayBillOnline",
    Amount: pkg.priceKes,
    PartyA: phone,
    PartyB: process.env.MPESA_SHORTCODE,
    PhoneNumber: phone,
    CallBackURL: process.env.MPESA_CALLBACK_URL,
    AccountReference: `PROMISE-${payment.id}`,
    TransactionDesc: `Promise Enterprise ${pkg.name}`
  };

  const response = await axios.post(process.env.MPESA_STK_URL, body, {
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json"
    },
    timeout: 20000
  });

  return {
    demo: false,
    status: "pending",
    merchantRequestId: response.data.MerchantRequestID,
    checkoutRequestId: response.data.CheckoutRequestID,
    customerMessage: response.data.CustomerMessage || "STK Push sent. Check your phone."
  };
}

module.exports = { normalizePhone, initiateStkPush };
