// client/src/components/TenderPricing/calculators/storage.ts
import { useState, useCallback } from "react";
import { CalculatorTemplate } from "./types";

const STORAGE_KEY = "bow-mark:calculator-templates";

export function loadTemplates(): CalculatorTemplate[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as CalculatorTemplate[]) : [];
  } catch {
    return [];
  }
}

export function saveTemplates(templates: CalculatorTemplate[]): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(templates));
}

export function useCalculatorTemplates() {
  const [templates, setTemplates] = useState<CalculatorTemplate[]>(loadTemplates);

  const save = useCallback((updated: CalculatorTemplate[]) => {
    saveTemplates(updated);
    setTemplates(updated);
  }, []);

  return { templates, saveTemplates: save };
}
