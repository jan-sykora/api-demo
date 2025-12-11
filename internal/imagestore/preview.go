					package imagestore

import (
	"bytes"
	"fmt"
	"image"
	_ "image/gif"
	_ "image/jpeg"
	"image/png"
	_ "image/png"

	"golang.org/x/image/draw"

	pb "github.com/jan-sykora/api-demo/gen/go/ai/h2o/imagestore/v1"
)

const (
	previewMaxWidth  = 200
	previewMaxHeight = 200
)

// generatePreview creates a thumbnail preview of the image.
func generatePreview(data []byte) (*pb.ImagePreview, error) {
	src, _, err := image.Decode(bytes.NewReader(data))
	if err != nil {
		return nil, fmt.Errorf("failed to decode image: %w", err)
	}

	// Calculate new dimensions maintaining aspect ratio
	bounds := src.Bounds()
	width := bounds.Dx()
	height := bounds.Dy()

	newWidth := previewMaxWidth
	newHeight := previewMaxHeight

	if width > height {
		newHeight = height * previewMaxWidth / width
	} else {
		newWidth = width * previewMaxHeight / height
	}

	// Create thumbnail
	dst := image.NewRGBA(image.Rect(0, 0, newWidth, newHeight))
	draw.CatmullRom.Scale(dst, dst.Bounds(), src, bounds, draw.Over, nil)

	// Encode as PNG
	var buf bytes.Buffer
	if err := png.Encode(&buf, dst); err != nil {
		return nil, fmt.Errorf("failed to encode preview: %w", err)
	}

	return &pb.ImagePreview{
		Data:     buf.Bytes(),
		MimeType: "image/png",
	}, nil
}