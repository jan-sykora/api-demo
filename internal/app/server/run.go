package server

import (
	"log"
	"net/http"

	"golang.org/x/net/http2"
	"golang.org/x/net/http2/h2c"

	"github.com/jan-sykora/api-demo/gen/go/ai/h2o/usage/v1/usagev1connect"
	"github.com/jan-sykora/api-demo/internal/usage"
)

const addr = ":50051"

// Run starts the Connect server.
func Run() error {
	mux := http.NewServeMux()

	path, handler := usagev1connect.NewEventServiceHandler(usage.NewService())
	mux.Handle(path, handler)

	log.Printf("Starting Connect server on %s", addr)
	return http.ListenAndServe(addr, h2c.NewHandler(mux, &http2.Server{}))
}