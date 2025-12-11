package server

import (
	"log"
	"net"

	"google.golang.org/grpc"
	"google.golang.org/grpc/reflection"

	pb "github.com/jan-sykora/api-demo/gen/go/ai/h2o/imagestore/v1"
	"github.com/jan-sykora/api-demo/internal/imagestore"
)

const addr = ":50051"

// Run starts the gRPC server.
func Run() error {
	lis, err := net.Listen("tcp", addr)
	if err != nil {
		return err
	}

	grpcServer := grpc.NewServer()
	pb.RegisterImageServiceServer(grpcServer, imagestore.NewService())
	reflection.Register(grpcServer)

	log.Printf("Starting gRPC server on %s", addr)
	return grpcServer.Serve(lis)
}