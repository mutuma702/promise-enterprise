const packages = new Map([
  [1, { id: 1, name: "1 Hour Wi-Fi", category: "hourly", durationMinutes: 60, priceKes: 10, description: "Quick study or browsing session.", badge: "" , active: true}],
  [2, { id: 2, name: "3 Hour Wi-Fi", category: "hourly", durationMinutes: 180, priceKes: 20, description: "Perfect for lectures and research.", badge: "" , active: true}],
  [3, { id: 3, name: "6 Hour Wi-Fi", category: "hourly", durationMinutes: 360, priceKes: 30, description: "Extended student session.", badge: "POPULAR", active: true}],
  [4, { id: 4, name: "12 Hour Wi-Fi", category: "hourly", durationMinutes: 720, priceKes: 40, description: "Stay online most of the day.", badge: "" , active: true}],
  [5, { id: 5, name: "24 Hour Wi-Fi", category: "daily", durationMinutes: 1440, priceKes: 50, description: "Full-day student access.", badge: "STUDENT SPECIAL", active: true}],
  [6, { id: 6, name: "2 Day Wi-Fi", category: "daily", durationMinutes: 2880, priceKes: 90, description: "Two days of connectivity.", badge: "" , active: true}],
  [7, { id: 7, name: "3 Day Wi-Fi", category: "daily", durationMinutes: 4320, priceKes: 120, description: "Useful for busy study periods.", badge: "" , active: true}],
  [8, { id: 8, name: "7 Day Wi-Fi", category: "daily", durationMinutes: 10080, priceKes: 200, description: "A full week online.", badge: "BEST VALUE", active: true}],
  [9, { id: 9, name: "1 Month Student", category: "monthly", durationMinutes: 43200, priceKes: 800, description: "Student-friendly monthly access.", badge: "POPULAR", active: true}],
  [10, { id: 10, name: "1 Month Premium", category: "monthly", durationMinutes: 43200, priceKes: 1000, description: "Premium monthly package.", badge: "" , active: true}],
  [11, { id: 11, name: "30-Day Unlimited", category: "monthly", durationMinutes: 43200, priceKes: 1200, description: "Designed for heavy users.", badge: "BEST VALUE", active: true}]
]);

const payments = new Map();
const subscriptions = new Map();
let nextPaymentId = 1000;
let nextSubscriptionId = 5000;

function getPackages() {
  return [...packages.values()].filter(p => p.active);
}
function getPackageById(id) {
  return packages.get(Number(id));
}
function createPayment(data) {
  const payment = {
    id: String(nextPaymentId++),
    packageId: data.packageId,
    phoneNumber: data.phoneNumber,
    amountKes: data.amountKes,
    merchantRequestId: null,
    checkoutRequestId: null,
    mpesaReceiptNumber: null,
    resultCode: null,
    resultDescription: null,
    status: "pending",
    transactionDate: null,
    createdAt: new Date().toISOString()
  };
  payments.set(payment.id, payment);
  return payment;
}
function getPayment(id) {
  return payments.get(String(id));
}
function updatePayment(id, patch) {
  const payment = getPayment(id);
  if (!payment) return null;
  Object.assign(payment, patch);
  return payment;
}
function createSubscription(data) {
  const now = new Date();
  const expires = new Date(now.getTime() + data.durationMinutes * 60 * 1000);
  const subscription = {
    id: String(nextSubscriptionId++),
    paymentId: String(data.paymentId),
    packageId: data.packageId,
    username: `student${String(data.paymentId).padStart(5, "0")}`,
    password: Math.random().toString(36).slice(2, 10).toUpperCase(),
    activatedAt: now.toISOString(),
    expiresAt: expires.toISOString(),
    status: "active"
  };
  subscriptions.set(subscription.id, subscription);
  return subscription;
}
function getSubscriptionByPayment(paymentId) {
  return [...subscriptions.values()].find(s => s.paymentId === String(paymentId)) || null;
}

module.exports = {
  packages,
  payments,
  subscriptions,
  getPackages,
  getPackageById,
  createPayment,
  getPayment,
  updatePayment,
  createSubscription,
  getSubscriptionByPayment
};
