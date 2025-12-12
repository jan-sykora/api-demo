.PHONY: run-web run-server build-server generate lint

run-web:
	cd web && npm run dev

run-server:
	go run ./cmd/server

build-server:
	go build -o bin/server ./cmd/server

generate:
	buf generate

lint:
	buf lint