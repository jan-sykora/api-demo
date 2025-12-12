# API Demo Project

A demonstration project for building gRPC APIs with Protocol Buffers following Google AIP guidelines.

## About

This project showcases how to design and implement a **Usage Tracking Service** API.

### Use Case

We're a software company building AI tools. We have an existing web app where users upload images to classify animals using AI. We need to track how much users spend on the classification tool.

## Quick Start

```bash
# Start the gRPC server
make run-server

# Start the web app
make run-web
```

## gRPC API Examples

The gRPC server runs on `localhost:8081`. Use [grpcurl](https://github.com/fullstorydev/grpcurl) to interact with the API.

### List available services

```bash
grpcurl -plaintext localhost:8081 list
```

### Create an event

```bash
grpcurl -plaintext -d '{
  "event": {
    "subject": "users/anonymous",
    "source": "animal-classifier",
    "action": "classify",
    "execution_duration": "1.5s"
  }
}' localhost:8081 ai.h2o.usage.v1.EventService/CreateEvent
```

### List events

```bash
grpcurl -plaintext localhost:8081 ai.h2o.usage.v1.EventService/ListEvents
```

### List events with pagination

```bash
grpcurl -plaintext -d '{
  "page_size": 10
}' localhost:8081 ai.h2o.usage.v1.EventService/ListEvents
```

## Development Commands

```bash
# Generate protobuf code
make generate

# Clean and regenerate
make clean-gen generate

# Lint proto files
make lint

# Run Go server
make run-server

# Run frontend
make run-web
```