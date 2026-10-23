import React, { useState } from 'react';
import {
  Briefcase,
  TrendingUp,
  DollarSign,
  Award,
  Presentation,
  CheckCircle2,
  Copy,
  Check,
  ShieldCheck,
  Building2,
  Users
} from 'lucide-react';

export default function BusinessDossier() {
  const [activeSection, setActiveSection] = useState('financials'); // 'financials', 'markets', 'seed', 'pitch'
  const [copiedPitch, setCopiedPitch] = useState(false);

  const pitchScript = `[Slide 1 : The Problem] "Good morning, judges. India's National Quantum Mission has committed Rs 6,003 Crores to build our quantum future, but our universities face an impossible bottleneck: over 300,000 engineering students must learn quantum computing, but colleges cannot afford $1.60/shot cloud QPU fees, and college lab computers crash when students try installing 4-gigabyte Python environments."

[Slide 2 : The Solution] "That is why we built QuantaLearn AI: the first browser-native quantum education and enterprise upskilling platform. By executing statevector math and WebGL 3D physics directly in the client's browser, QuantaLearn requires zero installation, works on any computer, and costs us zero marginal server bills."

[Slide 3 : Dual Quantum + AI Convergence] "We achieve 100% bidirectional convergence: Quantum for AI via our in-browser VQC studio with analytical parameter-shift gradients, a Quantum Support Vector Machine computing real Hilbert space kernel matrices, and drop-in PyTorch TorchLayer exports. On the flip side, AI for Quantum features an Autonomous Architecture Search agent that discovers minimal-depth Clifford+T circuits automatically."

[Slide 4 : The Dual-Market Business Model] "Our business monetizes across two high-margin B2B streams: Market A is Higher Education B2B SaaS at Rs 4.5 Lakhs per campus per year, providing automated circuit grading and NBA/NAAC accreditation compliance. Market B is Enterprise IT Workforce Reskilling at Rs 22 Lakhs per 40-engineer corporate cohort, turning classical AI developers into hybrid quantum engineers for TCS, Infosys, and global GCCs."

[Slide 5 : The Zero-Cost Moat & Financials] "Because our architecture runs 100% client-side, serving 10,000 students costs under Rs 2,000/month. This yields a 96.2% software gross margin, an LTV-to-CAC ratio of 33 to 1, and payback in 1.1 months. We scale from Rs 1.25 Crores in Year 1 to Rs 16.8 Crores ARR by Year 3 at a 72% EBITDA margin."

[Slide 6 : The Ask] "We are raising a Seed round of Rs 2.0 Crores for 20% equity, alongside National Quantum Mission non-dilutive grants, to deploy our academic sales force and lock in 200 campuses across India. Thank you."`;

  const handleCopyPitch = () => {
    navigator.clipboard.writeText(pitchScript);
    setCopiedPitch(true);
    setTimeout(() => setCopiedPitch(false), 2000);
  };

  return (
    <div className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8 space-y-6 max-w-7xl mx-auto w-full">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-slate-200 dark:border-slate-800">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold tracking-wide uppercase bg-emerald-100 dark:bg-emerald-950/80 text-emerald-700 dark:text-emerald-300">
              Smart India Hackathon 2026 : SIH26140 : Team AI ASTRA
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-slate-100 tracking-tight">
            Master Business Dossier & Unit Economics
          </h1>
          <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
            Dual B2B SaaS Model, 96.2% Software Gross Margin, 3-Year Projections, and 5-Minute Investor Pitch Script.
          </p>
        </div>
      </div>

      {/* Nav Tabs */}
      <div className="flex flex-wrap items-center gap-2 p-1.5 rounded-2xl bg-slate-100 dark:bg-slate-900/80 border border-slate-200/80 dark:border-slate-800">
        {[
          { id: 'financials', label: 'Unit Economics & 3-Year ARR', icon: TrendingUp },
          { id: 'markets', label: 'Dual-Market B2B Vectors', icon: Building2 },
          { id: 'seed', label: 'Seed Round & NQM Grants', icon: DollarSign },
          { id: 'pitch', label: '5-Minute Executive Pitch Script', icon: Presentation }
        ].map(tab => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveSection(tab.id)}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                activeSection === tab.id
                  ? 'bg-white dark:bg-slate-800 text-indigo-600 dark:text-indigo-400 shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* Section 1: Financials */}
      {activeSection === 'financials' && (
        <div className="space-y-6">
          {/* Key KPI Highlights */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="p-4 rounded-2xl bg-white dark:bg-[#161B26] border border-slate-200 dark:border-slate-800 shadow-sm">
              <span className="text-xs text-slate-500 font-semibold block">Gross Software Margin</span>
              <span className="text-2xl font-black text-emerald-600 font-mono mt-1 block">96.2%</span>
              <span className="text-[11px] text-slate-400 mt-1 block">Zero cloud GPU server fees via browser runtime</span>
            </div>
            <div className="p-4 rounded-2xl bg-white dark:bg-[#161B26] border border-slate-200 dark:border-slate-800 shadow-sm">
              <span className="text-xs text-slate-500 font-semibold block">Year 3 Commercial ARR</span>
              <span className="text-2xl font-black text-indigo-600 dark:text-indigo-400 font-mono mt-1 block">Rs 16.80 Cr</span>
              <span className="text-[11px] text-slate-400 mt-1 block">$2.02M USD run-rate across 200 campuses</span>
            </div>
            <div className="p-4 rounded-2xl bg-white dark:bg-[#161B26] border border-slate-200 dark:border-slate-800 shadow-sm">
              <span className="text-xs text-slate-500 font-semibold block">LTV to CAC Ratio</span>
              <span className="text-2xl font-black text-slate-800 dark:text-slate-200 font-mono mt-1 block">33.8 : 1</span>
              <span className="text-[11px] text-slate-400 mt-1 block">LTV: Rs 14.2L vs CAC: Rs 42K</span>
            </div>
            <div className="p-4 rounded-2xl bg-white dark:bg-[#161B26] border border-slate-200 dark:border-slate-800 shadow-sm">
              <span className="text-xs text-slate-500 font-semibold block">Payback Period</span>
              <span className="text-2xl font-black text-emerald-600 font-mono mt-1 block">1.1 Months</span>
              <span className="text-[11px] text-slate-400 mt-1 block">Breakeven achieved at Month 8</span>
            </div>
          </div>

          {/* 3-Year Projections Table */}
          <div className="p-5 rounded-2xl bg-white dark:bg-[#161B26] border border-slate-200 dark:border-slate-800 shadow-sm overflow-x-auto">
            <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 mb-4">
              Three-Year Financial Engine (FY27 - FY29)
            </h3>
            <table className="w-full text-xs text-left">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-500">
                  <th className="pb-3 font-semibold">Financial Metric</th>
                  <th className="pb-3 font-semibold">Year 1 (FY27)</th>
                  <th className="pb-3 font-semibold">Year 2 (FY28)</th>
                  <th className="pb-3 font-semibold">Year 3 (FY29)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-mono">
                <tr>
                  <td className="py-2.5 font-sans font-medium text-slate-800 dark:text-slate-200">Academic Campus Licenses</td>
                  <td className="py-2.5">20 campuses</td>
                  <td className="py-2.5">70 campuses</td>
                  <td className="py-2.5 font-bold text-indigo-600">200 campuses</td>
                </tr>
                <tr>
                  <td className="py-2.5 font-sans font-medium text-slate-800 dark:text-slate-200">Enterprise Corporate Cohorts</td>
                  <td className="py-2.5">2 cohorts</td>
                  <td className="py-2.5">10 cohorts</td>
                  <td className="py-2.5 font-bold text-indigo-600">32 cohorts</td>
                </tr>
                <tr>
                  <td className="py-2.5 font-sans font-medium text-slate-800 dark:text-slate-200">Total Gross Revenue</td>
                  <td className="py-2.5">Rs 1.25 Crore</td>
                  <td className="py-2.5">Rs 5.40 Crore</td>
                  <td className="py-2.5 font-bold text-emerald-600">Rs 16.80 Crore</td>
                </tr>
                <tr>
                  <td className="py-2.5 font-sans font-medium text-slate-800 dark:text-slate-200">Gross Profit (96% Margin)</td>
                  <td className="py-2.5">Rs 1.20 Crore</td>
                  <td className="py-2.5">Rs 5.22 Crore</td>
                  <td className="py-2.5 font-bold text-emerald-600">Rs 16.32 Crore</td>
                </tr>
                <tr>
                  <td className="py-2.5 font-sans font-medium text-slate-800 dark:text-slate-200">Total Operating Expenses</td>
                  <td className="py-2.5">Rs 1.00 Crore</td>
                  <td className="py-2.5">Rs 1.89 Crore</td>
                  <td className="py-2.5">Rs 4.15 Crore</td>
                </tr>
                <tr className="bg-slate-50 dark:bg-slate-900/60 font-bold">
                  <td className="py-2.5 px-2 font-sans text-slate-900 dark:text-slate-100">EBITDA Operating Profit</td>
                  <td className="py-2.5 px-2 text-indigo-600">Rs 20.2 Lakhs (16.1%)</td>
                  <td className="py-2.5 px-2 text-indigo-600">Rs 3.33 Crore (61.6%)</td>
                  <td className="py-2.5 px-2 text-emerald-600">Rs 12.17 Crore (72.4%)</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Section 2: Dual Markets */}
      {activeSection === 'markets' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="p-6 rounded-2xl bg-white dark:bg-[#161B26] border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
            <div className="flex items-center gap-2">
              <span className="w-8 h-8 rounded-lg bg-indigo-50 dark:bg-indigo-950 flex items-center justify-center text-indigo-600">
                <Building2 className="w-4 h-4" />
              </span>
              <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
                Market A : Higher Education B2B SaaS
              </h3>
            </div>
            <div className="text-xs space-y-2 text-slate-600 dark:text-slate-400">
              <p><strong className="text-slate-900 dark:text-slate-100">Target Customer:</strong> 3,500+ AICTE-approved engineering institutions, IITs, NITs, and state universities.</p>
              <p><strong className="text-slate-900 dark:text-slate-100">Regulatory Driver:</strong> Mandated quantum computing under NEP 2020 and NBA/NAAC accreditation criteria.</p>
              <p><strong className="text-slate-900 dark:text-slate-100">Product:</strong> Campus Lab License with automated circuit grading and LMS integration.</p>
              <p><strong className="text-slate-900 dark:text-slate-100">Annual Pricing:</strong> Rs 3,50,000 to Rs 6,50,000 / campus / year.</p>
            </div>
          </div>

          <div className="p-6 rounded-2xl bg-white dark:bg-[#161B26] border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
            <div className="flex items-center gap-2">
              <span className="w-8 h-8 rounded-lg bg-emerald-50 dark:bg-emerald-950 flex items-center justify-center text-emerald-600">
                <Users className="w-4 h-4" />
              </span>
              <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
                Market B : Enterprise IT Workforce Reskilling
              </h3>
            </div>
            <div className="text-xs space-y-2 text-slate-600 dark:text-slate-400">
              <p><strong className="text-slate-900 dark:text-slate-100">Target Customer:</strong> IT services giants (TCS, Infosys, Wipro, HCL, Cognizant), GCCs, Fintech, Defense labs.</p>
              <p><strong className="text-slate-900 dark:text-slate-100">Commercial Driver:</strong> Enterprise clients demanding quantum proof-of-concept projects; classical AI engineers require QML upskilling.</p>
              <p><strong className="text-slate-900 dark:text-slate-100">Product:</strong> 6-Week Enterprise Cohort from PyTorch to hybrid QML with PennyLane.</p>
              <p><strong className="text-slate-900 dark:text-slate-100">Cohort Pricing:</strong> Rs 18,00,000 to Rs 30,00,000 / 40-engineer corporate cohort.</p>
            </div>
          </div>
        </div>
      )}

      {/* Section 3: Seed Round & Grants */}
      {activeSection === 'seed' && (
        <div className="p-6 rounded-2xl bg-white dark:bg-[#161B26] border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
          <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
            Seed Equity Round & Non-Dilutive Grant Pipeline
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 pt-2">
            <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800">
              <span className="text-xs font-bold text-indigo-600 block">Seed Equity Round</span>
              <span className="text-lg font-mono font-black text-slate-900 dark:text-slate-100 mt-1 block">Rs 2.0 Crore</span>
              <span className="text-[11px] text-slate-500 block mt-1">20% Equity @ Rs 10 Cr Post-Money Valuation</span>
            </div>
            <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800">
              <span className="text-xs font-bold text-emerald-600 block">National Quantum Mission</span>
              <span className="text-lg font-mono font-black text-slate-900 dark:text-slate-100 mt-1 block">Rs 1.0 - 1.5 Cr</span>
              <span className="text-[11px] text-slate-500 block mt-1">Non-dilutive grant for indigenous quantum software</span>
            </div>
            <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800">
              <span className="text-xs font-bold text-emerald-600 block">Startup India (SISFS)</span>
              <span className="text-lg font-mono font-black text-slate-900 dark:text-slate-100 mt-1 block">Rs 50 Lakhs</span>
              <span className="text-[11px] text-slate-500 block mt-1">Tier-2/3 college multi-campus pilot deployment</span>
            </div>
            <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800">
              <span className="text-xs font-bold text-emerald-600 block">MeitY TIDE 2.0</span>
              <span className="text-lg font-mono font-black text-slate-900 dark:text-slate-100 mt-1 block">Rs 10 - 30 Lakhs</span>
              <span className="text-[11px] text-slate-500 block mt-1">Deep-tech patent filing on in-browser statevector simulation</span>
            </div>
          </div>
        </div>
      )}

      {/* Section 4: Pitch Script */}
      {activeSection === 'pitch' && (
        <div className="p-6 rounded-2xl bg-white dark:bg-[#161B26] border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
          <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
                5-Minute Executive Pitch Script (Grand Finale & Investor Delivery)
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Optimized verbatim delivery script for hackathon juries and venture capital partners.
              </p>
            </div>
            <button
              type="button"
              onClick={handleCopyPitch}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold transition-all cursor-pointer"
            >
              {copiedPitch ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copiedPitch ? 'Copied Pitch' : 'Copy Pitch Script'}</span>
            </button>
          </div>

          <div className="p-4 rounded-xl bg-slate-900 text-slate-100 text-xs font-mono whitespace-pre-wrap leading-relaxed">
            {pitchScript}
          </div>
        </div>
      )}
    </div>
  );
}
