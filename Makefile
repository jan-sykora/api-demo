.PHONY: run-web generate lint

run-web:
	cd web && npm run dev

generate:
	buf generate

lint:
	buf lint