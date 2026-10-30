---
name: Contact details integrity
description: Rules for displaying Maya Collection store hours and location.
---
Only display merchant-confirmed store hours and location details. Keep hours blank until an admin explicitly configures them. Use the merchant-supplied map destination; do not guess an address or place an unverified map marker.

**Why:** The user explicitly requires accurate contact/location information and says not to invent store hours or an address.

**How to apply:** Leave unconfigured hours unset, use the supplied map link as the source of truth, and show a neutral preview rather than a purported map when no verified embed is available.
