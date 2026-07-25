## Wardrobe Utilisation Score

The wardrobe utilisation score gives users a single number that answers the question: how much of what you own are you actually wearing? It sits at the top of the Stats page with its own dedicated header and acts as the headline metric for wardrobe health.

The score is calculated as the percentage of wardrobe items that are **not forgotten**, rounded up to the nearest whole number, capped at 100. An item is considered forgotten if it has never been worn, or if its most recent wear was more than 30 days ago — the same definition used by the wardrobe rediscovery section.

> Score = ⌈ (items worn in the last 30 days ÷ total items) × 100 ⌉, capped at 100

The score updates automatically whenever an outfit is logged or a new item is added, since both events change either the numerator (items with a recent wear) or the denominator (total items).

The score and its progress ring are colour-coded by tier:

| Score Range | Colour | Tooltip |
| --- | --- | --- |
| 0 – 50 | Red | "You have many unworn clothes, try giving them a chance!" |
| 51 – 75 | Yellow | "You're making use of your wardrobe, but there's room to improve!" |
| 76 – 90 | Green | "Great work! Most of your wardrobe is being put to good use." |
| 91 – 100 | Purple | "Outstanding! Your wardrobe utilisation is exceptional!" |

The UI renders the score inside a circular progress ring drawn with `react-native-svg`. The ring arc is filled proportionally to the score (0 = empty, 100 = full circle). Both the arc and the central score label change colour together according to the active tier.

---

### Wardrobe Utilisation Badges

Eight achievement badges are tied to the utilisation score and appear as a dedicated group on the Badges page. They are grouped into three categories.

**Milestone** — awarded once and never revoked when the score first reaches a threshold:

| Badge | Condition |
| --- | --- |
| Awakened | Score reaches 50 or above |
| Wardrobe Aware | Score reaches 75 or above |
| Full Rotation | Score reaches 90 or above |
| Maximalist | Score reaches 100 |

**Improvement** — awarded when the score improves relative to its value one or two months prior:

| Badge | Condition |
| --- | --- |
| Comeback | Score is 20 or more points higher than it was one month ago |
| Rising Tide | Score is higher than last month, and last month was higher than the month before |

**Consistency** — awarded when a high score is sustained on an account old enough to be meaningful:

| Badge | Condition |
| --- | --- |
| Well Dressed, Well Used | Score is 75 or above and account is at least 30 days old |
| No Piece Left Behind | Score is 90 or above and account is at least 30 days old |

Historical scores for the improvement and consistency badges are computed by reconstructing the utilisation state as of a past date: for each wardrobe item, the algorithm finds its most recent logged wear on or before the reference date and checks whether that date falls within the 30-day window ending at the reference date. This avoids storing score snapshots and ensures the badge logic is always consistent with the current scoring formula.

---

### Unit Tests — Wardrobe Utilisation Score Edge Cases

The utilisation score is a pure function of the wardrobe item list and wear-date history. The edge cases below verify correctness at the boundary conditions.

#### Score Calculation

| Test Case | Input | Expected Output |
| --- | --- | --- |
| Empty wardrobe | items = [], logs = [] | Score = 0 (no division; guarded by `wardrobe.length > 0`) |
| All items worn in the last 30 days | 5 items, all worn this week | Score = 100 |
| No items worn at all | 5 items, zero outfit logs | Score = 0 (all forgotten — no wear date) |
| Partial — 1 of 4 worn recently | 1 item worn yesterday, 3 never worn | Score = ⌈(1/4)×100⌉ = 25 |
| Partial — 3 of 4 worn recently | 3 worn this week, 1 worn 45 days ago | Score = ⌈(3/4)×100⌉ = 75 |
| Item worn exactly 30 days ago | Last wear = today − 30 days | Item counts as **not forgotten** (boundary is inclusive: `>= thirtyDaysAgo`) |
| Item worn exactly 31 days ago | Last wear = today − 31 days | Item counts as **forgotten** |
| Score ceiling rounding | 1 of 3 items worn recently | Score = ⌈(1/3)×100⌉ = 34 (ceiling, not floor or round) |
| Score cannot exceed 100 | All items worn recently, `Math.min(100, …)` guard | Score = 100 (capped) |
| Item logged multiple times | Item worn 5 times; only the most recent date matters | Only most recent wear checked against the 30-day window |

#### Historical Score (Improvement and Consistency Badges)

The `computeScoreAsOf(refDate, itemIds, wearDatesMap)` function reconstructs the score as it would have appeared on any past date.

| Test Case | Input | Expected Output |
| --- | --- | --- |
| Item worn after the reference date | Wear date = tomorrow; refDate = today | Wear date excluded — future wears not counted |
| Item worn exactly on the reference date | Wear date = refDate | Counted as valid (boundary is `<= refDate`) |
| Item has multiple wears; most recent is before refDate | Wears: [d−60, d−20, d−5]; refDate = d−10 | Most recent valid wear = d−20; checked against d−40 window |
| No wears before the reference date | All wears are after refDate | Item treated as never worn as of refDate → forgotten |
| Account too new for consistency badge | Account age < 30 days, score = 90 | Consistency badge not awarded despite high score |

---

### Manual Test Cases — Wardrobe Utilisation Score

| Test | Expected Result | Status |
| --- | --- | --- |
| Open Stats page with no wardrobe items | Score shows 0, ring is empty, red tier tooltip displayed | Pass |
| Open Stats page with all items worn this week | Score shows 100, ring is full, purple tier displayed | Pass |
| Log an outfit containing a forgotten item | Utilisation score increases on next Stats page load | Pass |
| Item becomes forgotten (30 days pass without wear) | Utilisation score decreases on next Stats page load | Pass |
| Score in red tier (0–50) | Ring arc and score label both rendered in red | Pass |
| Score in yellow tier (51–75) | Ring arc and score label both rendered in yellow | Pass |
| Score in green tier (76–90) | Ring arc and score label both rendered in green | Pass |
| Score in purple tier (91–100) | Ring arc and score label both rendered in purple | Pass |
| Wardrobe Utilisation section on Badges page visible | Eight badge cards shown under "Wardrobe Utilisation" | Pass |
| Score reaches 50 for the first time | Awakened badge unlocked and persisted to database | Pass |
| Score reaches 75 for the first time | Wardrobe Aware badge unlocked | Pass |
| Score reaches 90 for the first time | Full Rotation badge unlocked | Pass |
| Score reaches 100 | Maximalist badge unlocked | Pass |
| Score improves by 20+ points vs last month | Comeback badge unlocked | Pass |
| Score improves two months in a row | Rising Tide badge unlocked | Pass |
| Score ≥ 75 and account ≥ 30 days | Well Dressed, Well Used badge unlocked | Pass |
| Score ≥ 75 but account < 30 days | Well Dressed, Well Used badge not awarded | Pass |
| Score ≥ 90 and account ≥ 30 days | No Piece Left Behind badge unlocked | Pass |
| Unlocked utilisation badge can be shared to community | Share modal opens; post appears in community feed as a badge post | Pass |
