# AI Clipzone Nepal LMS — Security Specification & Threat Model

## 1. Core Data Invariants
1. **Strict Admin Gate (`email_verified == true`)**: Only Firebase users with `email_verified == true` and allowlisted email (`ai.clipzone.edu@gmail.com` or `rajababum426@gmail.com`) or an explicit `/admins/{uid}` grant are treated as Main Administrators. Zero pattern matching (`admin*`) is permitted.
2. **Sub-Admin Secret Code Isolation**: `/sub_admins/{code}` contains secret login codes (`SUB-*`) and is NEVER listable by students or unauthenticated callers (`allow list: if isAdminToken()`). Students route chats exclusively through non-secret `/sub_admin_profiles/{subprof_*}` documents.
3. **Zoom Link Confidentiality**: `/live_sessions/{sessionId}` stores only public schedule/topic metadata (`title`, `courseId`, `status`, `hostName`). Zoom links are encrypted at rest (`enc_v1:` AES-256-GCM) inside `/live_session_secrets/{sessionId}` (`allow list: if false`) and decrypted exclusively by backend API endpoints after verifying enrollment or instructor ownership.
4. **Activation Key Single-Device & Ownership Lock**: Students may read an exact `/activation_keys/{code}` by knowing the secret code to claim it, or list ONLY keys where `claimedByUid == request.auth.uid`. Students can never alter `courseId`, `duration`, `createdAt`, `expiresAt`, or `createdByRole`. Sub-Admins can only create/manage keys strictly scoped to their `assignedCourseId` where `subAdminUid == request.auth.uid`.
5. **Course Flag Integrity**: Only verified Main Admins can create/delete courses or toggle `includeLive` and `includeCertificate`. Course-scoped Sub-Admins can update video/PDF lessons only for their active assigned course and cannot flip `includeLive` or `includeCertificate`.
6. **Student Progress Ownership**: `/user_progress/{userId}` is strictly private to `userId == request.auth.uid` (or Main Admin) and enforces `incoming().userId == userId` on create and update.
7. **Support Conversation & Attachment Bounds**: Conversations allow only `student_subadmin`, `subadmin_mainadmin`, or `student_mainadmin`, never allow cross-student `list` scraping, and cap string/attachment payload sizes to prevent 1MB document crashes or Denial-of-Wallet abuse.
8. **Global Default-Deny Net**: `match /{document=**} { allow read, write: if false; }` sits at the top of `/databases/{database}/documents`.

---

## 2. The "Dirty Dozen" Attack Payloads (Expected Result: `PERMISSION_DENIED`)

1. **Unverified Admin Email Spoof (`isAdmin` bypass)**
   - Actor: Attacker signs up with custom claim/unverified provider email `ai.clipzone.edu@gmail.com` (`email_verified: false`), attempts `setDoc('/courses/hack', ...)`.
   - Defense: `isAdminToken()` mandates `request.auth.token.email_verified == true`.
2. **Prefix Pattern Admin Forgery (`admin@attacker.com`)**
   - Actor: Attacker signs in with verified `admin123@gmail.com` and calls `GET /api/live-decrypt-admin` or deletes `/courses/*`.
   - Defense: Exact email set match (`ai.clipzone.edu@gmail.com` / `rajababum426@gmail.com`) in Firestore rules + `server/authAndEnrollment.ts`.
3. **Shadow / Ghost Field Injection on Activation Key Claim**
   - Actor: Student claims unused key `/activation_keys/CLIP-ABC123` while injecting `{ "status": "used", "courseId": "course-all", "expiresAt": 9999999999999, "isAdmin": true }`.
   - Defense: Claim action `affectedKeys().hasOnly(...)` + `isValidActivationKey()` blocks unknown ghost fields and forbids modifying `courseId` or extending `expiresAt`.
4. **Sub-Admin Secret Code Scraping (`list /sub_admins`)**
   - Actor: Signed-in student executes `getDocs(collection(db, 'sub_admins'))` to steal all instructors' `SUB-*` codes.
   - Defense: `allow list: if isAdminToken();` rejects non-admin listing.
5. **Sub-Admin Privilege Escalation Across Courses**
   - Actor: Sub-Admin assigned to `course-A` tries creating a key or `live_session` for `course-B`, or toggling `includeLive: true` on `course-A`.
   - Defense: `isActiveSubAdminOwner(subCode, courseId)` verifies parent `/sub_admins/{subCode}` has `status == 'active'`, `activeUid == request.auth.uid`, and `courseId == incoming().courseId`; course update locks `includeLive` and `includeCertificate` immutably.
6. **Zoom Secret Link Scraping (`list /live_session_secrets`)**
   - Actor: Student runs `getDocs(collection(db, 'live_session_secrets'))`.
   - Defense: `allow list: if false;` plus AES-256-GCM encryption at rest (`encryptedZoomLink`).
7. **Cross-Student Progress Tampering (`/user_progress/{victimUid}`)**
   - Actor: Student A calls `setDoc('/user_progress/victimUid', { userId: 'victimUid', courses: {} })`.
   - Defense: `userId == request.auth.uid` check + `incoming().userId == userId`.
8. **Cross-User Support Chat Scraping (`list /support_conversations`)**
   - Actor: Student calls `getDocs(query(collection(db, 'support_conversations'), limit(100)))` without `ownerUid` filter.
   - Defense: `allow list` validates `isAdminToken() || resource.data.ownerUid == request.auth.uid || resource.data.userId == request.auth.uid || resource.data.subAdminUid == request.auth.uid`.
9. **Master Gate Orphaned Message Creation**
   - Actor: Attacker attempts to addDoc to `/support_conversations/fake_conv_id/messages/msg1` without owning or being participant of parent conversation.
   - Defense: Parent `get(/databases/$(database)/documents/support_conversations/$(conversationId))` verifies existence and caller authorization before allowing message read/create.
10. **Path ID Poisoning (1.5KB Junk Doc ID)**
    - Actor: Attacker attempts `setDoc('/user_progress/' + 'A'.repeat(1500), ...)`.
    - Defense: `isValidId(userId)` rejects any ID `> 128` chars or outside safe characters.
11. **Course Request Auto-Approval Fraud**
    - Actor: Student submits `/course_requests/req1` with `{ "status": "accepted", "userId": "uid" }` or updates an existing `pending` request to `accepted`.
    - Defense: Create enforces `incoming().status == 'pending'` and `userId == request.auth.uid`; update locks `status` and terminal states (`accepted` / `declined`) to Main Admin.
12. **Global System Config Overwrite (`/system/payment_qr` or `/system/admin_session`)**
    - Actor: Authenticated student overwrites `payment_qr.esewaId` to redirect student payments, or overwrites `system/admin_session`.
    - Defense: `/system/*` writes strictly restricted to `isAdmin()`.

---

## 3. Red Team Conflict Matrix

| Collection | Identity Spoofing | Ghost / Shadow Fields | Resource Poisoning | List Scraping | Terminal / Immutable Guards |
|---|---|---|---|---|---|
| `admins/{uid}` | Blocked (`isAdminToken()`) | Blocked (`hasOnly`) | Blocked (`isValidId`) | Blocked (`false`) | `uid`, `role` immutable |
| `activation_keys/{code}` | Blocked (`claimedByUid == auth.uid`) | Blocked (`hasOnly` + `isValidActivationKey`) | Blocked (size bounds on all strings) | Scoped (`isAdminToken() \|\| owner \|\| subAdminUid`) | `code`, `duration`, `courseId`, `createdAt`, `expiresAt` immutable |
| `sub_admins/{code}` | Blocked (`activeUid == auth.uid`) | Blocked (`hasOnly` + `isValidSubAdmin`) | Blocked (`isValidId`, avatar size cap) | Blocked (`isAdminToken()` only) | `code`, `courseId`, `status` immutable for Sub-Admin |
| `sub_admin_profiles/{id}` | Blocked (`isAdmin()` or `activeUid`) | Blocked (`hasOnly`) | Blocked (`isValidId`) | Public only `status == 'active'` | Never stores `code` |
| `courses/{courseId}` | Blocked (`isAdmin()` or active Sub-Admin) | Blocked (`hasOnly` + `isValidCourse`) | Blocked (`isValidCourseId`, array size caps) | Catalog check (`id is string`) | `includeLive`/`includeCertificate` immutable by Sub-Admin |
| `live_sessions/{id}` | Blocked (`isAdmin()` or `isActiveSubAdminOwner`) | Blocked (`hasOnly`) | Blocked (`isValidId`, text bounds) | Catalog check (`courseId is string`) | `createdAt`, `courseId`, `createdByRole` immutable |
| `live_session_secrets/{id}` | Blocked (`isAdmin()` or parent instructor) | Blocked (`hasOnly`) | Blocked (`isValidId`, 4KB cap) | Blocked (`allow list: if false`) | Encrypted ciphertext only |
| `user_progress/{uid}` | Blocked (`uid == auth.uid`) | Blocked (`hasOnly`) | Blocked (`isValidId`) | Blocked (`isAdminToken()` only) | `userId` immutable |
| `course_requests/{id}` | Blocked (`userId == auth.uid`) | Blocked (`hasOnly`) | Blocked (`isValidId`) | Scoped (`owner \|\| isAdminToken()`) | `status` must start `pending`; terminal state locked |
| `support_conversations/{id}` | Blocked (`ownerUid == auth.uid` / participant) | Blocked (`hasOnly`) | Blocked (`isValidConversationId`, size caps) | Scoped (`owner \|\| subAdminUid \|\| isAdminToken()`) | `id` & `userId` immutable |
| `.../messages/{msgId}` | Blocked (Master Gate `get()` parent) | Blocked (`hasOnly`) | Blocked (`isValidId`, text <= 5000, att <= 900KB) | Requires parent participant | `timestamp`, `conversationId` immutable |
| `system/{doc}` | Blocked (`isAdmin()` write) | Blocked (`isAdmin()` write) | Restricted doc IDs | Blocked (`allow list: if false`) | `admin_session` read/write Main Admin only |
