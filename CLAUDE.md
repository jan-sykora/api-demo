# API Demo Project

A demonstration project for presenting how to work with APIs, focusing on Protocol Buffers (protobuf) API design following Google AIP (API Improvement Proposals) guidelines.

## Project Purpose

This project serves as educational material for presentations on:
- Protobuf API design best practices
- Google AIP guidelines implementation
- API versioning and evolution
- Resource-oriented design patterns

## Google AIP Guidelines

This project follows [Google AIP](https://aip.dev/) standards:

### Core Principles
- **Resource-oriented design** (AIP-121): APIs are modeled around resources
- **Standard methods** (AIP-131 to AIP-135): Create, Get, Update, Delete, List
- **Custom methods** (AIP-136): For operations that don't fit standard methods
- **Field behavior** (AIP-203): Use field_behavior annotations (REQUIRED, OUTPUT_ONLY, etc.)

### Naming Conventions
- **Services**: `{Resource}Service` (e.g., `BookService`)
- **Methods**: Standard verbs - `Create{Resource}`, `Get{Resource}`, `List{Resource}s`, `Update{Resource}`, `Delete{Resource}`
- **Fields**: snake_case for all field names
- **Enums**: SCREAMING_SNAKE_CASE with `_UNSPECIFIED` as first value (value 0)

### Resource Names
- Format: `{collection}/{resource_id}` (e.g., `books/123`)
- Parent resources: `{parent}/{collection}/{resource_id}` (e.g., `shelves/456/books/123`)

### Common Patterns
- **Pagination** (AIP-158): Use `page_size` and `page_token`
- **Filtering** (AIP-160): Use `filter` field with CEL-like syntax
- **Ordering** (AIP-132): Use `order_by` field
- **Field masks** (AIP-134): Use `update_mask` for partial updates

## Project Structure

```
api-demo/
├── proto/                 # Protobuf definitions
│   └── api/
│       └── v1/           # API version 1
├── gen/                   # Generated code
├── examples/              # Example implementations
└── docs/                  # Additional documentation
```

## Development Commands

```bash
# Generate protobuf code (once proto files exist)
buf generate

# Lint proto files
buf lint

# Check for breaking changes
buf breaking --against '.git#branch=main'
```

## Key Resources

- [Google AIP](https://aip.dev/) - API Improvement Proposals
- [Buf](https://buf.build/) - Protobuf tooling
- [Protocol Buffers Documentation](https://protobuf.dev/)