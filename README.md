# Hostile Volume

## Overview
Hostile Volume is a browser-based web game deployed as a Progressive Web App (PWA). It utilizes client-side execution for state management and audio rendering, functioning entirely independently of a backend server after the initial load.

## Architecture
* **Core Engine (`index.html`):** Manages the primary game loop, DOM manipulation, and state tracking via Vanilla JavaScript.
* **Progressive Web App (PWA):** Implements a Service Worker (`sw.js`) and application manifest to aggressively cache media assets (e.g., `elevator.mp3`) and scripts, ensuring persistent offline operability.
* **Segmented Environments:** Features distinct directory structures for staging/beta testing (`/beta/`) and authentication rendering (`/login/`).

## Technology Stack
* **Frontend:** HTML5, CSS3, Vanilla JavaScript (ES6+)
* **Architecture:** Progressive Web App (PWA)
* **Media:** HTML5 Audio API

## Threat Model & Security Considerations
This project was structured to demonstrate the inherent vulnerabilities of client-side trust models and the critical importance of server-side access controls.

### 1. Forced Browsing & Broken Access Control
* **Vector:** The web root contains parallel environments, notably the `/beta/` directory. Because there is no authoritative backend enforcing route protection or requiring a valid session token, an unauthenticated attacker could utilize directory enumeration tools (e.g., FFuF, Gobuster) to discover and directly access unstabilized code or unreleased features.
* **Mitigation Strategy:** Security by obscurity is insufficient. Staging environments must be protected by server-side authentication and strict Access Control Lists (ACLs) enforced at the web server or reverse proxy layer.

### 2. Client-Side Authentication Bypass
* **Vector:** The `/login/` directory relies entirely on JavaScript execution within the client's browser to validate entry. An attacker can easily attach a debugger, modify the boolean logic of the authentication function, or bypass the portal entirely by navigating directly to the restricted assets.
* **Mitigation Strategy:** Authentication must be processed server-side. The client environment should only be responsible for credential submission and the handling of secure, HTTP-only session cookies or JWTs.

### 3. State & Execution Manipulation
* **Vector:** All game mechanics, variables, and audio execution triggers are stored in local memory. An attacker can leverage browser developer tools to alter the DOM, redefine JavaScript functions at runtime, or manipulate state variables to force win conditions or disable game constraints.
* **Mitigation Strategy:** If competitive integrity is required (e.g., a global leaderboard), state progression and score validation must be offloaded to an authoritative backend server.
