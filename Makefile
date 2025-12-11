.PHONY: run-web run-server generate lint

run-web:
	cd web && npm run dev

run-server:
	go run ./cmd/server

generate:
	buf generate

lint:
	buf lint