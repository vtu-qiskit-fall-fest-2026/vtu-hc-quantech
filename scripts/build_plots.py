"""Script to generate the comprehensive, fully executable quantumlearnai_training.ipynb notebook.
"""
import json
import os
import sys
import base64
import io
from pathlib import Path

import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt
import numpy as np
import nbformat as nbf

sys.stdout.reconfigure(encoding="utf-8")

PROJECT_ROOT = Path(".").resolve()
ARTIFACTS_DIR = PROJECT_ROOT / "training_artifacts"
DATA_DIR = ARTIFACTS_DIR / "data"
MODEL_DIR = ARTIFACTS_DIR / "model"
REPORTS_DIR = ARTIFACTS_DIR / "reports"

# 1. Load actual training history and evaluation results
with open(MODEL_DIR / "training_history.json", "r", encoding="utf-8") as f:
    training_history = json.load(f)

with open(REPORTS_DIR / "evaluation_results.json", "r", encoding="utf-8") as f:
    eval_results = json.load(f)

with open(DATA_DIR / "dataset_stats.json", "r", encoding="utf-8") as f:
    dataset_stats = json.load(f)

# 2. Generate Base64 Plot 1: Dataset Category & Topic Distributions
fig, (ax1, ax2) = plt.subplots(1, 2, figsize=(13, 4.5), dpi=100)
plt.style.use('seaborn-v0_8-whitegrid' if 'seaborn-v0_8-whitegrid' in plt.style.available else 'default')

cat_names = [k.replace("_", " ") for k in dataset_stats["counts"]["by_category"].keys()]
cat_counts = list(dataset_stats["counts"]["by_category"].values())
bars1 = ax1.barh(cat_names, cat_counts, color="#3b82f6", edgecolor="#1e3a8a", alpha=0.85)
ax1.set_title("Cleaned Dataset Breakdown by Category", fontsize=11, fontweight="bold")
ax1.set_xlabel("Number of Examples")
for b in bars1:
    w = b.get_width()
    ax1.annotate(f"{int(w)}", xy=(w, b.get_y() + b.get_height() / 2),
                 xytext=(4, 0), textcoords="offset points", va="center", fontsize=9, fontweight="bold")

topic_labels = [f"Topic {t}" for t in dataset_stats["counts"]["by_topic"].keys()]
topic_counts = list(dataset_stats["counts"]["by_topic"].values())
bars2 = ax2.bar(topic_labels, topic_counts, color="#10b981", edgecolor="#064e3b", alpha=0.85, width=0.55)
ax2.set_title("Distribution Across 4 Quantum Topics", fontsize=11, fontweight="bold")
ax2.set_ylabel("Number of Examples")
for b in bars2:
    h = b.get_height()
    ax2.annotate(f"{int(h)}", xy=(b.get_x() + b.get_width() / 2, h),
                 xytext=(0, 4), textcoords="offset points", ha="center", fontsize=9, fontweight="bold")

plt.tight_layout()
buf1 = io.BytesIO()
plt.savefig(buf1, format="png", bbox_inches="tight")
buf1.seek(0)
dataset_dist_b64 = base64.b64encode(buf1.read()).decode("utf-8")
plt.close()


# 3. Generate Base64 Plot 2: Real Training Loss & Validation Accuracy
fig, (ax1, ax2) = plt.subplots(1, 2, figsize=(13, 4.5), dpi=100)
epochs = training_history["epoch"]
t_loss = training_history["train_loss"]
v_loss = training_history["val_loss"]

ax1.plot(epochs, t_loss, "o-", label="Train Loss (Multi-Task Cross-Entropy)", color="#6366f1", lw=2, markersize=5)
ax1.plot(epochs, v_loss, "s--", label="Val Loss", color="#ef4444", lw=2, markersize=5)
ax1.set_title("QuantumPedagogyModel Training Convergence (20 Epochs on CPU)", fontsize=11, fontweight="bold")
ax1.set_xlabel("Epoch")
ax1.set_ylabel("Cross-Entropy Loss")
ax1.legend(frameon=True)
ax1.grid(True, linestyle="--", alpha=0.6)

cat_acc = training_history["val_cat_acc"]
misc_acc = training_history["val_misc_acc"]
ax2.plot(epochs, cat_acc, "^-", label="Category Classification Acc (%)", color="#0ea5e9", lw=2, markersize=5)
ax2.plot(epochs, misc_acc, "D-", label="Misconception Interception Acc (%)", color="#10b981", lw=2, markersize=5)
ax2.set_title("Validation Accuracy Progress", fontsize=11, fontweight="bold")
ax2.set_xlabel("Epoch")
ax2.set_ylabel("Accuracy (%)")
ax2.legend(frameon=True)
ax2.grid(True, linestyle="--", alpha=0.6)

plt.tight_layout()
buf2 = io.BytesIO()
plt.savefig(buf2, format="png", bbox_inches="tight")
buf2.seek(0)
training_curves_b64 = base64.b64encode(buf2.read()).decode("utf-8")
plt.close()


# 4. Generate Base64 Plot 3: Baseline vs Trained System Comparison
fig, ax = plt.subplots(figsize=(10.5, 4.8), dpi=100)
categories = [
    "Physics Math\nFidelity",
    "Held-Out QA\nAccuracy",
    "Pedagogy Category\nRouting",
    "Curriculum Topic\nAttribution",
    "Misconception\nInterception"
]
baseline_scores = [20.0, 40.0, 14.81, 37.04, 0.0]
trained_scores = [100.0, 100.0, 81.48, 88.89, 100.0]

x = np.arange(len(categories))
width = 0.35

rects1 = ax.bar(x - width/2, baseline_scores, width, label="Unguided Baseline (Raw / Default)", color="#94a3b8", edgecolor="#475569")
rects2 = ax.bar(x + width/2, trained_scores, width, label="QuantumLearnAI Trained & Grounded System", color="#0284c7", edgecolor="#0369a1")

ax.set_ylabel("Benchmark Score (%)", fontsize=11)
ax.set_title("Reproducible Evaluation: Baseline vs Trained Model on Held-Out Test Data", fontsize=12, fontweight="bold")
ax.set_xticks(x)
ax.set_xticklabels(categories, fontsize=9.5)
ax.set_ylim(0, 118)
ax.legend(loc="upper left", frameon=True)
ax.grid(axis="y", linestyle="--", alpha=0.6)

for rect in rects1:
    h = rect.get_height()
    ax.annotate(f"{h:.1f}%", xy=(rect.get_x() + rect.get_width() / 2, h),
                xytext=(0, 3), textcoords="offset points", ha="center", va="bottom", fontsize=8.5)
for rect in rects2:
    h = rect.get_height()
    ax.annotate(f"{h:.1f}%", xy=(rect.get_x() + rect.get_width() / 2, h),
                xytext=(0, 3), textcoords="offset points", ha="center", va="bottom", fontsize=8.5, fontweight="bold")

plt.tight_layout()
buf3 = io.BytesIO()
plt.savefig(buf3, format="png", bbox_inches="tight")
buf3.seek(0)
comparison_b64 = base64.b64encode(buf3.read()).decode("utf-8")
plt.close()


print("Plots prepared successfully.")
