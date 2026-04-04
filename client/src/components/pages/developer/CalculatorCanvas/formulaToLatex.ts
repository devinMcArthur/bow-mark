// client/src/components/pages/developer/CalculatorCanvas/formulaToLatex.ts
//
// Converts an infix math expression (expr-eval dialect) to a LaTeX string
// suitable for rendering with KaTeX. Variable IDs are replaced with their
// human-readable labels from labelMap.

type Token =
  | { kind: "num"; val: string }
  | { kind: "id"; val: string }
  | { kind: "op"; val: string }
  | { kind: "lparen" }
  | { kind: "rparen" }
  | { kind: "comma" }
  | { kind: "eof" };

function tokenize(formula: string): Token[] {
  const tokens: Token[] = [];
  let i = 0;
  while (i < formula.length) {
    if (/\s/.test(formula[i])) { i++; continue; }

    if (/[0-9]/.test(formula[i]) || (formula[i] === "." && /[0-9]/.test(formula[i + 1] ?? ""))) {
      let j = i;
      while (j < formula.length && /[0-9.]/.test(formula[j])) j++;
      tokens.push({ kind: "num", val: formula.slice(i, j) });
      i = j;
      continue;
    }

    if (/[a-zA-Z_]/.test(formula[i])) {
      let j = i;
      while (j < formula.length && /[a-zA-Z0-9_]/.test(formula[j])) j++;
      tokens.push({ kind: "id", val: formula.slice(i, j) });
      i = j;
      continue;
    }

    if ("+-*/^".includes(formula[i])) { tokens.push({ kind: "op", val: formula[i] }); i++; continue; }
    if (formula[i] === "(") { tokens.push({ kind: "lparen" }); i++; continue; }
    if (formula[i] === ")") { tokens.push({ kind: "rparen" }); i++; continue; }
    if (formula[i] === ",") { tokens.push({ kind: "comma" }); i++; continue; }
    i++;
  }
  tokens.push({ kind: "eof" });
  return tokens;
}

class Parser {
  private tokens: Token[];
  private pos = 0;
  private labelMap: Record<string, string>;

  constructor(tokens: Token[], labelMap: Record<string, string>) {
    this.tokens = tokens;
    this.labelMap = labelMap;
  }

  private peek(): Token { return this.tokens[this.pos]; }
  private consume(): Token { return this.tokens[this.pos++]; }
  private is(kind: string, val?: string): boolean {
    const t = this.peek();
    if (t.kind !== kind) return false;
    if (val !== undefined && (t as { kind: string; val?: string }).val !== val) return false;
    return true;
  }

  parse(): string { return this.parseAdditive(); }

  private parseAdditive(): string {
    let result = this.parseMultiplicative();
    while (this.is("op", "+") || this.is("op", "-")) {
      const op = (this.consume() as { kind: "op"; val: string }).val;
      const rhs = this.parseMultiplicative();
      result += op === "+" ? ` + ${rhs}` : ` - ${rhs}`;
    }
    return result;
  }

  // Collect consecutive * and / into a single \frac{num}{den} expression.
  private parseMultiplicative(): string {
    const numTerms: string[] = [this.parsePower()];
    const denTerms: string[] = [];

    while (this.is("op", "*") || this.is("op", "/")) {
      const op = (this.consume() as { kind: "op"; val: string }).val;
      const term = this.parsePower();
      if (op === "*") numTerms.push(term);
      else denTerms.push(term);
    }

    const join = (terms: string[]) =>
      terms.length === 1 ? terms[0] : terms.join(" \\cdot ");

    return denTerms.length === 0
      ? join(numTerms)
      : `\\frac{${join(numTerms)}}{${join(denTerms)}}`;
  }

  private parsePower(): string {
    const base = this.parseUnary();
    if (this.is("op", "^")) {
      this.consume();
      const exp = this.parseUnary();
      return `${base}^{${exp}}`;
    }
    return base;
  }

  private parseUnary(): string {
    if (this.is("op", "-")) {
      this.consume();
      return `-${this.parsePrimary()}`;
    }
    return this.parsePrimary();
  }

  private parsePrimary(): string {
    const t = this.peek();

    if (t.kind === "num") {
      this.consume();
      return t.val;
    }

    if (t.kind === "id") {
      this.consume();
      const name = t.val;
      // Function call?
      if (this.is("lparen")) {
        this.consume();
        const args: string[] = [];
        if (!this.is("rparen")) {
          args.push(this.parse());
          while (this.is("comma")) { this.consume(); args.push(this.parse()); }
        }
        if (this.is("rparen")) this.consume();
        return this.fnToLatex(name, args);
      }
      return this.idToLatex(name);
    }

    if (t.kind === "lparen") {
      this.consume();
      const inner = this.parse();
      if (this.is("rparen")) this.consume();
      return `\\left(${inner}\\right)`;
    }

    if (t.kind !== "eof") this.consume();
    return "?";
  }

  private idToLatex(name: string): string {
    const label = this.labelMap[name];
    const display = label && label !== name ? label : name;
    // Use \text{} so spaces in labels render correctly
    return `\\text{${display}}`;
  }

  private fnToLatex(name: string, args: string[]): string {
    const a0 = args[0] ?? "";
    const a1 = args[1] ?? "";
    switch (name.toLowerCase()) {
      case "sqrt":  return `\\sqrt{${a0}}`;
      case "abs":   return `\\left|${a0}\\right|`;
      case "min":   return `\\min\\!\\left(${args.join(",\\,")}\\right)`;
      case "max":   return `\\max\\!\\left(${args.join(",\\,")}\\right)`;
      case "ceil":  return `\\lceil ${a0} \\rceil`;
      case "floor": return `\\lfloor ${a0} \\rfloor`;
      case "log":   return args.length > 1
        ? `\\log_{${a1}}\\!\\left(${a0}\\right)`
        : `\\log\\!\\left(${a0}\\right)`;
      case "ln":    return `\\ln\\!\\left(${a0}\\right)`;
      case "sin":   return `\\sin\\!\\left(${a0}\\right)`;
      case "cos":   return `\\cos\\!\\left(${a0}\\right)`;
      default:      return `\\operatorname{${name}}\\!\\left(${args.join(",\\,")}\\right)`;
    }
  }
}

export function formulaToLatex(
  formula: string,
  labelMap: Record<string, string> = {}
): string {
  if (!formula.trim()) return "";
  try {
    const tokens = tokenize(formula);
    return new Parser(tokens, labelMap).parse();
  } catch {
    return formula;
  }
}
