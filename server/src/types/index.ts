// The exact shape of the data we encode inside every JWT we issue.
// Keep it small — a token should carry identity, never secrets like the hash.
export interface AuthTokenPayload {
  userId: string
  email: string
}

// Tell TypeScript that an Express Request *may* carry an authenticated user.
// Our auth middleware sets `req.user` after verifying a token; without this
// declaration, TypeScript would error on `req.user` because the stock Express
// `Request` type has no such property.
//
// This is "declaration merging": we reopen Express's own `Request` interface
// and add a field to it, rather than replacing it.
declare global {
  namespace Express {
    interface Request {
      user?: AuthTokenPayload
    }
  }
}

// An `import`/`export` makes this file a *module*. A bare `declare global` only
// works inside a module, so this empty export is load-bearing — don't remove it.
export {}
