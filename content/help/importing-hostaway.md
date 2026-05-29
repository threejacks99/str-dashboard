---
title: "Importing Data from Hostaway"
category: "Importing Data"
---

Hostaway is a channel manager, so its exports often cover **multiple properties and multiple booking channels** in one file. Hostics handles both.

## Export from Hostaway

1. Sign in to Hostaway.
2. Open the **Reservations** list (or a financial/consolidated report).
3. Set your date range and, if you only want one property, filter to it.
4. Export as **CSV** or **Excel**.

## Upload to Hostics

Because Hostaway files frequently span several listings, decide which case you're in:

- **One property in the file** → open **Add Data**, select that property, and upload.
- **Several properties in the file** → make sure the export includes a **Property** (or **Listing**) column, then follow [Importing multiple properties at once](/help/multi-property-import). Hostics will match each row to the right property by name and let you map or create any it doesn't recognize.

## What Hostics reads

- **Reservation / confirmation ID** → unique booking reference (prevents duplicate rows on re-import).
- **Check-in / check-out** (or arrival / departure) → stay dates and nights.
- **Payout / owner earnings** → your **revenue**.
- **Channel / source** → which platform the booking came from, used in your booking-source breakdowns.
- **Listing / property name** → which property each row belongs to (essential for multi-property files).

> Hostaway exports usually include both gross and net figures. Hostics uses the **payout/owner earnings** column as revenue.

## Notes

- If your Hostaway report mixes channels (Airbnb, Vrbo, direct), Hostics keeps the source on each booking so your **Bookings by source** chart stays accurate.
- Cancelled and owner stays are excluded from revenue and booking totals.

See [Common issues](/help/common-issues) if a column isn't recognized or rows land under the wrong property.
