package main

import (
	"log"

	"github.com/jan-sykora/api-demo/internal/app/server"
)

func main() {
	if err := server.Run(); err != nil {
		log.Fatalf("Server failed: %v", err)
	}
}
