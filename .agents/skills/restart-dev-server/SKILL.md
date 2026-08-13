---
name: restart-dev-server
description: Restart PortareFolium's local Next.js development server. Use when the user asks to stop, restart, refresh, or relaunch the development server; free port 3000; or verify a fresh local server after a build or runtime failure.
---

# Restart Development Server

Restart one clean PortareFolium `next dev` instance on port 3000 and verify the requested local route.

## Workflow

1. Inspect running `node` processes and identify only PortareFolium `next dev` process trees. Never terminate unrelated Node processes.
2. Stop every identified development-server parent and child process. Confirm that no PortareFolium `next dev` process remains and port 3000 has no listening socket.
3. Start one background server from the repository root:

   ```powershell
   pnpm generate:migrations && pnpm exec next dev --port 3000
   ```

   Redirect stdout and stderr to a temporary log directory so startup failures remain inspectable.

4. Wait for the server to report readiness and confirm port 3000 listens. Do not claim success from the launcher process alone.
5. Request the target route, defaulting to `/` only when no affected route is known. Confirm an HTTP 200 response.
6. For frontend changes, open the target route in the available browser, confirm the intended UI marker, and check browser console errors and page errors.

## Recovery

- If the port remains occupied, inspect the exact listener and its process tree before termination.
- If startup fails, read the captured stderr and stdout, report the exact failure, and leave port 3000 free unless the user asks for another attempt.
- If a production build removed `.next/dev` artifacts, a clean `next dev` restart regenerates them. Do not alter `next-env.d.ts` merely to compensate.

## Completion Evidence

Report the new listener process ID, HTTP status for the verified route, and browser-error result. Keep the new server running unless the user requests termination.
