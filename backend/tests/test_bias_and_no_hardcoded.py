"""Bias and Hardcoding Verification Test.

Enforces Principle 2: The platform is topic-agnostic.
Topic 1.1 is the first content pack, not a special case.
No code path, prompt, validator rule, UI component, or route may hardcode
anything specific to Topic 1.1 outside content files.
"""
import re
import unittest
from pathlib import Path

ROOT_DIR = Path(__file__).resolve().parent.parent.parent


class TestNoHardcodedTopicStrings(unittest.TestCase):
    """Scans codebase to verify zero topic-specific hardcoding outside content files."""

    FORBIDDEN_LITERAL_STRINGS = [
        '"1.1"',
        "'1.1'",
        "What Is Quantum Computing",
        "what is quantum computing"
    ]

    def test_no_hardcoded_topic_strings_in_backend(self):
        backend_dir = ROOT_DIR / "backend"
        # Folders to check strictly: api, ai, quantum, knowledge (excluding topics/)
        dirs_to_check = [
            backend_dir / "api",
            backend_dir / "ai",
            backend_dir / "quantum",
            backend_dir / "models"
        ]
        
        # Also check knowledge/loader.py, registry.py, retriever.py
        files_to_check = [
            backend_dir / "knowledge" / "loader.py",
            backend_dir / "knowledge" / "registry.py",
            backend_dir / "knowledge" / "retriever.py",
            backend_dir / "knowledge" / "schema.py",
            backend_dir / "main.py"
        ]
        
        for d in dirs_to_check:
            if d.exists():
                for p in d.rglob("*.py"):
                    files_to_check.append(p)

        violations = []
        for file_path in files_to_check:
            if not file_path.exists():
                continue
            content = file_path.read_text(encoding="utf-8")
            for forbidden in self.FORBIDDEN_LITERAL_STRINGS:
                if forbidden.lower() in content.lower():
                    # Ignore harmless type annotations or comments if any, but flag code
                    violations.append(f"{file_path.relative_to(ROOT_DIR)}: found '{forbidden}'")

        self.assertEqual(
            violations,
            [],
            f"Found topic-specific hardcoding in backend code:\n" + "\n".join(violations)
        )

    def test_no_hardcoded_topic_strings_in_frontend(self):
        src_dir = ROOT_DIR / "src"
        if not src_dir.exists():
            return

        violations = []
        for file_path in src_dir.rglob("*"):
            if file_path.suffix in [".js", ".jsx", ".ts", ".tsx"]:
                content = file_path.read_text(encoding="utf-8")
                for forbidden in self.FORBIDDEN_LITERAL_STRINGS:
                    if forbidden in content:
                        violations.append(f"{file_path.relative_to(ROOT_DIR)}: found '{forbidden}'")

        self.assertEqual(
            violations,
            [],
            f"Found topic-specific hardcoding in frontend code:\n" + "\n".join(violations)
        )


if __name__ == "__main__":
    unittest.main()
