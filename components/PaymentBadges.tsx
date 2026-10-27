// Simple acceptance marks for the payment methods offered through Stripe Checkout.
export function PaymentBadges() {
  const badge = "grid h-7 w-11 place-items-center rounded-md text-[10px] font-extrabold";
  return (
    <div className="flex flex-wrap gap-2" aria-label="Visa, Mastercard, American Express, iDEAL">
      <span className={`${badge} bg-[#1a1f71] italic tracking-tight text-white`}>VISA</span>
      <span className={`${badge} bg-[#231f20]`}>
        <svg viewBox="0 0 32 20" className="h-4 w-7" aria-hidden>
          <circle cx="12" cy="10" r="7" fill="#eb001b" />
          <circle cx="20" cy="10" r="7" fill="#f79e1b" fillOpacity="0.9" />
        </svg>
      </span>
      <span className={`${badge} bg-[#2e77bc] text-[8px] leading-none text-white`}>AMEX</span>
      <span className={`${badge} border border-border bg-white text-[#cc0066]`}>iDEAL</span>
    </div>
  );
}
