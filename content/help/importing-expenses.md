---
title: "Setting Up Your Expense Tracking"
category: "Importing Data"
---

Your income usually comes straight from a booking platform, but expenses are what turn revenue into real profit — and they rarely live in one tidy export. This guide shows you how to format an expense file Hostics imports cleanly, whether you're starting a fresh spreadsheet or exporting from your bank or accounting software.

> The fastest way to start: **[download the Hostics tracking template](/hostics-tracking-template.xlsx)**. Its Expenses sheet already has the right column headers — just fill in the rows and upload.

## The columns Hostics reads

Your expense file needs a header row. Hostics recognizes these columns automatically (any one of the listed labels works — they're case-insensitive):

- **Date** — when the expense was paid. Also accepts `Paid Date`, `Payment Date`, or `Expense Date`.
- **Vendor** — who you paid. Also accepts `Payee`, `Supplier`, `Merchant`, or `Paid To`.
- **Amount** — the cost. Also accepts `Cost`, `Total`, `Price`, or `Expense Amount`.
- **Category** — the type of expense (e.g. Cleaning, Repairs, Utilities). Also accepts `Type`, `Expense Type`, or `Expense Category`.
- **Description** — optional notes. Also accepts `Memo`, `Notes`, `Details`, or `Note`.
- **Property** — which rental the expense belongs to, for multi-property files. Also accepts `Listing`, `Unit`, or `House`. (Skip this if you select the property at upload time.)

Only Date, Vendor, Amount, and Category really matter for useful reports. Description and Property are optional.

## Formatting tips

- **Dates** are flexible: `2024-12-21`, `12/21/2024`, `21/12/2024`, and `Dec 21, 2024` all work.
- **Amounts** can include a dollar sign and commas — `$1,250.00` is fine.
- **Refunds or credits** can be entered as negatives, either with a minus sign (`-50`) or in parentheses (`(50)`). Both reduce your expense total.
- **Categories** are free text, so keep them consistent. "Cleaning" and "cleaning fee" will show up as two separate lines on your P&L. Picking a short, fixed set of categories up front makes your **Financials** page far more readable.

## A starter set of categories

There's no required list, but these cover most short-term rentals and map well to how an accountant thinks about a Schedule E:

Cleaning, Repairs & Maintenance, Supplies, Utilities, Insurance, Property Tax, Mortgage Interest, Management Fees, Software & Subscriptions, Advertising, Travel, Professional Fees, Other.

## Importing from your bank or accounting tool

If you export transactions from your bank, QuickBooks, or similar, you'll usually get a file with date, description, and amount columns. To make it import well:

1. Keep only the rental-related rows.
2. Make sure there's a clear **Amount** column and a **Date** column.
3. Add a **Category** column and fill it in — this is the single biggest thing that turns a raw transaction list into a useful expense report.
4. Save as CSV or Excel and upload through **Add Data**.

## After you upload

Re-importing an updated expense file is safe — Hostics de-duplicates. One thing to know: the duplicate check for expenses is based on the combination of **date + vendor + amount**. If you later edit one of those three fields on an expense inside Hostics and then re-upload the original file, the edited row can come back in as a new entry. [Common issues](/help/common-issues) explains how to handle that.
