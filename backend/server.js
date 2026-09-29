require("dotenv").config();

const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const rateLimit = require("express-rate-limit");
const path = require("path");

const { getPackages, getPackageById, createPayment, getPayment, updatePayment, createSubscription, getSubscriptionByPayment } = require("./store");
const { initiateStkPush, normalizePhone } = require("./services/mpesaService");
const { activateWifi } = require("./services/wifiService");

const app = express();
const PORT = Number(process.env.PORT || 3000);

app.use(helmet({ crossOriginResourcePolicy: false }));
app.use(cors({ origin: process.env.FRONTEND_URL || true }));
app.use(express.json({ limit: "100kb" }));

const paymentLimiter = rateLimit({
  windowMs: 60 * 1000,
  limit: 10,
  standardHeaders: true,
  legacyHeaders: false
});

app.get("/api/health", (req, res) => {
  res.json({ ok: true, service: "Promise Enterprise", demo: process.env.DEMO === "true" });
});

app.get("/api/packages", (req, res) => {
  res.json({ packages: getPackages() });
});

app.post("/api/payment/stkpush", paymentLimiter, async (req, res) => {
  try {
    const { packageId, phoneNumber } = req.body;
    const pkg = getPackageById(packageId);
    if (!pkg || !pkg.active) return res.status(400).json({ error: "Package unavailable." });

    const phone = normalizePhone(phoneNumber);
    if (!phone) return res.status(400).json({ error: "Enter a valid Kenyan M-PESA number." });

    const payment = createPayment({
      packageId: pkg.id,
      phoneNumber: phone,
      amountKes: pkg.priceKes
    });

    const result = await initiateStkPush({
      payment,
      package: pkg,
      phone
    });

    updatePayment(payment.id, {
      merchantRequestId: result.merchantRequestId,
      checkoutRequestId: result.checkoutRequestId,
      status: result.status
    });

    if (result.demo) {
      const completed = completePaymentAndActivate(payment.id, {
        resultCode: 0,
        resultDescription: "Demo payment completed",
        receipt: result.receipt
      });
      return res.json({
        success: true,
        demo: true,
        paymentId: payment.id,
        checkoutRequestId: result.checkoutRequestId,
        status: "success",
        subscription: completed
      });
    }

    res.json({
      success: true,
      demo: false,
      paymentId: payment.id,
      checkoutRequestId: result.checkoutRequestId,
      customerMessage: result.customerMessage
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: error.message || "Unable to initiate payment." });
  }
});

app.get("/api/payment/status/:paymentId", (req, res) => {
  const payment = getPayment(req.params.paymentId);
  if (!payment) return res.status(404).json({ error: "Payment not found." });

  const subscription = getSubscriptionByPayment(payment.id);
  res.json({ payment, subscription });
});

app.post("/api/payment/callback", (req, res) => {
  // Safaricom callbacks should be stored and processed server-side.
  // The exact callback structure should be tested against the current Daraja documentation
  // and the business's production application configuration.
  try {
    const callback = req.body?.Body?.stkCallback;
    if (!callback) return res.json({ ResultCode: 0, ResultDesc: "Accepted" });

    const checkoutRequestId = callback.CheckoutRequestID;
    const payment = [...require("./store").payments.values()].find(
      p => p.checkoutRequestId === checkoutRequestId
    );

    if (!payment) return res.json({ ResultCode: 0, ResultDesc: "Accepted" });

    const metadata = {};
    for (const item of callback.CallbackMetadata?.Item || []) {
      metadata[item.Name] = item.Value;
    }

    const resultCode = Number(callback.ResultCode);
    if (resultCode === 0) {
      completePaymentAndActivate(payment.id, {
        resultCode,
        resultDescription: callback.ResultDesc,
        receipt: metadata.MpesaReceiptNumber
      });
    } else {
      updatePayment(payment.id, {
        status: "failed",
        resultCode,
        resultDescription: callback.ResultDesc
      });
    }

    res.json({ ResultCode: 0, ResultDesc: "Accepted" });
  } catch (error) {
    console.error("Callback processing error:", error);
    res.json({ ResultCode: 0, ResultDesc: "Accepted" });
  }
});

function completePaymentAndActivate(paymentId, info) {
  const payment = getPayment(paymentId);
  if (!payment) throw new Error("Payment not found.");

  const existing = getSubscriptionByPayment(paymentId);
  if (existing) return existing;

  updatePayment(paymentId, {
    status: "success",
    resultCode: info.resultCode,
    resultDescription: info.resultDescription,
    mpesaReceiptNumber: info.receipt || null,
    transactionDate: new Date().toISOString()
  });

  const pkg = getPackageById(payment.packageId);
  const subscription = createSubscription({
    paymentId: payment.id,
    packageId: pkg.id,
    phoneNumber: payment.phoneNumber,
    durationMinutes: pkg.durationMinutes
  });

  activateWifi(subscription);
  return subscription;
}

app.use(express.static(path.join(__dirname, "..", "frontend")));

app.get("*splat", (req, res) => {
  res.sendFile(path.join(__dirname, "..", "frontend", "index.html"));
});

app.listen(PORT, () => {
  console.log(`Promise Enterprise running at http://localhost:${PORT}`);
});
