'use client'

import React, { useState, useRef, useEffect } from 'react';
import { ZoomIn, ZoomOut, RotateCw, Maximize2, Check, X } from 'lucide-react';

interface ImageCropperProps {
  imageSrc: string;
  onCrop: (croppedImage: string) => void;
  onCancel: () => void;
  aspectRatio?: number; // 1 for square, undefined for free
}

export const ImageCropper: React.FC<ImageCropperProps> = ({
  imageSrc,
  onCrop,
  onCancel,
  aspectRatio = 1, // Default to square
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const imageRef = useRef<HTMLImageElement | null>(null);
  
  const [scale, setScale] = useState(1);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [cropArea, setCropArea] = useState({ x: 0, y: 0, width: 0, height: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [imageLoaded, setImageLoaded] = useState(false);
  const [rotation, setRotation] = useState(0);

  const CONTAINER_SIZE = 400;
  const CROP_SIZE = 200; // Size of the crop area

  useEffect(() => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      imageRef.current = img;
      
      // Calculate initial scale to fit image in crop area
      const scaleX = CROP_SIZE / img.width;
      const scaleY = CROP_SIZE / img.height;
      const initialScale = Math.max(scaleX, scaleY) * 1.2; // 1.2x to allow some zoom out
      
      setScale(initialScale);
      setPosition({ x: CONTAINER_SIZE / 2, y: CONTAINER_SIZE / 2 });
      setCropArea({
        x: (CONTAINER_SIZE - CROP_SIZE) / 2,
        y: (CONTAINER_SIZE - CROP_SIZE) / 2,
        width: CROP_SIZE,
        height: CROP_SIZE,
      });
      setImageLoaded(true);
      draw();
    };
    img.src = imageSrc;
  }, [imageSrc]);

  useEffect(() => {
    if (imageLoaded) {
      draw();
    }
  }, [scale, position, imageLoaded, rotation]);

  const draw = () => {
    const canvas = canvasRef.current;
    if (!canvas || !imageRef.current) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Draw overlay (darken everything)
    ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Draw image
    const img = imageRef.current;
    const scaledWidth = img.width * scale;
    const scaledHeight = img.height * scale;

    ctx.save();
    ctx.translate(position.x, position.y);
    ctx.rotate((rotation * Math.PI) / 180);
    ctx.drawImage(
      img,
      -scaledWidth / 2,
      -scaledHeight / 2,
      scaledWidth,
      scaledHeight
    );
    ctx.restore();

    // Clear circular crop area (make it transparent)
    ctx.save();
    ctx.globalCompositeOperation = 'destination-out';
    const centerX = cropArea.x + cropArea.width / 2;
    const centerY = cropArea.y + cropArea.height / 2;
    const radius = cropArea.width / 2;
    ctx.beginPath();
    ctx.arc(centerX, centerY, radius, 0, 2 * Math.PI);
    ctx.fill();
    ctx.restore();

    // Draw circular crop area border
    ctx.strokeStyle = '#fff';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(centerX, centerY, radius, 0, 2 * Math.PI);
    ctx.stroke();

    // Draw guide lines for better alignment
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    // Horizontal line
    ctx.moveTo(centerX - radius, centerY);
    ctx.lineTo(centerX + radius, centerY);
    // Vertical line
    ctx.moveTo(centerX, centerY - radius);
    ctx.lineTo(centerX, centerY + radius);
    ctx.stroke();
  };

  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;

    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    // Check if clicking inside circular crop area
    const centerX = cropArea.x + cropArea.width / 2;
    const centerY = cropArea.y + cropArea.height / 2;
    const radius = cropArea.width / 2;
    const distance = Math.sqrt(Math.pow(x - centerX, 2) + Math.pow(y - centerY, 2));
    
    if (distance <= radius) {
      setIsDragging(true);
      setDragStart({ x: x - position.x, y: y - position.y });
    }
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDragging) return;

    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;

    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    setPosition({
      x: x - dragStart.x,
      y: y - dragStart.y,
    });
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const handleZoom = (delta: number) => {
    setScale(prev => Math.max(0.3, Math.min(5, prev + delta)));
  };

  const handleWheel = (e: React.WheelEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    const delta = -e.deltaY * 0.001; // Convert wheel delta to zoom delta
    setScale(prev => Math.max(0.3, Math.min(5, prev + delta)));
  };

  const handleRotate = () => {
    setRotation(prev => (prev + 90) % 360);
  };

  const handleCrop = () => {
    if (!imageRef.current) return;

    // Create a new canvas for the cropped image
    const croppedCanvas = document.createElement('canvas');
    croppedCanvas.width = CROP_SIZE;
    croppedCanvas.height = CROP_SIZE;
    const ctx = croppedCanvas.getContext('2d');
    if (!ctx) return;

    const img = imageRef.current;
    
    // Calculate the visible area of the image in the crop box
    const cropCenterX = cropArea.x + cropArea.width / 2;
    const cropCenterY = cropArea.y + cropArea.height / 2;
    
    // Calculate the offset from image center (position) to crop center
    const offsetX = cropCenterX - position.x;
    const offsetY = cropCenterY - position.y;
    
    // Convert to image coordinates (divide by scale)
    const imageOffsetX = offsetX / scale;
    const imageOffsetY = offsetY / scale;
    
    // Calculate source rectangle in original image
    // Image is centered at position, so we need to find what part of the image
    // is visible in the crop area
    const sourceX = (img.width / 2) - (CROP_SIZE / scale / 2) + imageOffsetX;
    const sourceY = (img.height / 2) - (CROP_SIZE / scale / 2) + imageOffsetY;
    const sourceWidth = CROP_SIZE / scale;
    const sourceHeight = CROP_SIZE / scale;

    // Create a temporary canvas for the square crop first
    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = CROP_SIZE;
    tempCanvas.height = CROP_SIZE;
    const tempCtx = tempCanvas.getContext('2d');
    if (!tempCtx) return;

    // Handle rotation
    if (rotation !== 0) {
      tempCtx.save();
      tempCtx.translate(CROP_SIZE / 2, CROP_SIZE / 2);
      tempCtx.rotate((rotation * Math.PI) / 180);
      
      // For rotated images, we need to adjust the source coordinates
      const rotatedImg = document.createElement('canvas');
      rotatedImg.width = img.width;
      rotatedImg.height = img.height;
      const rotatedCtx = rotatedImg.getContext('2d');
      if (rotatedCtx) {
        rotatedCtx.translate(img.width / 2, img.height / 2);
        rotatedCtx.rotate((rotation * Math.PI) / 180);
        rotatedCtx.drawImage(img, -img.width / 2, -img.height / 2);
        
        // Now draw from rotated image
        tempCtx.drawImage(
          rotatedImg,
          sourceX,
          sourceY,
          sourceWidth,
          sourceHeight,
          -CROP_SIZE / 2,
          -CROP_SIZE / 2,
          CROP_SIZE,
          CROP_SIZE
        );
      }
      tempCtx.restore();
    } else {
      // Draw cropped image without rotation
      tempCtx.drawImage(
        img,
        Math.max(0, sourceX),
        Math.max(0, sourceY),
        Math.min(sourceWidth, img.width - Math.max(0, sourceX)),
        Math.min(sourceHeight, img.height - Math.max(0, sourceY)),
        0,
        0,
        CROP_SIZE,
        CROP_SIZE
      );
    }

    // Create circular mask for final output
    ctx.save();
    ctx.beginPath();
    ctx.arc(CROP_SIZE / 2, CROP_SIZE / 2, CROP_SIZE / 2, 0, 2 * Math.PI);
    ctx.clip();
    
    // Draw the square cropped image
    ctx.drawImage(tempCanvas, 0, 0);
    ctx.restore();

    // Convert to base64
    const croppedImage = croppedCanvas.toDataURL('image/png', 0.95);
    onCrop(croppedImage);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-black text-slate-900">Chỉnh sửa ảnh</h4>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => handleZoom(-0.1)}
            className="p-2 hover:bg-slate-100 rounded-xl transition-colors text-slate-600"
            title="Thu nhỏ"
          >
            <ZoomOut size={18} />
          </button>
          <button
            type="button"
            onClick={() => handleZoom(0.1)}
            className="p-2 hover:bg-slate-100 rounded-xl transition-colors text-slate-600"
            title="Phóng to"
          >
            <ZoomIn size={18} />
          </button>
          <button
            type="button"
            onClick={handleRotate}
            className="p-2 hover:bg-slate-100 rounded-xl transition-colors text-slate-600"
            title="Xoay"
          >
            <RotateCw size={18} />
          </button>
        </div>
      </div>

      <div className="relative bg-slate-100 rounded-2xl overflow-hidden" ref={containerRef}>
        <canvas
          ref={canvasRef}
          width={CONTAINER_SIZE}
          height={CONTAINER_SIZE}
          className="w-full h-auto cursor-move"
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
          onWheel={handleWheel}
        />
      </div>

      <div className="flex items-center gap-2 text-xs text-slate-500">
        <Maximize2 size={14} />
        <span>Kéo để di chuyển ảnh, lăn chuột để zoom, sử dụng nút để xoay</span>
      </div>

      <div className="flex gap-3">
        <button
          type="button"
          onClick={onCancel}
          className="flex-1 px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-bold transition-colors"
        >
          <X size={18} className="inline mr-2" />
          Hủy
        </button>
        <button
          type="button"
          onClick={handleCrop}
          className="flex-1 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold transition-colors"
        >
          <Check size={18} className="inline mr-2" />
          Áp dụng
        </button>
      </div>
    </div>
  );
};
