/**
 * One receipt for every bill and payment: used by Print, Share PDF and WhatsApp
 * on the Billing and Ledger pages, so all three always show the same numbers.
 *
 * A receipt is plain data (see receiptFromVoucher); receiptHTML turns it into a
 * self-contained, print-safe A4 page. Balances use the app's sign: positive =
 * customer owes the shop ("due"), negative = shop owes the customer ("advance").
 */
import { calculateLabourCharge } from './billingUtils.js';

const n = (v) => (Number.isFinite(Number(v)) ? Number(v) : 0);

export const escapeHtml = (value) => String(value ?? '')
  .replace(/&/g, '&amp;')
  .replace(/</g, '&lt;')
  .replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;')
  .replace(/'/g, '&#39;');

export const inr = (v) => `${n(v) < 0 ? '−' : ''}₹${Math.abs(n(v)).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
export const grams = (v, dp = 3) => `${n(v) < 0 ? '−' : ''}${Math.abs(n(v)).toFixed(dp)} g`;

const TITLES = {
  credit: 'Credit Bill',
  cash: 'Cash Bill',
  add_cash: 'Cash Received',
  add_gold: 'Gold Received',
  add_silver: 'Silver Received',
  money_to_gold: 'Cash to Gold',
  money_to_silver: 'Cash to Silver',
  settlement: 'Settlement'
};

export const receiptTitle = (r) => {
  if (r.voucherType === 'purchase') return 'Purchase Bill';
  if (r.paymentType === 'add_cash' && r.cashReceived < 0) return 'Cash Adjustment';
  return TITLES[r.paymentType] || 'Receipt';
};

const BILL_TYPES = ['cash', 'credit'];

/**
 * Normalise a saved voucher (or the Billing form shaped like one) into receipt data.
 * ctx: { shop: {name, phone}, customer: {name, phone}, labourChargeType, todayBalances }
 * todayBalances is only used for very old vouchers saved without a balance snapshot.
 */
export const receiptFromVoucher = (v, ctx = {}) => {
  const items = (v.items || []).map((i) => ({
    name: i.itemName,
    metal: i.metalType,
    pieces: n(i.pieces),
    gross: n(i.grossWeight),
    less: n(i.lessWeight),
    net: n(i.netWeight),
    melting: n(i.melting),
    fine: n(i.fineWeight),
    labour: calculateLabourCharge(i.labourRate, i.grossWeight, ctx.labourChargeType || 'full'),
    amount: n(i.amount)
  }));
  const isBill = BILL_TYPES.includes(v.paymentType);
  const itemsTotal = items.reduce((s, i) => s + i.amount, 0);
  const gst = n(v.gstDetails?.totalGST);
  const cashReceived = n(v.cashReceived);
  const snap = v.balanceSnapshot;
  const side = (b, amountKey) => ({ cash: n(b?.[amountKey]), gold: n(b?.goldFineWeight), silver: n(b?.silverFineWeight) });

  let balance = null;
  if (snap?.oldBalance && snap?.currentBalance) {
    balance = { before: side(snap.oldBalance, 'totalAmount'), after: side(snap.currentBalance, 'amount') };
  } else if (ctx.todayBalances) {
    const t = ctx.todayBalances;
    balance = { after: { cash: n(t.cashBalance) + n(t.creditBalance), gold: n(t.goldFineWeight), silver: n(t.silverFineWeight) }, afterLabel: 'Balance today' };
  }

  return {
    shop: ctx.shop || {},
    customer: ctx.customer || {},
    paymentType: v.paymentType,
    voucherType: v.voucherType || 'sale',
    number: v.voucherNumber,
    date: v.date,
    time: v.createdAt,
    items: isBill ? items : [],
    stoneAmount: n(v.stoneAmount),
    fineAmount: n(v.fineAmount),
    gst,
    itemsTotal,
    total: isBill ? (n(v.total) || itemsTotal + n(v.stoneAmount) + n(v.fineAmount) + gst) : cashReceived,
    cashReceived,
    goldRate: n(v.goldRate),
    silverRate: n(v.silverRate),
    balance,
    narration: v.narration || ''
  };
};

/** Legacy Settlement records (gold/silver fine settled at a rate). */
export const receiptFromSettlement = (s, ctx = {}) => ({
  shop: ctx.shop || {},
  customer: ctx.customer || {},
  paymentType: 'settlement',
  voucherType: 'sale',
  number: `SET-${String(s._id || '').slice(0, 6).toUpperCase()}`,
  date: s.date,
  time: s.createdAt,
  items: [],
  settlement: { metal: s.metalType, rate: n(s.metalRate), fine: n(s.fineGiven), amount: n(s.amount), direction: s.direction },
  total: n(s.amount),
  cashReceived: 0,
  balance: null,
  narration: s.narration || ''
});

const fmtDate = (d) => (d ? new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '');
const fmtTime = (d) => (d ? new Date(d).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }) : '');

// What this entry did, in one line (payments and conversions have no items table)
const receivedLine = (r) => {
  const rec = r.cashReceived;
  switch (r.paymentType) {
    case 'add_cash': return [rec < 0 ? 'Cash adjustment' : 'Cash received', inr(rec)];
    case 'add_gold': return ['Fine gold received', grams(rec)];
    case 'add_silver': return ['Fine silver received', grams(rec)];
    case 'money_to_gold': return ['Cash paid towards gold', `${inr(rec)} @ ${inr(r.goldRate)}/g = ${grams(r.goldRate ? rec / r.goldRate : 0)}`];
    case 'money_to_silver': return ['Cash paid towards silver', `${inr(rec)} @ ${inr(r.silverRate)}/g = ${grams(r.silverRate ? rec / r.silverRate : 0)}`];
    case 'settlement': {
      const s = r.settlement;
      return [`${s.direction === 'receipt' ? 'Fine received' : 'Fine given'} (${s.metal})`, `${grams(s.fine)} @ ${inr(s.rate)}/g = ${inr(s.amount)}`];
    }
    default: return null;
  }
};

const dueWord = (v) => (v > 0.0005 ? '<span class="due">due</span>' : v < -0.0005 ? '<span class="adv">advance</span>' : '');

const balanceTable = (b) => {
  const metals = ['gold', 'silver'].filter((m) => Math.abs(b.after[m]) > 0.0005 || Math.abs(b.before?.[m] || 0) > 0.0005);
  const cols = [['cash', 'Cash', inr], ...metals.map((m) => [m, m === 'gold' ? 'Fine gold' : 'Fine silver', grams])];
  // The due/advance word carries the direction, so the figure itself is shown without a sign
  const cell = (val, fmt) => `<td>${escapeHtml(fmt(Math.abs(val) < 0.0005 ? 0 : Math.abs(val)))} ${dueWord(val)}</td>`;
  const change = (k) => b.after[k] - b.before[k];
  const rows = [];
  if (b.before) rows.push(`<tr><td class="tl muted">Before this entry</td>${cols.map(([k, , f]) => cell(b.before[k], f, true)).join('')}</tr>`);
  if (b.before) rows.push(`<tr><td class="tl muted">This entry</td>${cols.map(([k, , f]) => `<td>${change(k) > 0 ? '+' : ''}${escapeHtml(f(change(k)))}</td>`).join('')}</tr>`);
  rows.push(`<tr class="strong"><td class="tl">${escapeHtml(b.afterLabel || 'After this entry')}</td>${cols.map(([k, , f]) => cell(b.after[k], f, true)).join('')}</tr>`);
  return `<div class="bal avoid">
    <div class="sec-title">Account balance</div>
    <table><thead><tr><th class="tl"></th>${cols.map(([, label]) => `<th>${label}</th>`).join('')}</tr></thead><tbody>${rows.join('')}</tbody></table>
    <div class="hint">due = customer owes the shop · advance = shop owes the customer</div>
  </div>`;
};

const STYLE = `
.rcpt{width:720px;margin:0 auto;padding:28px 32px;background:#fff;color:#1c1c1a;font-family:Inter,-apple-system,'Segoe UI',Roboto,Arial,sans-serif;font-size:12.5px;line-height:1.45}
.rcpt *{box-sizing:border-box}
.rcpt .head{display:flex;justify-content:space-between;align-items:flex-start;gap:24px;padding-bottom:14px;border-bottom:2px solid #1c1c1a}
.rcpt .shop{font-size:22px;font-weight:700;letter-spacing:-.01em}
.rcpt .muted{color:#5b5b57}
.rcpt .doc{text-align:right}
.rcpt .doc-title{display:inline-block;padding:3px 10px;border-radius:4px;background:#2b4c7e;color:#fff;font-size:10.5px;font-weight:700;letter-spacing:.08em;text-transform:uppercase}
.rcpt .doc-no{margin-top:6px;font-size:17px;font-weight:700}
.rcpt .meta{display:flex;justify-content:space-between;gap:24px;padding:14px 0 10px}
.rcpt .label,.rcpt .sec-title{font-size:10px;font-weight:600;letter-spacing:.07em;text-transform:uppercase;color:#767671;margin-bottom:3px}
.rcpt .sec-title{margin:0 0 6px}
.rcpt .name{font-size:15px;font-weight:600}
.rcpt table{width:100%;border-collapse:collapse}
.rcpt th{padding:7px 6px;font-size:9.5px;font-weight:600;letter-spacing:.06em;text-transform:uppercase;color:#5b5b57;text-align:right;background:#f5f5f3;border-bottom:1px solid #1c1c1a}
.rcpt td{padding:7px 6px;text-align:right;border-bottom:1px solid #e2e2de;font-variant-numeric:tabular-nums}
.rcpt .tl{text-align:left}
.rcpt tfoot td{font-weight:700;background:#f5f5f3;border-top:1px solid #1c1c1a;border-bottom:0}
.rcpt tr{break-inside:avoid;page-break-inside:avoid}
.rcpt .metal{white-space:nowrap}
.rcpt .dot{display:inline-block;width:8px;height:8px;margin-right:5px;border-radius:50%;background:#8a8f98;vertical-align:middle}
.rcpt .gold .dot{background:#b08a3e}
.rcpt .grid2{display:grid;grid-template-columns:1fr 1fr;gap:18px;margin-top:16px}
.rcpt .box,.rcpt .bal,.rcpt .received{border:1px solid #e2e2de;border-radius:8px;padding:12px 14px}
.rcpt .row{display:flex;justify-content:space-between;gap:12px;padding:2px 0}
.rcpt .row.total{margin-top:6px;padding-top:8px;border-top:1px solid #1c1c1a;font-size:15px;font-weight:700}
.rcpt .received{margin-top:16px;display:flex;justify-content:space-between;align-items:center;gap:16px}
.rcpt .received .big{font-size:20px;font-weight:700;text-align:right}
.rcpt .bal{margin-top:16px}
.rcpt .bal td,.rcpt .bal th{border-bottom:1px solid #ececea}
.rcpt .bal tr.strong td{font-weight:700;font-size:13.5px;border-bottom:0}
.rcpt .due{color:#b3261e;font-size:10px;font-weight:600;text-transform:uppercase}
.rcpt .adv{color:#2f7a4e;font-size:10px;font-weight:600;text-transform:uppercase}
.rcpt .hint{margin-top:6px;font-size:10px;color:#767671}
.rcpt .note{margin-top:14px}
.rcpt .sign{display:grid;grid-template-columns:1fr 1fr;gap:64px;margin-top:44px}
.rcpt .sign div{padding-top:6px;border-top:1px solid #1c1c1a;text-align:center;font-size:11px;color:#5b5b57}
.rcpt .foot{margin-top:18px;text-align:center;font-size:10px;color:#767671}
.rcpt .avoid{break-inside:avoid;page-break-inside:avoid}
@media screen and (max-width:760px){.rcpt{width:auto;padding:16px}.rcpt .grid2{grid-template-columns:1fr}.rcpt .items-wrap{overflow-x:auto}}
`;

export const receiptHTML = (r) => {
  const title = receiptTitle(r);
  const e = escapeHtml;
  const hasItems = r.items?.length > 0;
  const sum = (k) => r.items.reduce((s, i) => s + i[k], 0);
  const fineBy = (metal) => r.items.filter((i) => i.metal === metal).reduce((s, i) => s + i.fine, 0);
  const received = receivedLine(r);

  const itemsTable = hasItems ? `
    <div class="items-wrap"><table>
      <thead><tr>
        <th class="tl">#</th><th class="tl">Item</th><th class="tl">Metal</th><th>Pcs</th><th>Gross</th><th>Less</th><th>Net</th><th>Melt %</th><th>Fine</th><th>Labour</th><th>Amount</th>
      </tr></thead>
      <tbody>${r.items.map((i, idx) => `<tr>
        <td class="tl muted">${idx + 1}</td>
        <td class="tl">${e(i.name)}</td>
        <td class="tl metal ${i.metal === 'gold' ? 'gold' : 'silver'}"><span class="dot"></span>${i.metal === 'gold' ? 'Gold' : 'Silver'}</td>
        <td>${i.pieces}</td><td>${i.gross.toFixed(3)}</td><td>${i.less.toFixed(3)}</td><td>${i.net.toFixed(3)}</td>
        <td>${i.melting ? i.melting.toFixed(2) : '–'}</td><td>${i.fine.toFixed(3)}</td><td>${e(inr(i.labour))}</td><td>${e(inr(i.amount))}</td>
      </tr>`).join('')}</tbody>
      <tfoot><tr>
        <td class="tl" colspan="3">Total</td><td>${sum('pieces')}</td><td>${sum('gross').toFixed(3)}</td><td>${sum('less').toFixed(3)}</td><td>${sum('net').toFixed(3)}</td>
        <td></td><td>${sum('fine').toFixed(3)}</td><td>${e(inr(sum('labour')))}</td><td>${e(inr(r.itemsTotal))}</td>
      </tr></tfoot>
    </table></div>` : '';

  const rates = [r.goldRate > 0 && `<div class="row"><span class="muted">Gold rate</span><span>${e(inr(r.goldRate))}/g</span></div>`,
    r.silverRate > 0 && `<div class="row"><span class="muted">Silver rate</span><span>${e(inr(r.silverRate))}/g</span></div>`].filter(Boolean).join('');

  const summary = hasItems ? `
    <div class="grid2 avoid">
      <div class="box">
        <div class="sec-title">Weights &amp; rates</div>
        ${fineBy('gold') ? `<div class="row"><span class="muted">Fine gold</span><span>${grams(fineBy('gold'))}</span></div>` : ''}
        ${fineBy('silver') ? `<div class="row"><span class="muted">Fine silver</span><span>${grams(fineBy('silver'))}</span></div>` : ''}
        ${rates}
      </div>
      <div class="box">
        <div class="sec-title">Amount</div>
        <div class="row"><span class="muted">Items</span><span>${e(inr(r.itemsTotal))}</span></div>
        ${r.stoneAmount ? `<div class="row"><span class="muted">Stone</span><span>${e(inr(r.stoneAmount))}</span></div>` : ''}
        ${r.fineAmount ? `<div class="row"><span class="muted">Fine amount</span><span>${e(inr(r.fineAmount))}</span></div>` : ''}
        ${r.gst ? `<div class="row"><span class="muted">GST</span><span>${e(inr(r.gst))}</span></div>` : ''}
        <div class="row total"><span>Grand total</span><span>${e(inr(r.total))}</span></div>
        ${r.cashReceived ? `<div class="row"><span class="muted">Cash received</span><span>${e(inr(r.cashReceived))}</span></div>
        <div class="row"><span class="muted">Balance of this bill</span><span>${e(inr(r.total - r.cashReceived))}</span></div>` : ''}
      </div>
    </div>` : '';

  const receivedBlock = received ? `
    <div class="received avoid">
      <div class="label">${e(received[0])}</div>
      <div class="big">${e(received[1])}</div>
    </div>` : '';

  return `<div class="rcpt-root"><style>${STYLE}</style><div class="rcpt">
    <div class="head avoid">
      <div>
        <div class="shop">${e(r.shop?.name || 'Jewellery Shop')}</div>
        ${r.shop?.phone ? `<div class="muted">Ph: ${e(r.shop.phone)}</div>` : ''}
      </div>
      <div class="doc">
        <span class="doc-title">${e(title)}</span>
        <div class="doc-no">${r.number ? `#${e(r.number)}` : ''}</div>
      </div>
    </div>
    <div class="meta avoid">
      <div><div class="label">Customer</div><div class="name">${e(r.customer?.name || '—')}</div>${r.customer?.phone ? `<div class="muted">${e(r.customer.phone)}</div>` : ''}</div>
      <div style="text-align:right"><div class="label">Date</div><div class="name">${e(fmtDate(r.date))}</div>${r.time ? `<div class="muted">${e(fmtTime(r.time))}</div>` : ''}</div>
    </div>
    ${itemsTable}
    ${summary}
    ${receivedBlock}
    ${r.balance ? balanceTable(r.balance) : ''}
    ${r.narration ? `<div class="note avoid"><div class="label">Note</div><div>${e(r.narration)}</div></div>` : ''}
    <div class="sign avoid"><div>Customer signature</div><div>Authorised signatory</div></div>
    <div class="foot">Thank you for your business · Generated ${e(new Date().toLocaleString('en-IN'))}</div>
  </div></div>`;
};

/** Short plain-text version for WhatsApp. */
export const receiptText = (r) => {
  const received = receivedLine(r);
  const after = r.balance?.after;
  const word = (v) => (v > 0.0005 ? ' due' : v < -0.0005 ? ' advance' : '');
  return [
    `*${r.shop?.name || 'Jewellery Shop'} — ${receiptTitle(r)}${r.number ? ` #${r.number}` : ''}*`,
    `Date: ${fmtDate(r.date)}`,
    `Customer: ${r.customer?.name || '—'}`,
    '',
    ...r.items.map((i, idx) => `${idx + 1}. ${i.name} (${i.metal}) · Fine ${grams(i.fine)} · ${inr(i.amount)}`),
    r.items.length ? `*Total: ${inr(r.total)}*` : '',
    r.items.length && r.cashReceived ? `Cash received: ${inr(r.cashReceived)}` : '',
    received ? `*${received[0]}: ${received[1]}*` : '',
    after ? `\nBalance: Cash ${inr(after.cash)}${word(after.cash)}${after.gold ? ` · Gold ${grams(after.gold)}${word(after.gold)}` : ''}${after.silver ? ` · Silver ${grams(after.silver)}${word(after.silver)}` : ''}` : '',
    r.narration ? `Note: ${r.narration}` : '',
    '',
    'Thank you for your business!'
  ].filter((line) => typeof line === 'string').join('\n').replace(/\n{3,}/g, '\n\n');
};

export const receiptFileName = (r) => {
  const slug = (v) => String(v || '').trim().replace(/[^\w-]+/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '');
  return `${[slug(receiptTitle(r)), slug(r.number), slug(r.customer?.name)].filter(Boolean).join('_') || 'Receipt'}.pdf`;
};

/** Opens the receipt in a new window and prints it. Returns false if pop-ups are blocked. */
export const printReceipt = (r) => {
  const w = window.open('', '_blank');
  if (!w) return false;
  w.document.write(`<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
    <title>${escapeHtml(`${receiptTitle(r)} ${r.number ? `#${r.number}` : ''}`)}</title>
    <style>@page{size:A4;margin:10mm}body{margin:0;background:#fff}</style></head>
    <body>${receiptHTML(r)}<script>window.onload=function(){window.focus();window.print();}<\/script></body></html>`);
  w.document.close();
  return true;
};

/**
 * Renders the receipt to an A4 PDF and opens the phone's share sheet (WhatsApp etc.);
 * falls back to downloading the file. Returns 'shared' | 'cancelled' | 'downloaded'.
 */
export const shareReceiptPDF = async (r) => {
  const host = document.createElement('div');
  // Off-screen, fixed A4 width so the PDF looks the same from a phone or a desktop
  host.style.cssText = 'position:fixed;left:-10000px;top:0;width:794px;background:#fff';
  host.innerHTML = receiptHTML(r);
  document.body.appendChild(host);
  try {
    // Loaded on demand: the PDF library is large and only needed when sharing
    const { default: html2pdf } = await import('html2pdf.js');
    if (document.fonts?.ready) await document.fonts.ready;
    const blob = await html2pdf().set({
      margin: [8, 8, 8, 8],
      image: { type: 'jpeg', quality: 0.98 },
      pagebreak: { mode: ['css', 'legacy'], avoid: ['.avoid', 'tr'] },
      html2canvas: { scale: 2, useCORS: true, backgroundColor: '#ffffff' },
      jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
    }).from(host.firstElementChild).output('blob');

    const file = new File([blob], receiptFileName(r), { type: 'application/pdf' });
    if (navigator.canShare?.({ files: [file] })) {
      try {
        await navigator.share({ files: [file], title: `${receiptTitle(r)} ${r.number ? `#${r.number}` : ''}`.trim(), text: `${receiptTitle(r)} for ${r.customer?.name || ''}`.trim() });
        return 'shared';
      } catch (err) {
        if (err?.name === 'AbortError') return 'cancelled';
      }
    }
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = file.name;
    document.body.appendChild(a);
    a.click();
    a.remove();
    // Revoking straight away can cancel the download in some browsers
    setTimeout(() => URL.revokeObjectURL(url), 2000);
    return 'downloaded';
  } finally {
    host.remove();
  }
};
