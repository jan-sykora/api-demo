package imagestore

import (
	"context"
	"fmt"
	"net/http"
	"sort"
	"time"

	"github.com/google/uuid"
	"google.golang.org/grpc/codes"
	"google.golang.org/grpc/status"
	"google.golang.org/protobuf/types/known/timestamppb"

	pb "github.com/jan-sykora/api-demo/gen/go/ai/h2o/imagestore/v1"
)

const (
	defaultPageSize = 20
	maxPageSize     = 100
)

// storedImage holds the image data and metadata in memory.
type storedImage struct {
	image      *pb.Image
	data       []byte
	createTime time.Time
}

// Service implements the ImageService gRPC service.
type Service struct {
	pb.UnimplementedImageServiceServer
	images map[string]*storedImage // keyed by image ID
}

// NewService creates a new ImageService.
func NewService() *Service {
	return &Service{
		images: make(map[string]*storedImage),
	}
}

// CreateImage creates a new image in the storage.
func (s *Service) CreateImage(ctx context.Context, req *pb.CreateImageRequest) (*pb.CreateImageResponse, error) {
	if req.GetImage() == nil {
		return nil, status.Error(codes.InvalidArgument, "image is required")
	}
	if req.GetImage().GetFilename() == "" {
		return nil, status.Error(codes.InvalidArgument, "filename is required")
	}
	if len(req.GetImage().GetData()) == 0 {
		return nil, status.Error(codes.InvalidArgument, "data is required")
	}

	data := req.GetImage().GetData()

	// Detect MIME type
	mimeType := http.DetectContentType(data)
	if mimeType != "image/jpeg" && mimeType != "image/png" && mimeType != "image/gif" {
		return nil, status.Errorf(codes.InvalidArgument, "unsupported image type: %s", mimeType)
	}

	// Generate preview
	preview, err := generatePreview(data)
	if err != nil {
		return nil, status.Errorf(codes.Internal, "failed to generate preview: %v", err)
	}

	// Generate unique ID
	id := uuid.New().String()
	name := fmt.Sprintf("images/%s", id)
	now := time.Now()

	img := &pb.Image{
		Name:       name,
		Filename:   req.GetImage().GetFilename(),
		MimeType:   mimeType,
		SizeBytes:  int64(len(data)),
		CreateTime: timestamppb.New(now),
		Preview:    preview,
	}

	s.images[id] = &storedImage{
		image:      img,
		data:       data,
		createTime: now,
	}

	return &pb.CreateImageResponse{Image: img}, nil
}

// GetImage retrieves an image by name.
func (s *Service) GetImage(ctx context.Context, req *pb.GetImageRequest) (*pb.GetImageResponse, error) {
	if req.GetName() == "" {
		return nil, status.Error(codes.InvalidArgument, "name is required")
	}

	id, err := parseImageName(req.GetName())
	if err != nil {
		return nil, status.Error(codes.InvalidArgument, err.Error())
	}

	stored, ok := s.images[id]
	if !ok {
		return nil, status.Error(codes.NotFound, "image not found")
	}

	return &pb.GetImageResponse{Image: stored.image}, nil
}

// ListImages lists images with pagination.
func (s *Service) ListImages(ctx context.Context, req *pb.ListImagesRequest) (*pb.ListImagesResponse, error) {
	pageSize := int(req.GetPageSize())
	if pageSize <= 0 {
		pageSize = defaultPageSize
	}
	if pageSize > maxPageSize {
		pageSize = maxPageSize
	}

	// Collect all images
	allImages := make([]*storedImage, 0, len(s.images))
	for _, img := range s.images {
		allImages = append(allImages, img)
	}

	// Sort by create time descending (newest first)
	sort.Slice(allImages, func(i, j int) bool {
		return allImages[i].createTime.After(allImages[j].createTime)
	})

	// Handle pagination
	startIdx := 0
	if req.GetPageToken() != "" {
		for i, img := range allImages {
			if img.image.GetName() == req.GetPageToken() {
				startIdx = i + 1
				break
			}
		}
	}

	// Get page of results
	endIdx := startIdx + pageSize
	if endIdx > len(allImages) {
		endIdx = len(allImages)
	}

	pageImages := allImages[startIdx:endIdx]
	result := make([]*pb.Image, len(pageImages))
	for i, stored := range pageImages {
		result[i] = stored.image
	}

	var nextPageToken string
	if endIdx < len(allImages) {
		nextPageToken = allImages[endIdx-1].image.GetName()
	}

	return &pb.ListImagesResponse{
		Images:        result,
		NextPageToken: nextPageToken,
	}, nil
}

// DeleteImage deletes an image.
func (s *Service) DeleteImage(ctx context.Context, req *pb.DeleteImageRequest) (*pb.DeleteImageResponse, error) {
	if req.GetName() == "" {
		return nil, status.Error(codes.InvalidArgument, "name is required")
	}

	id, err := parseImageName(req.GetName())
	if err != nil {
		return nil, status.Error(codes.InvalidArgument, err.Error())
	}

	if _, ok := s.images[id]; !ok {
		return nil, status.Error(codes.NotFound, "image not found")
	}

	delete(s.images, id)
	return &pb.DeleteImageResponse{}, nil
}

// DownloadImage downloads the full image data.
func (s *Service) DownloadImage(ctx context.Context, req *pb.DownloadImageRequest) (*pb.DownloadImageResponse, error) {
	if req.GetName() == "" {
		return nil, status.Error(codes.InvalidArgument, "name is required")
	}

	id, err := parseImageName(req.GetName())
	if err != nil {
		return nil, status.Error(codes.InvalidArgument, err.Error())
	}

	stored, ok := s.images[id]
	if !ok {
		return nil, status.Error(codes.NotFound, "image not found")
	}

	return &pb.DownloadImageResponse{
		Data:     stored.data,
		MimeType: stored.image.GetMimeType(),
	}, nil
}

// parseImageName extracts the image ID from a resource name like "images/{id}".
func parseImageName(name string) (string, error) {
	var id string
	if _, err := fmt.Sscanf(name, "images/%s", &id); err != nil {
		return "", fmt.Errorf("invalid image name format: %s", name)
	}
	return id, nil
}