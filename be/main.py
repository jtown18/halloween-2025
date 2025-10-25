from fastapi import FastAPI, File, UploadFile, HTTPException, Form
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
import cv2
import numpy as np
from ultralytics import YOLO
import io
from PIL import Image
import base64
from typing import List, Dict, Any
import logging

# Set up logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI(title="YOLOv11 Object Detection API", version="1.0.0")

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Configure this properly in production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Load YOLOv11 model
try:
    model = YOLO('yolo11x.pt')  # Using nano version for faster inference
    logger.info("YOLOv11 model loaded successfully")
except Exception as e:
    logger.error(f"Error loading YOLOv11 model: {e}")
    model = None

@app.get("/")
async def root():
    return {"message": "YOLOv11 Object Detection API", "status": "running"}

@app.get("/health")
async def health_check():
    return {
        "status": "healthy",
        "model_loaded": model is not None,
        "model_info": {
            "version": "YOLOv11n",
            "classes": len(model.names) if model else 0
        }
    }

def process_image(image_data: bytes) -> np.ndarray:
    """Convert uploaded image to numpy array for processing"""
    try:
        # Convert bytes to PIL Image
        image = Image.open(io.BytesIO(image_data))
        
        # Convert to RGB if necessary
        if image.mode != 'RGB':
            image = image.convert('RGB')
        
        # Convert to numpy array
        image_array = np.array(image)
        
        return image_array
    except Exception as e:
        logger.error(f"Error processing image: {e}")
        raise HTTPException(status_code=400, detail="Invalid image format")

def format_detections(results) -> List[Dict[str, Any]]:
    """Format YOLO results into JSON response - simple detection data only"""
    detections = []
    
    if not results or len(results) == 0:
        return detections
    
    result = results[0]  # Get first result
    
    if result.boxes is not None:
        confidences = result.boxes.conf.cpu().numpy()  # Get confidences
        class_ids = result.boxes.cls.cpu().numpy()  # Get class IDs
        
        for i in range(len(confidences)):
            confidence = float(confidences[i])
            class_id = int(class_ids[i])
            class_name = model.names[class_id]
            
            detection = {
                "class": class_name,
                "confidence": confidence
            }
            detections.append(detection)
    
    return detections

# Removed draw_detections and image_to_base64 functions since we only return simple detection data

@app.post("/api/detect")
async def detect_objects(
    file: UploadFile = File(...),
    confidence_threshold: float = Form(0.5),
    target_class: str = Form(None)
):
    """
    Detect objects in uploaded image using YOLOv11
    
    Args:
        file: Image file (jpg, png, etc.)
        confidence_threshold: Minimum confidence for detections (default: 0.5)
        return_image: Whether to return annotated image (default: True)
        target_class: Specific class to filter for (optional)
    
    Returns:
        JSON response with detections and optionally annotated image
    """
    if model is None:
        raise HTTPException(status_code=500, detail="YOLOv11 model not loaded")
    
    if not file.content_type.startswith('image/'):
        raise HTTPException(status_code=400, detail="File must be an image")
    
    try:
        # Read image data
        image_data = await file.read()
        image = process_image(image_data)
        
        # Run inference
        logger.info(f"Running inference on image: {file.filename}")
        results = model(image, conf=confidence_threshold)
        
        # Format detections
        all_detections = format_detections(results)
        
               # Filter detections if target_class is specified
        if target_class:
            # Add debugging to see what classes are detected
            logger.info(f"🔍 All detected classes: {[d['class'] for d in all_detections]}")
            
            # Normalize target class for comparison (lowercase, handle spaces/underscores)
            target_normalized = target_class.lower().replace(" ", "_").replace("-", "_")
            # logger.info(f"🎯 Looking for normalized target: '{target_normalized}'")
            
            filtered_detections = []
            for detection in all_detections:
                detected_class = detection["class"].lower().replace(" ", "_").replace("-", "_")
                # logger.info(f"🔍 Comparing '{detected_class}' with '{target_normalized}'")
                
                # Check for exact match or partial match
                if (detected_class == target_normalized or 
                    target_normalized in detected_class or 
                    detected_class in target_normalized):
                    logger.info(f"✅ Match found: {detection['class']}")
                    filtered_detections.append(detection)
            
            detections = filtered_detections
            # logger.info(f"🎯 Filtered for '{target_class}': {len(detections)} matches found")
        else:
            detections = all_detections
        
        response_data = {
            "success": True,
            "detections": detections,
            "total_objects": len(detections),
            "confidence_threshold": confidence_threshold,
            "target_class": target_class,
            "filtered": target_class is not None
        }

        # logger.info(f"📤 Sending response: {response_data}")
        # logger.info(f"Detection complete: {len(detections)} objects found")
        return JSONResponse(content=response_data)
        
    except Exception as e:
        logger.error(f"Error during detection: {e}")
        raise HTTPException(status_code=500, detail=f"Detection failed: {str(e)}")

@app.get("/api/classes")
async def get_classes():
    """Get list of classes that the model can detect"""
    if model is None:
        raise HTTPException(status_code=500, detail="Model not loaded")
    
    return {
        "classes": model.names,
        "total_classes": len(model.names)
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)