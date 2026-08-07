import Image from "next/image";
import Link from "next/link";
import { PiCalendarBlank, PiCheck, PiLockKey } from "react-icons/pi";

const steps = [
  { title: "Your details", subtitle: "Who's attending" },
  { title: "Your pass", subtitle: "Review & redeem" },
  { title: "Payment", subtitle: "Confirm & pay" },
];

export function SummitHeader({
  activeStep,
  greeting,
}: {
  activeStep: 1 | 2 | 3 | 4;
  greeting?: string;
}) {
  const progress = activeStep === 4 ? 100 : (activeStep / 3) * 100;

  return (
    <>
      <div aria-hidden="true" className="summit-progress">
        <span style={{ width: `${progress}%` }} />
      </div>
      <header className="summit-header">
        <div className="summit-header-inner">
          <Link className="summit-brand" href="/">
            <Image
              alt="Industrial Summit"
              className="summit-brand-logo"
              height={660}
              priority
              src="/investors-summit-2026-logo.png"
              width={2616}
            />
          </Link>
          {greeting && (
            <p className="summit-greeting">
              Hi, <strong>{greeting}</strong>
            </p>
          )}
          <span className="summit-secure">
            <PiLockKey aria-hidden="true" />
            <span>Secure registration</span>
          </span>
        </div>
      </header>
    </>
  );
}

export function SummitSidebar({
  activeStep,
}: {
  activeStep: 1 | 2 | 3 | 4;
}) {
  return (
    <aside className="summit-sidebar">
      <p className="summit-eyebrow">Your registration</p>
      <h1>
        Reserve your <em>seat</em> at the summit.
      </h1>
      <p className="summit-sidebar-copy">
        Three steps. Your details, your pass, then payment — about two minutes.
      </p>

      <ol className="summit-steps">
        {steps.map((step, index) => {
          const number = index + 1;
          const done = activeStep > number;
          const active = activeStep === number;

          return (
            <li className={active ? "is-active" : done ? "is-done" : ""} key={step.title}>
              <span className="summit-step-number">
                {done ? <PiCheck aria-hidden="true" /> : number}
              </span>
              <span className="summit-step-title">
                {step.title}
                <small>{step.subtitle}</small>
              </span>
              {done && <PiCheck aria-hidden="true" className="summit-step-check" />}
            </li>
          );
        })}
      </ol>

      <div className="summit-date-card">
        <p className="summit-date-title">
          <PiCalendarBlank aria-hidden="true" />
          Date & venue
        </p>
        <p>
          <strong>Thursday, 3 September 2026</strong>
          <br />
          <strong>The Fern Hotel, Jalna</strong>
          <br />
          9:00 am–3:00 pm, followed by a networking lunch and a dry port site
          visit.
        </p>
        <p>
          Registered delegates will receive final check-in instructions by email.
        </p>
      </div>

      <div className="summit-privacy">
        <strong>Your details stay private</strong>
        <p>
          Registration records are used only for summit access, badge printing,
          and payment. They are not exposed through any public API.
        </p>
      </div>
    </aside>
  );
}

export function SummitShell({
  activeStep,
  children,
}: {
  activeStep: 1 | 2 | 3 | 4;
  children: React.ReactNode;
}) {
  return (
    <div className="summit-shell">
      <SummitSidebar activeStep={activeStep} />
      <div className="min-w-0">{children}</div>
    </div>
  );
}

export function SummitPanelHeader({
  step,
  title,
  accent,
  description,
}: {
  step: string;
  title: string;
  accent: string;
  description: React.ReactNode;
}) {
  return (
    <div className="summit-panel-head">
      <p className="summit-kicker">{step}</p>
      <h2 id="summit-panel-title">
        {title} <em>{accent}</em>
      </h2>
      <p>{description}</p>
    </div>
  );
}
