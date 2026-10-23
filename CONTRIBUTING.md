# Contribution Guide

## Code style

Pre-commit hooks are used to ensure a specific code style and to check for linting errors.
Please use the hooks, or otherwise run the formatter and linter before submitting your changes.
These are checked in CI, so patches that do not apply these will need to be modified before they are merged.

You can run these manually via `npm run fmt` and `npm run lint`. They use [oxfmt and oxlint](https://oxc.rs/) respectively.

## Commit Messages

Please follow the [conventional commits](https://www.conventionalcommits.org/) standard.

## Dependencies

Try to limit the amount of `dependencies` used at runtime. `devDependencies` may be more lenient.
Always consider built-in Node or Javascript standard library features rather than reaching for a dependency.
Additionally, consider using dependencies already included in the project rather than introducing new ones.
It is also safe to explicitly include a dependency into `package.json` that already exists within `package-lock.json`.

## Tests

Tests are implemented using Vitest, with federation tests running in Docker via [Test Containers](https://testcontainers.com/).

When running federation/s2s tests, you'll need to build the docker image beforehand.
By default, the tests target the `shoot:test` Docker tag, so build the image like so:

```sh
docker build -t shoot:test .
```

Then you may run the tests via

```sh
npm run test
```

Even when not testing federation, Docker is still used to spawn a Postgres container as global setup.

Please try to write tests for all new code introduced to the project.
While we're not necessarily aiming for 100% code coverage, it does increase the confidence of new features.

## OpenAPI and JSON Schema generation

Shoot makes use of an OpenAPI document to document the client to server API and to enable client code generation.
If you make changes to API routes, please generate a new OpenAPI document via

```sh
npm run openapi
```

A JSON Schema is also generated from the Zod [ConfigSchema](https://github.com/MaddyUnderStars/shoot/blob/main/src/util/ConfigSchema.ts).
If you make changes to this schema, please generate a new JSON Schema document via

```sh
npm run config
```

## OAuth Frontend

Shoot does server-side rendering of OAuth pages. The templates for these are under [/assets/views](https://github.com/MaddyUnderStars/shoot/tree/main/assets/views).
Currently [Tailwind](https://tailwindcss.com/) is used for CSS generation in these files.
You can run the Tailwind compiler via

```sh
npm run tailwind
```

## LLM Policy

LLMs are forbidden from contributing to this project. Do not use LLMs during any part of the contribution process.
Your contribution will be rejected without further discussion.

Additionally, try to limit the amount of LLM code introduced via dependencies.
Occasionally a vital dependency will unfortunately introduce LLM code.
Rather than searching for potentially unproven alternatives, please try reviewing the LLM code of the dependency.
