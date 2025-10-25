import requests
import json
from pathlib import Path

# API endpoint
API_URL = "http://localhost:8000"

def test_health():
    """Test if the API is running"""
    try:
        response = requests.get(f"{API_URL}/health")
        print("Health Check:", response.json())
        return response.status_code == 200
    except requests.exceptions.ConnectionError:
        print("❌ API is not running. Please start the server first.")
        return False

def test_detection(image_path: str):
    """Test object detection with an image"""
    if not Path(image_path).exists():
        print(f"❌ Image not found: {image_path}")
        return
    
    with open(image_path, 'rb') as f:
        files = {'file': f}
        data = {
            'confidence_threshold': 0.5,
            'return_image': True
        }
        
        try:
            response = requests.post(f"{API_URL}/api/detect", files=files, data=data)
            
            if response.status_code == 200:
                result = response.json()
                print("\n✅ Detection Results:")
                print(f"Total objects found: {result['total_objects']}")
                
                for i, detection in enumerate(result['detections'], 1):
                    print(f"{i}. {detection['class_name']} - Confidence: {detection['confidence']:.2f}")
                    bbox = detection['bbox']
                    print(f"   Box: ({bbox['x1']:.0f}, {bbox['y1']:.0f}) to ({bbox['x2']:.0f}, {bbox['y2']:.0f})")
                
                if 'annotated_image' in result:
                    print("📷 Annotated image data included in response")
            else:
                print(f"❌ Detection failed: {response.status_code}")
                print(response.text)
                
        except Exception as e:
            print(f"❌ Error: {e}")

def get_available_classes():
    """Get list of classes the model can detect"""
    try:
        response = requests.get(f"{API_URL}/api/classes")
        if response.status_code == 200:
            classes = response.json()
            print(f"\n📋 Available classes ({classes['total_classes']}):")
            for class_id, class_name in classes['classes'].items():
                print(f"  {class_id}: {class_name}")
        else:
            print(f"❌ Failed to get classes: {response.status_code}")
    except Exception as e:
        print(f"❌ Error: {e}")

if __name__ == "__main__":
    print("🔍 YOLOv11 Object Detection API Test")
    print("="*40)
    
    # Test if API is running
    if not test_health():
        exit(1)
    
    # Get available classes
    get_available_classes()
    
    # Test detection with sample image
    # You can replace this with your own image path
    sample_image = "test_image.jpg"
    
    print(f"\n🖼️  Testing detection with image: {sample_image}")
    if Path(sample_image).exists():
        test_detection(sample_image)
    else:
        print(f"ℹ️  To test detection, place an image named '{sample_image}' in this directory")
        print("   Or modify the 'sample_image' variable in this script")