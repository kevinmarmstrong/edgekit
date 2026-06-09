# TheCommons — Complete User Story Specification

## User Types

| ID | Role | Description |
|----|------|-------------|
| R | **Resident** | Owner-occupant living in the community |
| T | **Tenant** | Renter; may have different rights than owner |
| AO | **Absentee Owner** | Property owner who does not live on-site |
| B | **Board Member** | Elected HOA/condo board member |
| PM | **Permission Holder** | Any person assigned one or more administrative permissions (volunteer, hired manager, committee chair, etc.) — not a fixed role |
| GO | **Group Organizer** | Leader of a community group (garden club, walking club, design review committee, decoration committee, landscaping team, book club, social committee, etc.) |
| GM | **Group Member** | Participant in one or more community groups |
| V | **Vendor** | Service provider, contractor, or maintenance technician |
| G | **Guest** | Visitor — no account, temporary access |
| SA | **SaaS Admin** | Platform operator managing multiple community tenants |

---

## Authentication & Login

- As a new resident, I want to sign up using my Google account so I never have to create a new username or password.
- As any user, I want to receive a magic link by email that logs me in with one click, so I can authenticate without a password.
- As any user, I want to receive a 6-digit magic code by SMS that logs me in on any device, so there is no password to forget.
- As any user, I want the app to offer Google login, magic email link, and magic SMS code on the same screen so I can choose whichever is fastest for me.
- As a new resident, I want my community invite to work as a magic link that both verifies my identity and logs me in simultaneously, so I complete account creation in one step with zero friction.
- As a returning user, I want the app to remember my authentication on my personal device for a configurable period (default 30 days) so I do not re-authenticate on every visit.
- As any user, I want to link both a Google account and a phone number to my account so I can use either method interchangeably.
- As any user, I want to revoke all active sessions from my account settings if I suspect my account has been accessed without my permission.
- As a V (vendor), I want to access my assigned work orders via a magic link in my SMS notification without creating an account, so there is no app-install barrier to doing my job.
- As a G (guest), I want to receive my community access pass via SMS magic link without creating an account.
- As a B, I want to require Google authentication for board members so that board identity is tied to a verified Google account.
- As a SA, I want to configure which authentication methods are enabled per community (Google, magic email, magic SMS, or any combination).
- As a SA, I want all authentication events — login, logout, failed attempts, and session revocations — logged in the platform audit trail per tenant.
- As a PM (permission holder), I want the system to re-authenticate me via a fresh magic code or Google prompt before I execute any financial or irreversible action, regardless of session age.

---

## PWA & Installation

- As any user, I want to be prompted to install the app to my home screen the first time I visit, so I get a native app experience without the App Store.
- As any user, I want the app to work offline for read-only actions (announcements, documents, my open requests) so I can access critical information without connectivity.
- As any user, I want push notifications delivered even when the app is closed, so I never miss urgent community alerts.
- As any user, I want the PWA to remember my login and preferences across sessions so I never have to re-authenticate on my own device.
- As any user, I want the installed app icon and splash screen to match my community's branding so it feels like a community-native app, not a generic platform.
- As any user, I want the app to update silently in the background so I always have the latest version without manual action.
- As any user, I want a native-feeling bottom navigation bar on mobile with no more than five items so the most important actions are always one tap away.

---

## Onboarding & Identity

- As a new resident, I want to join my community by scanning a QR code on my welcome letter so I never have to find an app store or remember a URL.
- As a new resident, I want my unit number, move-in date, and ownership/rental status pre-populated from the invite so I complete onboarding in under 60 seconds.
- As a resident, I want to set my contact and notification preferences during onboarding so I control how the community reaches me from day one.
- As a resident, I want to add a profile photo and display name so neighbors and staff know who I am.
- As a T (tenant), I want my account linked to my landlord's unit record so both of us have appropriate visibility without sharing credentials.
- As an AO (absentee owner), I want to manage my unit and receive financial notifications without being mistaken for an on-site resident.
- As a permission holder, I want to bulk-invite all residents by uploading a CSV of units and email addresses or phone numbers so I can onboard a whole community at once.
- As a permission holder, I want unregistered units flagged in the dashboard so I can follow up with residents who have not yet joined.
- As a SA, I want to onboard a new community by entering its name, address, unit count, and admin contact, and have the system provision everything — subdomain, database, default permissions — automatically.
- As a SA, I want each community to receive a branded subdomain (e.g., maplewood.thecommons.app) at onboarding with no DNS configuration required.
- As a SA, I want to create community templates (e.g., "volunteer HOA," "professionally managed," "apartment complex") that pre-assign sensible permission defaults at onboarding.

---

## Permission System

> There is no hardcoded "Property Manager" role. Every administrative capability is a discrete, assignable permission. Any person — board member, volunteer, hired manager, or committee chair — can hold any combination of permissions.

**Permission buckets (each independently assignable):**

| Permission | Example holders |
|---|---|
| `financial.view` | All board members |
| `financial.manage` | Treasurer only |
| `financial.assess` | Board majority vote required |
| `maintenance.view` | Operations committee |
| `maintenance.assign_vendors` | Maintenance coordinator |
| `maintenance.update_status` | Maintenance coordinator, assigned vendor |
| `communications.post_announcements` | Secretary, president |
| `communications.emergency_broadcast` | President |
| `compliance.issue_violations` | Compliance officer |
| `compliance.escalate_violations` | President, board majority |
| `governance.create_ballots` | Secretary, board members |
| `governance.close_ballots` | President, secretary |
| `governance.manage_documents` | Secretary |
| `governance.manage_meetings` | Secretary |
| `amenities.manage_calendar` | Amenity coordinator |
| `groups.create` | Configurable — any resident, approval-required, or board-only |
| `groups.manage_any` | Board member or designated coordinator |
| `residents.onboard` | Secretary, property manager |
| `residents.manage_accounts` | Property manager |
| `vendors.manage_directory` | Maintenance coordinator |
| `vendors.approve_invoices` | Treasurer |
| `bench.moderate` | Designated moderator |
| `platform.configure` | SA only |

**User stories:**

- As a B (president or board majority), I want to assign any permission to any named person, so our governance structure is reflected in the software rather than worked around it.
- As a B, I want to assign `financial.manage` exclusively to the treasurer and require a second approver for any transaction above a configurable threshold, so financial controls match our bylaws.
- As a B, I want to split `maintenance.view` from `maintenance.assign_vendors` so a volunteer coordinator can track requests without committing the community to vendor contracts.
- As a B, I want to require two-person approval for `financial.assess` (special assessments) so no single person can unilaterally charge residents.
- As a B, I want every permission assignment logged with who made it, when, and any notes, creating an immutable governance record.
- As a B, I want to set an expiry date on any permission assignment (e.g., a committee chair term ends June 30) so permissions expire automatically without manual revocation.
- As a resident, I want to see the full permission roster on my dashboard — who holds which permissions, when it was granted, and when it expires — so I always know who is accountable for each community function.
- As a resident, I want to be notified when any permission assignment changes (new, revoked, or expired) so governance changes are never hidden from the community.
- As any permission holder, I want the agent to only surface tools I have permission to use so I never accidentally attempt an action outside my authority.
- As a GO or resident, I want to see which residents currently hold `groups.create` permission so I know who to contact to propose a new group.
- As a SA, I want every permission change across all tenants logged in the platform audit trail for compliance purposes.

---

## Resident Dashboard

- As a resident, I want the home screen to show my open maintenance requests, upcoming events I have RSVP'd to, unread announcements, my next dues date, and open votes — all without navigating away.
- As a resident, I want the agent to be the primary interface — I describe what I need and it handles the rest — so I never have to dig through menus.
- As a resident, I want quick-action chips below the agent input ("Report an issue," "Book amenity," "Pay dues," "See events") so first-time users can discover what the app does.
- As a resident, I want the agent to remember context within a session so I can say "book the same slot next week" without repeating myself.

---

## Transparency Dashboard

> Transparency is a core platform value, not a configurable option for the permission roster and board composition.

- As a resident, I want a dedicated Transparency page showing: every current permission holder and their assigned permissions, every active community group and its organizer, the current board composition with term dates, all open ballots and participation rates, the community's financial summary (reserve fund %, last payment, next assessment), and maintenance SLA targets and current compliance rate.
- As a resident, I want the Transparency page updated in real time — any permission change, board update, or financial change is reflected within minutes.
- As a resident, I want every action taken by a permission holder that affects me (a violation issued, a payment applied, a document updated, a permission changed) to appear in my personal activity log with the name of who did it and when.
- As a B, I want the community audit trail to be downloadable as a PDF or CSV at any time for legal or dispute resolution purposes.
- As a SA, I want financial detail visibility to be configurable per community (some may show only percentages, not exact figures) while the permission roster and board composition remain fully public within the community at all times.

---

## Announcements & Communications

- As a resident, I want to see community announcements sorted by recency with urgent items pinned to the top.
- As a resident, I want to filter announcements by category (maintenance, safety, events, general) so I can find what matters to me.
- As a resident, I want to ask the agent "anything urgent this week?" and get a plain-language summary.
- As a resident, I want to receive a push notification within 60 seconds of an urgent announcement being published.
- As a permission holder (`communications.post_announcements`), I want to draft an announcement and schedule it for future publication so I can prepare communications in advance.
- As a permission holder, I want to target an announcement to a specific building, floor, or unit type rather than the whole community.
- As a permission holder, I want to see read receipts showing what percentage of residents have seen a critical notice.
- As a permission holder (`communications.emergency_broadcast`), I want to send an emergency broadcast that overrides all notification preferences and reaches every resident immediately.
- As a permission holder, I want to create announcement templates for recurring notices (e.g., monthly billing reminder) so I do not rewrite them each time.

---

## Maintenance & Service Requests

- As a resident, I want to report an issue by describing it in plain language and have the agent categorize it, set urgency, and confirm with me before submitting.
- As a resident, I want to attach a photo to a maintenance request directly from my phone camera with one tap.
- As a resident, I want to receive a status-change push notification every time my request moves state (submitted → assigned → in progress → resolved).
- As a resident, I want to see all my open and historical requests in one list with status and expected resolution time.
- As a resident, I want to reopen a resolved request if the issue was not fixed, with a comment explaining why.
- As a permission holder (`maintenance.view`), I want all incoming requests in a real-time queue sortable by urgency, category, building, and age.
- As a permission holder (`maintenance.assign_vendors`), I want to assign a request to a vendor directly from the request detail, with the vendor notified automatically.
- As a permission holder, I want SLA targets defined by urgency (emergency: 4 hours, urgent: 24 hours, routine: 5 business days) with requests flagged when approaching or past SLA.
- As a permission holder, I want the agent to draft a resident-facing status update from the work order notes so I do not write it manually.
- As a V (vendor), I want to receive new work assignments by SMS with a magic link to the request detail — no account required to view job info.
- As a V, I want to check in on arrival, log completion, and upload a photo from my phone without installing the app.
- As a V, I want to see all my active and upcoming assignments in one list so I can plan my schedule.
- As a B, I want a monthly maintenance summary showing volume, average resolution time, SLA compliance, and most common categories.

---

## Amenities & Reservations

- As a resident, I want to ask "is the clubhouse free Saturday afternoon?" and get an instant answer with available time slots.
- As a resident, I want to book a reservable amenity in one conversational turn: describe what I want, confirm the slot, approve — done.
- As a resident, I want to receive a calendar invite to my phone calendar when a booking is confirmed.
- As a resident, I want to cancel or modify a booking up to a configured notice period without calling anyone.
- As a resident, I want to see my upcoming reservations on my dashboard and receive a reminder 24 hours before.
- As a permission holder (`amenities.manage_calendar`), I want to configure which amenities require booking, their hours, capacity, duration limits, and blackout dates.
- As a permission holder, I want to block an amenity for maintenance with a note visible to anyone who tries to book during that period.
- As a permission holder, I want a calendar view of all amenity bookings to spot conflicts and overuse.
- As a permission holder, I want to set a per-resident booking cap (e.g., clubhouse once per week) enforced automatically.
- As a B, I want guest amenity usage tracked separately from resident usage in reports.

---

## Payments & Finances

- As a resident, I want to ask "what do I owe?" and get my current balance, due date, and payment history in one response.
- As a resident, I want to pay my HOA dues in one HITL-approved step showing the exact amount, period, and payment method before I confirm.
- As a resident, I want to set up autopay so dues are collected automatically each month without any action on my part.
- As a resident, I want a receipt pushed to me immediately after every payment.
- As a resident, I want a full payment history downloadable as a PDF.
- As a resident, I want a reminder notification 7 days before a payment is due, and again on the due date if still unpaid.
- As an AO, I want all financial communications sent to my contact info, not the unit address.
- As a permission holder (`financial.view`), I want to view all accounts and see who is current vs. delinquent, filtered by days overdue.
- As a permission holder (`financial.manage`), I want to issue a special assessment with a description, amount, and due date that automatically notifies all affected residents.
- As a permission holder (`financial.manage`), I want late fees applied automatically after a configurable grace period.
- As a permission holder (`financial.manage`), I want a monthly financial report showing collected dues, outstanding balances, and operating expenses.
- As a B, I want financial reports delivered to all board members on the first of each month automatically.
- As a B, I want to view the reserve fund balance, target, and funding percentage at any time.

---

## Documents & Governance

- As a resident, I want to ask "what are the rules about parking?" and have the agent search all governing documents and return the relevant section in plain language.
- As a resident, I want a single searchable library containing CC&Rs, bylaws, house rules, meeting minutes, financial reports, and policies.
- As a resident, I want documents tagged by category and version so I can always find the current governing document.
- As a resident, I want a notification when a new document is published or an existing one is updated.
- As a permission holder (`governance.manage_documents`), I want to upload a document and choose visibility (all residents, owners only, board only) in one step.
- As a permission holder, I want to supersede an old document version while keeping the history accessible.
- As a B, I want board-only documents (executive session minutes, legal correspondence) separated from resident-facing documents.

---

## Voting & Elections

- As a resident, I want to see all open ballot items on my dashboard and know at a glance which ones I have not yet voted on.
- As a resident, I want to cast my vote in one HITL-approved step showing the question, options, and deadline before I confirm.
- As a resident, I want a push reminder 48 hours before a ballot closes if I have not yet voted.
- As a resident, I want final results published immediately after a vote closes.
- As a permission holder (`governance.create_ballots`), I want to create a ballot with title, description, options, eligibility rules, quorum requirement, and deadline.
- As a B, I want to run a board election with candidate profiles, one vote per unit, and results certified automatically when quorum is met.
- As a B, I want real-time participation rates visible during an open vote without revealing individual votes.
- As a B, I want to export certified vote results as a PDF for the official record.
- As a permission holder (`governance.close_ballots`), I want the system to automatically close a vote at its deadline and notify all eligible voters of the outcome.

---

## Events & Community Calendar

- As a resident, I want to see all upcoming community events in a single calendar with dates, times, locations, and RSVP counts.
- As a resident, I want to RSVP to an event with one approval tap and receive a calendar invite automatically.
- As a resident, I want to cancel my RSVP up to the configured cutoff time.
- As a resident, I want a push reminder 24 hours before an event I have RSVP'd to.
- As a permission holder or GO, I want to create a community event with title, date, time, location, capacity, RSVP deadline, and audience (all residents or a specific group).
- As a permission holder or GO, I want to see an RSVP list and send a reminder to residents who have not responded by a configured date.
- As a permission holder or GO, I want to send a post-event summary or photos to all attendees.
- As a B, I want board meetings automatically added to the community calendar with agenda documents attached.

---

## Community Groups

- As a resident, I want to see all active community groups and join any I am interested in with one tap.
- As a resident, I want announcements and event invites only from groups I have joined, not all groups.
- As a GO or permission holder (`groups.create`), I want to create a new community group with name, description, purpose, and optional membership approval requirement.
- As a GO, I want to post announcements visible only to my group members.
- As a GO, I want to create events for my group that appear on the community calendar flagged as group-specific.
- As a GO, I want a member list with contact options so I can coordinate without exposing personal contact information.
- As a GO, I want to request a community amenity for a group event through the standard reservation system with group-priority booking where configured.
- As a GO (design review committee), I want to receive and track architectural modification requests submitted by residents, with a structured review and approval workflow.
- As a GO (design review committee), I want to respond to a modification request with approval, conditional approval, or denial — logged and the resident notified automatically.
- As a resident, I want to submit an architectural modification request (fence, paint color, landscaping, solar panels, etc.) with photos and a description, and track its status through the design review process.
- As a GO (landscaping team), I want a shared task list and schedule visible to all team members so we coordinate without a separate app.
- As a GO (decoration committee), I want to manage a shared budget and post expense reports visible to committee members and the board.
- As a permission holder (`groups.create`), I want to configure whether any resident can create a new group, only named people can, or new groups require approval.
- As a permission holder (`groups.manage_any`), I want to dissolve a community group with a logged reason if it becomes inactive or violates community standards, with the group's history archived rather than deleted.
- As a B, I want group activity (events, decisions, expenditures) visible in the community audit log.
- As a resident, I want to see clearly on the Transparency page who holds `groups.create` permission, who organizes each group, and what approval process is required to start a new one.
- As a GO, I want to designate a co-organizer who can post, manage members, and create events without full ownership of the group.

---

## The Bench — Neighbor Trade Board

> A community-sourced, fully attributed vendor reputation board. Residents share real experiences — good and bad — with contractors, handymen, and service providers. No anonymous posting. Ever. Every entry is permanently tied to the resident who submitted it.

- As a resident, I want to post a vendor experience on The Bench by describing the work done, trade category, approximate cost, vendor name and contact info, and my recommendation (Recommend / Do Not Recommend).
- As a resident, I want to attach photos showing the completed work to my Bench post so quality is visible and verifiable.
- As a resident, I want every Bench post to show the submitting resident's name and unit number so the community can weigh the source and ask follow-up questions.
- As a resident, I want to search The Bench by trade category (plumber, electrician, painter, landscaper, roofer, handyman, HVAC, pest control, etc.) with results sorted by most recent.
- As a resident, I want to filter The Bench to show only "Recommend" posts, only "Do Not Recommend" posts, or both.
- As a resident, I want to see an aggregate score per vendor (e.g., 7 Recommend, 1 Do Not Recommend) at a glance before reading individual posts.
- As a resident, I want to ask the agent "who's a good plumber?" and have it search The Bench and summarize the most-recommended options with cost ranges.
- As a resident, I want to respond to another resident's Bench post with an attributed follow-up comment to add context or ask a question.
- As a resident, I want to edit or delete my own Bench post at any time, with the edit history visible to other residents so the record is transparent.
- As a resident, I want to flag a post as potentially inaccurate or in violation of community standards, queuing it for review without removing it until a decision is made.
- As a permission holder (`bench.moderate`), I want to review flagged posts and reinstate, remove, or annotate them — with my decision logged in the audit trail.
- As a permission holder, I want any removed post to remain visible to the original author and board with a note explaining the removal, so removals are never silent.
- As a B or permission holder, I want a highly recommended Bench vendor to be promotable to the community's preferred vendor directory with one action.
- As a SA, I want The Bench to be a togglable feature per community, disabled by default.
- As a SA, I want The Bench to be configurable as read-only (no resident posts) for communities that want to seed vendor data before enabling community contributions.
- As any user, I want The Bench to display a clear, permanent notice that anonymous posting is not permitted and every post is publicly attributed, so the community standard is always visible.

---

## Vendor Management

- As a permission holder (`vendors.manage_directory`), I want a vendor directory with name, trade, license number, insurance expiry, contact info, and community rating.
- As a permission holder, I want an alert when a vendor's license or insurance is expiring within 30 days.
- As a permission holder (`maintenance.assign_vendors`), I want to invite a vendor to the platform so they can self-manage assignments without a full resident account.
- As a V, I want to see my assigned work orders, check in on arrival, update status, upload completion photos, and submit an invoice — all from my phone without installing the app.
- As a V, I want to receive SMS notifications for new assignments via magic link — no account required.
- As a permission holder, I want to rate a vendor after job completion and see aggregated ratings when selecting vendors for future work.
- As a permission holder (`vendors.approve_invoices`), I want to track vendor invoices against a maintenance budget and see spend by category and period.

---

## Violations & Compliance

- As a resident, I want to report a community rule violation (noise, parking, pet, trash) with a description and optional photo, with my identity kept confidential from the subject.
- As a resident, I want to see any open violations on my unit and understand what action is required of me.
- As a resident, I want to respond to a violation notice with a comment or evidence of correction.
- As a permission holder (`compliance.issue_violations`), I want to review incoming violation reports, investigate, and issue a formal notice with a required cure date.
- As a permission holder (`compliance.escalate_violations`), I want an escalation workflow that automatically issues a second notice and a fine if a violation is not cured by its deadline.
- As a permission holder, I want to track violation history by unit to identify repeat offenders in reports.
- As a B, I want a monthly violations summary showing open vs. resolved counts, most common violations, and fine revenue.

---

## Guest & Access Management

- As a resident, I want to issue a one-time or recurring guest pass that gives a visitor temporary amenity and common-area access.
- As a resident, I want to preregister a visitor so entry systems can verify them on arrival without me being present.
- As a G (guest), I want to receive my access code or pass by SMS magic link without creating an account.
- As a permission holder, I want to see all active guest passes and revoke any pass immediately if needed.
- As a permission holder, I want a visitor log showing entry times for all issued passes for security review.
- As a resident, I want to request a temporary parking pass for a guest and receive a printable pass for their windshield.

---

## Messaging & Notifications

- As a resident, I want to send a message to whoever holds the relevant permission and receive a reply in the same thread, like a support ticket.
- As a resident, I want to see all my message threads with management and know when my message has been read.
- As a permission holder, I want an inbox showing all open resident message threads, with the ability to assign threads to other permission holders.
- As a permission holder, I want the agent to draft a reply to a routine inquiry so I can review and send with one click.
- As any user, I want granular notification controls — choose which events trigger push, SMS, or email, or nothing — per category.
- As a resident, I want a daily or weekly digest option so I receive one summary instead of individual notifications for low-priority items.
- As a permission holder, I want to see which residents have push notifications enabled vs. email-only so I know who may miss urgent alerts.
- As any user, I want a do-not-disturb schedule so notifications pause during my sleeping hours.

---

## Configuration & Customization

- As a permission holder or SA, I want every feature (amenities, payments, groups, violations, voting, The Bench, etc.) to be togglable per community so the app only shows features the community actually uses.
- As a permission holder, I want to define which permission is required before a specific action can take effect, including optional two-person approval for sensitive actions.
- As a permission holder, I want to configure maintenance request categories, urgency levels, and SLA targets to match my community's service standards.
- As a permission holder, I want to brand the community portal with a name, logo, primary color, and welcome message.
- As a permission holder, I want to configure amenity rules (booking window, duration limits, capacity, blackout dates, deposit requirements) per amenity.
- As a SA, I want all community configuration stored as data, not code, so no deployment is needed for any customization.
- As a SA, I want to enable or disable features for a tenant from the platform admin console without deploying code.
- As a SA, I want to view a health dashboard across all tenants showing active users, request volume, error rates, and deployment status.

---

## Accessibility & Inclusion

- As any user, I want the app to meet WCAG 2.1 AA standards so residents with disabilities can use every feature.
- As any user, I want to interact with the agent by voice on mobile so I can submit a request while my hands are full.
- As a resident whose primary language is not English, I want the agent to respond in my preferred language, set in my profile.
- As a permission holder, I want to publish announcements in multiple languages to reach the full diversity of the community.
- As any user, I want text to be resizable without the layout breaking so residents who need larger type can read comfortably.

---

## Platform Integrity & Trust

- As any user, I want every agent action that modifies data to require explicit one-click approval so nothing happens without my intent.
- As any user, I want an activity log showing every action taken on my account, who performed it, and when.
- As a permission holder or B, I want a full community audit trail of all mutations — who submitted what, who approved it, when — that cannot be edited or deleted.
- As a SA, I want tenant data fully isolated so no community can ever see another community's data under any condition.
- As a SA, I want automated security scanning on every deployment and a zero-downtime deploy process.
- As any user, I want my personal data to be exportable and deletable per GDPR/CCPA requirements from within my account settings.
