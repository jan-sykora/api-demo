.PHONY: run-web generate lint

run-web:
	cd web && npm run dev

lint:
	buf lint