# Meta Lead Ads Real-Time PoC (Go + React Native)

A proof of concept that streams incoming Meta Lead Ad (`leadgen`) webhook events in real time to an open React Native (Expo) mobile app, with no manual refresh or user interaction on the device.

## Architecture Overview

Instead of client-side HTTP polling, this solution uses an event-driven WebSocket pipeline:

1. **Webhook ingestion (`POST /webhook`):** Meta sends a `page` object containing a `leadgen` change payload to the public Ngrok HTTPS endpoint.
2. **Go (Gin) server and broadcast channel:** The server validates and reads the incoming JSON, immediately returns `200 OK` to Meta, and pushes the payload bytes into an internal `broadcast` channel.
3. **WebSocket push (`GET /ws`):** A background goroutine reads from the `broadcast` channel and writes the payload to all active mobile clients held in a mutex-protected connection map.
4. **React Native client (`front-end/App.tsx`):** The app keeps a persistent WebSocket connection (`wss://`), parses incoming `leadgen` payloads (`leadgen_id`, `form_id`, `ad_id`, `page_id`, `created_time`), and prepends new lead cards to the UI state automatically.

## Project Structure

```text
meta-leads-poc/
├── main.go              # Go (Gin) webhook & WebSocket server
├── go.mod               # Go module dependencies
├── go.sum
└── front-end/           # React Native (Expo) mobile application
    ├── App.tsx          # Live feed UI & WebSocket client logic
    ├── package.json
    └── tsconfig.json
```

## Running Locally

### 1. Start the Go backend

```bash
go mod tidy
go run main.go
```

The server listens on `http://localhost:8080`.

### 2. Expose the local port via Ngrok

```bash
ngrok http 8080
```

Copy the generated `https://` forwarding URL, then:

- In the Meta App Dashboard, under **Webhooks** (Page → `leadgen`), set the callback URL to `https://<your-ngrok-domain>/webhook` with verify token `my_secret_token_123`.
- Update `WS_URL` in `front-end/App.tsx` to `wss://<your-ngrok-domain>/ws`.

### 3. Start the React Native app

```bash
cd front-end
npm install
npx expo start --tunnel
```

Scan the QR code in the Expo Go app on a physical device, or open it on an Android emulator.

## Assumptions Made

1. **Meta webhook triggering and account restrictions:** Newly registered Meta Developer accounts are subject to automated Advertising Access restrictions until manual identity verification completes. This blocks creating standalone Facebook Pages for the Lead Ads Testing Tool. To demonstrate real-time delivery from Meta's infrastructure, `leadgen` payloads are triggered through the Webhook Test utility in the Meta App Dashboard, which dispatches the identical `page` / `leadgen` payload structure.

2. **Webhook metadata vs. Graph API enrichment:** Meta's `leadgen` webhook only sends reference identifiers (`leadgen_id`, `form_id`, `ad_id`, `page_id`, `adgroup_id`, `created_time`), not raw user PII. For this PoC, the mobile app renders these live reference IDs alongside an expandable view of the raw webhook JSON. In production, the Go server would use the `leadgen_id` to call `GET https://graph.facebook.com/v20.0/{leadgen_id}` with a Page Access Token before broadcasting the enriched lead data.

3. **In-memory streaming:** Because the PoC focuses on real-time delivery to an already-open mobile screen, leads are streamed directly over WebSockets and held in client state rather than persisted in a database.
