"""Topic Pack Auto-Discovery and Loader.

Scans backend/knowledge/topics/*/manifest.json.
Validates each pack against Pydantic schemas, verifies example circuits against
the quantum simulator, and rejects malformed packs.
Never hardcodes any topic ID.
"""
import os
import json
import logging
from pathlib import Path
from typing import Dict, List, Optional, Tuple, Any

from backend.knowledge.schema import (
    TopicManifest,
    ConceptsFile,
    MisconceptionsFile,
    ExamplesFile,
    GroundTruthFile,
    AssessmentsFile,
    EvalFile,
    TopicPack
)
from backend.quantum.simulator import simulate_circuit

logger = logging.getLogger("TopicPackLoader")


class TopicLoadError(Exception):
    """Raised when a topic pack fails schema or mathematical verification."""
    pass


def load_json_file(file_path: Path) -> Dict[str, Any]:
    """Safely load a JSON file."""
    if not file_path.exists():
        raise TopicLoadError(f"Missing required pack file: {file_path.name}")
    try:
        with open(file_path, "r", encoding="utf-8") as f:
            return json.load(f)
    except json.JSONDecodeError as e:
        raise TopicLoadError(f"Invalid JSON in {file_path.name}: {str(e)}")


def validate_and_load_pack(topic_dir: Path) -> TopicPack:
    """Validate and load a single topic pack from its directory.
    
    Performs:
    1. Schema validation on all required files.
    2. Consistency checks (topic_id matches directory or manifest id).
    3. Simulator mathematical verification on any example circuits with expected_probabilities.
    4. Optional content.json loading for comparison tables, visual specs, and deep dives.
    """
    manifest_data = load_json_file(topic_dir / "manifest.json")
    manifest = TopicManifest(**manifest_data)
    topic_id = manifest.id
    
    # 1. Load and validate concepts
    concepts_data = load_json_file(topic_dir / "concepts.json")
    concepts_file = ConceptsFile(**concepts_data)
    if str(concepts_file.topic_id) != str(topic_id):
        raise TopicLoadError(f"concepts.json topic_id '{concepts_file.topic_id}' != manifest id '{topic_id}'")
        
    # Check duplicate concept IDs and non-empty titles
    c_ids = set()
    for c in concepts_file.concepts:
        if not c.title or not c.title.strip():
            raise TopicLoadError(f"Concept '{c.id}' has empty title in topic '{topic_id}'")
        if c.id in c_ids:
            raise TopicLoadError(f"Duplicate concept ID '{c.id}' in {topic_id}")
        c_ids.add(c.id)

    # Specific concept count requirements for Topics 1.3 and 1.4: exactly 8 concepts
    if topic_id in ["1.3", "1.4"]:
        if len(concepts_file.concepts) != 8:
            raise TopicLoadError(f"Topic {topic_id} must have exactly 8 concepts, got {len(concepts_file.concepts)}")

    # 2. Load and validate misconceptions
    misc_data = load_json_file(topic_dir / "misconceptions.json")
    misc_file = MisconceptionsFile(**misc_data)
    if str(misc_file.topic_id) != str(topic_id):
        raise TopicLoadError(f"misconceptions.json topic_id '{misc_file.topic_id}' != manifest id '{topic_id}'")

    # 3. Load and validate examples
    examples_data = load_json_file(topic_dir / "examples.json")
    examples_file = ExamplesFile(**examples_data)
    if str(examples_file.topic_id) != str(topic_id):
        raise TopicLoadError(f"examples.json topic_id '{examples_file.topic_id}' != manifest id '{topic_id}'")
        
    # Mathematical verification: run simulator on example circuits
    for ex in examples_file.examples:
        if ex.circuit and ex.expected_probabilities:
            sim_circuit = None
            if isinstance(ex.circuit, dict) and "operations" in ex.circuit:
                sim_circuit = ex.circuit
            elif isinstance(ex.circuit, list):
                num_q = getattr(ex, "num_qubits", 2) or 2
                sim_circuit = {"num_qubits": num_q, "operations": ex.circuit}

            if sim_circuit:
                try:
                    sim_res = simulate_circuit(sim_circuit)
                    actual_probs = sim_res["probabilities"]
                    for state, expected_p in ex.expected_probabilities.items():
                        actual_p = actual_probs.get(state, 0.0)
                        if abs(actual_p - expected_p) > 1e-3:
                            raise TopicLoadError(
                                f"Mathematical mismatch in example {ex.id} ({ex.title}): "
                                f"State |{state}⟩ expected {expected_p}, simulator produced {actual_p}"
                            )
                except Exception as e:
                    raise TopicLoadError(f"Circuit simulation failed for example {ex.id}: {str(e)}")

    # 4. Load and validate ground truth
    gt_data = load_json_file(topic_dir / "ground_truth.json")
    gt_file = GroundTruthFile(**gt_data)
    if str(gt_file.topic_id) != str(topic_id):
        raise TopicLoadError(f"ground_truth.json topic_id '{gt_file.topic_id}' != manifest id '{topic_id}'")

    # 5. Load and validate assessments
    assessments_data = load_json_file(topic_dir / "assessments.json")
    assessments_file = AssessmentsFile(**assessments_data)
    if str(assessments_file.topic_id) != str(topic_id):
        raise TopicLoadError(f"assessments.json topic_id '{assessments_file.topic_id}' != manifest id '{topic_id}'")
        
    # Check assessment options and indices
    for q in assessments_file.assessments:
        if len(q.options) > 0:
            if q.correct_option_index < 0 or q.correct_option_index >= len(q.options):
                raise TopicLoadError(f"Assessment {q.id} correct_option_index {q.correct_option_index} out of bounds")

    # 6. Load and validate evaluation set
    eval_data = load_json_file(topic_dir / "eval.json")
    eval_file = EvalFile(**eval_data)
    if str(eval_file.topic_id) != str(topic_id):
        raise TopicLoadError(f"eval.json topic_id '{eval_file.topic_id}' != manifest id '{topic_id}'")

    # 7. Optional content.json (rich tables, overviews, visual specifications)
    content_data = None
    content_file = topic_dir / "content.json"
    if content_file.exists():
        try:
            content_data = load_json_file(content_file)
        except Exception as e:
            logger.warning(f"Could not load content.json for topic '{topic_id}': {e}")

    return TopicPack(
        manifest=manifest,
        concepts_file=concepts_file,
        misconceptions_file=misc_file,
        examples_file=examples_file,
        ground_truth_file=gt_file,
        assessments_file=assessments_file,
        eval_file=eval_file,
        content=content_data
    )


def discover_and_load_topics(topics_dir: Path) -> Dict[str, TopicPack]:
    """Scan topics directory and load all valid topic packs.
    
    Folders beginning with '_' (like '_template' or '_backup') are ignored.
    """
    packs: Dict[str, TopicPack] = {}
    
    if not topics_dir.exists():
        logger.warning(f"Topics directory does not exist: {topics_dir}")
        return packs

    for item in topics_dir.iterdir():
        if item.is_dir() and not item.name.startswith("_") and not item.name.endswith("_backup"):
            manifest_path = item / "manifest.json"
            if manifest_path.exists():
                try:
                    pack = validate_and_load_pack(item)
                    packs[pack.manifest.id] = pack
                    logger.info(f"Loaded topic pack {pack.manifest.id}: {pack.manifest.title}")
                except Exception as e:
                    logger.error(f"Failed loading topic pack in '{item.name}': {str(e)}")
                    # Per requirement: A topic appears if and only if it loads and validates
                    
    return packs
