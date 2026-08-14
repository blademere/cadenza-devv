
```
express-app
├─ .agents
│  └─ skills
│     └─ express-backend
│        └─ SKILL.md
├─ .devcontainer
│  ├─ .env
│  ├─ devcontainer-lock.json
│  ├─ devcontainer.json
│  ├─ docker-compose.yml
│  └─ Dockerfile
├─ .dockerignore
├─ .env
├─ .opencode
│  ├─ agents
│  │  └─ Express-agent.agent.md
│  ├─ opencode.jsonc
│  ├─ package-lock.json
│  └─ package.json
├─ docs
│  ├─ auth.yaml
│  ├─ openapi.yaml
│  └─ users.yaml
├─ package-lock.json
├─ package.json
├─ prisma
│  ├─ migrations
│  │  ├─ 20260811053929_init
│  │  │  └─ migration.sql
│  │  └─ migration_lock.toml
│  └─ schema.prisma
├─ project-structure.txt
├─ scripts
├─ src
│  ├─ app.js
│  ├─ common
│  │  ├─ constants
│  │  ├─ errors
│  │  │  └─ appError.js
│  │  ├─ helpers
│  │  ├─ middleware
│  │  │  ├─ asyncHandler.js
│  │  │  ├─ authenticate.js
│  │  │  ├─ authorize.js
│  │  │  ├─ errorHandler.js
│  │  │  ├─ index.js
│  │  │  ├─ notFound.js
│  │  │  ├─ rateLimiter.js
│  │  │  └─ validate.js
│  │  ├─ responses
│  │  │  └─ apiResponse.js
│  │  ├─ types
│  │  ├─ utils
│  │  └─ validators
│  ├─ config
│  │  ├─ env.js
│  │  ├─ index.js
│  │  ├─ logger.js
│  │  └─ swagger.js
│  ├─ features
│  │  ├─ applications
│  │  ├─ auth
│  │  │  ├─ auth.constants.js
│  │  │  ├─ auth.controller.js
│  │  │  ├─ auth.repository.js
│  │  │  ├─ auth.routes.js
│  │  │  ├─ auth.service.js
│  │  │  ├─ auth.tokens.js
│  │  │  └─ auth.validation.js
│  │  └─ users
│  │     ├─ user.controller.js
│  │     ├─ user.mapper.js
│  │     ├─ user.repository.js
│  │     ├─ user.routes.js
│  │     ├─ user.service.js
│  │     └─ user.validation.js
│  ├─ infrastructure
│  │  ├─ cache
│  │  │  └─ redis.js
│  │  ├─ database
│  │  │  ├─ prisma.js
│  │  │  └─ transactions.js
│  │  ├─ email
│  │  │  ├─ nodemailer.js
│  │  │  ├─ resend.js
│  │  │  └─ templates
│  │  ├─ monitoring
│  │  │  ├─ metrics.js
│  │  │  ├─ prometheus.js
│  │  │  └─ sentry.js
│  │  ├─ oauth
│  │  │  ├─ github.js
│  │  │  └─ google.js
│  │  ├─ queue
│  │  │  ├─ bullmq.js
│  │  │  ├─ queues.js
│  │  │  └─ workers
│  │  └─ storage
│  │     ├─ cloudinary.js
│  │     └─ s3.js
│  ├─ routes
│  │  └─ index.js
│  └─ server.js
└─ tests
   ├─ helpers
   ├─ integration
   └─ unit

```
```
workspace
├─ .agents
│  └─ skills
│     └─ express-backend
│        └─ SKILL.md
├─ .devcontainer
│  ├─ Dockerfile
│  ├─ devcontainer-lock.json
│  ├─ devcontainer.json
│  └─ docker-compose.yml
├─ .dockerignore
├─ .openclaude
│  └─ settings.local.json
├─ .openclaude.json
├─ .opencode
│  ├─ agents
│  │  └─ Express-agent.agent.md
│  ├─ opencode.jsonc
│  ├─ package-lock.json
│  └─ package.json
├─ README.md
├─ docs
│  ├─ auth.yaml
│  ├─ openapi.yaml
│  └─ users.yaml
├─ package-lock.json
├─ package.json
├─ prisma
│  ├─ migrations
│  │  ├─ 20260811053929_init
│  │  │  └─ migration.sql
│  │  └─ migration_lock.toml
│  └─ schema.prisma
├─ project-structure.txt
├─ scripts
├─ src
│  ├─ app.js
│  ├─ common
│  │  ├─ constants
│  │  ├─ errors
│  │  │  └─ appError.js
│  │  ├─ helpers
│  │  ├─ middleware
│  │  │  ├─ asyncHandler.js
│  │  │  ├─ authenticate.js
│  │  │  ├─ authorize.js
│  │  │  ├─ errorHandler.js
│  │  │  ├─ index.js
│  │  │  ├─ notFound.js
│  │  │  ├─ rateLimiter.js
│  │  │  └─ validate.js
│  │  ├─ responses
│  │  │  └─ apiResponse.js
│  │  ├─ types
│  │  ├─ utils
│  │  └─ validators
│  ├─ config
│  │  ├─ env.js
│  │  ├─ index.js
│  │  ├─ logger.js
│  │  └─ swagger.js
│  ├─ features
│  │  ├─ applications
│  │  ├─ auth
│  │  │  ├─ auth.constants.js
│  │  │  ├─ auth.controller.js
│  │  │  ├─ auth.repository.js
│  │  │  ├─ auth.service.js
│  │  │  ├─ auth.tokens.js
│  │  │  └─ auth.validation.js
│  │  └─ users
│  │     ├─ user.controller.js
│  │     ├─ user.mapper.js
│  │     ├─ user.repository.js
│  │     ├─ user.service.js
│  │     └─ user.validation.js
│  ├─ infrastructure
│  │  ├─ cache
│  │  │  └─ redis.js
│  │  ├─ database
│  │  │  ├─ prisma.js
│  │  │  └─ transactions.js
│  │  ├─ email
│  │  │  ├─ nodemailer.js
│  │  │  ├─ resend.js
│  │  │  └─ templates
│  │  ├─ monitoring
│  │  │  ├─ metrics.js
│  │  │  ├─ prometheus.js
│  │  │  └─ sentry.js
│  │  ├─ oauth
│  │  │  ├─ github.js
│  │  │  └─ google.js
│  │  ├─ queue
│  │  │  ├─ bullmq.js
│  │  │  ├─ queues.js
│  │  │  └─ workers
│  │  └─ storage
│  │     ├─ cloudinary.js
│  │     └─ s3.js
│  └─ server.js
└─ tests
   ├─ helpers
   ├─ integration
   └─ unit

```
```
workspace
├─ .devcontainer
│  ├─ Dockerfile
│  ├─ devcontainer-lock.json
│  ├─ devcontainer.json
│  └─ docker-compose.yml
├─ .dockerignore
├─ README.md
├─ docs
│  └─ openapi.yaml
├─ package-lock.json
├─ package.json
├─ prisma
│  ├─ migrations
│  │  ├─ 20260813082522_init
│  │  │  └─ migration.sql
│  │  └─ migration_lock.toml
│  └─ schema.prisma
├─ scripts
├─ src
│  ├─ app.js
│  ├─ common
│  │  ├─ constants
│  │  ├─ errors
│  │  │  └─ appError.js
│  │  ├─ helpers
│  │  ├─ middleware
│  │  │  ├─ asyncHandler.js
│  │  │  ├─ authenticate.js
│  │  │  ├─ authorize.js
│  │  │  ├─ csrf.js
│  │  │  ├─ errorHandler.js
│  │  │  ├─ index.js
│  │  │  ├─ notFound.js
│  │  │  ├─ rateLimiter.js
│  │  │  └─ validate.js
│  │  ├─ responses
│  │  │  └─ apiResponse.js
│  │  ├─ types
│  │  ├─ utils
│  │  └─ validators
│  ├─ config
│  │  ├─ env.js
│  │  ├─ index.js
│  │  ├─ logger.js
│  │  └─ swagger.js
│  ├─ features
│  │  ├─ auth
│  │  │  ├─ auth.controller.js
│  │  │  ├─ auth.repository.js
│  │  │  ├─ auth.service.js
│  │  │  ├─ auth.tokens.js
│  │  │  └─ auth.validation.js
│  │  ├─ rbac
│  │  │  ├─ rbac.constants.js
│  │  │  ├─ rbac.repository.js
│  │  │  └─ rbac.service.js
│  │  └─ users
│  │     ├─ user.controller.js
│  │     ├─ user.mapper.js
│  │     ├─ user.repository.js
│  │     ├─ user.service.js
│  │     └─ user.validation.js
│  ├─ infrastructure
│  │  ├─ cache
│  │  │  └─ redis.js
│  │  ├─ database
│  │  │  ├─ prisma.js
│  │  │  └─ transactions.js
│  │  ├─ email
│  │  │  ├─ nodemailer.js
│  │  │  ├─ resend.js
│  │  │  └─ templates
│  │  ├─ monitoring
│  │  │  ├─ metrics.js
│  │  │  ├─ prometheus.js
│  │  │  └─ sentry.js
│  │  ├─ oauth
│  │  │  ├─ github.js
│  │  │  └─ google.js
│  │  ├─ queue
│  │  │  ├─ bullmq.js
│  │  │  ├─ queues.js
│  │  │  └─ workers
│  │  └─ storage
│  │     ├─ cloudinary.js
│  │     └─ s3.js
│  └─ server.js
└─ tests
   ├─ helpers
   ├─ integration
   └─ unit

```
```
workspace
├─ .devcontainer
│  ├─ Dockerfile
│  ├─ devcontainer-lock.json
│  ├─ devcontainer.json
│  └─ docker-compose.yml
├─ .dockerignore
├─ README.md
├─ docs
│  └─ openapi.yaml
├─ eslint.config.mjs
├─ package-lock.json
├─ package.json
├─ prisma
│  ├─ migrations
│  │  ├─ 20260813082522_init
│  │  │  └─ migration.sql
│  │  └─ migration_lock.toml
│  └─ schema.prisma
├─ scripts
├─ src
│  ├─ app.js
│  ├─ common
│  │  ├─ constants
│  │  ├─ errors
│  │  │  └─ appError.js
│  │  ├─ helpers
│  │  ├─ middleware
│  │  │  ├─ asyncHandler.js
│  │  │  ├─ authenticate.js
│  │  │  ├─ authorize.js
│  │  │  ├─ csrf.js
│  │  │  ├─ errorHandler.js
│  │  │  ├─ index.js
│  │  │  ├─ notFound.js
│  │  │  ├─ rateLimiter.js
│  │  │  └─ validate.js
│  │  ├─ responses
│  │  │  └─ apiResponse.js
│  │  ├─ types
│  │  ├─ utils
│  │  └─ validators
│  ├─ config
│  │  ├─ env.js
│  │  ├─ index.js
│  │  ├─ logger.js
│  │  └─ swagger.js
│  ├─ features
│  │  ├─ auth
│  │  │  ├─ auth.controller.js
│  │  │  ├─ auth.repository.js
│  │  │  ├─ auth.service.js
│  │  │  ├─ auth.tokens.js
│  │  │  └─ auth.validation.js
│  │  ├─ rbac
│  │  │  ├─ rbac.constants.js
│  │  │  ├─ rbac.repository.js
│  │  │  └─ rbac.service.js
│  │  └─ users
│  │     ├─ user.controller.js
│  │     ├─ user.mapper.js
│  │     ├─ user.repository.js
│  │     ├─ user.service.js
│  │     └─ user.validation.js
│  ├─ infrastructure
│  │  ├─ cache
│  │  │  └─ redis.js
│  │  ├─ database
│  │  │  ├─ prisma.js
│  │  │  └─ transactions.js
│  │  ├─ email
│  │  │  ├─ nodemailer.js
│  │  │  ├─ resend.js
│  │  │  └─ templates
│  │  ├─ monitoring
│  │  │  ├─ metrics.js
│  │  │  ├─ prometheus.js
│  │  │  └─ sentry.js
│  │  ├─ oauth
│  │  │  ├─ github.js
│  │  │  └─ google.js
│  │  ├─ queue
│  │  │  ├─ bullmq.js
│  │  │  ├─ queues.js
│  │  │  └─ workers
│  │  └─ storage
│  │     ├─ cloudinary.js
│  │     └─ s3.js
│  └─ server.js
└─ tests
   ├─ helpers
   ├─ integration
   └─ unit

```