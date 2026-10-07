import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { useAuth } from './context/AuthContext';

// Menu labels, the first-visit guide and the language card are translated.
// Other pages are still English; add keys here as they get translated.
export const LANGUAGES = [
  { code: 'en', name: 'English', native: 'English' },
  { code: 'kn', name: 'Kannada', native: 'ಕನ್ನಡ' },
  { code: 'hi', name: 'Hindi', native: 'हिन्दी' },
];

const STRINGS = {
  en: {
    'lang.title': 'Choose your language',
    'lang.sub': 'You can change this later in Account.',
    'tour.welcomeTitle': 'Welcome, {name}!',
    'tour.welcomeBody': "Let's take a 1-minute tour of the app. We'll show you where everything is.",
    'tour.start': 'Start tour',
    'tour.skip': 'Skip',
    'tour.next': 'Next',
    'tour.back': 'Back',
    'tour.step': 'Step {n} of {total}',
    'tour.clickHint': 'Click here to open it, or press Next.',
    'tour.doneTitle': "You're all set!",
    'tour.doneBody': 'Start by making your first bill. Press Help (?) at the top anytime for step-by-step guides: create, edit or delete a bill, check stock and more.',
    'tour.firstBill': 'Make first bill',
    'tour.close': 'Close',
    'nav.more': 'More',
    'nav.logout': 'Logout',
    'nav.role': 'Shop account',
    'logout.message': 'Are you sure you want to logout?',
    'logout.cancel': 'Cancel',
    'account.langTitle': 'Language & guide',
    'account.language': 'Language',
    'account.replay': 'Show app guide again',
    'account.langNote': 'The menu and this guide use your language. Bills and other pages are in English for now.',

    'help.button': 'Help',
    'notFound.title': 'Page not found',
    'notFound.body': "The page you're looking for doesn't exist or has moved. Check the address, or go back.",
    'notFound.back': 'Go back',
    'notFound.home': 'Go to dashboard',
    'notFound.login': 'Go to login',
    'guide.title': 'Step-by-step guides',
    'guide.app': 'App tour', 'guide.app.d': 'Every menu, one by one',
    'guide.createBill': 'Create a bill', 'guide.createBill.d': 'Make a cash or credit bill',
    'guide.editBill': 'Edit a bill', 'guide.editBill.d': 'Change a bill you already saved',
    'guide.deleteBill': 'Delete a bill', 'guide.deleteBill.d': 'Remove a wrong bill',
    'guide.checkStock': 'Check stock', 'guide.checkStock.d': 'Gold, silver and cash in hand',
    'guide.addCustomer': 'Add a customer', 'guide.addCustomer.d': 'Create and find customer accounts',
    'guide.purchase': 'Buy old gold', 'guide.purchase.d': 'Record a purchase or exchange',
    'guide.reports': 'See reports', 'guide.reports.d': 'Sales and profit for any dates',
    'guide.doneTitle': "That's it!",
    'guide.doneBody': 'Press Help (?) at the top anytime to see a guide again.',
    'guide.gotIt': 'Got it',
    'guide.noTarget': "This isn't here yet. It will show up once you add one.",

    'g.cb1.t': 'Choose the customer', 'g.cb1.b': "Search by name or phone. New customer? Click 'Add Customer'.",
    'g.cb2.t': 'Bill type', 'g.cb2.b': "Voucher number and date fill in by themselves. Pick 'Cash Bill' if they pay now, or 'Credit Bill' to add it to their balance.",
    'g.cb3.t': "Today's rates", 'g.cb3.b': "Enter today's gold and silver rate. 'Cash Received' is the money the customer gives now.",
    'g.cb4.t': 'Add items', 'g.cb4.b': 'Add a gold or silver row, then type the item name and gross weight. Fine weight and amount are calculated for you.',
    'g.cb5.t': 'Check the totals', 'g.cb5.b': "See the bill total and the customer's new balance before you save.",
    'g.cb6.t': 'Save and share', 'g.cb6.b': "'Save Voucher' stores the bill and updates stock and the customer's balance. Then print it or send it on WhatsApp.",
    'g.open.t': 'Open the customer', 'g.open.b': "Every bill is kept under its customer. Click 'View' to open their account.",
    'g.eb2.t': 'Edit the bill', 'g.eb2.b': 'Click the pencil next to the bill. It opens in Billing with everything filled in.',
    'g.eb3.t': 'Save your changes', 'g.eb3.b': "Change what you need and press 'Update Voucher'. Balance and stock are corrected automatically. Bills can be edited within the time set in Account (48 hours by default).",
    'g.db2.t': 'Preview, print or share', 'g.db2.b': 'The eye shows the bill, the printer prints it, and share sends a PDF.',
    'g.db3.t': 'Delete the bill', 'g.db3.b': 'The red bin deletes the bill. Within 48 hours (or the time set in Account) stock and balance are put back. After that, only the record is removed.',
    'g.st1.t': 'Gold and silver stock', 'g.st1.b': 'Fine weight of gold and silver you have. Sales reduce it and purchases add to it.',
    'g.st2.t': 'Cash in hand', 'g.st2.b': 'Cash from sales and money you added, minus expenses and payments. Click it to see the breakdown.',
    'g.st3.t': 'Add stock or cash', 'g.st3.b': 'Bought new stock or put money in the drawer? Record it here.',
    'g.st4.t': 'History', 'g.st4.b': 'Every addition is listed here. You can export or print it.',
    'g.ac1.t': 'Add a customer', 'g.ac1.b': 'Click here and enter name, phone and any old balance they already owe in cash, gold or silver.',
    'g.ac2.t': 'Find a customer', 'g.ac2.b': 'Search by name or phone number.',
    'g.pu1.t': 'Choose the seller', 'g.pu1.b': 'Pick the customer you are buying old gold or silver from.',
    'g.pu2.t': 'Bill type', 'g.pu2.b': 'Choose Old Purchase, Exchange (old for new) or New Purchase, and enter the cash you pay them.',
    'g.pu3.t': 'Items bought', 'g.pu3.b': 'Add each item with gross weight and melting %. Fine weight and value are calculated.',
    'g.pu4.t': 'Save', 'g.pu4.b': "'Save Voucher' records the purchase and adds the metal to your stock.",
    'g.rp1.t': 'Pick the dates', 'g.rp1.b': "Choose Today, Last 7 Days, This Month, or set your own dates and press 'Apply'.",
    'g.rp2.t': 'Key numbers', 'g.rp2.b': 'Total sales, cash collected, credit, expenses and profit for those dates.',
    'g.rp3.t': 'Day by day', 'g.rp3.b': "Sales for each day. Press 'Print' for a paper copy.",

    'nav./dashboard': 'Dashboard', 'short./dashboard': 'Home',
    'nav./billing': 'Billing', 'short./billing': 'Billing',
    'nav./gst-billing': 'GST Billing',
    'nav./purchase-billing': 'Purchase / Old Gold',
    'nav./ledgers': 'Ledgers', 'short./ledgers': 'Ledgers',
    'nav./gst-ledger': 'GST Ledger',
    'nav./expenses': 'Expenses',
    'nav./karigar': 'Karigar',
    'nav./stock': 'Stock', 'short./stock': 'Stock',
    'nav./item-reports': 'Item Reports',
    'nav./reports': 'Reports & Analytics',
    'nav./account': 'Account',

    'help./dashboard': "Today's sales and customers who owe you, at a glance.",
    'help./billing': 'Make sales bills, cash or credit, with gold and silver items. Print or share on WhatsApp.',
    'help./gst-billing': 'Make GST tax invoices with CGST/SGST or IGST worked out for you.',
    'help./purchase-billing': 'Record old gold or silver you buy from customers, or an exchange.',
    'help./ledgers': "Every customer's account: what they owe in cash, gold and silver.",
    'help./gst-ledger': 'Accounts of customers you bill with GST invoices.',
    'help./expenses': 'Note shop expenses like rent, salary and electricity.',
    'help./karigar': 'Track gold given to and received from your karigars, and their charges.',
    'help./stock': 'Your gold, silver and cash in hand. Bills update it automatically.',
    'help./item-reports': "Item-wise stock: what's available and what's sold.",
    'help./reports': 'Sales, profit, top customers and daily totals for any date range.',
    'help./account': 'Shop details, theme, language and settings. Replay this guide from here.',
  },

  kn: {
    'lang.title': 'ನಿಮ್ಮ ಭಾಷೆಯನ್ನು ಆಯ್ಕೆಮಾಡಿ',
    'lang.sub': 'ಇದನ್ನು ನಂತರ ಖಾತೆ ಸೆಟ್ಟಿಂಗ್‌ನಲ್ಲಿ ಬದಲಾಯಿಸಬಹುದು.',
    'tour.welcomeTitle': 'ಸ್ವಾಗತ, {name}!',
    'tour.welcomeBody': 'ಒಂದು ನಿಮಿಷದಲ್ಲಿ ಆ್ಯಪ್‌ನ ಪರಿಚಯ ಮಾಡಿಕೊಳ್ಳೋಣ. ಎಲ್ಲವೂ ಎಲ್ಲಿದೆ ಎಂದು ತೋರಿಸುತ್ತೇವೆ.',
    'tour.start': 'ಪರಿಚಯ ಪ್ರಾರಂಭಿಸಿ',
    'tour.skip': 'ಬಿಟ್ಟುಬಿಡಿ',
    'tour.next': 'ಮುಂದೆ',
    'tour.back': 'ಹಿಂದೆ',
    'tour.step': 'ಹಂತ {n} / {total}',
    'tour.clickHint': 'ತೆರೆಯಲು ಇಲ್ಲಿ ಕ್ಲಿಕ್ ಮಾಡಿ, ಅಥವಾ "ಮುಂದೆ" ಒತ್ತಿ.',
    'tour.doneTitle': 'ಎಲ್ಲವೂ ಸಿದ್ಧ!',
    'tour.doneBody': 'ನಿಮ್ಮ ಮೊದಲ ಬಿಲ್ ಮಾಡುವ ಮೂಲಕ ಪ್ರಾರಂಭಿಸಿ. ಬಿಲ್ ಮಾಡುವುದು, ಬದಲಾಯಿಸುವುದು, ಅಳಿಸುವುದು, ಸ್ಟಾಕ್ ನೋಡುವುದು ಮುಂತಾದವುಗಳ ಹಂತ ಹಂತದ ಮಾರ್ಗದರ್ಶಿಗಾಗಿ ಮೇಲಿನ "ಸಹಾಯ (?)" ಒತ್ತಿ.',
    'tour.firstBill': 'ಮೊದಲ ಬಿಲ್ ಮಾಡಿ',
    'tour.close': 'ಮುಚ್ಚಿ',
    'nav.more': 'ಇನ್ನಷ್ಟು',
    'nav.logout': 'ಲಾಗ್ ಔಟ್',
    'nav.role': 'ಅಂಗಡಿ ಖಾತೆ',
    'logout.message': 'ನೀವು ಖಚಿತವಾಗಿ ಲಾಗ್ ಔಟ್ ಆಗಬೇಕೇ?',
    'logout.cancel': 'ರದ್ದುಮಾಡಿ',
    'account.langTitle': 'ಭಾಷೆ ಮತ್ತು ಮಾರ್ಗದರ್ಶಿ',
    'account.language': 'ಭಾಷೆ',
    'account.replay': 'ಮಾರ್ಗದರ್ಶಿಯನ್ನು ಮತ್ತೆ ತೋರಿಸಿ',
    'account.langNote': 'ಮೆನು ಮತ್ತು ಈ ಮಾರ್ಗದರ್ಶಿ ನಿಮ್ಮ ಭಾಷೆಯಲ್ಲಿವೆ. ಬಿಲ್ ಮತ್ತು ಇತರ ಪುಟಗಳು ಸದ್ಯಕ್ಕೆ ಇಂಗ್ಲಿಷ್‌ನಲ್ಲಿವೆ.',

    'help.button': 'ಸಹಾಯ',
    'notFound.title': 'ಪುಟ ಸಿಗಲಿಲ್ಲ',
    'notFound.body': 'ನೀವು ಹುಡುಕುತ್ತಿರುವ ಪುಟ ಇಲ್ಲ ಅಥವಾ ಬೇರೆಡೆ ಹೋಗಿದೆ. ವಿಳಾಸವನ್ನು ಪರಿಶೀಲಿಸಿ, ಅಥವಾ ಹಿಂದಕ್ಕೆ ಹೋಗಿ.',
    'notFound.back': 'ಹಿಂದಕ್ಕೆ ಹೋಗಿ',
    'notFound.home': 'ಡ್ಯಾಶ್‌ಬೋರ್ಡ್‌ಗೆ ಹೋಗಿ',
    'notFound.login': 'ಲಾಗಿನ್‌ಗೆ ಹೋಗಿ',
    'guide.title': 'ಹಂತ ಹಂತದ ಮಾರ್ಗದರ್ಶಿಗಳು',
    'guide.app': 'ಆ್ಯಪ್ ಪರಿಚಯ', 'guide.app.d': 'ಪ್ರತಿ ಮೆನು, ಒಂದೊಂದಾಗಿ',
    'guide.createBill': 'ಬಿಲ್ ಮಾಡಿ', 'guide.createBill.d': 'ನಗದು ಅಥವಾ ಸಾಲದ ಬಿಲ್',
    'guide.editBill': 'ಬಿಲ್ ಬದಲಾಯಿಸಿ', 'guide.editBill.d': 'ಉಳಿಸಿದ ಬಿಲ್ ತಿದ್ದುಪಡಿ',
    'guide.deleteBill': 'ಬಿಲ್ ಅಳಿಸಿ', 'guide.deleteBill.d': 'ತಪ್ಪಾದ ಬಿಲ್ ತೆಗೆದುಹಾಕಿ',
    'guide.checkStock': 'ಸ್ಟಾಕ್ ನೋಡಿ', 'guide.checkStock.d': 'ಚಿನ್ನ, ಬೆಳ್ಳಿ ಮತ್ತು ಕೈಯಲ್ಲಿರುವ ನಗದು',
    'guide.addCustomer': 'ಗ್ರಾಹಕರನ್ನು ಸೇರಿಸಿ', 'guide.addCustomer.d': 'ಗ್ರಾಹಕರ ಖಾತೆ ತೆರೆಯಿರಿ ಮತ್ತು ಹುಡುಕಿ',
    'guide.purchase': 'ಹಳೆಯ ಚಿನ್ನ ಖರೀದಿ', 'guide.purchase.d': 'ಖರೀದಿ ಅಥವಾ ಬದಲಾವಣೆ ದಾಖಲಿಸಿ',
    'guide.reports': 'ವರದಿಗಳನ್ನು ನೋಡಿ', 'guide.reports.d': 'ಯಾವುದೇ ದಿನಾಂಕದ ಮಾರಾಟ ಮತ್ತು ಲಾಭ',
    'guide.doneTitle': 'ಅಷ್ಟೇ!',
    'guide.doneBody': 'ಮಾರ್ಗದರ್ಶಿಯನ್ನು ಮತ್ತೆ ನೋಡಲು ಮೇಲಿನ "ಸಹಾಯ (?)" ಒತ್ತಿ.',
    'guide.gotIt': 'ಸರಿ',
    'guide.noTarget': 'ಇದು ಇನ್ನೂ ಇಲ್ಲ. ಸೇರಿಸಿದ ನಂತರ ಇಲ್ಲಿ ಕಾಣಿಸುತ್ತದೆ.',

    'g.cb1.t': 'ಗ್ರಾಹಕರನ್ನು ಆಯ್ಕೆಮಾಡಿ', 'g.cb1.b': "ಹೆಸರು ಅಥವಾ ಫೋನ್ ಮೂಲಕ ಹುಡುಕಿ. ಹೊಸ ಗ್ರಾಹಕರೇ? 'Add Customer' ಕ್ಲಿಕ್ ಮಾಡಿ.",
    'g.cb2.t': 'ಬಿಲ್ ಪ್ರಕಾರ', 'g.cb2.b': "ವೋಚರ್ ಸಂಖ್ಯೆ ಮತ್ತು ದಿನಾಂಕ ತಾನಾಗಿಯೇ ಬರುತ್ತವೆ. ಈಗಲೇ ಹಣ ಕೊಟ್ಟರೆ 'Cash Bill', ಬಾಕಿಗೆ ಸೇರಿಸಲು 'Credit Bill' ಆಯ್ಕೆಮಾಡಿ.",
    'g.cb3.t': 'ಇಂದಿನ ದರ', 'g.cb3.b': "ಇಂದಿನ ಚಿನ್ನ ಮತ್ತು ಬೆಳ್ಳಿ ದರ ನಮೂದಿಸಿ. 'Cash Received' ಎಂದರೆ ಗ್ರಾಹಕರು ಈಗ ಕೊಡುವ ಹಣ.",
    'g.cb4.t': 'ವಸ್ತುಗಳನ್ನು ಸೇರಿಸಿ', 'g.cb4.b': 'ಚಿನ್ನ ಅಥವಾ ಬೆಳ್ಳಿ ಸಾಲು ಸೇರಿಸಿ, ನಂತರ ವಸ್ತುವಿನ ಹೆಸರು ಮತ್ತು ಒಟ್ಟು ತೂಕ ಬರೆಯಿರಿ. ಫೈನ್ ತೂಕ ಮತ್ತು ಮೊತ್ತ ತಾನಾಗಿಯೇ ಲೆಕ್ಕವಾಗುತ್ತವೆ.',
    'g.cb5.t': 'ಮೊತ್ತ ಪರಿಶೀಲಿಸಿ', 'g.cb5.b': 'ಉಳಿಸುವ ಮೊದಲು ಬಿಲ್ ಮೊತ್ತ ಮತ್ತು ಗ್ರಾಹಕರ ಹೊಸ ಬಾಕಿಯನ್ನು ನೋಡಿ.',
    'g.cb6.t': 'ಉಳಿಸಿ ಮತ್ತು ಕಳುಹಿಸಿ', 'g.cb6.b': "'Save Voucher' ಬಿಲ್ ಅನ್ನು ಉಳಿಸಿ ಸ್ಟಾಕ್ ಮತ್ತು ಗ್ರಾಹಕರ ಬಾಕಿಯನ್ನು ನವೀಕರಿಸುತ್ತದೆ. ನಂತರ ಪ್ರಿಂಟ್ ಮಾಡಿ ಅಥವಾ WhatsApp ನಲ್ಲಿ ಕಳುಹಿಸಿ.",
    'g.open.t': 'ಗ್ರಾಹಕರನ್ನು ತೆರೆಯಿರಿ', 'g.open.b': "ಪ್ರತಿ ಬಿಲ್ ಅದರ ಗ್ರಾಹಕರ ಖಾತೆಯಲ್ಲಿರುತ್ತದೆ. ಖಾತೆ ತೆರೆಯಲು 'View' ಕ್ಲಿಕ್ ಮಾಡಿ.",
    'g.eb2.t': 'ಬಿಲ್ ಬದಲಾಯಿಸಿ', 'g.eb2.b': 'ಬಿಲ್ ಪಕ್ಕದ ಪೆನ್ಸಿಲ್ ಗುರುತು ಕ್ಲಿಕ್ ಮಾಡಿ. ಎಲ್ಲಾ ವಿವರಗಳೊಂದಿಗೆ ಬಿಲ್ಲಿಂಗ್‌ನಲ್ಲಿ ತೆರೆಯುತ್ತದೆ.',
    'g.eb3.t': 'ಬದಲಾವಣೆ ಉಳಿಸಿ', 'g.eb3.b': "ಬೇಕಾದುದನ್ನು ಬದಲಾಯಿಸಿ 'Update Voucher' ಒತ್ತಿ. ಬಾಕಿ ಮತ್ತು ಸ್ಟಾಕ್ ತಾನಾಗಿಯೇ ಸರಿಯಾಗುತ್ತವೆ. ಖಾತೆ ಸೆಟ್ಟಿಂಗ್‌ನಲ್ಲಿರುವ ಸಮಯದೊಳಗೆ (ಸಾಮಾನ್ಯವಾಗಿ 48 ಗಂಟೆ) ಮಾತ್ರ ಬದಲಾಯಿಸಬಹುದು.",
    'g.db2.t': 'ನೋಡಿ, ಪ್ರಿಂಟ್ ಅಥವಾ ಕಳುಹಿಸಿ', 'g.db2.b': 'ಕಣ್ಣಿನ ಗುರುತು ಬಿಲ್ ತೋರಿಸುತ್ತದೆ, ಪ್ರಿಂಟರ್ ಪ್ರಿಂಟ್ ಮಾಡುತ್ತದೆ, ಶೇರ್ PDF ಕಳುಹಿಸುತ್ತದೆ.',
    'g.db3.t': 'ಬಿಲ್ ಅಳಿಸಿ', 'g.db3.b': 'ಕೆಂಪು ಡಬ್ಬದ ಗುರುತು ಬಿಲ್ ಅಳಿಸುತ್ತದೆ. 48 ಗಂಟೆಯೊಳಗೆ (ಅಥವಾ ಖಾತೆ ಸೆಟ್ಟಿಂಗ್‌ನ ಸಮಯದೊಳಗೆ) ಸ್ಟಾಕ್ ಮತ್ತು ಬಾಕಿ ಮರಳಿ ಸರಿಯಾಗುತ್ತವೆ. ನಂತರವಾದರೆ ದಾಖಲೆ ಮಾತ್ರ ಅಳಿಸಲಾಗುತ್ತದೆ.',
    'g.st1.t': 'ಚಿನ್ನ ಮತ್ತು ಬೆಳ್ಳಿ ಸ್ಟಾಕ್', 'g.st1.b': 'ನಿಮ್ಮ ಬಳಿ ಇರುವ ಚಿನ್ನ ಮತ್ತು ಬೆಳ್ಳಿಯ ಫೈನ್ ತೂಕ. ಮಾರಾಟದಿಂದ ಕಡಿಮೆಯಾಗುತ್ತದೆ, ಖರೀದಿಯಿಂದ ಹೆಚ್ಚಾಗುತ್ತದೆ.',
    'g.st2.t': 'ಕೈಯಲ್ಲಿರುವ ನಗದು', 'g.st2.b': 'ಮಾರಾಟ ಮತ್ತು ನೀವು ಸೇರಿಸಿದ ಹಣ, ಖರ್ಚು ಮತ್ತು ಪಾವತಿಗಳನ್ನು ಕಳೆದು. ವಿವರ ನೋಡಲು ಇದರ ಮೇಲೆ ಕ್ಲಿಕ್ ಮಾಡಿ.',
    'g.st3.t': 'ಸ್ಟಾಕ್ ಅಥವಾ ನಗದು ಸೇರಿಸಿ', 'g.st3.b': 'ಹೊಸ ಸ್ಟಾಕ್ ಖರೀದಿಸಿದಿರಾ ಅಥವಾ ಡ್ರಾಯರ್‌ಗೆ ಹಣ ಹಾಕಿದಿರಾ? ಇಲ್ಲಿ ದಾಖಲಿಸಿ.',
    'g.st4.t': 'ಇತಿಹಾಸ', 'g.st4.b': 'ಪ್ರತಿ ಸೇರ್ಪಡೆ ಇಲ್ಲಿ ಪಟ್ಟಿಯಾಗಿದೆ. ಎಕ್ಸ್‌ಪೋರ್ಟ್ ಅಥವಾ ಪ್ರಿಂಟ್ ಮಾಡಬಹುದು.',
    'g.ac1.t': 'ಗ್ರಾಹಕರನ್ನು ಸೇರಿಸಿ', 'g.ac1.b': 'ಇಲ್ಲಿ ಕ್ಲಿಕ್ ಮಾಡಿ ಹೆಸರು, ಫೋನ್ ಮತ್ತು ನಗದು, ಚಿನ್ನ ಅಥವಾ ಬೆಳ್ಳಿಯಲ್ಲಿ ಹಳೆಯ ಬಾಕಿ ಇದ್ದರೆ ಬರೆಯಿರಿ.',
    'g.ac2.t': 'ಗ್ರಾಹಕರನ್ನು ಹುಡುಕಿ', 'g.ac2.b': 'ಹೆಸರು ಅಥವಾ ಫೋನ್ ಸಂಖ್ಯೆಯಿಂದ ಹುಡುಕಿ.',
    'g.pu1.t': 'ಮಾರುವವರನ್ನು ಆಯ್ಕೆಮಾಡಿ', 'g.pu1.b': 'ನೀವು ಹಳೆಯ ಚಿನ್ನ ಅಥವಾ ಬೆಳ್ಳಿ ಖರೀದಿಸುತ್ತಿರುವ ಗ್ರಾಹಕರನ್ನು ಆಯ್ಕೆಮಾಡಿ.',
    'g.pu2.t': 'ಬಿಲ್ ಪ್ರಕಾರ', 'g.pu2.b': 'ಹಳೆಯ ಖರೀದಿ, ಬದಲಾವಣೆ (ಹಳೆಯದಕ್ಕೆ ಹೊಸದು) ಅಥವಾ ಹೊಸ ಖರೀದಿ ಆಯ್ಕೆಮಾಡಿ, ಮತ್ತು ನೀವು ಕೊಡುವ ಹಣ ಬರೆಯಿರಿ.',
    'g.pu3.t': 'ಖರೀದಿಸಿದ ವಸ್ತುಗಳು', 'g.pu3.b': 'ಪ್ರತಿ ವಸ್ತುವಿನ ಒಟ್ಟು ತೂಕ ಮತ್ತು ಮೆಲ್ಟಿಂಗ್ % ಸೇರಿಸಿ. ಫೈನ್ ತೂಕ ಮತ್ತು ಮೌಲ್ಯ ತಾನಾಗಿಯೇ ಲೆಕ್ಕವಾಗುತ್ತವೆ.',
    'g.pu4.t': 'ಉಳಿಸಿ', 'g.pu4.b': "'Save Voucher' ಖರೀದಿಯನ್ನು ದಾಖಲಿಸಿ ಲೋಹವನ್ನು ನಿಮ್ಮ ಸ್ಟಾಕ್‌ಗೆ ಸೇರಿಸುತ್ತದೆ.",
    'g.rp1.t': 'ದಿನಾಂಕ ಆಯ್ಕೆಮಾಡಿ', 'g.rp1.b': "ಇಂದು, ಕಳೆದ 7 ದಿನ, ಈ ತಿಂಗಳು ಆಯ್ಕೆಮಾಡಿ, ಅಥವಾ ನಿಮ್ಮದೇ ದಿನಾಂಕ ಹಾಕಿ 'Apply' ಒತ್ತಿ.",
    'g.rp2.t': 'ಮುಖ್ಯ ಅಂಕಿಅಂಶಗಳು', 'g.rp2.b': 'ಆ ದಿನಾಂಕಗಳ ಒಟ್ಟು ಮಾರಾಟ, ಬಂದ ನಗದು, ಸಾಲ, ಖರ್ಚು ಮತ್ತು ಲಾಭ.',
    'g.rp3.t': 'ದಿನವಾರು', 'g.rp3.b': "ಪ್ರತಿ ದಿನದ ಮಾರಾಟ. ಕಾಗದದ ಪ್ರತಿಗೆ 'Print' ಒತ್ತಿ.",

    'nav./dashboard': 'ಡ್ಯಾಶ್‌ಬೋರ್ಡ್', 'short./dashboard': 'ಮುಖಪುಟ',
    'nav./billing': 'ಬಿಲ್ಲಿಂಗ್', 'short./billing': 'ಬಿಲ್ಲಿಂಗ್',
    'nav./gst-billing': 'GST ಬಿಲ್ಲಿಂಗ್',
    'nav./purchase-billing': 'ಖರೀದಿ / ಹಳೆಯ ಚಿನ್ನ',
    'nav./ledgers': 'ಲೆಡ್ಜರ್', 'short./ledgers': 'ಲೆಡ್ಜರ್',
    'nav./gst-ledger': 'GST ಲೆಡ್ಜರ್',
    'nav./expenses': 'ಖರ್ಚುಗಳು',
    'nav./karigar': 'ಕಾರಿಗರ್',
    'nav./stock': 'ಸ್ಟಾಕ್', 'short./stock': 'ಸ್ಟಾಕ್',
    'nav./item-reports': 'ಐಟಂ ವರದಿ',
    'nav./reports': 'ವರದಿಗಳು',
    'nav./account': 'ಖಾತೆ ಸೆಟ್ಟಿಂಗ್',

    'help./dashboard': 'ಇಂದಿನ ಮಾರಾಟ ಮತ್ತು ಬಾಕಿ ಇರುವ ಗ್ರಾಹಕರು ಒಂದೇ ನೋಟದಲ್ಲಿ.',
    'help./billing': 'ಚಿನ್ನ, ಬೆಳ್ಳಿ ವಸ್ತುಗಳೊಂದಿಗೆ ನಗದು ಅಥವಾ ಸಾಲದ ಮಾರಾಟ ಬಿಲ್ ಮಾಡಿ. ಪ್ರಿಂಟ್ ಮಾಡಿ ಅಥವಾ WhatsApp ನಲ್ಲಿ ಕಳುಹಿಸಿ.',
    'help./gst-billing': 'CGST/SGST ಅಥವಾ IGST ಸ್ವಯಂ ಲೆಕ್ಕದೊಂದಿಗೆ GST ತೆರಿಗೆ ಇನ್‌ವಾಯ್ಸ್ ಮಾಡಿ.',
    'help./purchase-billing': 'ಗ್ರಾಹಕರಿಂದ ಖರೀದಿಸುವ ಹಳೆಯ ಚಿನ್ನ/ಬೆಳ್ಳಿ ಅಥವಾ ಬದಲಾವಣೆಯನ್ನು ದಾಖಲಿಸಿ.',
    'help./ledgers': 'ಪ್ರತಿ ಗ್ರಾಹಕರ ಖಾತೆ: ನಗದು, ಚಿನ್ನ ಮತ್ತು ಬೆಳ್ಳಿಯಲ್ಲಿ ಎಷ್ಟು ಬಾಕಿ ಇದೆ.',
    'help./gst-ledger': 'GST ಇನ್‌ವಾಯ್ಸ್ ನೀಡುವ ಗ್ರಾಹಕರ ಖಾತೆಗಳು.',
    'help./expenses': 'ಬಾಡಿಗೆ, ಸಂಬಳ, ವಿದ್ಯುತ್ ಮುಂತಾದ ಅಂಗಡಿ ಖರ್ಚುಗಳನ್ನು ಬರೆಯಿರಿ.',
    'help./karigar': 'ಕಾರಿಗರ್‌ಗೆ ಕೊಟ್ಟ ಮತ್ತು ಪಡೆದ ಚಿನ್ನ ಹಾಗೂ ಅವರ ಮಜೂರಿಯ ಲೆಕ್ಕ.',
    'help./stock': 'ನಿಮ್ಮ ಚಿನ್ನ, ಬೆಳ್ಳಿ ಮತ್ತು ಕೈಯಲ್ಲಿರುವ ನಗದು. ಬಿಲ್ ಮಾಡಿದಾಗ ತಾನಾಗಿಯೇ ನವೀಕರಣವಾಗುತ್ತದೆ.',
    'help./item-reports': 'ಐಟಂವಾರು ಸ್ಟಾಕ್: ಲಭ್ಯವಿರುವುದು ಮತ್ತು ಮಾರಾಟವಾದದ್ದು.',
    'help./reports': 'ಯಾವುದೇ ದಿನಾಂಕದ ಅವಧಿಗೆ ಮಾರಾಟ, ಲಾಭ, ಪ್ರಮುಖ ಗ್ರಾಹಕರು ಮತ್ತು ದಿನದ ಮೊತ್ತ.',
    'help./account': 'ಅಂಗಡಿ ವಿವರ, ಥೀಮ್, ಭಾಷೆ ಮತ್ತು ಸೆಟ್ಟಿಂಗ್‌ಗಳು. ಈ ಮಾರ್ಗದರ್ಶಿಯನ್ನು ಇಲ್ಲಿಂದ ಮತ್ತೆ ನೋಡಿ.',
  },

  hi: {
    'lang.title': 'अपनी भाषा चुनें',
    'lang.sub': 'आप इसे बाद में अकाउंट में बदल सकते हैं।',
    'tour.welcomeTitle': 'स्वागत है, {name}!',
    'tour.welcomeBody': 'आइए 1 मिनट में ऐप को समझें। हम दिखाएँगे कि सब कुछ कहाँ है।',
    'tour.start': 'टूर शुरू करें',
    'tour.skip': 'छोड़ें',
    'tour.next': 'आगे',
    'tour.back': 'पीछे',
    'tour.step': 'चरण {n} / {total}',
    'tour.clickHint': 'खोलने के लिए यहाँ क्लिक करें, या "आगे" दबाएँ।',
    'tour.doneTitle': 'सब तैयार है!',
    'tour.doneBody': 'अपना पहला बिल बनाकर शुरू करें। बिल बनाना, बदलना, डिलीट करना, स्टॉक देखना और बाकी सबकी स्टेप-बाय-स्टेप गाइड के लिए ऊपर "मदद (?)" दबाएँ।',
    'tour.firstBill': 'पहला बिल बनाएँ',
    'tour.close': 'बंद करें',
    'nav.more': 'और',
    'nav.logout': 'लॉग आउट',
    'nav.role': 'दुकान खाता',
    'logout.message': 'क्या आप सच में लॉग आउट करना चाहते हैं?',
    'logout.cancel': 'रद्द करें',
    'account.langTitle': 'भाषा और गाइड',
    'account.language': 'भाषा',
    'account.replay': 'गाइड फिर से दिखाएँ',
    'account.langNote': 'मेनू और यह गाइड आपकी भाषा में हैं। बिल और बाकी पेज अभी अंग्रेज़ी में हैं।',

    'help.button': 'मदद',
    'notFound.title': 'पेज नहीं मिला',
    'notFound.body': 'आप जो पेज ढूँढ रहे हैं वह मौजूद नहीं है या कहीं और चला गया है। पता जाँचें, या वापस जाएँ।',
    'notFound.back': 'वापस जाएँ',
    'notFound.home': 'डैशबोर्ड पर जाएँ',
    'notFound.login': 'लॉगिन पर जाएँ',
    'guide.title': 'स्टेप-बाय-स्टेप गाइड',
    'guide.app': 'ऐप टूर', 'guide.app.d': 'हर मेनू, एक-एक करके',
    'guide.createBill': 'बिल बनाएँ', 'guide.createBill.d': 'नकद या उधार बिल',
    'guide.editBill': 'बिल बदलें', 'guide.editBill.d': 'सेव किया बिल ठीक करें',
    'guide.deleteBill': 'बिल डिलीट करें', 'guide.deleteBill.d': 'गलत बिल हटाएँ',
    'guide.checkStock': 'स्टॉक देखें', 'guide.checkStock.d': 'सोना, चाँदी और हाथ में नकद',
    'guide.addCustomer': 'ग्राहक जोड़ें', 'guide.addCustomer.d': 'ग्राहक का खाता बनाएँ और खोजें',
    'guide.purchase': 'पुराना सोना खरीदें', 'guide.purchase.d': 'खरीद या एक्सचेंज दर्ज करें',
    'guide.reports': 'रिपोर्ट देखें', 'guide.reports.d': 'किसी भी तारीख़ की बिक्री और मुनाफ़ा',
    'guide.doneTitle': 'बस इतना ही!',
    'guide.doneBody': 'गाइड फिर से देखने के लिए ऊपर "मदद (?)" दबाएँ।',
    'guide.gotIt': 'ठीक है',
    'guide.noTarget': 'यह अभी यहाँ नहीं है। जोड़ने के बाद यहाँ दिखेगा।',

    'g.cb1.t': 'ग्राहक चुनें', 'g.cb1.b': "नाम या फ़ोन से खोजें। नया ग्राहक है? 'Add Customer' पर क्लिक करें।",
    'g.cb2.t': 'बिल का प्रकार', 'g.cb2.b': "वाउचर नंबर और तारीख़ अपने-आप भर जाते हैं। अभी भुगतान हो तो 'Cash Bill', बकाया में जोड़ना हो तो 'Credit Bill' चुनें।",
    'g.cb3.t': 'आज का भाव', 'g.cb3.b': "आज का सोने और चाँदी का भाव डालें। 'Cash Received' वह रकम है जो ग्राहक अभी दे रहा है।",
    'g.cb4.t': 'सामान जोड़ें', 'g.cb4.b': 'सोने या चाँदी की लाइन जोड़ें, फिर सामान का नाम और कुल वज़न लिखें। फ़ाइन वज़न और रकम अपने-आप निकलती है।',
    'g.cb5.t': 'कुल देखें', 'g.cb5.b': 'सेव करने से पहले बिल की रकम और ग्राहक का नया बकाया देखें।',
    'g.cb6.t': 'सेव करें और भेजें', 'g.cb6.b': "'Save Voucher' बिल सेव करता है और स्टॉक व ग्राहक का बकाया अपडेट करता है। फिर प्रिंट करें या WhatsApp पर भेजें।",
    'g.open.t': 'ग्राहक खोलें', 'g.open.b': "हर बिल उसके ग्राहक के खाते में रहता है। खाता खोलने के लिए 'View' पर क्लिक करें।",
    'g.eb2.t': 'बिल बदलें', 'g.eb2.b': 'बिल के पास पेंसिल पर क्लिक करें। यह सारी जानकारी के साथ बिलिंग में खुलेगा।',
    'g.eb3.t': 'बदलाव सेव करें', 'g.eb3.b': "जो बदलना है बदलें और 'Update Voucher' दबाएँ। बकाया और स्टॉक अपने-आप ठीक हो जाते हैं। बिल अकाउंट में तय समय (आमतौर पर 48 घंटे) के अंदर ही बदला जा सकता है।",
    'g.db2.t': 'देखें, प्रिंट या शेयर', 'g.db2.b': 'आँख का निशान बिल दिखाता है, प्रिंटर प्रिंट करता है, और शेयर PDF भेजता है।',
    'g.db3.t': 'बिल डिलीट करें', 'g.db3.b': 'लाल डिब्बे का निशान बिल डिलीट करता है। 48 घंटे (या अकाउंट में तय समय) के अंदर स्टॉक और बकाया वापस ठीक हो जाते हैं। उसके बाद सिर्फ़ रिकॉर्ड हटता है।',
    'g.st1.t': 'सोने-चाँदी का स्टॉक', 'g.st1.b': 'आपके पास सोने और चाँदी का फ़ाइन वज़न। बिक्री से घटता है, खरीद से बढ़ता है।',
    'g.st2.t': 'हाथ में नकद', 'g.st2.b': 'बिक्री और आपके जोड़े पैसे, खर्च और भुगतान घटाकर। पूरा हिसाब देखने के लिए इस पर क्लिक करें।',
    'g.st3.t': 'स्टॉक या नकद जोड़ें', 'g.st3.b': 'नया स्टॉक खरीदा या दराज़ में पैसे रखे? यहाँ दर्ज करें।',
    'g.st4.t': 'इतिहास', 'g.st4.b': 'हर जोड़ यहाँ दिखता है। आप इसे एक्सपोर्ट या प्रिंट कर सकते हैं।',
    'g.ac1.t': 'ग्राहक जोड़ें', 'g.ac1.b': 'यहाँ क्लिक करें और नाम, फ़ोन और नकद, सोने या चाँदी में पुराना बकाया हो तो लिखें।',
    'g.ac2.t': 'ग्राहक खोजें', 'g.ac2.b': 'नाम या फ़ोन नंबर से खोजें।',
    'g.pu1.t': 'बेचने वाला चुनें', 'g.pu1.b': 'जिस ग्राहक से पुराना सोना या चाँदी खरीद रहे हैं, उसे चुनें।',
    'g.pu2.t': 'बिल का प्रकार', 'g.pu2.b': 'पुरानी खरीद, एक्सचेंज (पुराने के बदले नया) या नई खरीद चुनें, और जो नकद आप दे रहे हैं वह लिखें।',
    'g.pu3.t': 'खरीदा सामान', 'g.pu3.b': 'हर सामान का कुल वज़न और मेल्टिंग % डालें। फ़ाइन वज़न और कीमत अपने-आप निकलती है।',
    'g.pu4.t': 'सेव करें', 'g.pu4.b': "'Save Voucher' खरीद दर्ज करता है और धातु आपके स्टॉक में जोड़ता है।",
    'g.rp1.t': 'तारीख़ चुनें', 'g.rp1.b': "आज, पिछले 7 दिन, इस महीने चुनें, या अपनी तारीख़ डालकर 'Apply' दबाएँ।",
    'g.rp2.t': 'मुख्य आँकड़े', 'g.rp2.b': 'उन तारीख़ों की कुल बिक्री, मिला नकद, उधार, खर्च और मुनाफ़ा।',
    'g.rp3.t': 'रोज़ का हिसाब', 'g.rp3.b': "हर दिन की बिक्री। कागज़ पर चाहिए तो 'Print' दबाएँ।",

    'nav./dashboard': 'डैशबोर्ड', 'short./dashboard': 'होम',
    'nav./billing': 'बिलिंग', 'short./billing': 'बिलिंग',
    'nav./gst-billing': 'GST बिलिंग',
    'nav./purchase-billing': 'खरीद / पुराना सोना',
    'nav./ledgers': 'खाते', 'short./ledgers': 'खाते',
    'nav./gst-ledger': 'GST खाते',
    'nav./expenses': 'खर्चे',
    'nav./karigar': 'कारीगर',
    'nav./stock': 'स्टॉक', 'short./stock': 'स्टॉक',
    'nav./item-reports': 'आइटम रिपोर्ट',
    'nav./reports': 'रिपोर्ट',
    'nav./account': 'अकाउंट सेटिंग',

    'help./dashboard': 'आज की बिक्री और बकाया ग्राहक, एक नज़र में।',
    'help./billing': 'सोने-चाँदी के सामान के साथ नकद या उधार बिक्री बिल बनाएँ। प्रिंट करें या WhatsApp पर भेजें।',
    'help./gst-billing': 'CGST/SGST या IGST अपने-आप जोड़कर GST टैक्स इनवॉइस बनाएँ।',
    'help./purchase-billing': 'ग्राहकों से खरीदा पुराना सोना-चाँदी या एक्सचेंज दर्ज करें।',
    'help./ledgers': 'हर ग्राहक का खाता: नकद, सोने और चाँदी में कितना बकाया है।',
    'help./gst-ledger': 'जिन ग्राहकों को GST इनवॉइस देते हैं, उनके खाते।',
    'help./expenses': 'किराया, वेतन, बिजली जैसे दुकान के खर्चे लिखें।',
    'help./karigar': 'कारीगरों को दिया और उनसे मिला सोना, और उनकी मज़दूरी का हिसाब।',
    'help./stock': 'आपका सोना, चाँदी और हाथ में नकद। बिल बनाने पर अपने-आप अपडेट होता है।',
    'help./item-reports': 'आइटम-वार स्टॉक: क्या उपलब्ध है और क्या बिक गया।',
    'help./reports': 'किसी भी तारीख़ की बिक्री, मुनाफ़ा, मुख्य ग्राहक और रोज़ का हिसाब।',
    'help./account': 'दुकान की जानकारी, थीम, भाषा और सेटिंग। यह गाइड यहीं से दोबारा देखें।',
  },
};

const STORAGE_KEY = 'gs_lang';
const readStored = () => {
  try { return localStorage.getItem(STORAGE_KEY); } catch { return null; }
};

const LangContext = createContext(null);

export function LangProvider({ children }) {
  const { user, updateUserSettings } = useAuth();
  const [lang, setLangState] = useState(() => readStored() || 'en');

  // The account's saved language wins once the user is loaded
  useEffect(() => {
    if (user?.language && user.language !== lang) setLangState(user.language);
  }, [user?.language]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    document.documentElement.lang = lang;
  }, [lang]);

  const setLang = useCallback((code) => {
    setLangState(code);
    try { localStorage.setItem(STORAGE_KEY, code); } catch { /* private mode */ }
    if (user) updateUserSettings({ language: code }).catch(() => {});
  }, [user, updateUserSettings]);

  const t = useCallback((key, vars) => {
    const raw = STRINGS[lang]?.[key] ?? STRINGS.en[key] ?? key;
    return vars ? raw.replace(/\{(\w+)\}/g, (_, k) => vars[k] ?? '') : raw;
  }, [lang]);

  // Has this person picked a language yet (on this account or this device)?
  const hasChosen = Boolean(user?.language || readStored());

  return (
    <LangContext.Provider value={{ lang, setLang, t, hasChosen }}>
      {children}
    </LangContext.Provider>
  );
}

export const useLang = () => useContext(LangContext);
