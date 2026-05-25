import { useState, useEffect } from "react";
import VStack from "./VStack.jsx";

// Convert internal { required_any, excluded } object → string for the input
function stringify(arr) {
  return Array.isArray(arr) ? arr.join(", ") : "";
}

// Parse comma/newline-separated input → array of trimmed, deduped tags
function parse(input) {
  if (!input) return [];
  return Array.from(
    new Set(
      String(input)
        .split(/[,\n]/)
        .map((t) => t.trim())
        .filter(Boolean)
    )
  );
}

/**
 * Customer-tag-based targeting control.
 * Value shape: { required_any?: string[], excluded?: string[] } | undefined
 * When both arrays are empty, the parent should store `undefined` (no targeting).
 */
export default function TagTargetingSection({
  value,
  onChange,
  heading = "Customer tags",
}) {
  const [requiredInput, setRequiredInput] = useState(
    stringify(value?.required_any)
  );
  const [excludedInput, setExcludedInput] = useState(
    stringify(value?.excluded)
  );

  // Sync from external updates (e.g. parent reset)
  useEffect(() => {
    setRequiredInput(stringify(value?.required_any));
    setExcludedInput(stringify(value?.excluded));
  }, [value?.required_any, value?.excluded]);

  function commit(nextRequired, nextExcluded) {
    const required = parse(nextRequired);
    const excluded = parse(nextExcluded);
    if (required.length === 0 && excluded.length === 0) {
      onChange(undefined);
      return;
    }
    const next = {};
    if (required.length) next.required_any = required;
    if (excluded.length) next.excluded = excluded;
    onChange(next);
  }

  return (
    <s-section heading={heading}>
      <VStack gap={400}>
        <s-text color="subdued" variant="bodySm">
          Restrict who sees this rule based on Shopify customer tags. Leave
          both empty to apply to all customers (including guests).
        </s-text>

        <s-text-field
          label="Required tags"
          details="Customer must have at least one of these tags. Guests won't match. Comma-separated."
          placeholder="vip, returning"
          value={requiredInput}
          onInput={(e) => {
            setRequiredInput(e.target.value);
            commit(e.target.value, excludedInput);
          }}
        />

        <s-text-field
          label="Excluded tags"
          details="Hide from customers with any of these tags. Guests will still see the rule. Comma-separated."
          placeholder="wholesale, b2b"
          value={excludedInput}
          onInput={(e) => {
            setExcludedInput(e.target.value);
            commit(requiredInput, e.target.value);
          }}
        />
      </VStack>
    </s-section>
  );
}
