export type RegistrationPaymentStatus =
  | "details_submitted"
  | "payment_pending"
  | "paid"
  | "cancelled";

export type ProviderPaymentStatus =
  | "created"
  | "authorized"
  | "captured"
  | "refunded"
  | "failed";

export type AdminRegistration = {
  application_id: number;
  first_name: string;
  last_name: string;
  phone: string;
  email: string;
  industry: string;
  profession: string;
  designation: string;
  place: string;
  summit_expectations: string | null;
  plan_name: string;
  redeem_code: string | null;
  original_amount_paise: number;
  amount_due_paise: number;
  discount_amount_paise: number;
  payment_status: RegistrationPaymentStatus;
  payment_mode: "test" | "live" | null;
  razorpay_order_id: string | null;
  razorpay_payment_id: string | null;
  provider_payment_status: ProviderPaymentStatus | null;
  payment_method: string | null;
  paid_at: string | null;
  created_at: string;
  updated_at: string;
};

export type AdminMetrics = {
  total_registrations: number;
  redeem_code_registrations: number;
  paid_registrations: number;
  live_paid_registrations: number;
  test_paid_registrations: number;
  awaiting_payment: number;
  collected_paise: number;
  test_collected_paise: number;
  expected_paise: number;
};

export type AdminListFilters = {
  search: string;
  payment: "all" | "awaiting" | "paid" | "cancelled";
  pricing: "all" | "redeemed" | "standard";
  sort: "recent" | "oldest";
  cursor: number | null;
  direction: "next" | "previous";
};

export type AdminPagination = {
  totalMatches: number;
  pageSize: number;
  hasPrevious: boolean;
  hasNext: boolean;
  previousCursor: number | null;
  nextCursor: number | null;
};

export type AdminDashboardData = {
  generated_at: string;
  source: string;
  metrics: AdminMetrics;
  registrations: AdminRegistration[];
  pagination: AdminPagination;
};

export type AdminPaymentAttempt = {
  id: number;
  provider_payment_id: string;
  status: ProviderPaymentStatus;
  amount_paise: number;
  currency: string;
  method: string | null;
  signature_verified_at: string | null;
  captured_at: string | null;
  error_code: string | null;
  error_description: string | null;
  error_source: string | null;
  error_step: string | null;
  error_reason: string | null;
  created_at: string;
  updated_at: string;
};

export type AdminPaymentOrder = {
  id: number;
  provider: "razorpay";
  key_mode: "test" | "live";
  provider_order_id: string | null;
  receipt: string;
  amount_paise: number;
  currency: string;
  status: "initializing" | "created" | "attempted" | "paid" | "creation_failed";
  attempts: number;
  provider_created_at: string | null;
  last_error_code: string | null;
  last_error_description: string | null;
  created_at: string;
  updated_at: string;
  payment_attempts: AdminPaymentAttempt[];
};

export type AdminEmailDelivery = {
  id: number;
  recipient_email: string;
  status: "pending" | "sending" | "sent" | "failed";
  processing_attempts: number;
  provider_message_id: string | null;
  last_error: string | null;
  claimed_at: string | null;
  sent_at: string | null;
  created_at: string;
  updated_at: string;
};

export type AdminRegistrationDetail = {
  registration: AdminRegistration & {
    plan_description: string | null;
    gst_included: boolean;
    redeem_code_active: boolean | null;
    redeem_code_discount_paise: number | null;
  };
  payment_orders: AdminPaymentOrder[];
  email_deliveries: AdminEmailDelivery[];
};
