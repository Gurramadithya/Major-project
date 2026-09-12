from __future__ import annotations

import base64
import io
import time
from pathlib import Path
from typing import Optional, Tuple

import cv2
import numpy as np
import torch
import torch.nn as nn
import torch.nn.functional as F
from PIL import Image
from torchvision import transforms

from .model import get_model


def validate_lung_xray_image(image_bytes: bytes) -> bool:
    """Accept genuine chest radiographs while rejecting obvious non-chest images and noise."""
    try:
        image = Image.open(io.BytesIO(image_bytes)).convert("RGB")
        rgb = np.asarray(image)
        if rgb.size == 0 or rgb.ndim != 3 or rgb.shape[2] != 3:
            return False

        h, w, _ = rgb.shape
        # More permissive resolution check
        if min(h, w) < 100 or max(h, w) > 5000:
            return False
        # More permissive aspect ratio
        if not 0.3 <= (h / w) <= 4.0:
            return False

        gray = cv2.cvtColor(rgb, cv2.COLOR_RGB2GRAY)
        if gray.size == 0 or np.std(gray) < 3:
            return False

        mean_intensity = float(np.mean(gray))
        if mean_intensity < 5 or mean_intensity > 255:
            return False

        # More permissive contrast check
        contrast = float(np.percentile(gray, 95) - np.percentile(gray, 5))
        if contrast < 8:
            return False

        # More permissive saturation check
        saturation = cv2.cvtColor(rgb, cv2.COLOR_RGB2HSV)[:, :, 1]
        if float(np.percentile(saturation, 90)) > 50:
            return False

        # More permissive edge density check
        blur = cv2.GaussianBlur(gray, (5, 5), 0)
        edges = cv2.Canny(blur, 50, 150)
        edge_density = float(np.mean(edges > 0))
        if edge_density > 0.25:
            return False
        if edge_density < 0.0001 and contrast < 15:
            return False

        return True
    except Exception:
        return False


class ChestXRayInference:
    """Inference class for Chest X-ray classification."""
    
    def __init__(self, model_path: str, device: str = "cpu") -> None:
        """
        Initialize the inference class.
        
        Args:
            model_path: Path to the trained model checkpoint
            device: Device to run inference on ('cpu' or 'cuda')
        """
        self.model_path = Path(model_path)
        self.device = device
        self.model = None
        self.transform = None
        self._load_model()
    
    def _load_model(self) -> None:
        """Load the trained model."""
        if not self.model_path.exists():
            raise FileNotFoundError(f"Model not found at {self.model_path}")
        
        print(f"Loading model from {self.model_path}")
        
        # Initialize model
        self.model = get_model(num_classes=2)
        self.model = self.model.to(self.device)
        
        # Load checkpoint
        checkpoint = torch.load(self.model_path, map_location=self.device)
        if isinstance(checkpoint, dict) and "model_state_dict" in checkpoint:
            self.model.load_state_dict(checkpoint["model_state_dict"])
        else:
            self.model.load_state_dict(checkpoint)
        
        self.model.eval()
        
        # Define transform
        self.transform = transforms.Compose([
            transforms.Resize((224, 224)),
            transforms.ToTensor(),
            transforms.Normalize(mean=[0.485, 0.456, 0.406], std=[0.229, 0.224, 0.225]),
        ])
        
        print("Model loaded successfully")
    
    def preprocess_image(self, image_bytes: bytes) -> torch.Tensor:
        """
        Preprocess image bytes for inference.
        
        Args:
            image_bytes: Raw image bytes
            
        Returns:
            Preprocessed tensor
        """
        image = Image.open(io.BytesIO(image_bytes)).convert("RGB")
        tensor = self.transform(image)
        return tensor.unsqueeze(0)  # Add batch dimension
    
    def _generate_gradcam(self, input_tensor: torch.Tensor, target_class: int) -> np.ndarray:
        """
        Generate Grad-CAM heatmap for the input image.
        
        Args:
            input_tensor: Preprocessed input tensor (1, 3, 224, 224)
            target_class: Target class index for Grad-CAM
            
        Returns:
            Grad-CAM heatmap as numpy array (224, 224)
        """
        # Hook to capture gradients and activations
        gradients = []
        activations = []
        
        def forward_hook(module, input, output):
            activations.append(output)
        
        def backward_hook(module, grad_input, grad_output):
            gradients.append(grad_output[0])
        
        # Register hooks on the last convolutional layer (Conv Block 4)
        target_layer = self.model.features[12]  # Conv2d(128, 256) in Conv Block 4
        forward_handle = target_layer.register_forward_hook(forward_hook)
        backward_handle = target_layer.register_full_backward_hook(backward_hook)
        
        try:
            # Forward pass
            self.model.zero_grad()
            output = self.model(input_tensor)
            
            # Backward pass for target class
            target = output[0][target_class]
            target.backward()
            
            # Get gradients and activations
            if not gradients or not activations:
                print("Warning: No gradients or activations captured")
                # Return a default heatmap
                return np.zeros((224, 224, 3), dtype=np.uint8)
            
            grad = gradients[0]  # (1, 256, 14, 14)
            act = activations[0]  # (1, 256, 14, 14)
            
            # Global average pooling of gradients
            weights = torch.mean(grad, dim=(2, 3), keepdim=True)  # (1, 256, 1, 1)
            
            # Weighted combination of activations
            cam = torch.sum(weights * act, dim=1, keepdim=True)  # (1, 1, 14, 14)
            cam = F.relu(cam)  # ReLU to keep only positive contributions
            
            # Resize to input size
            cam = F.interpolate(cam, size=(224, 224), mode='bilinear', align_corners=False)
            cam = cam.squeeze().detach().cpu().numpy()  # (224, 224)

            # Normalize to 0-255
            cam = (cam - cam.min()) / (cam.max() - cam.min() + 1e-8)
            cam = (cam * 255).astype(np.uint8)
            
            # Apply colormap
            cam_colored = cv2.applyColorMap(cam, cv2.COLORMAP_JET)
            cam_colored = cv2.cvtColor(cam_colored, cv2.COLOR_BGR2RGB)
            
            return cam_colored
            
        except Exception as e:
            print(f"Error generating Grad-CAM: {e}")
            import traceback
            traceback.print_exc()
            # Return a default heatmap
            return np.zeros((224, 224, 3), dtype=np.uint8)
            
        finally:
            forward_handle.remove()
            backward_handle.remove()
    
    def _localize_lung_region(self, heatmap: np.ndarray) -> dict:
        """
        Determine which lung region has the most activation.
        
        Args:
            heatmap: Grad-CAM heatmap (224, 224, 3)
            
        Returns:
            Dictionary with localization info
        """
        # Convert to grayscale for analysis
        gray = cv2.cvtColor(heatmap, cv2.COLOR_RGB2GRAY)
        
        # Split image into left and right halves
        h, w = gray.shape
        mid = w // 2
        
        left_half = gray[:, :mid]
        right_half = gray[:, mid:]
        
        # Calculate activation intensity for each half
        left_intensity = np.mean(left_half)
        right_intensity = np.mean(right_half)
        
        # Determine localization
        threshold = 30  # Minimum activation threshold
        
        if left_intensity < threshold and right_intensity < threshold:
            localization = "both"
            highlight_left = True
            highlight_right = True
        elif left_intensity > right_intensity * 1.2:
            localization = "left"
            highlight_left = True
            highlight_right = False
        elif right_intensity > left_intensity * 1.2:
            localization = "right"
            highlight_left = False
            highlight_right = True
        else:
            localization = "both"
            highlight_left = True
            highlight_right = True
        
        return {
            "localization": localization,
            "highlight_left": highlight_left,
            "highlight_right": highlight_right,
            "left_intensity": float(left_intensity),
            "right_intensity": float(right_intensity)
        }
    
    def _validate_chest_xray(self, image_bytes: bytes) -> bool:
        """
        Validate that the image is a chest X-ray with reasonable checks.
        
        Args:
            image_bytes: Raw image bytes
            
        Returns:
            True if valid chest X-ray, False otherwise
        """
        return validate_lung_xray_image(image_bytes)
    
    def predict(self, image_bytes: bytes) -> dict:
        """
        Run inference on an image with Grad-CAM localization.
        
        Args:
            image_bytes: Raw image bytes
            
        Returns:
            Dictionary containing prediction, confidence, severity, and Grad-CAM data
        """
        start_time = time.perf_counter()
        
        # Validate that this is a chest X-ray
        if not self._validate_chest_xray(image_bytes):
            return {
                "prediction": "Invalid Image",
                "confidence": 0.0,
                "severity": "Unknown",
                "processing_time": f"{round((time.perf_counter() - start_time) * 1000, 2):.2f} ms",
                "class_probabilities": {},
                "gradcam_image": None,
                "localization": None,
                "success": False,
                "message": "The uploaded image does not appear to be a valid chest X-ray. Please upload a lung/chest X-ray image."
            }
        
        # Preprocess
        input_tensor = self.preprocess_image(image_bytes)
        input_tensor = input_tensor.to(self.device)
        
        # Run inference
        with torch.no_grad():
            outputs = self.model(input_tensor)
            probabilities = torch.nn.functional.softmax(outputs, dim=1)
            confidence, predicted = torch.max(probabilities, 1)
        
        # Convert to Python types
        predicted_class = predicted.item()
        confidence_value = confidence.item()
        
        # Map class to label
        class_names = ["Normal", "Pneumonia"]
        prediction = class_names[predicted_class]
        
        # Calculate severity based on confidence
        severity = self._calculate_severity(prediction, confidence_value)
        
        # Generate Grad-CAM if prediction is Pneumonia
        gradcam_image = None
        localization = None
        if prediction == "Pneumonia":
            gradcam_heatmap = self._generate_gradcam(input_tensor, predicted_class)
            localization = self._localize_lung_region(gradcam_heatmap)
            
            # Convert to base64 for transmission
            _, buffer = cv2.imencode('.png', gradcam_heatmap)
            gradcam_image = base64.b64encode(buffer).decode('utf-8')
        
        processing_time = round((time.perf_counter() - start_time) * 1000, 2)
        
        return {
            "prediction": prediction,
            "confidence": round(confidence_value * 100, 1),  # Convert to percentage
            "severity": severity,
            "processing_time": f"{processing_time:.2f} ms",
            "class_probabilities": {
                class_names[i]: round(probabilities[0][i].item() * 100, 1)
                for i in range(len(class_names))
            },
            "gradcam_image": gradcam_image,
            "localization": localization
        }
    
    def _calculate_severity(self, prediction: str, confidence: float) -> str:
        """
        Calculate severity based on prediction and confidence.
        
        Args:
            prediction: Predicted class
            confidence: Confidence score (0-1)
            
        Returns:
            Severity level
        """
        if prediction == "Normal":
            return "Normal"
        
        # For abnormal predictions, severity increases with confidence
        if confidence >= 0.9:
            return "Critical"
        elif confidence >= 0.8:
            return "High"
        elif confidence >= 0.7:
            return "Moderate"
        else:
            return "Low"


def load_model(model_path: str, device: str = "cpu") -> ChestXRayInference:
    """
    Load the inference model.
    
    Args:
        model_path: Path to the trained model checkpoint
        device: Device to run inference on
        
    Returns:
        ChestXRayInference instance
    """
    return ChestXRayInference(model_path, device)


def predict_image(image_bytes: bytes, model_path: str, device: str = "cpu") -> dict:
    """
    Predict on a single image.
    
    Args:
        image_bytes: Raw image bytes
        model_path: Path to the trained model checkpoint
        device: Device to run inference on
        
    Returns:
        Dictionary containing prediction results
    """
    inference = load_model(model_path, device)
    return inference.predict(image_bytes)
