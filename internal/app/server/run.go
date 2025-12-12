package server

import (
	"log"
	"net/http"
	"strings"

	"connectrpc.com/cors"
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
	return http.ListenAndServe(addr, withCORS(h2c.NewHandler(mux, &http2.Server{})))
}

func withCORS(h http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Access-Control-Allow-Origin", "*")
		w.Header().Set("Access-Control-Allow-Methods", strings.Join(cors.AllowedMethods(), ", "))
		w.Header().Set("Access-Control-Allow-Headers", strings.Join(cors.AllowedHeaders(), ", "))
		w.Header().Set("Access-Control-Expose-Headers", strings.Join(cors.ExposedHeaders(), ", "))
		if r.Method == http.MethodOptions {
			w.WriteHeader(http.StatusNoContent)
			return
		}
		h.ServeHTTP(w, r)
	})
}