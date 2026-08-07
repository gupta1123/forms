import "server-only";

import { createSupabaseServiceClient } from "@/lib/supabase/service";
import type {
  AdminEmailDelivery,
  AdminListFilters,
  AdminPagination,
  AdminPaymentAttempt,
  AdminPaymentOrder,
  AdminRegistration,
  AdminRegistrationDetail,
  RegistrationPaymentStatus,
} from "@/lib/admin/types";

const ADMIN_PAGE_SIZE = 20;

type ApplicationRow = {
  id: number;
  first_name: string;
  last_name: string;
  phone: string;
  email: string;
  industry: string;
  profession: string;
  designation: string;
  place: string;
  summit_expectations: string | null;
  plan_id: number;
  redeem_code_id: number | null;
  original_amount_paise: number;
  amount_due_paise: number;
  status: RegistrationPaymentStatus;
  paid_at: string | null;
  created_at: string;
  updated_at: string;
};

type PlanRow = {
  id: number;
  name: string;
  description: string | null;
  gst_included: boolean;
};

type RedeemCodeRow = {
  id: number;
  code_normalized: string;
  discount_paise: number;
  active: boolean;
};

type PaymentOrderRow = Omit<AdminPaymentOrder, "payment_attempts"> & {
  application_id: number;
};

type PaymentAttemptRow = AdminPaymentAttempt & {
  payment_order_id: number;
};

const applicationColumns =
  "id, first_name, last_name, phone, email, industry, profession, designation, place, summit_expectations, plan_id, redeem_code_id, original_amount_paise, amount_due_paise, status, paid_at, created_at, updated_at";

export async function getAdminRegistrationPage(filters: AdminListFilters): Promise<{
  registrations: AdminRegistration[];
  pagination: AdminPagination;
}> {
  const supabase = createSupabaseServiceClient();
  const searchPattern = normaliseSearchPattern(filters.search);
  let redeemCodeSearchIds: number[] = [];

  if (searchPattern) {
    const { data, error } = await supabase
      .from("summit_redeem_codes")
      .select("id")
      .ilike("code_normalized", searchPattern)
      .limit(20);
    if (error) throw new Error("The registration search could not be loaded.");
    redeemCodeSearchIds = (data ?? []).map((code) => code.id);
  }

  let pageQuery = supabase.from("summit_applications").select(applicationColumns);
  let countQuery = supabase
    .from("summit_applications")
    .select("id", { count: "exact", head: true });

  if (searchPattern) {
    const searchExpression = [
      "first_name",
      "last_name",
      "email",
      "phone",
      "industry",
      "profession",
      "designation",
      "place",
      "summit_expectations",
    ]
      .map((column) => `${column}.ilike.${searchPattern}`)
      .concat(
        redeemCodeSearchIds.length > 0
          ? [`redeem_code_id.in.(${redeemCodeSearchIds.join(",")})`]
          : [],
      )
      .join(",");
    pageQuery = pageQuery.or(searchExpression);
    countQuery = countQuery.or(searchExpression);
  }

  if (filters.payment === "awaiting") {
    pageQuery = pageQuery.in("status", ["details_submitted", "payment_pending"]);
    countQuery = countQuery.in("status", ["details_submitted", "payment_pending"]);
  } else if (filters.payment !== "all") {
    pageQuery = pageQuery.eq("status", filters.payment);
    countQuery = countQuery.eq("status", filters.payment);
  }

  if (filters.pricing === "redeemed") {
    pageQuery = pageQuery.not("redeem_code_id", "is", null);
    countQuery = countQuery.not("redeem_code_id", "is", null);
  } else if (filters.pricing === "standard") {
    pageQuery = pageQuery.is("redeem_code_id", null);
    countQuery = countQuery.is("redeem_code_id", null);
  }

  const displayAscending = filters.sort === "oldest";
  const queryAscending =
    filters.direction === "previous" ? !displayAscending : displayAscending;

  if (filters.cursor) {
    const wantsLowerIds =
      (filters.direction === "next" && !displayAscending) ||
      (filters.direction === "previous" && displayAscending);
    pageQuery = wantsLowerIds
      ? pageQuery.lt("id", filters.cursor)
      : pageQuery.gt("id", filters.cursor);
  }

  pageQuery = pageQuery
    .order("id", { ascending: queryAscending })
    .limit(ADMIN_PAGE_SIZE + 1);

  const [{ data: applicationData, error: applicationError }, countResult] =
    await Promise.all([pageQuery, countQuery]);

  if (applicationError || countResult.error) {
    throw new Error("The registration list could not be loaded.");
  }

  const fetchedApplications = (applicationData ?? []) as ApplicationRow[];
  const hasExtraPage = fetchedApplications.length > ADMIN_PAGE_SIZE;
  let applications = fetchedApplications.slice(0, ADMIN_PAGE_SIZE);

  if (filters.direction === "previous") applications = applications.reverse();

  const registrations = await hydrateRegistrations(supabase, applications);
  const firstRegistration = registrations[0];
  const lastRegistration = registrations.at(-1);
  const hasCursor = Boolean(filters.cursor);

  return {
    registrations,
    pagination: {
      totalMatches: countResult.count ?? 0,
      pageSize: ADMIN_PAGE_SIZE,
      hasPrevious:
        filters.direction === "previous" ? hasExtraPage : hasCursor,
      hasNext: filters.direction === "previous" ? hasCursor : hasExtraPage,
      previousCursor: firstRegistration?.application_id ?? null,
      nextCursor: lastRegistration?.application_id ?? null,
    },
  };
}

export async function getAdminRegistrationDetail(
  applicationId: number,
): Promise<AdminRegistrationDetail | null> {
  const supabase = createSupabaseServiceClient();
  const { data: applicationData, error: applicationError } = await supabase
    .from("summit_applications")
    .select(applicationColumns)
    .eq("id", applicationId)
    .maybeSingle();

  if (applicationError) throw new Error("The registration could not be loaded.");
  if (!applicationData) return null;

  const application = applicationData as ApplicationRow;
  const [planResult, redeemCodeResult, ordersResult, deliveriesResult] =
    await Promise.all([
      supabase
        .from("summit_plans")
        .select("id, name, description, gst_included")
        .eq("id", application.plan_id)
        .maybeSingle(),
      application.redeem_code_id
        ? supabase
            .from("summit_redeem_codes")
            .select("id, code_normalized, discount_paise, active")
            .eq("id", application.redeem_code_id)
            .maybeSingle()
        : Promise.resolve({ data: null, error: null }),
      supabase
        .from("summit_payment_orders")
        .select(
          "id, application_id, provider, key_mode, provider_order_id, receipt, amount_paise, currency, status, attempts, provider_created_at, last_error_code, last_error_description, created_at, updated_at",
        )
        .eq("application_id", application.id)
        .order("created_at", { ascending: false }),
      supabase
        .from("summit_email_deliveries")
        .select(
          "id, recipient_email, status, processing_attempts, provider_message_id, last_error, claimed_at, sent_at, created_at, updated_at",
        )
        .eq("application_id", application.id)
        .order("created_at", { ascending: false }),
    ]);

  if (
    planResult.error ||
    redeemCodeResult.error ||
    ordersResult.error ||
    deliveriesResult.error ||
    !planResult.data
  ) {
    throw new Error("The registration details could not be loaded.");
  }

  const plan = planResult.data as PlanRow;
  const redeemCode = redeemCodeResult.data as RedeemCodeRow | null;
  const orders = (ordersResult.data ?? []) as PaymentOrderRow[];
  const orderIds = orders.map((order) => order.id);
  let paymentAttempts: PaymentAttemptRow[] = [];

  if (orderIds.length > 0) {
    const { data, error } = await supabase
      .from("summit_payment_attempts")
      .select(
        "id, payment_order_id, provider_payment_id, status, amount_paise, currency, method, signature_verified_at, captured_at, error_code, error_description, error_source, error_step, error_reason, created_at, updated_at",
      )
      .in("payment_order_id", orderIds)
      .order("created_at", { ascending: false });

    if (error) throw new Error("The payment history could not be loaded.");
    paymentAttempts = (data ?? []) as PaymentAttemptRow[];
  }

  const latestOrder = orders[0] ?? null;
  const latestAttempt = latestOrder
    ? paymentAttempts.find(
        (attempt) => attempt.payment_order_id === latestOrder.id,
      ) ?? null
    : null;
  const registration = toAdminRegistration(
    application,
    plan,
    redeemCode,
    latestOrder,
    latestAttempt,
  );

  return {
    registration: {
      ...registration,
      plan_description: plan.description,
      gst_included: plan.gst_included,
      redeem_code_active: redeemCode?.active ?? null,
      redeem_code_discount_paise: redeemCode?.discount_paise ?? null,
    },
    payment_orders: orders.map(({ application_id, ...order }) => {
      void application_id;
      return {
        ...order,
        payment_attempts: paymentAttempts
          .filter((attempt) => attempt.payment_order_id === order.id)
          .map(({ payment_order_id, ...attempt }) => {
            void payment_order_id;
            return attempt;
          }),
      };
    }),
    email_deliveries: (deliveriesResult.data ?? []) as AdminEmailDelivery[],
  };
}

async function hydrateRegistrations(
  supabase: ReturnType<typeof createSupabaseServiceClient>,
  applications: ApplicationRow[],
): Promise<AdminRegistration[]> {
  if (applications.length === 0) return [];

  const applicationIds = applications.map((application) => application.id);
  const planIds = [...new Set(applications.map((application) => application.plan_id))];
  const redeemCodeIds = [
    ...new Set(
      applications
        .map((application) => application.redeem_code_id)
        .filter((id): id is number => id !== null),
    ),
  ];

  const [plansResult, redeemCodesResult, ordersResult] = await Promise.all([
    supabase
      .from("summit_plans")
      .select("id, name, description, gst_included")
      .in("id", planIds),
    redeemCodeIds.length > 0
      ? supabase
          .from("summit_redeem_codes")
          .select("id, code_normalized, discount_paise, active")
          .in("id", redeemCodeIds)
      : Promise.resolve({ data: [], error: null }),
    supabase
      .from("summit_payment_orders")
      .select(
        "id, application_id, provider, key_mode, provider_order_id, receipt, amount_paise, currency, status, attempts, provider_created_at, last_error_code, last_error_description, created_at, updated_at",
      )
      .in("application_id", applicationIds)
      .order("created_at", { ascending: false }),
  ]);

  if (plansResult.error || redeemCodesResult.error || ordersResult.error) {
    throw new Error("The registration payment details could not be loaded.");
  }

  const plans = (plansResult.data ?? []) as PlanRow[];
  const redeemCodes = (redeemCodesResult.data ?? []) as RedeemCodeRow[];
  const orders = (ordersResult.data ?? []) as PaymentOrderRow[];
  const latestOrders = new Map<number, PaymentOrderRow>();

  for (const order of orders) {
    if (!latestOrders.has(order.application_id)) {
      latestOrders.set(order.application_id, order);
    }
  }

  const latestOrderIds = [...latestOrders.values()].map((order) => order.id);
  let attempts: PaymentAttemptRow[] = [];

  if (latestOrderIds.length > 0) {
    const { data, error } = await supabase
      .from("summit_payment_attempts")
      .select(
        "id, payment_order_id, provider_payment_id, status, amount_paise, currency, method, signature_verified_at, captured_at, error_code, error_description, error_source, error_step, error_reason, created_at, updated_at",
      )
      .in("payment_order_id", latestOrderIds)
      .order("updated_at", { ascending: false });

    if (error) throw new Error("The registration payments could not be loaded.");
    attempts = (data ?? []) as PaymentAttemptRow[];
  }

  const latestAttempts = new Map<number, PaymentAttemptRow>();
  for (const attempt of attempts) {
    if (!latestAttempts.has(attempt.payment_order_id)) {
      latestAttempts.set(attempt.payment_order_id, attempt);
    }
  }

  const planMap = new Map(plans.map((plan) => [plan.id, plan]));
  const redeemCodeMap = new Map(redeemCodes.map((code) => [code.id, code]));

  return applications.map((application) => {
    const order = latestOrders.get(application.id) ?? null;
    const attempt = order ? latestAttempts.get(order.id) ?? null : null;
    return toAdminRegistration(
      application,
      planMap.get(application.plan_id) ?? null,
      application.redeem_code_id
        ? redeemCodeMap.get(application.redeem_code_id) ?? null
        : null,
      order,
      attempt,
    );
  });
}

function toAdminRegistration(
  application: ApplicationRow,
  plan: PlanRow | null,
  redeemCode: RedeemCodeRow | null,
  order: PaymentOrderRow | null,
  attempt: PaymentAttemptRow | null,
): AdminRegistration {
  return {
    application_id: application.id,
    first_name: application.first_name,
    last_name: application.last_name,
    phone: application.phone,
    email: application.email,
    industry: application.industry,
    profession: application.profession,
    designation: application.designation,
    place: application.place,
    summit_expectations: application.summit_expectations,
    plan_name: plan?.name ?? "Industrial Summit Pass",
    redeem_code: redeemCode?.code_normalized ?? null,
    original_amount_paise: application.original_amount_paise,
    amount_due_paise: application.amount_due_paise,
    discount_amount_paise:
      application.original_amount_paise - application.amount_due_paise,
    payment_status: application.status,
    payment_mode: order?.key_mode ?? null,
    razorpay_order_id: order?.provider_order_id ?? null,
    razorpay_payment_id: attempt?.provider_payment_id ?? null,
    provider_payment_status: attempt?.status ?? null,
    payment_method: attempt?.method ?? null,
    paid_at: application.paid_at,
    created_at: application.created_at,
    updated_at: application.updated_at,
  };
}

function normaliseSearchPattern(search: string) {
  const safeSearch = search
    .replace(/[,%()"'\\]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 80);

  return safeSearch ? `%${safeSearch.replaceAll(" ", "%")}%` : null;
}
