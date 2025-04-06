# NestJS Queue System

A robust queue management system built with NestJS, featuring API documentation with Swagger, database integration with Prisma, and comprehensive logging with Pino.

## Features

- RESTful API endpoints for queue management
- Swagger API documentation
- Database integration with Prisma ORM
- Structured logging with Pino
- Environment-based configuration
- CORS support
- Request payload size management

## Prerequisites

- Node.js (v18 or higher)
- pnpm
- PostgreSQL database

## Installation

```bash
# Install dependencies
pnpm install
```

## Database Setup

```bash
# Generate Prisma client
pnpm db:generate

# Apply migrations (development)
pnpm db:migrate:dev

# Apply migrations (production)
pnpm db:migrate

# Push schema changes directly (if needed)
pnpm db:push
```

## Running the Application

```bash
# Development mode
pnpm start:dev

# Debug mode
pnpm start:debug

# Production mode
pnpm build
pnpm start:prod
```

## API Documentation

When running in non-production environments, Swagger UI is available at:

```
http://localhost:3000/queue/api
```

## Environment Variables

Create a `.env` file in the root directory with the following variables:

```env
# Server
PORT=3000
NODE_ENV=development

# Database
DATABASE_URL=postgresql://username:password@localhost:5432/queue_system
```

## Project Structure

```
nest-queue-system/
├── src/
│   ├── app/
│   │   ├── queue/                  # Queue module files
│   │   │   └── queue.repository.ts # Queue repository
│   │   └── ...                     # Other app modules
│   ├── database/
│   │   └── services/
│   │       └── prisma.service.ts   # Prisma service for DB connections
│   ├── app.module.ts               # Main application module
│   └── main.ts                     # Application entry point
├── prisma/
│   └── schema.prisma               # Database schema
├── test/                           # Test files
├── .env                            # Environment variables
├── nest-cli.json                   # NestJS CLI configuration
└── package.json                    # Project dependencies and scripts
```
