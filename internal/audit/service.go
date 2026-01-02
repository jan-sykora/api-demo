package audit

import (
	"context"
	"fmt"
	"sort"
	"sync"
	"time"

	"github.com/google/uuid"
	"google.golang.org/grpc/codes"
	"google.golang.org/grpc/status"
	"google.golang.org/protobuf/types/known/timestamppb"

	auditv1 "github.com/jan-sykora/api-demo/gen/go/ai/h2o/audit/v1"
)

const (
	defaultPageSize = 20
	maxPageSize     = 100
)

// storedEvent holds the event data in memory.
type storedEvent struct {
	event      *auditv1.Event
	createTime time.Time
}

// EventService implements the EventService gRPC handler.
type EventService struct {
	auditv1.UnimplementedEventServiceServer
	mu     sync.RWMutex
	events map[string]*storedEvent // keyed by event ID
}

// NewEventService creates a new EventService.
func NewEventService() *EventService {
	return &EventService{
		events: make(map[string]*storedEvent),
	}
}

// CreateEvent creates a new event.
func (s *EventService) CreateEvent(ctx context.Context, req *auditv1.CreateEventRequest) (*auditv1.CreateEventResponse, error) {
	if req.GetEvent() == nil {
		return nil, status.Error(codes.InvalidArgument, "event is required")
	}
	if req.GetEvent().GetUser() == "" {
		return nil, status.Error(codes.InvalidArgument, "user is required")
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

	event := &auditv1.Event{
		Name:              name,
		User:              req.GetEvent().GetUser(),
		Source:            req.GetEvent().GetSource(),
		Action:            req.GetEvent().GetAction(),
		ExecutionDuration: req.GetEvent().GetExecutionDuration(),
		CreateTime:        timestamppb.New(now),
	}

	s.mu.Lock()
	s.events[id] = &storedEvent{
		event:      event,
		createTime: now,
	}
	s.mu.Unlock()

	return &auditv1.CreateEventResponse{Event: event}, nil
}

// ListEvents lists events with pagination.
func (s *EventService) ListEvents(ctx context.Context, req *auditv1.ListEventsRequest) (*auditv1.ListEventsResponse, error) {
	pageSize := int(req.GetPageSize())
	if pageSize <= 0 {
		pageSize = defaultPageSize
	}
	if pageSize > maxPageSize {
		pageSize = maxPageSize
	}

	s.mu.RLock()
	defer s.mu.RUnlock()

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
	result := make([]*auditv1.Event, len(pageEvents))
	for i, stored := range pageEvents {
		result[i] = stored.event
	}

	var nextPageToken string
	if endIdx < len(allEvents) {
		nextPageToken = allEvents[endIdx-1].event.GetName()
	}

	return &auditv1.ListEventsResponse{
		Events:        result,
		NextPageToken: nextPageToken,
	}, nil
}