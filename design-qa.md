# Design QA — Jalna Investment Summit registration

## Comparison target

- Source visual truth: `/Users/apple/.codex/attachments/1cc53422-f258-4a18-b15e-1ee4985e62b0/pasted-text.txt`
- Desktop source capture: `/Users/apple/.codex/visualizations/2026/08/06/019fd692-02d4-74a2-8268-cf80ccaac2ea/jalna-ui-reference-wide-2.png`
- Desktop implementation capture: `/Users/apple/.codex/visualizations/2026/08/06/019fd692-02d4-74a2-8268-cf80ccaac2ea/jalna-registration-desktop.png`
- Mobile source capture: `/Users/apple/.codex/visualizations/2026/08/06/019fd692-02d4-74a2-8268-cf80ccaac2ea/jalna-ui-reference-mobile.png`
- Mobile implementation capture: `/Users/apple/.codex/visualizations/2026/08/06/019fd692-02d4-74a2-8268-cf80ccaac2ea/jalna-registration-mobile.png`
- Redeemed-pass implementation capture: `/Users/apple/.codex/visualizations/2026/08/06/019fd692-02d4-74a2-8268-cf80ccaac2ea/jalna-pass-redeemed.png`
- Paid-confirmation implementation capture: `/Users/apple/.codex/visualizations/2026/08/06/019fd692-02d4-74a2-8268-cf80ccaac2ea/jalna-confirmation.png`

## Viewport and normalization

- Desktop CSS viewport: `1280 × 720`; browser-reported `devicePixelRatio: 2`. Browser screenshots were normalized to CSS-pixel width by the capture surface.
- Desktop source pixels: `1280 × 1605`; desktop implementation pixels: `1280 × 1392`. Heights differ because the supplied mock contains additional organisation, purpose, and meeting-request controls that are intentionally not part of the existing database schema.
- Mobile CSS viewport: `390 × 844`; source pixels: `390 × 2825`; implementation pixels: `390 × 2473`.
- Both source and implementation were captured in the empty registration state, light theme, without browser chrome.
- Desktop geometry was also checked from the rendered DOM: source and implementation both used a `1177.59px` shell beginning at `x=51.20px` and a `799.20px` main panel beginning at `x=429.60px`.

## Full-view comparison evidence

- The paper background, navy/brass/seed palette, serif display hierarchy, monospaced labels, two-column shell, sticky left rail, square 1.5px borders, and navy offset panel shadow match the supplied reference.
- The registration fields retain the application's required schema (first name, last name, email, phone, industry, profession, designation, place, and optional summit expectations) while following the reference's field grouping and rhythm.
- The pass page carries the same visual language and preserves the server-verified ₹2,999 price, `SUMIT26` discount, ₹2,399 total, Razorpay launch, and paid-state handling.
- The confirmation route uses the same panel, typography, tokens, step completion states, and a real payment/registration summary instead of a fabricated QR asset.

## Focused region comparison evidence

- Header/brand: the exact source-provided summit mark is reused as a vector asset; brand typography uses Instrument Serif and the registration label uses JetBrains Mono.
- Form panel: kicker, display heading, section legends, required markers, field borders, focus treatment, and CTA shadow were compared at the same desktop viewport.
- Stepper: active, inactive, and completed states use the same square geometry and navy/seed semantics as the reference.
- Responsive form: at `390px`, the field grid resolves to one `307.8px` column and the document width remains exactly `390px`, with no horizontal overflow.

## Required fidelity surfaces

- Fonts and typography: passed. Instrument Serif, Hanken Grotesk, and JetBrains Mono are self-hosted through `next/font` and map to the reference roles, weights, line heights, and tracking.
- Spacing and layout rhythm: passed. Desktop shell and panel rectangles match the reference; mobile stacks the rail, stepper, date card, and panel without overflow.
- Colors and visual tokens: passed. Paper, paper-deep, card, ink, navy, navy-deep, brass, seed, error, and opacity tokens match the supplied CSS values.
- Image quality and asset fidelity: passed. The source logo is reused as a sharp SVG asset. Standard UI icons come from one icon library; there are no placeholder images, emoji icons, CSS illustrations, or fabricated QR artwork.
- Copy and content: passed with an intentional constraint. Reference wording was adopted where it fits the current product; unsupported organisation, sector-choice, meeting-request, and transfer-policy claims were not invented.
- Accessibility: passed for this scope. Inputs have associated labels, required/error semantics remain, focus indicators are visible, reduced motion is respected, and mobile tap targets remain practical.

## Comparison history

1. Initial mobile comparison found one P2 mismatch: the date-and-venue card was hidden below `980px`, while the reference keeps it visible.
2. Fix: removed `.summit-date-card` from the tablet/mobile hidden selector in `src/app/globals.css`.
3. Post-fix evidence: the final mobile implementation capture shows the card in the same sequence as the source; measured document width remains `390px` with no overflow.

## Findings

- No actionable P0, P1, or P2 visual differences remain.
- P3/accepted product constraint: the implementation is shorter than the reference because it preserves the existing approved database fields and delegates payment-method selection to Razorpay Checkout.

## Primary interactions tested

- Submitted every required registration field and reached `/plans`.
- Applied `SUMIT26`; verified the ₹600 saving and ₹2,399 payment CTA.
- Opened Razorpay Test Mode; verified its checkout iframe appears.
- Opened an existing paid registration at `/confirmation`; verified the successful-payment state.
- Checked browser console errors on registration and plan routes: none.

final result: passed
