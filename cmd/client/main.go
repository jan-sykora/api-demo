package main

import (
	"context"
	"log"
	"time"

	"google.golang.org/grpc"
	"google.golang.org/grpc/credentials/insecure"
	"google.golang.org/protobuf/types/known/durationpb"

	usagev1 "github.com/jan-sykora/api-demo/gen/go/ai/h2o/usage/v1"
)

func main() {
	conn, err := grpc.NewClient("localhost:8081", grpc.WithTransportCredentials(insecure.NewCredentials()))
	if err != nil {
		log.Fatalf("Failed to connect: %v", err)
	}
	defer conn.Close()

	client := usagev1.NewEventServiceClient(conn)
	ctx := context.Background()

	// Create an event
	createResp, err := client.CreateEvent(ctx, &usagev1.CreateEventRequest{
		Event: &usagev1.Event{
			Subject:           "users/anonymous",
			Source:            "animal-classifier",
			Action:            "classify",
			ExecutionDuration: durationpb.New(1500 * time.Millisecond),
		},
	})
	if err != nil {
		log.Fatalf("Failed to create event: %v", err)
	}
	log.Printf("Created event: %s", createResp.Event.Name)

	// List events
	listResp, err := client.ListEvents(ctx, &usagev1.ListEventsRequest{
		PageSize: 10,
	})
	if err != nil {
		log.Fatalf("Failed to list events: %v", err)
	}
	log.Printf("Found %d events:", len(listResp.Events))
	for _, event := range listResp.Events {
		log.Printf("  - %s: %s/%s (took %v)", event.Name, event.Source, event.Action, event.ExecutionDuration.AsDuration())
	}
}
