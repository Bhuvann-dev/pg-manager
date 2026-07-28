/*
Formatting helpers.
*/

/*
Indian-grouped rupee amount: 10000 -> "₹10,000", -500 -> "-₹500".
*/
export function formatMoney(amount) {
  const n = Number(amount) || 0;
  const abs = Math.abs(n).toLocaleString("en-IN");
  return (n < 0 ? "-₹" : "₹") + abs;
}
