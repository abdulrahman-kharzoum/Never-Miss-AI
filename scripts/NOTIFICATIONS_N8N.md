# Configuring n8n (or any processor) to publish notifications to Supabase

This project uses a Supabase `notifications` table for real-time user notifications.
Instead of posting status updates to the backend `/api/file-processing-status` endpoint,
we recommend having n8n write INSERTs directly to Supabase so all frontend clients
receive updates via Supabase realtime.

## Recommended approach

1) Create the `notifications` table (see `scripts/create_notifications_table.sql`).
2) Configure n8n to INSERT rows into the table when file processing status changes.

You can do this in two ways:

A) Use Supabase REST API from n8n (recommended for simplicity)
-----------------------------------------------------------
- Use the HTTP Request node in n8n.
- URL (replace <project> and region):
  `https://<your-project>.supabase.co/rest/v1/notifications`
- Method: POST
- Headers:
  - `apikey: <SERVICE_ROLE_KEY>`
  - `Authorization: Bearer <SERVICE_ROLE_KEY>`
  - `Content-Type: application/json`
  - `Prefer: return=representation`  (optional: returns the inserted row)
- Body (raw JSON) example:

  {
    "user_id": "PdO6B3E0oOcQlYIcvC5vn1Naflz2",
    "session_id": "rag_1761600323807_ohl1nq4e",
    "status": "pending",
    "message": "File processing has started for this session.",
    "data": { "redirectUrl": null }
  }

Notes:
- Use the Supabase service_role key (server-side secret) here because you're inserting
  on behalf of the system. Do NOT place the service role key in the browser.
- If you enabled Row Level Security (RLS) on the table, ensure your insert policy
  allows the service_role key to write (service_role bypasses RLS).

B) Use a server-side helper or function
--------------------------------------
If you prefer not to add the service_role key to n8n, you can:
- Add a small server-side function (e.g., an edge function or a small API) that
  accepts the file-processing webhook from n8n, validates it, and inserts into
  Supabase using the service_role key. This still removes the need to broadcast
  via Socket.IO.

## Sample cURL (for manual testing)

```bash
curl -X POST \
  'https://<your-project>.supabase.co/rest/v1/notifications' \
  -H 'apikey: <SERVICE_ROLE_KEY>' \
  -H 'Authorization: Bearer <SERVICE_ROLE_KEY>' \
  -H 'Content-Type: application/json' \
  -d '{"user_id":"PdO6B3E0oOcQlYIcvC5vn1Naflz2","session_id":"rag_1761600323807_ohl1nq4e","status":"completed","message":"File processing completed. Click to open chat.","data":{"redirectUrl":"https://your-webhook-url"}}'
```

## What the frontend does

- The frontend already subscribes to the `notifications` table via the Supabase client
  in `frontend/src/context/NotificationContext.jsx` and will display any INSERTs
  in real-time.
- When a notification has `status === 'completed'` and `data.redirectUrl` is present,
  clicking the notification will open the chat interface with the webhook URL.

## Security considerations

- The service_role key is powerful: keep it out of the browser and rotate if exposed.
- If you need to allow n8n to write into Supabase without exposing the service role key,
  consider using a server-side insert function or using build-in Supabase Edge Functions
  to accept trusted webhooks from n8n and then insert into the table.

## Troubleshooting

- If notifications do not appear in the frontend:
  1) Verify the INSERT succeeded in Supabase (check SQL editor or `notifications_recent` view).
  2) Ensure the browser client is authenticated and RLS policies permit SELECT for that user.
  3) Check console/network logs for Supabase realtime subscription errors.

---

If you'd like, I can also:
- Add an n8n workflow JSON with an HTTP Request node ready to use.
- Add a tiny edge function or FastAPI endpoint that validates and inserts into Supabase
  (if you don't want to put the service role key into n8n).

Which would you prefer? (Direct n8n REST insert, or add a small server helper?)
