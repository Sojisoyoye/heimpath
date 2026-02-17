# HeimPath Backend

The HeimPath backend is a FastAPI application providing APIs for the German Real Estate Navigator platform.

## Architecture

### Project Structure

```
backend/
├── app/
│   ├── api/                    # API routes
│   │   ├── routes/
│   │   │   ├── auth.py         # Authentication endpoints
│   │   │   ├── users.py        # User management
│   │   │   ├── journeys.py     # Property journey endpoints
│   │   │   ├── laws.py         # Legal knowledge base
│   │   │   ├── subscriptions.py # Stripe subscriptions
│   │   │   └── ...
│   │   ├── deps.py             # Dependencies (auth, db)
│   │   └── main.py             # Router aggregation
│   ├── models/                 # Database models (SQLModel)
│   │   ├── user.py             # User model
│   │   ├── journey.py          # Journey, Step, Task models
│   │   ├── legal.py            # Law, CourtRuling, Bookmark models
│   │   └── ...
│   ├── schemas/                # Pydantic request/response schemas
│   │   ├── user.py
│   │   ├── journey.py
│   │   ├── legal.py
│   │   └── ...
│   ├── services/               # Business logic layer
│   │   ├── journey_service.py  # Journey generation and management
│   │   ├── legal_service.py    # Legal knowledge base operations
│   │   ├── payment_service.py  # Stripe integration
│   │   └── ...
│   ├── repository/             # Data access layer
│   ├── core/                   # Configuration and security
│   │   ├── config.py           # Settings management
│   │   ├── security.py         # Password hashing, JWT
│   │   └── db.py               # Database connection
│   ├── alembic/                # Database migrations
│   └── main.py                 # FastAPI application entry
├── tests/                      # Test suite (271+ tests)
│   ├── api/routes/             # API endpoint tests
│   ├── services/               # Service layer tests
│   └── ...
└── pyproject.toml              # Python dependencies
```

### Key Components

- **Journey System**: Personalized property buying journeys with 15+ steps across 4 phases
- **Legal Knowledge Base**: 50+ German real estate laws with full-text search
- **Payment Integration**: Stripe subscription management
- **Authentication**: JWT-based with email verification and password recovery

## Requirements

* [Docker](https://www.docker.com/)
* [uv](https://docs.astral.sh/uv/) for Python package and environment management

## Docker Compose

Start the local development environment with Docker Compose following the guide in [../development.md](../development.md).

## General Workflow

By default, the dependencies are managed with [uv](https://docs.astral.sh/uv/), go there and install it.

From `./backend/` you can install all the dependencies with:

```console
$ uv sync
```

Then you can activate the virtual environment with:

```console
$ source .venv/bin/activate
```

Make sure your editor is using the correct Python virtual environment, with the interpreter at `backend/.venv/bin/python`.

### Adding New Features

1. **Models**: Add SQLModel models in `./backend/app/models/`
2. **Schemas**: Add Pydantic schemas in `./backend/app/schemas/`
3. **Services**: Add business logic in `./backend/app/services/`
4. **Routes**: Add API endpoints in `./backend/app/api/routes/`
5. **Tests**: Add tests in `./backend/tests/`

## VS Code

There are already configurations in place to run the backend through the VS Code debugger, so that you can use breakpoints, pause and explore variables, etc.

The setup is also already configured so you can run the tests through the VS Code Python tests tab.

## Docker Compose Override

During development, you can change Docker Compose settings that will only affect the local development environment in the file `compose.override.yml`.

The changes to that file only affect the local development environment, not the production environment. So, you can add "temporary" changes that help the development workflow.

For example, the directory with the backend code is synchronized in the Docker container, copying the code you change live to the directory inside the container. That allows you to test your changes right away, without having to build the Docker image again. It should only be done during development, for production, you should build the Docker image with a recent version of the backend code. But during development, it allows you to iterate very fast.

There is also a command override that runs `fastapi run --reload` instead of the default `fastapi run`. It starts a single server process (instead of multiple, as would be for production) and reloads the process whenever the code changes. Have in mind that if you have a syntax error and save the Python file, it will break and exit, and the container will stop. After that, you can restart the container by fixing the error and running again:

```console
$ docker compose watch
```

There is also a commented out `command` override, you can uncomment it and comment the default one. It makes the backend container run a process that does "nothing", but keeps the container alive. That allows you to get inside your running container and execute commands inside, for example a Python interpreter to test installed dependencies, or start the development server that reloads when it detects changes.

To get inside the container with a `bash` session you can start the stack with:

```console
$ docker compose watch
```

and then in another terminal, `exec` inside the running container:

```console
$ docker compose exec backend bash
```

You should see an output like:

```console
root@7f2607af31c3:/app#
```

that means that you are in a `bash` session inside your container, as a `root` user, under the `/app` directory, this directory has another directory called "app" inside, that's where your code lives inside the container: `/app/app`.

There you can use the `fastapi run --reload` command to run the debug live reloading server.

```console
$ fastapi run --reload app/main.py
```

...it will look like:

```console
root@7f2607af31c3:/app# fastapi run --reload app/main.py
```

and then hit enter. That runs the live reloading server that auto reloads when it detects code changes.

Nevertheless, if it doesn't detect a change but a syntax error, it will just stop with an error. But as the container is still alive and you are in a Bash session, you can quickly restart it after fixing the error, running the same command ("up arrow" and "Enter").

...this previous detail is what makes it useful to have the container alive doing nothing and then, in a Bash session, make it run the live reload server.

## Backend Tests

To test the backend run:

```console
$ bash ./scripts/test.sh
```

The tests run with Pytest, modify and add tests to `./backend/tests/`.

If you use GitHub Actions the tests will run automatically.

### Test Running Stack

If your stack is already up and you just want to run the tests, you can use:

```bash
docker compose exec backend pytest -v
```

Or using the test script:

```bash
docker compose exec backend bash scripts/tests-start.sh
```

That `/app/scripts/tests-start.sh` script just calls `pytest` after making sure that the rest of the stack is running. If you need to pass extra arguments to `pytest`, you can pass them to that command and they will be forwarded.

For example, to stop on first error:

```bash
docker compose exec backend bash scripts/tests-start.sh -x
```

### Test Coverage

When the tests are run, a file `htmlcov/index.html` is generated, you can open it in your browser to see the coverage of the tests.

### Current Test Status

- **271+ tests passing**
- API route tests for all endpoints
- Service layer unit tests
- Integration tests with database

## Migrations

As during local development your app directory is mounted as a volume inside the container, you can also run the migrations with `alembic` commands inside the container and the migration code will be in your app directory (instead of being only inside the container). So you can add it to your git repository.

Make sure you create a "revision" of your models and that you "upgrade" your database with that revision every time you change them. As this is what will update the tables in your database. Otherwise, your application will have errors.

* Start an interactive session in the backend container:

```console
$ docker compose exec backend bash
```

* Alembic is already configured to import your SQLModel models from `./backend/app/models/`.

* After changing a model (for example, adding a column), inside the container, create a revision, e.g.:

```console
$ alembic revision --autogenerate -m "Add column last_name to User model"
```

* Commit to the git repository the files generated in the alembic directory.

* After creating the revision, run the migration in the database (this is what will actually change the database):

```console
$ alembic upgrade head
```

### Current Migrations

The following migrations have been applied:

1. Initial user and item tables
2. `a1b2c3d4e5f6` - Add citizenship, email_verified, updated_at to User
3. `b2c3d4e5f6a7` - Add subscription_tier to User
4. `c3d4e5f6a7b8` - Add journey tables (Journey, JourneyStep, JourneyTask)
5. `d4e5f6a7b8c9` - Add legal knowledge base tables (Law, CourtRuling, StateVariation, etc.)

If you don't want to use migrations at all, uncomment the lines in the file at `./backend/app/core/db.py` that end in:

```python
SQLModel.metadata.create_all(engine)
```

and comment the line in the file `scripts/prestart.sh` that contains:

```console
$ alembic upgrade head
```

If you don't want to start with the default models and want to remove them / modify them, from the beginning, without having any previous revision, you can remove the revision files (`.py` Python files) under `./backend/app/alembic/versions/`. And then create a first migration as described above.

## API Documentation

Once the backend is running, you can access:

- **Swagger UI**: http://localhost:8000/docs
- **ReDoc**: http://localhost:8000/redoc

### Main API Endpoints

| Endpoint | Description |
|----------|-------------|
| `POST /api/v1/login/access-token` | User login |
| `POST /api/v1/auth/register` | User registration |
| `GET /api/v1/users/me` | Get current user |
| `GET /api/v1/users/me/export` | Export user data (GDPR) |
| `POST /api/v1/journeys/` | Create property journey |
| `GET /api/v1/journeys/{id}/progress` | Get journey progress |
| `GET /api/v1/laws/` | List laws |
| `GET /api/v1/laws/search` | Search laws |
| `POST /api/v1/laws/{id}/bookmark` | Bookmark a law |
| `GET /api/v1/subscriptions/current` | Get subscription status |

## Email Templates

The email templates are in `./backend/app/email-templates/`. Here, there are two directories: `build` and `src`. The `src` directory contains the source files that are used to build the final email templates. The `build` directory contains the final email templates that are used by the application.

Before continuing, ensure you have the [MJML extension](https://github.com/mjmlio/vscode-mjml) installed in your VS Code.

Once you have the MJML extension installed, you can create a new email template in the `src` directory. After creating the new email template and with the `.mjml` file open in your editor, open the command palette with `Ctrl+Shift+P` and search for `MJML: Export to HTML`. This will convert the `.mjml` file to a `.html` file and now you can save it in the build directory.

## Environment Variables

Key backend environment variables:

| Variable | Description |
|----------|-------------|
| `SECRET_KEY` | JWT signing key |
| `POSTGRES_SERVER` | Database host |
| `POSTGRES_USER` | Database user |
| `POSTGRES_PASSWORD` | Database password |
| `POSTGRES_DB` | Database name |
| `STRIPE_SECRET_KEY` | Stripe API key |
| `STRIPE_WEBHOOK_SECRET` | Stripe webhook verification |
| `SMTP_HOST` | Email server host |
| `SMTP_USER` | Email server user |
| `SMTP_PASSWORD` | Email server password |
