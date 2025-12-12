# API Demo Project

A demonstration project for presenting how to work with APIs, focusing on Protocol Buffers (protobuf) API design following Google AIP (API Improvement Proposals) guidelines.

## Use Case: Usage Tracking Service

### Background
We're a software company building AI tools. We have an existing web app where users upload images to classify animals using AI.

### New Requirement
We need to track how much users spend on the classification tool - specifically how long each classification takes.

### Our Task
Design and implement a **Usage Tracking Service** API following Google AIP guidelines.

## Demo Flow

1. **Define the use case** - Usage tracking requirements
2. **Design the API** - Step-by-step protobuf API design following AIP
3. **Generate stubs** - Use buf to generate Go server code
4. **Implement backend** - Go gRPC server with in-memory storage
5. **Build frontend** - Simple TypeScript web app to demonstrate the API

## Tech Stack

- **API Definition**: Protocol Buffers (proto3)
- **Backend**: Go (gRPC server)
- **Frontend**: TypeScript (simple web app)
- **Tooling**: Buf for proto management and code generation
- **Storage**: In-memory (for demo simplicity)

## Project Structure

```
api-demo/
├── api/proto/             # Protobuf definitions
│   └── ai/h2o/usage/v1/
│       ├── event.proto
│       └── event_service.proto
├── gen/go/                # Generated Go code
├── internal/              # Go implementation
│   ├── app/server/
│   └── usage/
├── cmd/server/            # Server entry point
├── web/                   # TypeScript frontend
└── buf.yaml               # Buf configuration
```

## Google AIP Guidelines

This project follows [Google AIP](https://aip.dev/) standards:

### Core Principles
- **Resource-oriented design** (AIP-121): APIs are modeled around resources
- **Standard methods** (AIP-131 to AIP-135): Create, Get, Update, Delete, List
- **Custom methods** (AIP-136): For operations that don't fit standard methods
- **Field behavior** (AIP-203): Use field_behavior annotations (REQUIRED, OUTPUT_ONLY, etc.)

### Naming Conventions
- **Services**: `{Resource}Service` (e.g., `EventService`)
- **Methods**: Standard verbs - `Create{Resource}`, `Get{Resource}`, `List{Resource}s`, `Update{Resource}`, `Delete{Resource}`
- **Fields**: snake_case for all field names
- **Enums**: SCREAMING_SNAKE_CASE with `_UNSPECIFIED` as first value (value 0)

### Resource Names
- Format: `{collection}/{resource_id}` (e.g., `events/123`)

### Common Patterns
- **Pagination** (AIP-158): Use `page_size` and `page_token`
- **Filtering** (AIP-160): Use `filter` field with CEL-like syntax
- **Field masks** (AIP-134): Use `update_mask` for partial updates
- **Duration fields** (AIP-142): Use `google.protobuf.Duration` with `_duration` suffix

## Development Commands

```bash
# Generate protobuf code
make generate

# Lint proto files
make lint

# Run Go server
make run-server

# Run frontend
make run-web
```

## Key Resources

- [Google AIP](https://aip.dev/) - API Improvement Proposals
- [Buf](https://buf.build/) - Protobuf tooling
- [Protocol Buffers Documentation](https://protobuf.dev/)