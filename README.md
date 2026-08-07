# Jalna Investment Summit registration

A public registration and plan-selection flow built with Next.js and Supabase.

## Deployment architecture

This is one full-stack Next.js application, so the frontend and backend belong
in the same GitHub repository. Pages and React components provide the frontend;
server actions and the `/api/payments/*` route handlers provide the backend.
Supabase hosts the PostgreSQL database and Razorpay processes payments.

Deploy the repository as one Netlify site. Configure every variable from
`.env.example` in **Netlify → Site configuration → Environment variables**,
using real production values. Do not upload or commit `.env.local`.

After the first production deploy, configure the Razorpay webhook URL as:

```text
https://YOUR-NETLIFY-DOMAIN/api/payments/webhook
```

Use a new webhook secret in both Razorpay and Netlify, then replace the test
Razorpay keys with live keys only when the site is ready to accept real money.

## Current flow

1. Visitor opens the public registration form.
2. Required personal and professional details are stored through a validated PostgreSQL function.
3. An opaque checkout token is saved in an HTTP-only cookie.
4. The visitor reviews the ₹2,999 summit plan on `/plans`.
5. The `SUMMIT26` redeem code changes the server-verified amount to ₹2,399.
6. Razorpay Checkout creates and verifies the payment using server-only credentials.
7. A captured payment opens `/confirmation` with registration and payment references.
8. Opening the main URL always shows the form. Submitting the same paid email and phone reconnects the attendee to the plan page and shows that payment is already complete.
9. A completed registration cannot be edited or charged a second time through the repeat-visitor flow.

## Razorpay payment backend

The payment backend uses Razorpay Orders and never trusts a price sent by the
browser. `POST /api/payments/order` reads the registration's server-side amount,
creates or recovers an idempotent Razorpay order, and returns only the public
Checkout configuration. `POST /api/payments/verify` validates the Checkout HMAC
signature and fetches the payment from Razorpay before updating Supabase.

Webhook events are accepted at `POST /api/payments/webhook`. The handler checks
the signature against the raw request body, deduplicates events using
`x-razorpay-event-id`, and records captured or failed attempts transactionally.

Required server environment variables:

```env
SUPABASE_SECRET_KEY=sb_secret_...
RAZORPAY_KEY_ID=rzp_test_...
RAZORPAY_KEY_SECRET=...
RAZORPAY_WEBHOOK_SECRET=...
```

Run `202608060004_create_summit_payments.sql` before using the payment routes.

## Admin dashboard

The private dashboard is available at `/admin` (with `/-admin` as an alias). It
shows a searchable and filterable attendee list with registration details,
redeem-code usage, and payment status. Access requires a Supabase Auth user that
is also listed in `summit_admins`.

After running the third migration:

1. Create an email/password user in **Supabase → Authentication → Users**.
2. In the SQL Editor, grant that user access:

   ```sql
   select public.add_summit_admin_by_email('admin@example.com', 'Admin');
   ```

3. Open `http://localhost:3000/admin` and sign in with that account.

Admin registration data is returned only through an authenticated,
administrator-checked database function. Payment metrics will update once the
Razorpay webhook records successful payments.

## Local development

1. Copy `.env.example` to `.env.local` and add the Supabase publishable key.
2. Run the migrations in `supabase/migrations` in filename order.
3. Install dependencies with `npm install`.
4. Start the app with `npm run dev`.
5. Open `http://localhost:3000`.

## Redeem code

`SUMMIT26` applies a ₹600 discount. Migration
`202608070001_correct_redeem_code_to_summit26.sql` safely corrects the earlier
code while preserving linked registrations and redemption counts. Redeem-code
validation and pricing happen in PostgreSQL; the browser cannot set the payable
amount.

## Public information pages

The footer links to `/pricing`, `/contact`, `/terms`, `/privacy`,
`/refund-policy`, and `/delivery-policy`. Configure the organiser, support, date,
and location values documented in `.env.example` before production deployment.

No `service_role` key or database password is used by the application.
