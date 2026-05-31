---
title: "Understanding Your Booking Metrics"
category: "Understanding Your Metrics"
---

Your **Bookings** page focuses on demand and guest patterns — how often you're booked, how long guests stay, how far ahead they reserve, and where they come from. Here's what each figure means and how it's calculated.

Across all of these, **personal/owner stays are excluded**, and cancelled bookings are excluded from everything except the cancellation rate itself.

## Total Bookings

The number of confirmed (non-cancelled, non-owner) reservations with a check-in date in the selected range. This is your raw demand count for the period.

## Total Nights

The sum of nights across those bookings. Where Total Bookings counts *how many* reservations, Total Nights counts *how much occupancy* they represent — two bookings of 7 nights each is 14 nights, the same as fourteen one-night stays.

## Average Nights per Booking

```
Total Nights ÷ Total Bookings
```

How long a typical stay runs. A rising average usually points toward longer, lower-turnover bookings (less cleaning, more predictable); a falling one toward short stays.

## Average Guests per Booking

The average headcount (adults plus children) across your confirmed bookings — useful for sizing supplies, linens, and capacity.

## Average Days Ahead

```
For each booking: check-in date − booking date
…then averaged across all bookings
```

This is your booking lead time — how far in advance guests reserve. (You may see it labeled "lead time" elsewhere; it's the same number.) Short lead times suggest last-minute demand and room to tune pricing close to the date; long lead times mean your calendar fills early and you can plan further out.

## Cancellation Rate

```
Cancelled bookings ÷ all non-owner bookings × 100
```

The share of reservations that were cancelled. This is the one metric that *includes* cancelled bookings in its math — because measuring them is the whole point. A climbing rate can signal pricing, listing-accuracy, or guest-quality issues worth investigating.

Cancellations are recorded inside Hostics rather than imported from your file — see [Handling cancellations](/help/handling-cancellations) for how a booking gets marked cancelled, both automatically on import and by hand.

## The charts

- **Bookings over time** — confirmed bookings per month, for spotting seasonality.
- **Stay duration** — your bookings grouped into 1–2, 3–4, 5–7, 8–14, and 15+ night buckets.
- **Bookings by source** — the channel mix (Airbnb, direct, and so on) behind your reservations.
- **Day of week** — which check-in days are most common, by the weekday of each booking's check-in.

## Occupancy Rate and Average Daily Rate (on your Dashboard)

Two more metrics appear on your **Dashboard** rather than the Bookings page:

**Average Daily Rate (ADR)**

```
Total gross rent ÷ Total nights
```

Your average nightly rate across confirmed stays, based on the gross booking amount. It tells you what a night is worth before fees and expenses.

**Occupancy Rate**

```
Booked nights ÷ Available nights × 100
```

The share of your available calendar that was booked, across the selected date range and property filter.

> **One thing to know about occupancy:** Hostics currently treats every property as available for *every day* of the date range you've selected. It doesn't yet account for when a property was actually listed — so a rental you bought partway through the year, or one you only list seasonally, will show a **lower** occupancy than its true figure, because the months it wasn't available are still counted as empty nights. For a property that's been listed the whole period, the number is accurate. We're planning to refine this with per-property availability dates. In the meantime, occupancy is most reliable over date ranges where the property was actually live, and **Total Nights** is a clean, assumption-free measure of how much your calendar is working.
