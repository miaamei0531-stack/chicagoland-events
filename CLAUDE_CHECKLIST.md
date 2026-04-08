# QA Checklist — Run After Every Feature

## MAP
[ ] Map loads centered on Chicago
[ ] Blue markers for official events
[ ] Teal markers for community events
[ ] Clusters form at low zoom
[ ] Clicking marker opens EventDetailPanel
[ ] Map updates on pan and zoom

## FILTERS
[ ] All 10 category pills render
[ ] Selecting a category filters map AND list
[ ] Selected pill shows active visual state
[ ] Reset clears all filters
[ ] Search filters by title and description
[ ] Date range filters correctly
[ ] Radius slider filters by distance

## EVENT DETAIL PANEL
[ ] Opens on marker click
[ ] Shows title, categories, date, address, price
[ ] Shows SourceBadge (Official blue / Community teal)
[ ] Official Page button links correctly
[ ] Comments section loads
[ ] Shows login prompt if not authenticated
[ ] Panel closes on X click

## SUBMIT EVENT FORM
[ ] Opens from Submit Event button
[ ] Step 1: title, category, description work
[ ] Step 2: date inputs and recurring toggle work
[ ] Step 3: address geocodes and shows map pin
[ ] Step 4: price, URL, email inputs work
[ ] Step 5: review shows all entered data
[ ] Submit sends to POST /api/v1/submissions
[ ] Confirmation message shows after submit
[ ] Login prompt shows if not authenticated

## COMMUNITY COMMENTS
[ ] Comments load per event
[ ] Comment type filter pills work
[ ] Comment form shows when logged in
[ ] New comments appear without page refresh
[ ] Report button visible on each comment

## AUTHENTICATION
[ ] Sign in with Google works
[ ] User avatar appears in navbar after login
[ ] Logout works and clears session
[ ] Protected routes redirect when not logged in

## MY SUBMISSIONS
[ ] Page loads at /my-submissions
[ ] Shows all submissions for current user
[ ] Status badges show correctly
[ ] Rejected shows admin note + Edit button
[ ] Approved shows View on Map link

## ADMIN DASHBOARD
[ ] /admin redirects non-admins to home
[ ] Pending submissions tab shows queue
[ ] Verification score bar renders
[ ] Approve removes from queue
[ ] Reject opens note field
[ ] Reported comments visible with delete option

## DESIGN SYSTEM
[ ] No hardcoded hex colors in any component
[ ] Plus Jakarta Sans used for headings
[ ] Inter used for body text
[ ] Primary orange #E8601C used correctly
[ ] Secondary green #2C7A5C used correctly
[ ] Background warm white #FBF7F4 applied
[ ] All cards use rounded-card and shadow-card

## PERFORMANCE
[ ] npm run build has zero errors
[ ] npm run lint has zero warnings
[ ] No console errors on any page
[ ] No API keys visible in frontend code
