"use client";

import { useEffect, useState } from "react";
import {
  BrainCircuit,
  Cpu,
  CheckCircle2,
  AlertTriangle,
  Play,
  RotateCcw,
  Sparkles,
  Layers,
  Activity,
  ShieldCheck,
  Info,
} from "lucide-react";
import { fetchModelStatus, apiPost, type ModelStatusResponse } from "@/lib/api";

interface AnalyzeApiResponse {
  result?: string;
  anomaly_score?: number | null;
  explanation?: string;
  data_quality_status?: string;
  predictions?: Record<string, unknown> | null;
  temperature_c?: number;
}

export default function AiAnalysisView() {
  const [modelStatus, setModelStatus] = useState<ModelStatusResponse | null>(null);
  const [loading, setLoading] = useState(true);

  // Anomaly screening simulation form
  const [hr, setHr] = useState<number>(75);
  const [spo2, setSpo2] = useState<number>(98.5);
  const [temp, setTemp] = useState<number>(36.6);
  const [ecg, setEcg] = useState<string>("0.12");
  const [bpSys, setBpSys] = useState<string>("120");
  const [bpDia, setBpDia] = useState<string>("80");

  const [analyzing, setAnalyzing] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<AnalyzeApiResponse | null>(null);
  const [analysisError, setAnalysisError] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      const res = await fetchModelStatus();
      if (res.ok) setModelStatus(res.data);
      setLoading(false);
    }
    load();
  }, []);

  const handleRunAnalysis = async (e: React.FormEvent) => {
    e.preventDefault();
    setAnalyzing(true);
    setAnalysisError(null);
    setAnalysisResult(null);

    const payload: Record<string, number | null> = {
      heart_rate_bpm: Number(hr),
      spo2_percent: Number(spo2),
      temperature_c: Number(temp),
      ecg: ecg.trim() ? Number(ecg) : null,
      bp_systolic: bpSys.trim() ? Number(bpSys) : null,
      bp_diastolic: bpDia.trim() ? Number(bpDia) : null,
    };

    const res = await apiPost<AnalyzeApiResponse>(
      "/api/v1/devices/esp32_device_01/analyze?save_to_db=false",
      payload
    );

    if (res.ok) {
      setAnalysisResult(res.data);
    } else {
      setAnalysisError(res.message);
    }
    setAnalyzing(false);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <section className="glass flex flex-wrap items-center justify-between gap-4 p-6">
        <div>
          <div className="flex items-center gap-2">
            <BrainCircuit className="text-violet" size={24} />
            <h2 className="text-xl font-bold">Multi-Model AI Clinical Anomaly Screening</h2>
          </div>
          <p className="mt-1 text-sm text-muted">
            Ensemble pipeline combining Isolation Forest, One-Class SVM, and Deep PyTorch Autoencoder.
          </p>
        </div>
        {modelStatus?.all_loaded && (
          <div className="flex items-center gap-2 bg-ok/20 border border-ok/30 px-3.5 py-2 rounded-xl text-ok text-xs font-bold">
            <CheckCircle2 size={16} />
            <span>All 3 Pre-Trained AI Models Active</span>
          </div>
        )}
      </section>

      {/* Model Spec Cards */}
      <section className="grid gap-4 sm:grid-cols-3">
        <div className="glass p-5 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="font-bold text-white text-sm">Isolation Forest</span>
              <span className="text-[10px] text-ok bg-ok/20 px-2 py-0.5 rounded-full font-mono font-semibold">
                ACTIVE
              </span>
            </div>
            <p className="text-xs text-muted leading-relaxed">
              Tree-based ensemble designed for rapid physiological outlier isolation and multi-dimensional boundary detection.
            </p>
          </div>
          <div className="mt-4 pt-3 border-t border-white/10 text-[11px] text-muted font-mono">
            Features: [HR, SpO2, ECG, BP_Sys, BP_Dia]
          </div>
        </div>

        <div className="glass p-5 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="font-bold text-white text-sm">One-Class SVM</span>
              <span className="text-[10px] text-ok bg-ok/20 px-2 py-0.5 rounded-full font-mono font-semibold">
                ACTIVE
              </span>
            </div>
            <p className="text-xs text-muted leading-relaxed">
              Non-linear RBF kernel boundary separator mapping normal vital distributions into high-dimensional space.
            </p>
          </div>
          <div className="mt-4 pt-3 border-t border-white/10 text-[11px] text-muted font-mono">
            Kernel: Radial Basis Function (RBF)
          </div>
        </div>

        <div className="glass p-5 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="font-bold text-white text-sm">PyTorch Autoencoder</span>
              <span className="text-[10px] text-ok bg-ok/20 px-2 py-0.5 rounded-full font-mono font-semibold">
                ACTIVE
              </span>
            </div>
            <p className="text-xs text-muted leading-relaxed">
              Deep bottleneck neural network measuring reconstruction Mean Squared Error (MSE) against learned physiological manifolds.
            </p>
          </div>
          <div className="mt-4 pt-3 border-t border-white/10 text-[11px] text-cyan font-mono">
            Threshold: {modelStatus?.models.autoencoder?.threshold ? modelStatus.models.autoencoder.threshold.toFixed(4) : "0.9227"}
          </div>
        </div>
      </section>

      {/* Interactive Model Screening Console */}
      <section className="glass p-6">
        <div className="flex items-center justify-between pb-4 border-b border-white/10 mb-6">
          <div className="flex items-center gap-2">
            <Sparkles className="text-cyan" size={18} />
            <h3 className="font-bold">Live AI Model Inference Test Console</h3>
          </div>
          <span className="text-xs text-muted font-mono">Endpoint: /api/v1/devices/{`{device_id}`}/analyze</span>
        </div>

        <form onSubmit={handleRunAnalysis} className="space-y-6">
          <div className="grid gap-4 sm:grid-cols-3">
            <div>
              <label className="text-xs font-bold text-muted block mb-1">Heart Rate (BPM)</label>
              <input
                type="number"
                value={hr}
                onChange={(e) => setHr(Number(e.target.value))}
                className="field font-mono"
                required
              />
            </div>
            <div>
              <label className="text-xs font-bold text-muted block mb-1">SpO₂ (%)</label>
              <input
                type="number"
                step="0.1"
                value={spo2}
                onChange={(e) => setSpo2(Number(e.target.value))}
                className="field font-mono"
                required
              />
            </div>
            <div>
              <label className="text-xs font-bold text-muted block mb-1">Temperature (°C)</label>
              <input
                type="number"
                step="0.1"
                value={temp}
                onChange={(e) => setTemp(Number(e.target.value))}
                className="field font-mono"
                required
              />
            </div>
            <div>
              <label className="text-xs font-bold text-muted block mb-1">ECG Normalized (optional)</label>
              <input
                type="text"
                placeholder="e.g. 0.12 or leave empty"
                value={ecg}
                onChange={(e) => setEcg(e.target.value)}
                className="field font-mono"
              />
            </div>
            <div>
              <label className="text-xs font-bold text-muted block mb-1">Systolic BP (mmHg)</label>
              <input
                type="text"
                placeholder="e.g. 120 or leave empty"
                value={bpSys}
                onChange={(e) => setBpSys(e.target.value)}
                className="field font-mono"
              />
            </div>
            <div>
              <label className="text-xs font-bold text-muted block mb-1">Diastolic BP (mmHg)</label>
              <input
                type="text"
                placeholder="e.g. 80 or leave empty"
                value={bpDia}
                onChange={(e) => setBpDia(e.target.value)}
                className="field font-mono"
              />
            </div>
          </div>

          <div className="flex items-center justify-between pt-2">
            <p className="text-xs text-muted max-w-md">
              Tests live inference against the deployed backend models without overwriting the production patient record.
            </p>
            <button
              type="submit"
              disabled={analyzing}
              className="btn flex items-center gap-2"
            >
              <Play size={14} className={analyzing ? "animate-spin" : ""} />
              <span>{analyzing ? "Evaluating Ensemble..." : "Execute Model Inference"}</span>
            </button>
          </div>
        </form>

        {/* Live Inference Output Display */}
        {analysisError && (
          <div className="mt-6 rounded-field border border-crit/30 bg-crit/10 p-4 text-xs text-crit flex items-center gap-2">
            <AlertTriangle size={16} />
            <span>{analysisError}</span>
          </div>
        )}

        {analysisResult && (
          <div className="mt-6 rounded-field border border-white/10 bg-base/60 p-5 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-muted">Backend Evaluation Result</span>
              <span className={`text-xs px-2.5 py-0.5 rounded-full font-bold uppercase font-mono ${
                analysisResult.result === "INCOMPLETE_FEATURES"
                  ? "bg-warn/20 text-warn"
                  : analysisResult.anomaly_score && analysisResult.anomaly_score > 0.9
                  ? "bg-crit/20 text-crit"
                  : "bg-ok/20 text-ok"
              }`}>
                {analysisResult.result || (analysisResult.anomaly_score ? "ANALYZED" : "SUCCESS")}
              </span>
            </div>

            {analysisResult.explanation && (
              <p className="text-xs text-white/90 leading-relaxed font-mono bg-deep/80 p-3 rounded-xl border border-white/5">
                {analysisResult.explanation}
              </p>
            )}

            {analysisResult.anomaly_score !== null && analysisResult.anomaly_score !== undefined && (
              <div className="flex items-center gap-3 pt-2">
                <span className="text-xs text-muted">Anomaly Score:</span>
                <span className="text-sm font-bold text-cyan font-mono">{analysisResult.anomaly_score}</span>
              </div>
            )}
          </div>
        )}
      </section>

      {/* Clinical Advisory */}
      <div className="glass p-4 text-xs text-muted flex items-start gap-3">
        <Info size={18} className="text-cyan shrink-0 mt-0.5" />
        <p>
          AI-generated anomaly screening is strictly decision support. It does not replace professional clinical judgment or direct patient assessment.
        </p>
      </div>
    </div>
  );
}
