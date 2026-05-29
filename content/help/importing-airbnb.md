---
title: "Importing Data from Airbnb"
category: "Importing Data"
---

Airbnb's transaction history exports cleanly into Hostics. Here's how to get it.

## Export from Airbnb

1. Sign in to Airbnb on a desktop browser and go to your host account.
2. Open **Menu → Transaction History** (or visit your earnings/reservations report).
3. Set the date range you want to import.
4. Choose **CSV** and download the file.

## Upload to Hostics

1. In Hostics, open **Add Data**.
2. If you have more than one property, select the property this file belongs to (or see [Importing multiple properties at once](/help/multi-property-import) if the export covers several).
3. Drop in the CSV and confirm the import.

## What Hostics reads

Hostics maps Airbnb's columns automatically. The ones that matter most:

- **Confirmation code** → the reservation's unique ID. This is what Hostics uses to recognize a booking, so re-importing an updated report updates existing rows instead of duplicating them.
- **Check-in / check-out dates** → your stay dates and nights.
- **Earnings / payout** → this becomes your **revenue** in Hostics.

> **Important:** Hostics counts the **owner payout** (what you actually receive after Airbnb's host service fee) as your revenue — not the gross nightly rate the guest paid. This keeps your profit numbers honest. If your export has both a gross amount and a payout/earnings column, Hostics uses the payout.

## A couple of Airbnb-specific notes

- **Cancelled reservations** are kept for your records but excluded from revenue and booking totals, so a cancellation won't inflate your numbers.
- **Personal/owner stays** (nights you blocked for yourself) are excluded from revenue too, if your data marks them as owner bookings.

If a column doesn't get picked up, check that your file's header row uses recognizable labels — see [Common issues](/help/common-issues) for the full list of column names Hostics recognizes.
