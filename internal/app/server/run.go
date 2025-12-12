package server

import (
	"context"
	"log"
	"net"
	"net/http"

	"github.com/grpc-ecosystem/grpc-gateway/v2/runtime"
	"google.golang.org/grpc"
	"google.golang.org/grpc/credentials/insecure"
	"google.golang.org/grpc/reflection"

	usagev1 "github.com/jan-sykora/api-demo/gen/go/ai/h2o/usage/v1"
	"github.com/jan-sykora/api-demo/internal/usage"
)

const (
	grpcAddr = ":8081"
	httpAddr = ":8080"
)

// Run starts the gRPC server and gRPC-Gateway HTTP server.
func Run() error {
	svc := usage.NewService()

	// Start gRPC server in a goroutine
	go func() {
		if err := runGRPCServer(svc); err != nil {
			log.Fatalf("gRPC server failed: %v", err)
		}
	}()

	// Start HTTP gateway server (proxies to gRPC server)
	return runHTTPServer()
}

func runGRPCServer(svc *usage.Service) error {
	lis, err := net.Listen("tcp", grpcAddr)
	if err != nil {
		return err
	}

	grpcServer := grpc.NewServer()
	usagev1.RegisterEventServiceServer(grpcServer, svc)

	// Enable reflection for tools like grpcurl
	reflection.Register(grpcServer)

	log.Printf("Starting gRPC server on %s", grpcAddr)
	return grpcServer.Serve(lis)
}

func runHTTPServer() error {
	ctx := context.Background()

	mux := runtime.NewServeMux()
	opts := []grpc.DialOption{grpc.WithTransportCredentials(insecure.NewCredentials())}

	// Register handler that proxies HTTP requests to the gRPC server
	err := usagev1.RegisterEventServiceHandlerFromEndpoint(ctx, mux, "localhost"+grpcAddr, opts)
	if err != nil {
		return err
	}

	// Wrap with CORS handler for browser requests
	handler := corsHandler(mux)

	log.Printf("Starting HTTP server (gRPC-Gateway) on %s", httpAddr)
	return http.ListenAndServe(httpAddr, handler)
}

func corsHandler(h http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Access-Control-Allow-Origin", "*")
		w.Header().Set("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS")
		w.Header().Set("Access-Control-Allow-Headers", "Content-Type, Authorization")

		if r.Method == "OPTIONS" {
			w.WriteHeader(http.StatusNoContent)
			return
		}

		h.ServeHTTP(w, r)
	})
}
