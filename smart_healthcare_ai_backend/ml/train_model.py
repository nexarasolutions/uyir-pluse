import argparse, json
from pathlib import Path
import joblib, pandas as pd
from sklearn.ensemble import IsolationForest
FEATURES = ["heart_rate_bpm", "spo2_percent", "temperature_c"]
def main():
    p = argparse.ArgumentParser()
    p.add_argument("--csv", required=True)
    p.add_argument("--out", default="models/isolation_forest.joblib")
    args = p.parse_args()
    df = pd.read_csv(args.csv)
    missing = [c for c in FEATURES if c not in df.columns]
    if missing: raise SystemExit(f"Missing columns: {missing}")
    df[FEATURES] = df[FEATURES].apply(pd.to_numeric, errors="coerce")
    df = df.dropna(subset=FEATURES)
    df = df[df.heart_rate_bpm.between(25,240) & df.spo2_percent.between(50,100) & df.temperature_c.between(25,45)]
    if len(df) < 100: raise SystemExit(f"Need >=100 valid rows, got {len(df)}")
    model = IsolationForest(n_estimators=200, contamination="auto", random_state=42)
    model.fit(df[FEATURES].astype(float))
    out = Path(args.out); out.parent.mkdir(parents=True, exist_ok=True); joblib.dump(model, out)
    meta = {"model_type":"IsolationForest","version":"isolation-forest-v1","features":FEATURES,"valid_rows_used":len(df),"source_csv":Path(args.csv).name,"clinical_validation":"not performed"}
    (out.parent/"model_metadata.json").write_text(json.dumps(meta, indent=2))
    print("Saved", out, "using", len(df), "valid rows.")
    print("No clinical accuracy or false-alarm rate can be claimed without labelled independent evaluation.")
if __name__ == "__main__": main()
