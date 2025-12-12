package usage

import (
	"context"
	"fmt"
	"sort"
	"time"

	"github.com/google/uuid"
	"google.golang.org/grpc/codes"
	"google.golang.org/grpc/status"
	"google.golang.org/protobuf/types/known/timestamppb"

	pb "github.com/jan-sykora/api-demo/gen/go/ai/h2o/usage/v1"
)

const (
	defaultPageSize = 20
	maxPageSize     = 100
)

// storedEvent holds the event data in memory.
type storedEvent struct {
	event      *pb.Event
	createTime time.Time
}

// Service implements the EventService gRPC service.
type Service struct {
	pb.UnimplementedEventServiceServer
	events map[string]*storedEvent // keyed by event ID
}

// NewService creates a new EventService.
func NewService() *Service {
	return &Service{
		events: make(map[string]*storedEvent),
	}
}

// CreateEvent creates a new usage event.
func (s *Service) CreateEvent(ctx context.Context, req *pb.CreateEventRequest) (*pb.CreateEventResponse, error) {
	if req.GetEvent() == nil {
		return nil, status.Error(codes.InvalidArgument, "event is required")
	}
	if req.GetEvent().GetSubject() == "" {
		return nil, status.Error(codes.InvalidArgument, "subject is required")
	}
	if req.GetEvent().GetSource() == "" {
		return nil, status.Error(codes.InvalidArgument, "source is required")
	}
	if req.GetEvent().GetAction() == "" {
		return nil, status.Error(codes.InvalidArgument, "action is required")
	}
	if req.GetEvent().GetExecutionDuration() == nil {
		return nil, status.Error(codes.InvalidArgument, "execution_duration is required")
	}

	id := uuid.New().String()
	name := fmt.Sprintf("events/%s", id)
	now := time.Now()

	event := &pb.Event{
		Name:              name,
		Subject:          req.GetEvent().GetSubject(),
		Source:           req.GetEvent().GetSource(),
		Action:           req.GetEvent().GetAction(),
		ExecutionDuration: req.GetEvent().GetExecutionDuration(),
		CreateTime:       timestamppb.New(now),
	}

	s.events[id] = &storedEvent{
		event:      event,
		createTime: now,
	}

	return &pb.CreateEventResponse{Event: event}, nil
}

// ListEvents lists usage events with pagination.
func (s *Service) ListEvents(ctx context.Context, req *pb.ListEventsRequest) (*pb.ListEventsResponse, error) {
	pageSize := int(req.GetPageSize())
	if pageSize <= 0 {
		pageSize = defaultPageSize
	}
	if pageSize > maxPageSize {
		pageSize = maxPageSize
	}

	// Collect all events
	allEvents := make([]*storedEvent, 0, len(s.events))
	for _, e := range s.events {
		allEvents = append(allEvents, e)
	}

	// Sort by create time descending (newest first)
	sort.Slice(allEvents, func(i, j int) bool {
		return allEvents[i].createTime.After(allEvents[j].createTime)
	})

	// Handle pagination
	startIdx := 0
	if req.GetPageToken() != "" {
		for i, e := range allEvents {
			if e.event.GetName() == req.GetPageToken() {
				startIdx = i + 1
				break
			}
		}
	}

	// Get page of results
	endIdx := startIdx + pageSize
	if endIdx > len(allEvents) {
		endIdx = len(allEvents)
	}

	pageEvents := allEvents[startIdx:endIdx]
	result := make([]*pb.Event, len(pageEvents))
	for i, stored := range pageEvents {
		result[i] = stored.event
	}

	var nextPageToken string
	if endIdx < len(allEvents) {
		nextPageToken = allEvents[endIdx-1].event.GetName()
	}

	return &pb.ListEventsResponse{
		Events:        result,
		NextPageToken: nextPageToken,
	}, nil
}