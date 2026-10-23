"""QuantumLearnAI Neural Pedagogy Classifier & Socratic Router.

Safely loads the trained QuantumPedagogyModel checkpoint on CPU to perform:
1. Educational category classification (Knowledge, Worked Examples, Student QA, Misconceptions, Socratic, Assessments)
2. Quantum computing topic routing (1.1, 1.2, 1.3, 1.4)
3. Misconception interception (Binary detection)

Preserves CPU compatibility, executes in sub-millisecond inference time,
and falls back gracefully if the checkpoint is absent or incompatible.
NOTE: This model is a multi-task classifier/router, NOT a generative LLM.
"""
import os
import re
import json
import logging
from pathlib import Path
from typing import Dict, List, Any, Optional, Tuple

import torch
import torch.nn as nn

logger = logging.getLogger("PedagogyClassifier")

CATEGORIES = [
    "A_Knowledge",
    "B_Worked_Examples",
    "C_Student_QA",
    "D_Misconceptions",
    "E_Socratic_Conversations",
    "F_Assessments"
]

TOPICS = [f"1.{i}" for i in range(1, 5)]


class SimpleTokenizer:
    """Lightweight whitespace and quantum token tokenizer with subword hashing."""
    def __init__(self, vocab_size: int = 2500):
        self.vocab_size = vocab_size
        self.word2idx = {"<pad>": 0, "<unk>": 1, "<s>": 2, "</s>": 3}
        self.idx2word = {0: "<pad>", 1: "<unk>", 2: "<s>", 3: "</s>"}

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


class QuantumPedagogyModel(nn.Module):
    """Multi-Task Neural Pedagogy Router & Misconception Detector."""
    def __init__(self, vocab_size: int = 2500, embed_dim: int = 64, hidden_dim: int = 128, num_categories: int = 6, num_topics: int = 4):
        super().__init__()
        self.embedding = nn.Embedding(vocab_size, embed_dim, padding_idx=0)
        self.dropout = nn.Dropout(0.2)
        self.attn_weights = nn.Linear(embed_dim, 1)

        self.fc_shared = nn.Sequential(
            nn.Linear(embed_dim, hidden_dim),
            nn.LayerNorm(hidden_dim),
            nn.GELU(),
            nn.Dropout(0.2)
        )

        self.category_head = nn.Linear(hidden_dim, num_categories)
        self.topic_head = nn.Linear(hidden_dim, num_topics)
        self.misconception_head = nn.Linear(hidden_dim, 2)

    def forward(self, input_ids: torch.Tensor) -> Tuple[torch.Tensor, torch.Tensor, torch.Tensor]:
        embeds = self.dropout(self.embedding(input_ids))
        mask = (input_ids != 0).unsqueeze(-1)
        attn_scores = self.attn_weights(embeds)
        attn_scores = attn_scores.masked_fill(~mask, -1e9)
        attn_probs = torch.softmax(attn_scores, dim=1)
        pooled = torch.sum(embeds * attn_probs, dim=1)

        features = self.fc_shared(pooled)
        cat_logits = self.category_head(features)
        topic_logits = self.topic_head(features)
        misc_logits = self.misconception_head(features)

        return cat_logits, topic_logits, misc_logits


class PedagogyClassifierService:
    """Manages CPU lifecycle and single-instance inference for QuantumPedagogyModel."""

    def __init__(self, artifacts_dir: Optional[Path] = None):
        self.is_available = False
        self.model: Optional[QuantumPedagogyModel] = None
        self.tokenizer: Optional[SimpleTokenizer] = None
        self.categories = CATEGORIES
        self.topics = TOPICS

        if artifacts_dir is None:
            # Resolve relative to project root
            base_dir = Path(__file__).resolve().parent.parent.parent
            artifacts_dir = base_dir / "training_artifacts" / "model"

        self.model_path = artifacts_dir / "quantumlearnai_model.pt"
        self.tokenizer_path = artifacts_dir / "tokenizer_config.json"
        self.config_path = artifacts_dir / "model_config.json"

        self._load_classifier()

    def _load_classifier(self) -> None:
        """Safely load tokenizer config and PyTorch checkpoint on CPU."""
        if not self.model_path.exists() or not self.tokenizer_path.exists():
            logger.info(f"Pedagogy classifier checkpoint not found at {self.model_path}. Operating in fallback mode.")
            return

        try:
            with open(self.tokenizer_path, "r", encoding="utf-8") as f:
                tok_cfg = json.load(f)

            vocab_size = tok_cfg.get("vocab_size", 2500)
            self.tokenizer = SimpleTokenizer(vocab_size=vocab_size)
            self.tokenizer.word2idx = tok_cfg.get("word2idx", self.tokenizer.word2idx)
            self.tokenizer.idx2word = {int(k): v for k, v in tok_cfg.get("idx2word", {}).items()}

            embed_dim = 64
            hidden_dim = 128
            if self.config_path.exists():
                with open(self.config_path, "r", encoding="utf-8") as f:
                    m_cfg = json.load(f)
                    embed_dim = m_cfg.get("embed_dim", 64)
                    hidden_dim = m_cfg.get("hidden_dim", 128)

            self.model = QuantumPedagogyModel(
                vocab_size=len(self.tokenizer.word2idx),
                embed_dim=embed_dim,
                hidden_dim=hidden_dim,
                num_categories=len(self.categories),
                num_topics=len(self.topics)
            )

            state_dict = torch.load(self.model_path, map_location="cpu")
            self.model.load_state_dict(state_dict)
            self.model.eval()
            self.is_available = True
            logger.info("QuantumPedagogyModel loaded successfully on CPU.")
        except Exception as e:
            logger.warning(f"Failed to initialize QuantumPedagogyModel: {e}. Falling back gracefully.")
            self.is_available = False
            self.model = None
            self.tokenizer = None

    def classify(self, query: str) -> Optional[Dict[str, Any]]:
        """Run inference on student query and produce category, topic, and misconception predictions."""
        if not self.is_available or self.model is None or self.tokenizer is None:
            return None

        if not query or not query.strip():
            return None

        try:
            tokens = self.tokenizer.encode(query, max_len=64)
            input_ids = torch.tensor([tokens], dtype=torch.long)

            with torch.no_grad():
                cat_logits, topic_logits, misc_logits = self.model(input_ids)

            cat_probs = torch.softmax(cat_logits, dim=-1).squeeze(0).tolist()
            topic_probs = torch.softmax(topic_logits, dim=-1).squeeze(0).tolist()
            misc_probs = torch.softmax(misc_logits, dim=-1).squeeze(0).tolist()

            pred_cat_idx = int(torch.argmax(cat_logits, dim=-1).item())
            pred_top_idx = int(torch.argmax(topic_logits, dim=-1).item())
            pred_misc_idx = int(torch.argmax(misc_logits, dim=-1).item())

            pred_category = self.categories[pred_cat_idx]
            pred_topic = self.topics[pred_top_idx]
            is_misconception = (pred_misc_idx == 1)

            category_scores = {self.categories[i]: round(cat_probs[i], 4) for i in range(len(self.categories))}
            topic_scores = {self.topics[i]: round(topic_probs[i], 4) for i in range(len(self.topics))}

            return {
                "predicted_category": pred_category,
                "category_confidence": round(cat_probs[pred_cat_idx], 4),
                "predicted_topic": pred_topic,
                "topic_confidence": round(topic_probs[pred_top_idx], 4),
                "is_misconception": is_misconception,
                "misconception_confidence": round(misc_probs[1], 4),
                "category_scores": category_scores,
                "topic_scores": topic_scores
            }
        except Exception as e:
            logger.warning(f"Pedagogy classification failed during inference: {e}")
            return None
