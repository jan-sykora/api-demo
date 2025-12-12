package server

import (
	"log"
	"net"

	"google.golang.org/grpc"
	"google.golang.org/grpc/reflection"

	usagev1 "github.com/jan-sykora/api-demo/gen/go/ai/h2o/usage/v1"
	"github.com/jan-sykora/api-demo/internal/usage"
)

const grpcAddr = ":8081"

// Run starts the gRPC server.
func Run() error {
	lis, err := net.Listen("tcp", grpcAddr)
	if err != nil {
		return err
	}

	grpcServer := grpc.NewServer()
	usagev1.RegisterEventServiceServer(grpcServer, usage.NewService())

	// Enable reflection for tools like grpcurl
	reflection.Register(grpcServer)

	log.Printf("Starting gRPC server on %s", grpcAddr)
	return grpcServer.Serve(lis)
}