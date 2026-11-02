# P-NEXA — Phase 5 Predictive Intelligence Engine
## Explainable Statistical Modeling & Multi-Step Forecasting

### 1. Architectural Philosophy

The P-NEXA Predictive Intelligence Engine is designed around **explainability, traceability, and determinism**. Rather than relying on black-box or hallucinatory deep learning outputs for critical infrastructure telemetry, Phase 5 couples calibrated statistical baselines with linear trend forecasting and robust anomaly attribution.

---

### 2. Anomaly Detection Algorithms

#### 2.1 Rolling Metric Window
Each tracked metric per entity maintains an in-memory sliding window ($W = 60$ samples by default). The window calculates:
- Sample Count ($n$)
- Sample Mean ($\mu$)
- Sample Variance ($\sigma^2$) and Standard Deviation ($\sigma$)
- Median ($M$)
- Median Absolute Deviation (MAD):
  $$\text{MAD} = \text{median}(|x_i - M|)$$
- Exponential Moving Average (EMA, default decay $\alpha = 0.2$):
  $$\text{EMA}_t = \alpha \cdot x_t + (1 - \alpha) \cdot \text{EMA}_{t-1}$$

#### 2.2 Hybrid Z-Score Evaluation
For any incoming telemetry value $x$:
$$Z = \frac{x - \mu}{\max(\sigma, 0.0001)}$$

- If $Z > 3.0$ and $x > 75$, the metric is tagged as statistically anomalous.
- For non-Gaussian distributions with extreme outliers, the system also inspects Modified Z-score using MAD:
  $$M_i = \frac{0.6745 \cdot (x_i - M)}{\text{MAD}}$$

#### 2.3 Critical Threshold Ceilings
To prevent statistical adaptation to creeping degradation (where a slow ramp-up inflates the rolling mean), hard safety ceilings are enforced:
- **CPU:** Anomaly triggered if $x \ge 90.0\%$, regardless of historical mean.
- **Memory:** Anomaly triggered if $x \ge 92.0\%$.
- **Disk:** Anomaly triggered if $x \ge 95.0\%$.
- **Auth Failures:** Anomaly triggered if $x \ge 20$ failures/window.

#### 2.4 False-Positive Suppression & Alert Cooldown
When an anomaly fires, an entity-level cooldown timer (60 seconds) is initiated. Subsequent anomalies on the same entity during this window are recorded in the event store but suppressed from triggering repetitive AI Council investigations, eliminating alert fatigue.

---

### 3. Multi-Step Trend Forecasting

#### 3.1 Ordinary Least Squares (OLS) Linear Regression
Given historical samples $(0, y_0), (1, y_1), \dots, (n-1, y_{n-1})$:
$$\beta = \frac{n \sum (i \cdot y_i) - (\sum i)(\sum y_i)}{n \sum i^2 - (\sum i)^2}$$
$$\alpha = \frac{\sum y_i - \beta \sum i}{n}$$

For future step $k \in [1, \dots, H]$, the projected value is:
$$\hat{y}_{n-1+k} = \alpha + \beta \cdot (n - 1 + k)$$

#### 3.2 Calibrated 95% Confidence Intervals
Residual standard error:
$$\text{SE}_{\text{residual}} = \sqrt{\frac{\sum_{i=0}^{n-1} (y_i - (\alpha + \beta \cdot i))^2}{n - 2}}$$

For each projected horizon step $k$, uncertainty widens with time:
$$\text{Margin}_k = 1.96 \cdot \text{SE}_{\text{residual}} \cdot \sqrt{1 + \frac{1}{n} + \frac{(n - 1 + k - \bar{x})^2}{\sum (i - \bar{x})^2}}$$
$$\text{Lower Bound}_k = \max(0, \hat{y}_k - \text{Margin}_k)$$
$$\text{Upper Bound}_k = \min(100, \hat{y}_k + \text{Margin}_k)$$

---

### 4. Traceable Finding Contract

Each anomaly evaluation returns an explainable `AnomalyFinding`:
```json
{
  "id": "anom-1762098000000-abcd",
  "tenantId": "6ae8ac7ea9126f760119935b",
  "entityId": "srv-auth",
  "metric": "cpu",
  "currentValue": 96.5,
  "baselineMean": 45.2,
  "baselineStdDev": 4.1,
  "zScore": 12.51,
  "anomalyScore": 0.96,
  "severity": "CRITICAL",
  "isAnomaly": true,
  "evidence": "Critical threshold exceeded: cpu = 96.5% >= 90%. Z-score: 12.51.",
  "ruleOrModelVersion": "v1.2.0-stat-hybrid-zscore",
  "uncertaintyInterval": {
    "confidence": 0.95,
    "lowerBound": 88.4,
    "upperBound": 100.0
  },
  "timestamp": "2026-11-02T15:30:10.144Z"
}
```

