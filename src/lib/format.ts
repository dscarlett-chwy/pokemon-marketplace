const money = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" });
const wholeMoney = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 });

export function formatMoney(amount: number) {
  return Number.isInteger(amount) ? wholeMoney.format(amount) : money.format(amount);
}

const dateFormat = new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });

export function formatWhen(iso: string) {
  return dateFormat.format(new Date(iso));
}
