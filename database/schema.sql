CREATE TABLE IF NOT EXISTS users (
  id BIGSERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  phone_number VARCHAR(20) NOT NULL UNIQUE,
  email TEXT,
  student_registration_number TEXT,
  password_hash TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS packages (
  id BIGSERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  category VARCHAR(20) NOT NULL CHECK (category IN ('hourly','daily','monthly')),
  duration_minutes INTEGER NOT NULL CHECK (duration_minutes > 0),
  price_kes INTEGER NOT NULL CHECK (price_kes > 0),
  description TEXT,
  badge TEXT,
  active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS payments (
  id BIGSERIAL PRIMARY KEY,
  user_id BIGINT REFERENCES users(id),
  package_id BIGINT REFERENCES packages(id),
  phone_number VARCHAR(20) NOT NULL,
  amount_kes INTEGER NOT NULL,
  merchant_request_id TEXT,
  checkout_request_id TEXT UNIQUE,
  mpesa_receipt_number TEXT UNIQUE,
  result_code INTEGER,
  result_description TEXT,
  status VARCHAR(20) NOT NULL DEFAULT 'pending',
  transaction_date TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS subscriptions (
  id BIGSERIAL PRIMARY KEY,
  user_id BIGINT REFERENCES users(id),
  package_id BIGINT REFERENCES packages(id),
  payment_id BIGINT REFERENCES payments(id),
  username TEXT,
  password TEXT,
  activated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMPTZ NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'active'
);

CREATE TABLE IF NOT EXISTS payment_callbacks (
  id BIGSERIAL PRIMARY KEY,
  checkout_request_id TEXT,
  payload JSONB NOT NULL,
  received_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS one_successful_subscription_per_payment
ON subscriptions(payment_id);
