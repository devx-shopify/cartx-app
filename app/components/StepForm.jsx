import { useState } from "react";

export default function StepForm({
  steps,
  onSubmit,
  submitting,
  submitLabel = "Save",
}) {
  const [currentStep, setCurrentStep] = useState(0);
  const total = steps.length;
  const isFirst = currentStep === 0;
  const isLast = currentStep === total - 1;

  return (
    <div className="cx-step-form">
      {/* Progress header */}
      <div className="cx-step-header">
        <div className="cx-step-track">
          <div
            className="cx-step-track-fill"
            style={{ width: `${total > 1 ? (currentStep / (total - 1)) * 100 : 100}%` }}
          />
        </div>
        <div className="cx-step-indicators">
          {steps.map((step, i) => {
            const done = i < currentStep;
            const active = i === currentStep;
            return (
              <button
                key={i}
                type="button"
                className={`cx-step-indicator ${done ? "cx-step-done" : ""} ${active ? "cx-step-active" : ""}`}
                onClick={() => i < currentStep && setCurrentStep(i)}
              >
                <span className="cx-step-dot">
                  {done ? (
                    <svg width="12" height="12" viewBox="0 0 16 16" fill="currentColor">
                      <path d="M13.485 3.929a.75.75 0 01.036 1.06l-7.25 7.5a.75.75 0 01-1.072.012L2.227 9.53a.75.75 0 011.046-1.076l2.44 2.373 6.712-6.934a.75.75 0 011.06-.036z" />
                    </svg>
                  ) : (
                    i + 1
                  )}
                </span>
                <span className="cx-step-label">{step.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Current step content */}
      <div className="cx-step-body">{steps[currentStep].content}</div>

      {/* Navigation */}
      <div className="cx-step-nav">
        <div className="cx-step-nav-left">
          {!isFirst && (
            <button
              type="button"
              className="cx-btn cx-btn-secondary"
              onClick={() => setCurrentStep((s) => s - 1)}
            >
              <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
              </svg>
              Previous
            </button>
          )}
        </div>
        <div className="cx-step-nav-meta">
          Step {currentStep + 1} of {total}
        </div>
        <div className="cx-step-nav-right">
          {isLast ? (
            <button
              type="button"
              className="cx-btn cx-btn-primary"
              onClick={onSubmit}
              disabled={submitting}
            >
              {submitting ? "Saving..." : submitLabel}
            </button>
          ) : (
            <button
              type="button"
              className="cx-btn cx-btn-primary"
              onClick={() => setCurrentStep((s) => s + 1)}
            >
              Next
              <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
              </svg>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
