## frontend-logic

## Global Layout
- Header
  - Left: logo → link to `/`
  - Right: login/register → swaps to "profile" + "logout" after auth
- Main: 3-column (left nav, center content, right user info)
- Footer: placeholder only

---

## Routes

### `/`
- Home (welcome or redirect to `/courses`)

### `/courses`
- List all courses
- Each course has link to `/courses/{id}`

### `/courses/[id]`
- Show course detail
- List problems under course
- Each problem has link to `/courses/{id}/problems/{pid}`

### `/courses/[id]/problems/[pid]`
- Show problem detail
- Submission form (POST → API)
- Error/success feedback message
- List of current user's submissions for this problem

### `/me/submissions`
- List all submissions by current user
- Table format, each row links to API JSON

---

## Auth UI
- Request magic link (form with email)
- Verify → redirect back to `/`
- Logout → clears cookie, redirects back