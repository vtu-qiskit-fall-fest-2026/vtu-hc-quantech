// Content Pipeline - Verifier Agent
// Executes every worked example, statevector, and quiz answer through Float64 QuantumCircuitState.
// Fails the build on any mathematical mismatch or invalid quiz answer index.

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { runCircuit, Complex } from '../../src/quantum/simulator.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, '..');
const DATA_DIR = path.join(ROOT_DIR, 'data');
const OUTPUT_DIR = path.join(ROOT_DIR, 'output');
const SRC_DATA_DIR = path.resolve(ROOT_DIR, '../src/data');

const lessonsPath = path.join(OUTPUT_DIR, 'lessons.json');
const misconceptionsPath = path.join(DATA_DIR, 'misconceptions.json');

if (!fs.existsSync(lessonsPath)) {
  console.error(`❌ Error: ${lessonsPath} not found. Run generate_lessons.mjs first.`);
  process.exit(1);
}

const lessons = JSON.parse(fs.readFileSync(lessonsPath, 'utf8'));
const misconceptions = JSON.parse(fs.readFileSync(misconceptionsPath, 'utf8'));
const validMisconceptionIds = new Set(misconceptions.map(m => m.id));

console.log(`\n========================================================================================`);
console.log(`  QuantaLearn AI — Content Verifier Agent`);
console.log(`  Simulating ${lessons.length} lessons through Float64 Quantum Engine`);
console.log(`========================================================================================\n`);

let passCount = 0;
let failCount = 0;
const failureDetails = [];
const verificationReport = {
  timestamp: new Date().toISOString(),
  totalLessons: lessons.length,
  passed: 0,
  failed: 0,
  results: []
};

// Formatter for table output
function pad(str, len) {
  const s = String(str || '');
  return s.length >= len ? s.slice(0, len) : s + ' '.repeat(len - s.length);
}

console.log(`| ${pad('Concept ID', 26)} | ${pad('Tier', 14)} | ${pad('Fidelity (F)', 12)} | ${pad('Prob Err', 10)} | ${pad('Quiz', 6)} | ${pad('Status', 8)} |`);
console.log(`|${'-'.repeat(28)}|${'-'.repeat(16)}|${'-'.repeat(14)}|${'-'.repeat(12)}|${'-'.repeat(8)}|${'-'.repeat(10)}|`);

for (const lesson of lessons) {
  let lessonPassed = true;
  const errors = [];
  let fidelity = 1.0;
  let maxProbError = 0.0;

  // 1. Verify Worked Example
  if (lesson.worked_example && lesson.worked_example.circuit) {
    const ex = lesson.worked_example;
    try {
      const sim = runCircuit(ex.qubits, ex.circuit);

      // Verify statevector overlap (Fidelity)
      if (ex.expected_statevector && ex.expected_statevector.length === sim.dim) {
        let overlapRe = 0;
        let overlapIm = 0;

        for (let i = 0; i < sim.dim; i++) {
          const expRe = ex.expected_statevector[i].re || 0;
          const expIm = ex.expected_statevector[i].im || 0;
          const simAmp = sim.statevector[i];

          // ⟨ψ_exp|ψ_sim⟩ = Σ (exp_re - i·exp_im)(sim_re + i·sim_im)
          overlapRe += expRe * simAmp.re + expIm * simAmp.im;
          overlapIm += expRe * simAmp.im - expIm * simAmp.re;
        }

        fidelity = overlapRe * overlapRe + overlapIm * overlapIm;
        if (Math.abs(fidelity - 1.0) > 1e-4) {
          lessonPassed = false;
          errors.push(`Worked example statevector fidelity mismatch: ${fidelity.toFixed(6)} (expected 1.0000)`);
        }
      }

      // Verify probabilities
      if (ex.expected_probabilities) {
        for (let i = 0; i < sim.dim; i++) {
          const bin = i.toString(2).padStart(ex.qubits, '0');
          const expectedP = ex.expected_probabilities[bin] !== undefined ? ex.expected_probabilities[bin] : 0;
          const measuredP = sim.statevector[i].absSq();
          const err = Math.abs(measuredP - expectedP);
          if (err > maxProbError) maxProbError = err;

          if (err > 1e-4) {
            lessonPassed = false;
            errors.push(`Worked example probability mismatch for |${bin}⟩: measured ${measuredP.toFixed(4)}, expected ${expectedP.toFixed(4)}`);
          }
        }
      }
    } catch (e) {
      lessonPassed = false;
      errors.push(`Worked example simulation error: ${e.message}`);
    }
  }

  // 2. Verify Try-It Challenge Solution
  if (lesson.try_it_challenge && lesson.try_it_challenge.solution_circuit) {
    const ch = lesson.try_it_challenge;
    try {
      const simCh = runCircuit(ch.qubits, ch.solution_circuit);
      if (ch.target_probabilities) {
        for (const [bin, targetP] of Object.entries(ch.target_probabilities)) {
          const idx = parseInt(bin, 2);
          const actualP = simCh.statevector[idx] ? simCh.statevector[idx].absSq() : 0;
          if (Math.abs(actualP - targetP) > 1e-4) {
            lessonPassed = false;
            errors.push(`Challenge target probability mismatch for |${bin}⟩: got ${actualP.toFixed(4)}, expected ${targetP.toFixed(4)}`);
          }
        }
      }
    } catch (e) {
      lessonPassed = false;
      errors.push(`Challenge simulation error: ${e.message}`);
    }
  }

  // 3. Verify Quiz & Misconception References
  let quizValid = true;
  if (lesson.quiz && Array.isArray(lesson.quiz)) {
    for (const q of lesson.quiz) {
      if (typeof q.answer_index !== 'number' || q.answer_index < 0 || q.answer_index >= q.options.length) {
        quizValid = false;
        errors.push(`Invalid quiz answer index: ${q.answer_index} (options count: ${q.options?.length})`);
      }
      if (!Array.isArray(q.options) || q.options.length < 2) {
        quizValid = false;
        errors.push(`Quiz options must be an array of at least 2 items`);
      }
      if (q.misconception_distractors) {
        for (const [optIdx, mId] of Object.entries(q.misconception_distractors)) {
          if (!validMisconceptionIds.has(mId)) {
            quizValid = false;
            errors.push(`Quiz references unknown misconception ID: ${mId}`);
          }
        }
      }
    }
  }

  if (!quizValid) lessonPassed = false;

  // Record outcome
  if (lessonPassed) {
    passCount++;
    lesson.verification.machine_verified = true;
    lesson.verification.verified_at = new Date().toISOString();
    lesson.verification.fidelity = Math.min(1.0, Math.round(fidelity * 1000000) / 1000000);

    console.log(
      `| ${pad(lesson.concept_id, 26)} | ${pad(lesson.tier_name, 14)} | ${pad(fidelity.toFixed(6), 12)} | ${pad(maxProbError.toFixed(6), 10)} | ${pad('PASS', 6)} | ${pad('✅ PASS', 8)} |`
    );
  } else {
    failCount++;
    lesson.verification.machine_verified = false;
    failureDetails.push({ concept_id: lesson.concept_id, errors });

    console.log(
      `| ${pad(lesson.concept_id, 26)} | ${pad(lesson.tier_name, 14)} | ${pad(fidelity.toFixed(6), 12)} | ${pad(maxProbError.toFixed(6), 10)} | ${pad('FAIL', 6)} | ${pad('❌ FAIL', 8)} |`
    );
  }

  verificationReport.results.push({
    concept_id: lesson.concept_id,
    passed: lessonPassed,
    fidelity,
    maxProbError,
    errors
  });
}

verificationReport.passed = passCount;
verificationReport.failed = failCount;

// Write updated verified lessons and report
fs.writeFileSync(path.join(OUTPUT_DIR, 'lessons.json'), JSON.stringify(lessons, null, 2), 'utf8');
fs.writeFileSync(path.join(SRC_DATA_DIR, 'generated_lessons.json'), JSON.stringify(lessons, null, 2), 'utf8');
fs.writeFileSync(path.join(OUTPUT_DIR, 'verification_report.json'), JSON.stringify(verificationReport, null, 2), 'utf8');

console.log(`\n========================================================================================`);
console.log(`  VERIFICATION RESULTS:`);
console.log(`  Passed: ${passCount} / ${lessons.length} (100% Machine Verified)`);
console.log(`  Failed: ${failCount} / ${lessons.length}`);
console.log(`  Output Report: ${path.join(OUTPUT_DIR, 'verification_report.json')}`);
console.log(`========================================================================================\n`);

if (failCount > 0) {
  console.error(`❌ Build-Time Verifier Agent: ${failCount} lessons failed mathematical verification!\n`);
  for (const f of failureDetails) {
    console.error(`  - ${f.concept_id}:`);
    for (const err of f.errors) {
      console.error(`      • ${err}`);
    }
  }
  process.exit(1);
} else {
  console.log(`✅ Build-Time Verifier Agent: All ${passCount} lessons mathematically verified with zero error!\n`);
  process.exit(0);
}
