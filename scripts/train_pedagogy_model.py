"""QuantumLearnAI Real Model Training Pipeline.

Trains a specialized Multi-Task Neural Pedagogy & Socratic Router Model
on the prepared QuantumLearnAI dataset using PyTorch on CPU.

Architecture:
- Text Tokenizer / Vocabulary builder
- Embedding Layer with position-aware attention pooling
- Multi-Task Prediction Heads:
  1. Pedagogical Category Head (6 classes)
  2. Curriculum Topic Head (4 classes)
  3. Misconception Flag Head (Binary)

Records REAL training loss, validation metrics, and saves real weights to training_artifacts/model/.
"""
import os
import sys
import json
import math
import time
import random
import re
from pathlib import Path
from typing import Dict, List, Any, Tuple

import numpy as np
import torch
import torch.nn as nn
import torch.optim as optim
from torch.utils.data import Dataset, DataLoader

sys.stdout.reconfigure(encoding="utf-8")

PROJECT_ROOT = Path(".").resolve()
ARTIFACTS_DIR = PROJECT_ROOT / "training_artifacts"
DATA_DIR = ARTIFACTS_DIR / "data"
MODEL_DIR = ARTIFACTS_DIR / "model"
REPORTS_DIR = ARTIFACTS_DIR / "reports"
MODEL_DIR.mkdir(parents=True, exist_ok=True)
REPORTS_DIR.mkdir(parents=True, exist_ok=True)

SEED = 42
torch.manual_seed(SEED)
np.random.seed(SEED)
random.seed(SEED)


# ==============================================================================
# 1. VOCABULARY & TOKENIZER
# ==============================================================================
class SimpleTokenizer:
    """Lightweight whitespace and quantum token tokenizer with subword hashing."""
    def __init__(self, vocab_size: int = 2500):
        self.vocab_size = vocab_size
        self.word2idx = {"<pad>": 0, "<unk>": 1, "<s>": 2, "</s>": 3}
        self.idx2word = {0: "<pad>", 1: "<unk>", 2: "<s>", 3: "</s>"}

    def fit(self, texts: List[str]):
        counts = {}
        for text in texts:
            tokens = self._tokenize(text)
            for tok in tokens:
                counts[tok] = counts.get(tok, 0) + 1

        sorted_tokens = sorted(counts.items(), key=lambda x: x[1], reverse=True)
        for tok, _ in sorted_tokens:
            if len(self.word2idx) >= self.vocab_size:
                break
            if tok not in self.word2idx:
                idx = len(self.word2idx)
                self.word2idx[tok] = idx
                self.idx2word[idx] = tok

    def _tokenize(self, text: str) -> List[str]:
        t = text.lower().strip()
        t = t.replace("√3/2", "sqrt3_2").replace("1/2", "half").replace("1/√2", "inv_sqrt2")
        t = t.replace("|0⟩", "|0>").replace("|1⟩", "|1>").replace("|00⟩", "|00>").replace("|11⟩", "|11>")
        t = t.replace("’", "'").replace("“", '"').replace("”", '"')
        tokens = re.findall(r"[a-z0-9_><|]+|[^\w\s]", t)
        return tokens

    def encode(self, text: str, max_len: int = 64) -> List[int]:
        tokens = self._tokenize(text)[:max_len - 2]
        indices = [self.word2idx["<s>"]] + [self.word2idx.get(tok, self.word2idx["<unk>"]) for tok in tokens] + [self.word2idx["</s>"]]
        if len(indices) < max_len:
            indices += [self.word2idx["<pad>"]] * (max_len - len(indices))
        return indices[:max_len]


# ==============================================================================
# 2. DATASET LOADER
# ==============================================================================
CATEGORIES = [
    "A_Knowledge",
    "B_Worked_Examples",
    "C_Student_QA",
    "D_Misconceptions",
    "E_Socratic_Conversations",
    "F_Assessments"
]
CAT2IDX = {c: i for i, c in enumerate(CATEGORIES)}
TOPICS = ["1.1", "1.2", "1.3", "1.4"]
TOPIC2IDX = {t: i for i, t in enumerate(TOPICS)}


class QuantumPedagogyDataset(Dataset):
    def __init__(self, records: List[Dict[str, Any]], tokenizer: SimpleTokenizer, max_len: int = 64):
        self.records = records
        self.tokenizer = tokenizer
        self.max_len = max_len

    def __len__(self):
        return len(self.records)

    def __getitem__(self, idx):
        item = self.records[idx]
        tokens = self.tokenizer.encode(item["user_query"], max_len=self.max_len)
        cat_label = CAT2IDX.get(item["category"], 0)
        topic_label = TOPIC2IDX.get(item["topic_id"], 0)
        misc_label = 1 if item["category"] == "D_Misconceptions" else 0

        return {
            "input_ids": torch.tensor(tokens, dtype=torch.long),
            "category": torch.tensor(cat_label, dtype=torch.long),
            "topic": torch.tensor(topic_label, dtype=torch.long),
            "misconception": torch.tensor(misc_label, dtype=torch.long)
        }


# ==============================================================================
# 3. NEURAL NETWORK ARCHITECTURE
# ==============================================================================
class QuantumPedagogyModel(nn.Module):
    """Multi-Task Neural Pedagogy Router & Misconception Detector."""
    def __init__(self, vocab_size: int = 2500, embed_dim: int = 64, hidden_dim: int = 128, num_categories: int = 6, num_topics: int = 4):
        super().__init__()
        self.embedding = nn.Embedding(vocab_size, embed_dim, padding_idx=0)
        self.dropout = nn.Dropout(0.2)

        # Self-attention pooling layer
        self.attn_weights = nn.Linear(embed_dim, 1)

        # Shared representation layers
        self.fc_shared = nn.Sequential(
            nn.Linear(embed_dim, hidden_dim),
            nn.LayerNorm(hidden_dim),
            nn.GELU(),
            nn.Dropout(0.2)
        )

        # Head 1: Category Classification (Knowledge, Examples, Q&A, Misconceptions, Socratic, Assessment)
        self.category_head = nn.Linear(hidden_dim, num_categories)

        # Head 2: Topic Classification (1.1, 1.2, 1.3, 1.4)
        self.topic_head = nn.Linear(hidden_dim, num_topics)

        # Head 3: Misconception Interceptor (Binary)
        self.misconception_head = nn.Linear(hidden_dim, 2)

    def forward(self, input_ids: torch.Tensor) -> Tuple[torch.Tensor, torch.Tensor, torch.Tensor]:
        # input_ids: (batch, seq_len)
        embeds = self.dropout(self.embedding(input_ids)) # (batch, seq_len, embed_dim)

        # Attention pooling
        mask = (input_ids != 0).unsqueeze(-1) # (batch, seq_len, 1)
        attn_scores = self.attn_weights(embeds) # (batch, seq_len, 1)
        attn_scores = attn_scores.masked_fill(~mask, -1e9)
        attn_probs = torch.softmax(attn_scores, dim=1) # (batch, seq_len, 1)
        pooled = torch.sum(embeds * attn_probs, dim=1) # (batch, embed_dim)

        # Shared feature representation
        features = self.fc_shared(pooled) # (batch, hidden_dim)

        # Outputs
        cat_logits = self.category_head(features)
        topic_logits = self.topic_head(features)
        misc_logits = self.misconception_head(features)

        return cat_logits, topic_logits, misc_logits


# ==============================================================================
# 4. TRAINING LOOP
# ==============================================================================
def train_model():
    print("=== STARTING QUANTUMLEARNAI REAL MODEL TRAINING (CPU) ===")
    
    # Load all cleaned records
    cleaned_file = DATA_DIR / "cleaned_all_records.json"
    with open(cleaned_file, "r", encoding="utf-8") as f:
        all_records = json.load(f)

    # Load splits
    def load_jsonl_records(split_name: str) -> List[Dict[str, Any]]:
        # Map chat format back to rich records
        id_map = {r["user_query"].strip(): r for r in all_records}
        lines = []
        with open(DATA_DIR / f"{split_name}.jsonl", "r", encoding="utf-8") as f:
            for l in f:
                if l.strip():
                    d = json.loads(l)
                    uq = next(m["content"] for m in d["messages"] if m["role"] == "user")
                    matched = id_map.get(uq.strip())
                    if matched:
                        lines.append(matched)
                    else:
                        # Fallback search
                        for r in all_records:
                            if r["user_query"].strip() in uq or uq in r["user_query"]:
                                lines.append(r)
                                break
        return lines

    train_records = load_jsonl_records("train")
    val_records = load_jsonl_records("val")
    test_records = load_jsonl_records("test")

    print(f"Loaded records for training: {len(train_records)} train, {len(val_records)} val, {len(test_records)} test")

    # Fit tokenizer
    tokenizer = SimpleTokenizer(vocab_size=2500)
    all_texts = [r["user_query"] + " " + r["assistant_response"] for r in all_records]
    tokenizer.fit(all_texts)
    print(f"Fitted tokenizer vocabulary: {len(tokenizer.word2idx)} tokens")

    # Create datasets & dataloaders
    train_ds = QuantumPedagogyDataset(train_records, tokenizer, max_len=64)
    val_ds = QuantumPedagogyDataset(val_records, tokenizer, max_len=64)
    test_ds = QuantumPedagogyDataset(test_records, tokenizer, max_len=64)

    train_loader = DataLoader(train_ds, batch_size=8, shuffle=True)
    val_loader = DataLoader(val_ds, batch_size=8, shuffle=False)

    # Initialize model
    model = QuantumPedagogyModel(
        vocab_size=len(tokenizer.word2idx),
        embed_dim=64,
        hidden_dim=128,
        num_categories=len(CATEGORIES),
        num_topics=len(TOPICS)
    )

    criterion_cat = nn.CrossEntropyLoss()
    criterion_top = nn.CrossEntropyLoss()
    criterion_misc = nn.CrossEntropyLoss()

    optimizer = optim.AdamW(model.parameters(), lr=2e-3, weight_decay=1e-2)
    epochs = 20
    scheduler = optim.lr_scheduler.CosineAnnealingLR(optimizer, T_max=epochs)

    history = {
        "epoch": [],
        "train_loss": [],
        "val_loss": [],
        "val_cat_acc": [],
        "val_topic_acc": [],
        "val_misc_acc": []
    }

    print("\nStarting Training Across 20 Epochs...")
    print(f"{'Epoch':<6} | {'Train Loss':<12} | {'Val Loss':<10} | {'Cat Acc':<10} | {'Topic Acc':<10} | {'Misc Acc':<10}")
    print("-" * 75)

    start_time = time.time()
    for epoch in range(1, epochs + 1):
        model.train()
        total_loss = 0.0
        batches = 0

        for batch in train_loader:
            optimizer.zero_grad()
            input_ids = batch["input_ids"]
            cat_target = batch["category"]
            topic_target = batch["topic"]
            misc_target = batch["misconception"]

            cat_out, top_out, misc_out = model(input_ids)

            l_cat = criterion_cat(cat_out, cat_target)
            l_top = criterion_top(top_out, topic_target)
            l_misc = criterion_misc(misc_out, misc_target)

            loss = l_cat + l_top + 0.8 * l_misc
            loss.backward()
            torch.nn.utils.clip_grad_norm_(model.parameters(), max_norm=1.0)
            optimizer.step()

            total_loss += loss.item()
            batches += 1

        scheduler.step()
        avg_train_loss = total_loss / max(1, batches)

        # Validation
        model.eval()
        val_loss = 0.0
        val_batches = 0
        correct_cat, correct_top, correct_misc = 0, 0, 0
        total_samples = 0

        with torch.no_grad():
            for batch in val_loader:
                input_ids = batch["input_ids"]
                cat_target = batch["category"]
                topic_target = batch["topic"]
                misc_target = batch["misconception"]

                cat_out, top_out, misc_out = model(input_ids)

                l_cat = criterion_cat(cat_out, cat_target)
                l_top = criterion_top(top_out, topic_target)
                l_misc = criterion_misc(misc_out, misc_target)

                v_loss = l_cat + l_top + 0.8 * l_misc
                val_loss += v_loss.item()
                val_batches += 1

                correct_cat += (cat_out.argmax(dim=-1) == cat_target).sum().item()
                correct_top += (top_out.argmax(dim=-1) == topic_target).sum().item()
                correct_misc += (misc_out.argmax(dim=-1) == misc_target).sum().item()
                total_samples += len(cat_target)

        avg_val_loss = val_loss / max(1, val_batches)
        cat_acc = correct_cat / max(1, total_samples) * 100
        top_acc = correct_top / max(1, total_samples) * 100
        misc_acc = correct_misc / max(1, total_samples) * 100

        history["epoch"].append(epoch)
        history["train_loss"].append(round(avg_train_loss, 4))
        history["val_loss"].append(round(avg_val_loss, 4))
        history["val_cat_acc"].append(round(cat_acc, 2))
        history["val_topic_acc"].append(round(top_acc, 2))
        history["val_misc_acc"].append(round(misc_acc, 2))

        print(f"Ep {epoch:<3} | {avg_train_loss:<12.4f} | {avg_val_loss:<10.4f} | {cat_acc:<9.1f}% | {top_acc:<9.1f}% | {misc_acc:<9.1f}%")

    elapsed = time.time() - start_time
    print(f"\nTraining completed in {elapsed:.2f} seconds!")

    # Save artifacts
    weights_path = MODEL_DIR / "quantumlearnai_model.pt"
    torch.save(model.state_dict(), weights_path)
    print(f"Saved real model weights to: {weights_path}")

    # Save configs
    config = {
        "model_architecture": "QuantumPedagogyModel",
        "vocab_size": len(tokenizer.word2idx),
        "embed_dim": 64,
        "hidden_dim": 128,
        "categories": CATEGORIES,
        "topics": TOPICS,
        "device": "cpu",
        "epochs": epochs,
        "training_time_seconds": round(elapsed, 2),
        "final_train_loss": history["train_loss"][-1],
        "final_val_loss": history["val_loss"][-1],
        "final_val_cat_accuracy": history["val_cat_acc"][-1],
        "final_val_topic_accuracy": history["val_topic_acc"][-1],
        "final_val_misc_accuracy": history["val_misc_acc"][-1]
    }
    with open(MODEL_DIR / "model_config.json", "w", encoding="utf-8") as f:
        json.dump(config, f, indent=2)

    with open(MODEL_DIR / "tokenizer_config.json", "w", encoding="utf-8") as f:
        json.dump({"word2idx": tokenizer.word2idx, "vocab_size": len(tokenizer.word2idx)}, f, indent=2)

    with open(MODEL_DIR / "training_history.json", "w", encoding="utf-8") as f:
        json.dump(history, f, indent=2)

    print(f"Saved training history and configurations to: {MODEL_DIR}")
    return model, tokenizer, test_records, history


if __name__ == "__main__":
    train_model()
