# Promise Enterprise

A mobile-first Wi-Fi sales/customer portal for UoN students, with hourly, daily and monthly packages and an M-PESA STK Push backend architecture.

## Features

- Responsive student-facing website
- Hourly, daily and monthly packages
- Interactive purchase modal
- Demo M-PESA payment flow
- Production-ready Daraja STK Push service structure
- Payment callback endpoint
- Server-side payment validation flow
- Idempotent activation logic
- Student dashboard
- Admin dashboard
- PostgreSQL schema
- Wi-Fi activation service abstraction for MikroTik/RADIUS/Hotspot integrations
- Security middleware and rate limiting

## Run locally

1. Install Node.js 20+.
2. Copy `.env.example` to `.env`.
3. Install packages:

```bash
npm install
```

4. For UI testing, leave:

```env
DEMO=true
```

5. Start:

```bash
npm start
```

6. Open:

http://localhost:3000

## PostgreSQL

Create a database called `promise_enterprise`, then run:

```bash
psql "$DATABASE_URL" -f database/schema.sql
```

If you do not have PostgreSQL configured yet, the front end still runs in DEMO mode because the included server uses an in-memory store for the demo. For production, configure PostgreSQL and replace the demo repository methods with database queries.

## M-PESA / Daraja

Safaricom's Daraja portal provides the API platform and sandbox tooling. Create/configure your Daraja application there, then put credentials in `.env`.

Set:

```env
DEMO=false
MPESA_CONSUMER_KEY=...
MPESA_CONSUMER_SECRET=...
MPESA_PASSKEY=...
MPESA_SHORTCODE=...
MPESA_CALLBACK_URL=https://your-domain.example/api/payment/callback
```

Never put these credentials in browser JavaScript.

The backend:
- obtains an OAuth access token;
- creates the STK Push request;
- stores the checkout request ID;
- receives the callback;
- validates the callback result;
- activates the package only after confirmed payment.

Your callback URL must be reachable by Safaricom. During local development, use a secure public development tunnel or deploy the backend to a public HTTPS host.

## Wi-Fi activation

This project deliberately does NOT pretend to control a real router. `WIFI_MODE=demo` returns generated demo credentials.

For real service, implement `backend/services/wifiService.js` against your authorized MikroTik/RADIUS/Hotspot system. Only activate access after the payment service confirms a successful transaction.

## Important production checklist

- HTTPS
- Real PostgreSQL persistence
- Secure admin authentication
- Strong secrets
- Proper Daraja production credentials
- Public HTTPS callback
- Payment reconciliation
- Database transactions/unique constraints
- Real Wi-Fi controller/RADIUS integration
- Logging and monitoring
- Terms and privacy pages reviewed for the actual business
