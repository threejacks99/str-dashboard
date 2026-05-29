---
title: "Importing Data from VRBO"
category: "Importing Data"
---

VRBO (and the wider Vrbo/Expedia Group host tools) can export your reservations and payouts as CSV or Excel, which Hostics imports directly.

## Export from VRBO

1. Sign in to your Vrbo host dashboard on desktop.
2. Go to your **Reservations** or **Financial/Payout** report.
3. Set the date range you want.
4. Download as **CSV** or **Excel**.

## Upload to Hostics

1. Open **Add Data** in Hostics.
2. Select the property the file belongs to (or use the [multi-property flow](/help/multi-property-import) if it spans several).
3. Upload the file and confirm.

## What Hostics reads

Hostics recognizes VRBO's column labels automatically:

- **Reservation ID / booking ID** → the unique booking reference used to prevent duplicates on re-import.
- **Arrival / departure** (or check-in / check-out) → stay dates and nights.
- **Payout / net amount** → your **revenue**.

> Like Airbnb, Hostics uses your **net payout** as revenue rather than the gross booking total, so management or channel fees deducted before payout aren't counted as income you never received.

## Notes

- VRBO files sometimes label dates as **arrival** and **departure** rather than check-in/check-out — both are recognized.
- Cancelled and owner-blocked stays are kept but excluded from revenue and booking counts.

If something doesn't map, see the recognized column names in [Common issues](/help/common-issues).
