from __future__ import annotations

import os
import sys
import time
from pathlib import Path

import torch
import torch.nn as nn
import torch.optim as optim
from torch.utils.data import DataLoader
from torchvision import transforms
from tqdm import tqdm
from PIL import Image

# Add parent directory to path for imports
sys.path.insert(0, str(Path(__file__).resolve().parents[3]))

# Import directly from files to avoid __init__.py issues
import backend.app.ai.dataset as dataset_module
import backend.app.ai.model as model_module

ChestXRayDataset = dataset_module.ChestXRayDataset
get_train_transforms = dataset_module.get_train_transforms
get_val_transforms = dataset_module.get_val_transforms
get_model = model_module.get_model


def train_one_epoch(
    model: nn.Module,
    dataloader: DataLoader,
    criterion: nn.Module,
    optimizer: optim.Optimizer,
    device: str
) -> tuple[float, float]:
    """Train for one epoch."""
    model.train()
    running_loss = 0.0
    correct = 0
    total = 0
    
    pbar = tqdm(dataloader, desc="Training")
    for images, labels in pbar:
        images, labels = images.to(device), labels.to(device)
        
        optimizer.zero_grad()
        outputs = model(images)
        loss = criterion(outputs, labels)
        loss.backward()
        optimizer.step()
        
        running_loss += loss.item()
        _, predicted = outputs.max(1)
        total += labels.size(0)
        correct += predicted.eq(labels).sum().item()
        
        pbar.set_postfix({
            'loss': f'{loss.item():.4f}',
            'acc': f'{100. * correct / total:.2f}%'
        })
    
    epoch_loss = running_loss / len(dataloader)
    epoch_acc = 100. * correct / total
    return epoch_loss, epoch_acc


def validate(
    model: nn.Module,
    dataloader: DataLoader,
    criterion: nn.Module,
    device: str
) -> tuple[float, float]:
    """Validate the model."""
    model.eval()
    running_loss = 0.0
    correct = 0
    total = 0
    
    with torch.no_grad():
        pbar = tqdm(dataloader, desc="Validation")
        for images, labels in pbar:
            images, labels = images.to(device), labels.to(device)
            
            outputs = model(images)
            loss = criterion(outputs, labels)
            
            running_loss += loss.item()
            _, predicted = outputs.max(1)
            total += labels.size(0)
            correct += predicted.eq(labels).sum().item()
            
            pbar.set_postfix({
                'loss': f'{loss.item():.4f}',
                'acc': f'{100. * correct / total:.2f}%'
            })
    
    epoch_loss = running_loss / len(dataloader)
    epoch_acc = 100. * correct / total
    return epoch_loss, epoch_acc


def train_model(
    dataset_root: str,
    output_path: str,
    epochs: int = 15,
    batch_size: int = 16,
    learning_rate: float = 0.001,
    device: str = "cpu"
) -> None:
    """
    Train the Chest X-ray classification model.
    
    Args:
        dataset_root: Path to the dataset root directory
        output_path: Path to save the trained model
        epochs: Number of training epochs
        batch_size: Batch size for training
        learning_rate: Learning rate
        device: Device to train on ('cpu' or 'cuda')
    """
    print("=" * 80)
    print("Chest X-ray Classification Training")
    print("=" * 80)
    print(f"Dataset: {dataset_root}")
    print(f"Output: {output_path}")
    print(f"Epochs: {epochs}")
    print(f"Batch Size: {batch_size}")
    print(f"Device: {device}")
    print("=" * 80)
    
    # Create output directory
    output_dir = Path(output_path).parent
    output_dir.mkdir(parents=True, exist_ok=True)
    
    # Load datasets
    print("\nLoading datasets...")
    train_dataset = ChestXRayDataset(
        root_dir=dataset_root,
        transform=get_train_transforms(),
        split="train"
    )
    val_dataset = ChestXRayDataset(
        root_dir=dataset_root,
        transform=get_val_transforms(),
        split="val"
    )
    
    train_loader = DataLoader(
        train_dataset,
        batch_size=batch_size,
        shuffle=True,
        num_workers=0,  # CPU optimization for Windows
        pin_memory=False
    )
    val_loader = DataLoader(
        val_dataset,
        batch_size=batch_size,
        shuffle=False,
        num_workers=0,
        pin_memory=False
    )
    
    print(f"Train samples: {len(train_dataset)}")
    print(f"Val samples: {len(val_dataset)}")
    
    # Initialize model
    print("\nInitializing model...")
    model = get_model(num_classes=2)
    model = model.to(device)
    
    # Loss and optimizer
    criterion = nn.CrossEntropyLoss()
    optimizer = optim.Adam(model.parameters(), lr=learning_rate)
    scheduler = optim.lr_scheduler.ReduceLROnPlateau(
        optimizer, mode='min', factor=0.5, patience=3, verbose=True
    )
    
    # Training loop
    best_val_acc = 0.0
    print("\nStarting training...")
    
    for epoch in range(epochs):
        print(f"\nEpoch {epoch + 1}/{epochs}")
        print("-" * 80)
        
        train_loss, train_acc = train_one_epoch(
            model, train_loader, criterion, optimizer, device
        )
        val_loss, val_acc = validate(model, val_loader, criterion, device)
        
        scheduler.step(val_loss)
        
        print(f"Train Loss: {train_loss:.4f}, Train Acc: {train_acc:.2f}%")
        print(f"Val Loss: {val_loss:.4f}, Val Acc: {val_acc:.2f}%")
        
        # Save best model
        if val_acc > best_val_acc:
            best_val_acc = val_acc
            torch.save({
                'epoch': epoch,
                'model_state_dict': model.state_dict(),
                'optimizer_state_dict': optimizer.state_dict(),
                'val_acc': val_acc,
                'val_loss': val_loss,
            }, output_path)
            print(f"✓ Saved best model (Val Acc: {val_acc:.2f}%)")
    
    print("\n" + "=" * 80)
    print(f"Training completed!")
    print(f"Best validation accuracy: {best_val_acc:.2f}%")
    print(f"Model saved to: {output_path}")
    print("=" * 80)


if __name__ == "__main__":
    # Configuration
    DATASET_ROOT = r"E:\MedicalAIProject\dataset\archive\chest_xray\chest_xray"
    OUTPUT_PATH = r"E:\MedicalAIProject\backend\models\chest_model.pth"
    EPOCHS = 15
    BATCH_SIZE = 16
    LEARNING_RATE = 0.001
    DEVICE = "cpu"  # Use CPU for 8GB RAM constraint
    
    # Check if dataset exists
    if not Path(DATASET_ROOT).exists():
        print(f"ERROR: Dataset not found at {DATASET_ROOT}")
        print("Please download the Kaggle Chest X-ray dataset and extract it to the specified location.")
        exit(1)
    
    # Start training
    train_model(
        dataset_root=DATASET_ROOT,
        output_path=OUTPUT_PATH,
        epochs=EPOCHS,
        batch_size=BATCH_SIZE,
        learning_rate=LEARNING_RATE,
        device=DEVICE
    )
