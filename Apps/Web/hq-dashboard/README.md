# Phantom HQ Dashboard

Web operations console for monitoring Phantom activity **without access to private message content**.

Location: `Apps/Web/hq-dashboard` (sibling to `Apps/Mobile/Phantom`).

## What HQ can see

- `activity_events` — append-only audit trail (connections, groups, message-sent metadata)
- `chats` — document metadata (members, type, timestamps), **not** `chats/{id}/messages`
- Pending counts from `connection_requests` and `group_invitations`

## What HQ cannot see

- Message bodies (`encryptedFor` payloads stay in `messages` subcollection; rules deny HQ reads)
- Kyber private keys (device-only)

## Setup

```bash
cd Apps/Web/hq-dashboard
npm install
npm run dev
```

### Grant HQ access

Add the operator email to the singleton config document:

```
hq_operators/hq_operator
{
  active: true,
  role: "hq_monitor",
  name: "Operator Name",
  allowedEmails: ["pratyanshrana1@gmail.com"]
}
```

Or run from the mobile folder:

```bash
python grantHqAccess.py operator@example.gov
```

Deploy updated rules from the mobile app folder:

```bash
cd Apps/Mobile/Phantom
firebase deploy --only firestore:rules
```

## Mobile instrumentation

The mobile app writes to `activity_events` on connection, group, and message actions. Message events log sender, chat id, and media flags only — never plaintext.

## Security notes

- HQ accounts must be in `hq_operators`; regular users cannot read `activity_events`.
- Rotate HQ credentials and disable operators with `active: false`.
- For production, prefer Firebase custom claims (`hq: true`) instead of a collection lookup.
