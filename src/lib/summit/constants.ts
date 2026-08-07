export const CHECKOUT_COOKIE_NAME = "summit_checkout";
export const CHECKOUT_COOKIE_MAX_AGE = 60 * 60 * 24 * 30;
export const PAID_MATCH_COOKIE_NAME = "summit_paid_match";
export const PAID_MATCH_COOKIE_MAX_AGE = 60 * 10;

export function isCheckoutToken(value: string | undefined): value is string {
  return Boolean(
    value &&
      /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
        value,
      ),
  );
}
