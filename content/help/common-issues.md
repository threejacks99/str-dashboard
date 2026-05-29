---
title: "Common Issues and Fixes"
category: "Troubleshooting"
---

Most issues people run into are import-related and quick to fix. Here are the ones we see most often.

## My import didn't pick up a column

Hostics matches your file's header labels against the names it recognizes. If a column was ignored, its header probably isn't one Hostics knows. Rename the header to one of these and re-import:

**Reservation files**
- Booking reference: `Confirmation Code`, `Reservation ID`, `Booking ID`, `Reservation #`
- Guest: `Guest`, `Guest Name`
- Check-in: `Check-in`, `Arrival`, `Start Date`, `From`
- Check-out: `Check-out`, `Departure`, `End Date`, `To`
- Nights: `Nights`, `Length of Stay`
- Revenue (your payout): `Payout`, `Owner Payout`, `Host Payout`, `Net Amount`, `You Earned`, `Earnings`
- Gross amount: `Rent`, `Gross Rent`, `Total`, `Rate`
- Management fee: `Management Fee`, `Mgmt Fee`, `PM Fee`
- Source: `Source`, `Channel`, `Platform`, `Type`
- Property: `Property`, `Listing`, `Unit`, `House`

**Expense files**
- Date: `Date`, `Paid Date`, `Payment Date`, `Expense Date`
- Vendor: `Vendor`, `Payee`, `Supplier`, `Merchant`, `Paid To`
- Amount: `Amount`, `Cost`, `Total`, `Price`
- Category: `Category`, `Type`, `Expense Type`
- Description: `Description`, `Memo`, `Notes`
- Property: `Property`, `Listing`, `Unit`, `House`

(Matching ignores capitalization and surrounding spaces.)

## My file was read as the wrong type (reservations vs. expenses)

Hostics decides whether a file is reservations or expenses by looking at its columns. A reservation file is recognized by headers like **arrive, nights, rent, owner commission, departure**; an expense file by **paid date, vendor, category, amount**. It needs to see at least a few of the right ones.

If a file is misread (or comes back as "unknown"), it's usually missing those signature columns. Make sure a reservation file clearly has check-in/check-out, nights, and a payout column — and that an expense file has a date, an amount, and ideally a category.

## A re-uploaded expense came back as a duplicate

Hostics prevents duplicate imports, but the two kinds of data use different checks:

- **Reservations** are de-duplicated by their **booking reference**, which stays stable, so re-imports are reliably recognized.
- **Expenses** are de-duplicated by the combination of **date + vendor + amount**. If you edited any of those three on an expense inside Hostics and then re-uploaded the original file, Hostics sees the unedited row as new and adds it again.

To fix a duplicate created this way, just delete the extra entry. Deletions of individual reservations and expenses are quick and confirmable. To avoid it, make edits in one place — either in your source file (and re-import) or in Hostics, but not both on the same row's date/vendor/amount.

## Accented characters look different after import

Hostics stores text as plain (unaccented) characters, so "Café Cleaning" becomes "Cafe Cleaning" and a stray symbol from a messy export is dropped. This is intentional — it keeps your data clean and your reports and tax exports free of broken characters. The figures attached to those rows are unaffected.

## A date didn't import

Hostics reads `2024-12-21`, `12/21/2024`, `21/12/2024`, and `Dec 21, 2024`. If a date is in an unusual format it may be skipped for that row. Reformat the date column to one of those and re-import.

## My numbers look too high or too low

- **Revenue lower than expected?** Remember Hostics counts your **owner payout**, not the gross booking total — so platform and management fees aren't included as income. That's by design.
- **Profit (NOI) looks too high?** Some expenses probably aren't imported yet. NOI is revenue minus the expenses you've entered, so missing costs inflate it. See [Setting up your expense tracking](/help/importing-expenses).
- **A booking counted twice across properties?** In a portfolio, the same reservation can legitimately appear under two properties only if it was imported under each. Check that each booking is filed under a single property.

## I can't generate an export

The **Schedule E PDF and Excel exports** unlock when your subscription is active. During the free trial they're locked while the rest of the app is fully available. If your trial has ended, choose a plan from the **Billing** page to restore access. See [Billing and subscriptions](/help/billing-and-subscriptions).

---

If your issue isn't here, email support using the button below — including the platform you exported from and a description of what you expected helps us help you faster.
