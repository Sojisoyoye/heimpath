# Contributing to HeimPath

Thank you for your interest in contributing to HeimPath! This document provides guidelines and instructions for contributing.

## Table of Contents

- [Development Setup](#development-setup)
- [Branch Naming Conventions](#branch-naming-conventions)
- [Commit Message Guidelines](#commit-message-guidelines)
- [Pull Request Process](#pull-request-process)
- [Code Standards](#code-standards)
- [Security Guidelines](#security-guidelines)

## Development Setup

### Prerequisites

- Docker and Docker Compose
- Python 3.10+
- Node.js 18+ (or Bun)
- uv (Python package manager)

### Getting Started

1. **Clone the repository**

   ```bash
   git clone https://github.com/Sojisoyoye/heimpath.git
   cd heimpath
   ```

2. **Set up environment variables**

   ```bash
   cp .env.example .env
   cp frontend/.env.example frontend/.env
   ```

   Edit `.env` with your local configuration. Generate a secure secret key:

   ```bash
   openssl rand -hex 32
   ```

3. **Start the development environment**

   ```bash
   docker compose up -d
   ```

4. **Run backend tests**

   ```bash
   cd backend
   uv run bash scripts/tests-start.sh
   ```

5. **Run frontend development server**

   ```bash
   cd frontend
   bun install
   bun run dev
   ```

## Branch Naming Conventions

Use descriptive branch names with the following prefixes:

| Prefix | Use Case | Example |
|--------|----------|---------|
| `feature/` | New features | `feature/guided-journey-personalization` |
| `bugfix/` | Bug fixes | `bugfix/deepl-rate-limiting` |
| `refactor/` | Code refactoring | `refactor/optimize-database-queries` |
| `docs/` | Documentation | `docs/add-api-documentation` |
| `ci/` | CI/CD changes | `ci/add-security-scanning` |
| `hotfix/` | Urgent production fixes | `hotfix/critical-auth-issue` |

## Commit Message Guidelines

We follow [Conventional Commits](https://www.conventionalcommits.org/) specification:

```
<type>(<scope>): <description>

[optional body]

[optional footer(s)]
```

### Types

- `feat`: A new feature
- `fix`: A bug fix
- `docs`: Documentation changes
- `style`: Code style changes (formatting, missing semicolons, etc.)
- `refactor`: Code refactoring without changing functionality
- `test`: Adding or updating tests
- `chore`: Maintenance tasks, dependency updates
- `ci`: CI/CD configuration changes

### Examples

```
feat(journey): add personalized step recommendations

fix(auth): resolve token refresh race condition

docs(api): update property endpoints documentation

refactor(calculator): extract tax calculation logic
```

### Rules

- Use imperative mood: "Add feature" not "Added feature"
- Keep the subject line under 50 characters
- Capitalize the first letter of the subject
- Do not end the subject line with a period
- Include issue number in footer if applicable: `Fixes #123`

## Pull Request Process

1. **Create a feature branch** from `master`

2. **Make your changes** following the code standards

3. **Write/update tests** for your changes

4. **Run the test suite locally**

   ```bash
   # Backend
   cd backend && uv run bash scripts/tests-start.sh

   # Frontend E2E
   cd frontend && bun run test:e2e
   ```

5. **Push your branch** and create a Pull Request

6. **Fill out the PR template** completely

7. **Request review** from maintainers

8. **Address feedback** and update your PR as needed

### PR Requirements

- All CI checks must pass
- At least one approving review required
- Branch must be up to date with `master`
- No merge conflicts

## Code Standards

### Backend (Python/FastAPI)

- Follow PEP 8 style guidelines
- Use type hints for all function signatures
- Write docstrings for public functions and classes
- Maintain 90%+ test coverage
- Use async/await for all I/O operations
- Run `ruff` and `mypy` before committing

### Frontend (React/TypeScript)

- Use functional components with hooks
- Follow the project structure in `CLAUDE.md`
- Use TypeScript strict mode
- Use Tailwind CSS for styling
- Run `biome` before committing

### General

- Keep functions small and focused (< 50 lines)
- Write self-documenting code with clear names
- Add comments only for "why", not "what"
- Never commit secrets or credentials
- Use environment variables for configuration

## Security Guidelines

### Do

- Use parameterized queries for database operations
- Validate all user input
- Use secure password hashing (bcrypt)
- Keep dependencies updated
- Report security vulnerabilities privately

### Don't

- Commit secrets, API keys, or passwords
- Log sensitive information
- Disable security features for convenience
- Use `eval()` or similar dangerous functions

### Reporting Security Issues

If you discover a security vulnerability, please report it privately by emailing the maintainers. Do not create a public issue.

## Questions?

If you have questions about contributing, feel free to open a discussion or reach out to the maintainers.
