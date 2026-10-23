<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://ai.google.dev/static/site-assets/images/share-ais-513315318.png" />
</div>

# Run and deploy your AI Studio app

This contains everything you need to run your app locally.

View your app in AI Studio: https://ai.studio/apps/48529f55-6650-43da-b184-d9e5475bebae

## Run Locally

**Prerequisites:**  Node.js


1. Install dependencies:
   `npm install`
2. Copy [.env.example](.env.example) to `.env.local` and set any provider keys you use.
   `VITE_GOOGLE_MAPS_API_KEY` enables the interactive IP geolocation map.
   `ISMALICIOUS_API_KEY` enables isMalicious URL reputation lookups.
3. Run the app:
   `npm run dev`

To run the built production version locally, use `npm run start`. This builds the frontend first, then serves it from the app server.

## Deploy to Vercel

Import this repository in Vercel or run `vercel --prod` from the project root. Vercel builds the Vite frontend and
deploys the handlers under `api/` as serverless functions. Requests matching those API routes, including GET requests
and the live threat-feed connection, reach Vercel functions; other paths rewrite to the single-page app.

Configure any required provider credentials as Vercel project environment variables before deploying. In particular,
set `ismalicious_api_key` (or `ISMALICIOUS_API_KEY`) for URL reputation lookups. Set `VITE_GOOGLE_MAPS_API_KEY` if
for the interactive map; `VITE_` variables are included in the browser bundle and
must not contain secrets. Do not upload `.env.local` or put server-side API keys in `VITE_` variables.

## Deploy to Render

Create a Render Web Service from the repository and use the included `render.yaml` Blueprint, or set:

- Build command: `npm ci && npm run build`
- Start command: `npm run start:server`
- Health check path: `/`

Set `VITE_GOOGLE_MAPS_API_KEY` as a build-time environment variable so Vite includes it in the frontend bundle.
This browser key is public by design; restrict it in Google Cloud to the Maps JavaScript API and your deployed
website origin. Set `ISMALICIOUS_API_KEY` as a server-only environment variable for URL reputation lookups.
Never put the isMalicious key in a `VITE_` variable or commit `.env.local`. Provider-backed features require valid
keys and provider account/API access; the rest of the dashboard runs without those optional keys.

Vercel's function filesystem and in-memory state are temporary and may not persist between invocations. Consent-based
device-visit records and request audit logs therefore are not durable on Vercel; use an external persistent database
if these records need to survive deployments or be shared across instances. The live event feed may reconnect when a
serverless execution reaches its platform duration limit.

## Device Intelligence

The Device Intelligence dashboard records a visit only after the browser explicitly opts in. It stores the broad device
category, browser family, operating-system family, and server timestamp in `data/device-visits.json`. It does not store
visitor names, IP addresses, exact screen dimensions, precise location, persistent device identifiers, or full browser
fingerprints. The server retains at most 1,000 records from the last 30 days. Configure persistent storage for the
`data` directory when deploying if these records should survive restarts or redeployments. Set
`DEVICE_INTELLIGENCE_STORAGE_PATH` to choose another server-side file location. Visitors can decline or stop future
collection from the Device Intelligence tab.

## Live Global Network Map

The Global Network Map consumes Check Point ThreatCloud's public server-sent event feed through the app server and
plots provider-reported attacks on the globe. The dashboard also shows Check Point's live daily total and available
country history. Select a country to see its latest reported daily count, malware-type trends, and recent live feed
events involving it. Event details are limited to fields supplied by Check Point; missing location or timestamp fields
are identified as unavailable rather than inferred. The official threat map is at `https://threatmap.checkpoint.com/`.

The Security Alerts tab uses the same live provider feed. Selecting an event retrieves Check Point source/destination
country history and, only when the provider's signature names a CVE, queries the NVD CVE API for reference details.
NVD correlation is informational and does not prove that a particular event exploited that CVE. Check Point's public
feed does not include source IPs, and this app has no firewall/WAF configured; therefore it does not claim or attempt
to block an IP. No sample or simulated alerts are used.

The Security Alerts tab also displays a separate, live server request audit. It records actual HTTP requests handled by
this app (method, path without query string, response status, and time), and applies transparent detections for
requests to commonly probed sensitive paths, unusual HTTP methods, and at least 12 client-error responses from the
same connection source within 60 seconds. These rules are indicators for review, not proof of compromise. Client
addresses, request bodies, and query strings are not retained. The latest 250 entries are held in memory and are
cleared when the server restarts. Global Check Point events are provider-reported activity and are not evidence of
attacks against this app.

The Reports tab exports the currently available request-log records and Check Point events received during the browser
session as PDF, CSV, or JSON. Reports can be filtered to the last hour, last 24 hours, or all available records. The
report labels these data sources separately; provider threat events are global and do not establish that this app was
targeted. Request logs are limited to the latest 250 in-memory entries and may be unavailable after a server restart.
No sample records are added to reports.

The URL Reputation tab checks submitted HTTP/HTTPS URLs with the isMalicious reputation API and live OpenPhish,
URLhaus, and Phishing.Database indicators. Configure the provider key as `ismalicious_api_key` in the server-side
`.env.local` file; the key is never returned to the browser. Restart the server after changing the key. The submitted
URL is sent to isMalicious for lookup, but this app does not open or fetch the submitted website. Feed snapshots are
cached in server memory for up to 15 minutes and compared locally.

A match in a threat feed or an isMalicious malicious report is labeled malicious; provider suspicious reports and
explainable URL signals are labeled suspicious. No threat report is labeled unverified, never guaranteed safe. Scores
are triage indicators: feed matches retain their source-specific scores, provider malicious reports use at least 90
and the provider confidence score, and suspicious signals are capped below 90. These values are not probabilities or
proof of compromise. Results show the isMalicious classification and confidence when the provider responds. Partial
feed/API outages are shown alongside results; the lookup fails only if every source is unavailable. A no-match
result cannot guarantee safety or rule out other threat types.

Password breach checks keep password analysis in the browser and send only the first five characters of the password's
SHA-1 hash to the same-origin `/api/password/breach-check` endpoint, which proxies Have I Been Pwned's k-anonymity
range API. The password and full hash are not sent.
