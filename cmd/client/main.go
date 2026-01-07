package main

import (
	"context"
	"fmt"
	"log"
	"time"

	"google.golang.org/grpc"
	"google.golang.org/grpc/credentials/insecure"
	"google.golang.org/protobuf/types/known/durationpb"

	auditv1 "github.com/jan-sykora/api-demo/gen/go/ai/h2o/audit/v1"
)

func main() {
	conn, err := grpc.NewClient("127.0.0.1:8081", grpc.WithTransportCredentials(insecure.NewCredentials()))
	if err != nil {
		log.Fatalf("Failed to connect: %v", err)
	}
	defer conn.Close()

	client := auditv1.NewEventServiceClient(conn)
	ctx := context.Background()

	// Create an event
	createResp, err := client.CreateEvent(ctx, &auditv1.CreateEventRequest{
		Event: &auditv1.Event{
			User:              "users/tomas-pastorek",
			Source:            "authorization-service",
			Action:            "create-role",
			ExecutionDuration: durationpb.New(1500 * time.Millisecond),
		},
	})
	if err != nil {
		log.Fatalf("Failed to create event: %v", err)
	}
	fmt.Printf("Created event: %s\n", createResp.Event.Name)

	// List events
	listResp, err := client.ListEvents(ctx, &auditv1.ListEventsRequest{
		PageSize: 10,
	})
	if err != nil {
		log.Fatalf("Failed to list events: %v", err)
	}
	fmt.Printf("Found %d events:\n", len(listResp.Events))
	for _, event := range listResp.Events {
		fmt.Printf("  - %s: %s/%s, %s (took %v)\n", event.Name, event.Source, event.Action, event.User, event.ExecutionDuration.AsDuration())
	}
}
