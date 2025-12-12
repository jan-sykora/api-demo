.PHONY: run-web run-server build-server generate lint clean-gen

run-web:
	cd web && npm run dev

run-server:
	go run ./cmd/server

build-server:
	go build -o bin/server ./cmd/server

clean-gen:
	rm -rf gen web/src/gen

generate:
	buf generate

lint:
	buf lint api/proto