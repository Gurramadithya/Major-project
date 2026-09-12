from __future__ import annotations

import torch
import torch.nn as nn
import torch.nn.functional as F


class ChestXRayCNN(nn.Module):
    """Lightweight CNN for Chest X-ray classification (Normal vs Pneumonia)."""
    
    def __init__(self, num_classes: int = 2) -> None:
        """
        Initialize the CNN model.
        
        Args:
            num_classes: Number of output classes (2 for binary classification)
        """
        super(ChestXRayCNN, self).__init__()
        
        # Feature extraction layers
        self.features = nn.Sequential(
            # Conv Block 1
            nn.Conv2d(3, 32, kernel_size=3, padding=1),
            nn.BatchNorm2d(32),
            nn.ReLU(inplace=False),  # Changed for Grad-CAM compatibility
            nn.MaxPool2d(kernel_size=2, stride=2),
            
            # Conv Block 2
            nn.Conv2d(32, 64, kernel_size=3, padding=1),
            nn.BatchNorm2d(64),
            nn.ReLU(inplace=False),  # Changed for Grad-CAM compatibility
            nn.MaxPool2d(kernel_size=2, stride=2),
            
            # Conv Block 3
            nn.Conv2d(64, 128, kernel_size=3, padding=1),
            nn.BatchNorm2d(128),
            nn.ReLU(inplace=False),  # Changed for Grad-CAM compatibility
            nn.MaxPool2d(kernel_size=2, stride=2),
            
            # Conv Block 4
            nn.Conv2d(128, 256, kernel_size=3, padding=1),
            nn.BatchNorm2d(256),
            nn.ReLU(inplace=False),  # Changed for Grad-CAM compatibility
            nn.MaxPool2d(kernel_size=2, stride=2),
        )
        
        # Classifier layers
        self.classifier = nn.Sequential(
            nn.Dropout(0.5),
            nn.Linear(256 * 14 * 14, 512),
            nn.ReLU(inplace=False),  # Changed for Grad-CAM compatibility
            nn.Dropout(0.5),
            nn.Linear(512, 128),
            nn.ReLU(inplace=False),  # Changed for Grad-CAM compatibility
            nn.Linear(128, num_classes),
        )
        
        # Initialize weights
        self._initialize_weights()
    
    def _initialize_weights(self) -> None:
        """Initialize model weights."""
        for m in self.modules():
            if isinstance(m, nn.Conv2d):
                nn.init.kaiming_normal_(m.weight, mode='fan_out', nonlinearity='relu')
                if m.bias is not None:
                    nn.init.constant_(m.bias, 0)
            elif isinstance(m, nn.BatchNorm2d):
                nn.init.constant_(m.weight, 1)
                nn.init.constant_(m.bias, 0)
            elif isinstance(m, nn.Linear):
                nn.init.normal_(m.weight, 0, 0.01)
                nn.init.constant_(m.bias, 0)
    
    def forward(self, x: torch.Tensor) -> torch.Tensor:
        """Forward pass."""
        x = self.features(x)
        x = x.view(x.size(0), -1)  # Flatten
        x = self.classifier(x)
        return x


def get_model(num_classes: int = 2, pretrained: bool = False) -> ChestXRayCNN:
    """
    Get the Chest X-ray CNN model.
    
    Args:
        num_classes: Number of output classes
        pretrained: Whether to load pretrained weights (not implemented)
    
    Returns:
        ChestXRayCNN model
    """
    model = ChestXRayCNN(num_classes=num_classes)
    return model
