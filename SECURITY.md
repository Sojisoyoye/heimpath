# Security Policy

HeimPath handles sensitive user data — property finances, personal documents, and payment information. Security is taken seriously.

## Supported Versions

Only the latest production release is actively supported with security fixes.

## Reporting a Vulnerability

**Please do not report security vulnerabilities through public GitHub issues.**

If you believe you have found a security vulnerability, report it by emailing:

**security@heimpath.com**

Include as much detail as possible:

- A description of the vulnerability and its potential impact
- Step-by-step instructions to reproduce it
- Any relevant code, screenshots, or logs

We will acknowledge receipt within 48 hours and aim to provide a fix or mitigation within 14 days for critical issues.

## Disclosure Policy

Please give us a reasonable amount of time to address the issue before any public disclosure. We will credit reporters in the fix commit unless you prefer to remain anonymous.

## Scope

The following are in scope:

- `heimpath.com` and `staging.heimpath.com`
- The HeimPath API (`/api/v1/`)
- Authentication and session management
- User data access controls

The following are out of scope:

- Vulnerabilities in third-party dependencies (report those upstream)
- Social engineering attacks
- Physical security
