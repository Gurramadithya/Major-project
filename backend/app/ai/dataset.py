from __future__ import annotations

from pathlib import Path
from typing import Callable, Optional, Tuple

import torch
from PIL import Image
from torch.utils.data import Dataset
from torchvision import transforms


class ChestXRayDataset(Dataset):
    """PyTorch Dataset for Chest X-ray images."""
    
    def __init__(
        self,
        root_dir: str,
        transform: Optional[Callable] = None,
        split: str = "train"
    ) -> None:
        """
        Initialize the dataset.
        
        Args:
            root_dir: Root directory of the dataset
            transform: Optional transform to apply to images
            split: Dataset split ('train', 'val', or 'test')
        """
        self.root_dir = Path(root_dir)
        self.transform = transform
        self.split = split
        
        # Get image paths and labels
        self.samples = []
        self._load_samples()
    
    def _load_samples(self) -> None:
        """Load image paths and labels from directory structure."""
        split_dir = self.root_dir / self.split
        
        # NORMAL class (label 0)
        normal_dir = split_dir / "NORMAL"
        if normal_dir.exists():
            for img_path in normal_dir.glob("*.jpeg"):
                self.samples.append((str(img_path), 0))
            for img_path in normal_dir.glob("*.jpg"):
                self.samples.append((str(img_path), 0))
            for img_path in normal_dir.glob("*.png"):
                self.samples.append((str(img_path), 0))
        
        # PNEUMONIA class (label 1)
        pneumonia_dir = split_dir / "PNEUMONIA"
        if pneumonia_dir.exists():
            for img_path in pneumonia_dir.glob("*.jpeg"):
                self.samples.append((str(img_path), 1))
            for img_path in pneumonia_dir.glob("*.jpg"):
                self.samples.append((str(img_path), 1))
            for img_path in pneumonia_dir.glob("*.png"):
                self.samples.append((str(img_path), 1))
        
        print(f"Loaded {len(self.samples)} samples from {self.split} split")
    
    def __len__(self) -> int:
        return len(self.samples)
    
    def __getitem__(self, idx: int) -> Tuple[torch.Tensor, int]:
        """Get a sample from the dataset."""
        img_path, label = self.samples[idx]
        
        # Load image
        image = Image.open(img_path).convert("RGB")
        
        # Apply transforms
        if self.transform:
            image = self.transform(image)
        
        return image, label


def get_train_transforms() -> transforms.Compose:
    """Get training data augmentation transforms."""
    return transforms.Compose([
        transforms.Resize((224, 224)),
        transforms.RandomHorizontalFlip(p=0.5),
        transforms.RandomRotation(degrees=10),
        transforms.RandomAffine(degrees=0, translate=(0.05, 0.05)),
        transforms.ToTensor(),
        transforms.Normalize(mean=[0.485, 0.456, 0.406], std=[0.229, 0.224, 0.225]),
    ])


def get_val_transforms() -> transforms.Compose:
    """Get validation/test transforms (no augmentation)."""
    return transforms.Compose([
        transforms.Resize((224, 224)),
        transforms.ToTensor(),
        transforms.Normalize(mean=[0.485, 0.456, 0.406], std=[0.229, 0.224, 0.225]),
    ])
