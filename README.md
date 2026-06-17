# Hostile Volume

## Overview
Live at https://hostilevolume.com Hostile Volume is a browser-based web game deployed as a Progressive Web App (PWA). It utilizes client-side execution for state management and audio rendering, functioning entirely independently of a backend server after the initial load.

## Architecture
* **Core Engine (`assets/app.js`):** Manages the primary game loop, DOM manipulation, and state tracking via Vanilla JavaScript.
* **Modular Level Data:** Stores each level's HTML in `data/levels/*.json` so the root `index.html` stays focused on the app shell.
* **Progressive Web App (PWA):** Implements a Service Worker (`sw.js`) and application manifest to aggressively cache media assets (e.g., `elevator.mp3`), scripts, and level data, ensuring persistent offline operability.
* **Authentication Rendering:** Keeps the client-side authentication demo isolated under `/login/`.

## Technology Stack
* **Frontend:** HTML5, CSS3, Vanilla JavaScript (ES6+)
* **Architecture:** Progressive Web App (PWA)
* **Media:** HTML5 Audio API

## Threat Model & Security Considerations
This project was structured to demonstrate the inherent vulnerabilities of client-side trust models and the critical importance of server-side access controls.

### 1. Forced Browsing & Broken Access Control
* **Vector:** Static routes and client-rendered assets can be discovered directly. Because there is no authoritative backend enforcing route protection or requiring a valid session token, an unauthenticated attacker can inspect client-side files and bypass purely cosmetic navigation barriers.
* **Mitigation Strategy:** Security by obscurity is insufficient. Restricted environments or assets must be protected by server-side authentication and strict Access Control Lists (ACLs) enforced at the web server or reverse proxy layer.

### 2. Client-Side Authentication Bypass
* **Vector:** The `/login/` directory relies entirely on JavaScript execution within the client's browser to validate entry. An attacker can easily attach a debugger, modify the boolean logic of the authentication function, or bypass the portal entirely by navigating directly to the restricted assets.
* **Mitigation Strategy:** Authentication must be processed server-side. The client environment should only be responsible for credential submission and the handling of secure, HTTP-only session cookies or JWTs.

### 3. State & Execution Manipulation
* **Vector:** All game mechanics, variables, and audio execution triggers are stored in local memory. An attacker can leverage browser developer tools to alter the DOM, redefine JavaScript functions at runtime, or manipulate state variables to force win conditions or disable game constraints.
* **Mitigation Strategy:** If competitive integrity is required (e.g., a global leaderboard), state progression and score validation must be offloaded to an authoritative backend server.
