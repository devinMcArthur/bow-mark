// Pre-load the @models barrel so ts-node's Language Service has all
// model symbols resolved before individual tests try to compile files
// that import @models. Without this, cold vitest runs occasionally fail
// with "Unable to require file: src/models/index.ts" because the LS
// can't emit decorator-heavy Typegoose model files without pre-warmed
// type resolution.
import "@models";
