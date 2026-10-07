import {
  FiCompass, FiFileText, FiEdit2, FiTrash2, FiPackage, FiUserPlus, FiShoppingBag, FiBarChart2
} from 'react-icons/fi';

/**
 * Task guides. Each step:
 *   key        text lives in i18n as g.<key>.t (title) and g.<key>.b (body)
 *   path       page to open for this step
 *   pathPrefix step only exists on pages under this prefix (reached by a previous click)
 *   target     data-tour marker to spotlight
 *   press      "Next" presses the real button (used to open a customer / a bill)
 * Never mark a destructive button (delete) with press.
 */
export const GUIDES = [
  { id: 'app', icon: FiCompass },
  {
    id: 'createBill', icon: FiFileText,
    steps: [
      { key: 'cb1', path: '/billing', target: 'bill-customer' },
      { key: 'cb2', path: '/billing', target: 'bill-voucher' },
      { key: 'cb3', path: '/billing', target: 'bill-rates' },
      { key: 'cb4', path: '/billing', target: 'bill-items' },
      { key: 'cb5', path: '/billing', target: 'bill-summary' },
      { key: 'cb6', path: '/billing', target: 'bill-save' },
    ],
  },
  {
    id: 'editBill', icon: FiEdit2,
    steps: [
      { key: 'open', path: '/ledgers', target: 'ledger-first', press: true },
      { key: 'eb2', pathPrefix: '/ledgers/', target: 'txn-edit', press: true },
      { key: 'eb3', path: '/billing', target: 'bill-save' },
    ],
  },
  {
    id: 'deleteBill', icon: FiTrash2,
    steps: [
      { key: 'open', path: '/ledgers', target: 'ledger-first', press: true },
      { key: 'db2', pathPrefix: '/ledgers/', target: 'txn-view' },
      { key: 'db3', pathPrefix: '/ledgers/', target: 'txn-delete' },
    ],
  },
  {
    id: 'checkStock', icon: FiPackage,
    steps: [
      { key: 'st1', path: '/stock', target: 'stock-current' },
      { key: 'st2', path: '/stock', target: 'stock-cash' },
      { key: 'st3', path: '/stock', target: 'stock-add' },
      { key: 'st4', path: '/stock', target: 'stock-history' },
    ],
  },
  {
    id: 'addCustomer', icon: FiUserPlus,
    steps: [
      { key: 'ac1', path: '/ledgers', target: 'ledger-add' },
      { key: 'ac2', path: '/ledgers', target: 'ledger-search' },
      { key: 'open', path: '/ledgers', target: 'ledger-first' },
    ],
  },
  {
    id: 'purchase', icon: FiShoppingBag,
    steps: [
      { key: 'pu1', path: '/purchase-billing', target: 'pur-customer' },
      { key: 'pu2', path: '/purchase-billing', target: 'pur-type' },
      { key: 'pu3', path: '/purchase-billing', target: 'pur-items' },
      { key: 'pu4', path: '/purchase-billing', target: 'pur-save' },
    ],
  },
  {
    id: 'reports', icon: FiBarChart2,
    steps: [
      { key: 'rp1', path: '/reports', target: 'rep-range' },
      { key: 'rp2', path: '/reports', target: 'rep-kpis' },
      { key: 'rp3', path: '/reports', target: 'rep-daily' },
    ],
  },
];

export const startGuide = (id) => window.dispatchEvent(new CustomEvent('gs:guide', { detail: id }));
