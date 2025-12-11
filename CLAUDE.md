# API Demo Project

A demonstration project for presenting how to work with APIs, focusing on Protocol Buffers (protobuf) API design following Google AIP (API Improvement Proposals) guidelines.

## Use Case: Image Storage Service

### Background
We're a software company building AI tools. We have an existing web app where users manually upload images to classify animals using AI.

### New Requirement
Instead of manual uploads, we want to decouple image ingestion from classification:
- One system/user uploads images to a shared storage service
- Another system/user can browse and pick images from that storage
- The AI classification service consumes images from this storage

### Our Task
Design and implement an **Image Storage Service** API following Google AIP guidelines.

## Demo Flow

1. **Define the use case** - Image storage service requirements
2. **Design the API** - Step-by-step protobuf API design following AIP
3. **Generate stubs** - Use buf to generate Go server and TypeScript client code
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
├── proto/                 # Protobuf definitions
│   └── imagestore/
│       └── v1/
│           └── image.proto
├── gen/                   # Generated code
│   ├── go/               # Go server stubs
│   └── ts/               # TypeScript client stubs
├── server/               # Go backend implementation
├── web/                  # TypeScript frontend
└── buf.yaml              # Buf configuration
```

## Google AIP Guidelines

This project follows [Google AIP](https://aip.dev/) standards:

### Core Principles
- **Resource-oriented design** (AIP-121): APIs are modeled around resources
- **Standard methods** (AIP-131 to AIP-135): Create, Get, Update, Delete, List
- **Custom methods** (AIP-136): For operations that don't fit standard methods
- **Field behavior** (AIP-203): Use field_behavior annotations (REQUIRED, OUTPUT_ONLY, etc.)

### Naming Conventions
- **Services**: `{Resource}Service` (e.g., `ImageService`)
- **Methods**: Standard verbs - `Create{Resource}`, `Get{Resource}`, `List{Resource}s`, `Update{Resource}`, `Delete{Resource}`
- **Fields**: snake_case for all field names
- **Enums**: SCREAMING_SNAKE_CASE with `_UNSPECIFIED` as first value (value 0)

### Resource Names
- Format: `{collection}/{resource_id}` (e.g., `images/123`)

### Common Patterns
- **Pagination** (AIP-158): Use `page_size` and `page_token`
- **Filtering** (AIP-160): Use `filter` field with CEL-like syntax
- **Field masks** (AIP-134): Use `update_mask` for partial updates

## Development Commands

```bash
# Generate protobuf code
buf generate

# Lint proto files
buf lint

# Check for breaking changes
buf breaking --against '.git#branch=main'

# Run Go server
go run ./server

# Run frontend (once set up)
cd web && npm run dev
```

## Key Resources

- [Google AIP](https://aip.dev/) - API Improvement Proposals
- [Buf](https://buf.build/) - Protobuf tooling
- [Protocol Buffers Documentation](https://protobuf.dev/)