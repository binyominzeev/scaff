import { writeFile } from "./common.mjs";

/**
 * Writes a Pocket ID / OIDC (Authorization Code + PKCE) auth implementation for the
 * Next.js App Router target. Adapted from AUTH_SETUP.md, with two deliberate deviations:
 *   - tokens are stored in httpOnly cookies (not localStorage), so generated server
 *     components can call getCurrentUserId() during SSR;
 *   - the redirect_uri is a dedicated /auth/callback route instead of "/", so it never
 *     collides with a generated ui-screens home page.
 */
export function writePocketIdOidcAuth(outDir) {
  // ---- lib/auth.ts (server-only: token exchange, JWKS verification, cookie session) ----
  writeFile(
    outDir,
    "lib/auth.ts",
    `import "server-only";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { NextResponse } from "next/server";
import { createRemoteJWKSet, decodeJwt, jwtVerify } from "jose";

const issuer = process.env.NEXT_PUBLIC_OIDC_ISSUER?.replace(/\\/$/, "");
const audience = process.env.OIDC_AUDIENCE || undefined;
const jwks = issuer ? createRemoteJWKSet(new URL(\`\${issuer}/.well-known/jwks.json\`)) : null;

export const ACCESS_TOKEN_COOKIE = "oidc_access_token";
export const REFRESH_TOKEN_COOKIE = "oidc_refresh_token";
// Profile claims (name/preferred_username/email) typically only live in the ID token, not the
// access token, so it's kept in its own cookie purely for display purposes (never used for authz).
export const ID_TOKEN_COOKIE = "oidc_id_token";

type TokenResponse = { access_token: string; refresh_token?: string; id_token?: string };

// Pocket ID's token endpoint is non-standard: not "/token", but "/api/oidc/token".
export async function exchangeWithPocketId(grantParams: Record<string, string>): Promise<TokenResponse> {
  const clientId = process.env.NEXT_PUBLIC_OIDC_CLIENT_ID;
  const clientSecret = process.env.OIDC_CLIENT_SECRET;
  if (!issuer || !clientId || !clientSecret) {
    throw new Error("Az OIDC szerver konfiguráció hiányos (NEXT_PUBLIC_OIDC_ISSUER / NEXT_PUBLIC_OIDC_CLIENT_ID / OIDC_CLIENT_SECRET).");
  }
  const response = await fetch(\`\${issuer}/api/oidc/token\`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ client_id: clientId, client_secret: clientSecret, ...grantParams }),
  });
  const body = await response.text();
  if (!response.ok) throw new Error(\`OIDC token endpoint hiba (\${response.status}): \${body}\`);
  return JSON.parse(body) as TokenResponse;
}

export async function verifyAccessToken(token: string) {
  if (!issuer || !jwks) throw new Error("Az authentikáció nincs konfigurálva.");
  const { payload } = await jwtVerify(token, jwks, { issuer, ...(audience ? { audience } : {}) });
  return payload;
}

function claimName(claims: Record<string, unknown>): string {
  return (claims.name as string) || (claims.preferred_username as string) || (claims.email as string) || "felhasználó";
}

/** Decodes the display name from the httpOnly ID token cookie (unverified — display only, never used for authz). */
export async function getSessionName(): Promise<string | null> {
  const store = await cookies();
  const idToken = store.get(ID_TOKEN_COOKIE)?.value;
  if (!idToken) return null;
  try {
    return claimName(decodeJwt(idToken));
  } catch {
    return null;
  }
}

/** Sets the httpOnly session cookies from a fresh token response and returns a safe {name, exp} body. */
export function buildSessionResponse(tokens: TokenResponse): NextResponse {
  const claims = decodeJwt(tokens.id_token ?? tokens.access_token);
  const name = claimName(claims);
  const exp = typeof claims.exp === "number" ? claims.exp : null;
  const response = NextResponse.json({ name, exp });
  const isProd = process.env.NODE_ENV === "production";
  response.cookies.set(ACCESS_TOKEN_COOKIE, tokens.access_token, {
    httpOnly: true,
    secure: isProd,
    sameSite: "lax",
    path: "/",
    ...(exp ? { expires: new Date(exp * 1000) } : {}),
  });
  if (tokens.id_token) {
    response.cookies.set(ID_TOKEN_COOKIE, tokens.id_token, {
      httpOnly: true,
      secure: isProd,
      sameSite: "lax",
      path: "/",
      ...(exp ? { expires: new Date(exp * 1000) } : {}),
    });
  }
  if (tokens.refresh_token) {
    response.cookies.set(REFRESH_TOKEN_COOKIE, tokens.refresh_token, {
      httpOnly: true,
      secure: isProd,
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24 * 30,
    });
  }
  return response;
}

/** Server-komponensekből hívható: a bejelentkezett user id-ja, vagy átirányítás a loginra. */
export async function getCurrentUserId(): Promise<string> {
  const store = await cookies();
  const token = store.get(ACCESS_TOKEN_COOKIE)?.value;
  if (!token) redirect("/login");
  try {
    const payload = await verifyAccessToken(token);
    if (typeof payload.sub !== "string") throw new Error("A token nem tartalmaz sub claim-et.");
    return payload.sub;
  } catch {
    redirect("/login");
  }
}

/** Route handlerekben használható, nem dobó auth-ellenőrzés (opcionális, nincs automatikusan bekötve). */
export async function getAuthenticatedUser(request: Request): Promise<{ id: string; claims: Record<string, unknown> } | null> {
  const authorization = request.headers.get("authorization") ?? "";
  const bearer = authorization.match(/^Bearer\\s+(.+)$/i)?.[1];
  const cookieToken = bearer ?? (await cookies()).get(ACCESS_TOKEN_COOKIE)?.value;
  if (!cookieToken) return null;
  try {
    const payload = await verifyAccessToken(cookieToken);
    if (typeof payload.sub !== "string") return null;
    return { id: payload.sub, claims: payload as Record<string, unknown> };
  } catch {
    return null;
  }
}
`
  );

  // ---- lib/auth/pkce.ts (client-only PKCE helpers) ----
  writeFile(
    outDir,
    "lib/auth/pkce.ts",
    `// Kliens-oldali PKCE helperek — csak "use client" komponensekből hívd (crypto.subtle, sessionStorage).
const VERIFIER_KEY = "oidc.pkce_verifier";
const RETURN_PATH_KEY = "oidc.return_path";

function base64Url(bytes: Uint8Array): string {
  let binary = "";
  bytes.forEach((byte) => {
    binary += String.fromCharCode(byte);
  });
  return btoa(binary).replace(/\\+/g, "-").replace(/\\//g, "_").replace(/=+$/, "");
}

export function createVerifier(): string {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  return base64Url(bytes);
}

export async function createCodeChallenge(verifier: string): Promise<string> {
  const data = new TextEncoder().encode(verifier);
  const digest = await crypto.subtle.digest("SHA-256", data);
  return base64Url(new Uint8Array(digest));
}

export async function discoverAuthorizationEndpoint(issuer: string): Promise<string> {
  const response = await fetch(\`\${issuer.replace(/\\/$/, "")}/.well-known/openid-configuration\`);
  if (!response.ok) throw new Error("OIDC discovery sikertelen.");
  const metadata = await response.json();
  return metadata.authorization_endpoint as string;
}

export function redirectUri(): string {
  return \`\${window.location.origin}/auth/callback\`;
}

export function storeVerifier(verifier: string, returnPath: string) {
  sessionStorage.setItem(VERIFIER_KEY, verifier);
  sessionStorage.setItem(RETURN_PATH_KEY, returnPath);
}

export function consumeVerifier(): { verifier: string | null; returnPath: string } {
  const verifier = sessionStorage.getItem(VERIFIER_KEY);
  const returnPath = sessionStorage.getItem(RETURN_PATH_KEY) || "/";
  sessionStorage.removeItem(VERIFIER_KEY);
  sessionStorage.removeItem(RETURN_PATH_KEY);
  return { verifier, returnPath };
}
`
  );

  // ---- components/auth-provider.tsx (client React context: session state + refresh scheduling) ----
  writeFile(
    outDir,
    "components/auth-provider.tsx",
    `"use client";

import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import { createCodeChallenge, createVerifier, discoverAuthorizationEndpoint, redirectUri, storeVerifier } from "@/lib/auth/pkce";

type AuthState = { authenticated: boolean; name: string; exp: number | null };

type AuthContextValue = AuthState & {
  login: (returnPath?: string) => Promise<void>;
  logout: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

const ISSUER = process.env.NEXT_PUBLIC_OIDC_ISSUER;
const CLIENT_ID = process.env.NEXT_PUBLIC_OIDC_CLIENT_ID;

async function fetchSession(): Promise<AuthState> {
  const response = await fetch("/api/auth/session");
  if (!response.ok) return { authenticated: false, name: "", exp: null };
  const data = await response.json();
  return { authenticated: Boolean(data.authenticated), name: data.name ?? "", exp: data.exp ?? null };
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthState>({ authenticated: false, name: "", exp: null });
  const refreshTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const refreshRef = useRef<() => Promise<void>>(async () => {});

  const scheduleRefresh = useCallback((exp: number | null) => {
    if (refreshTimer.current) clearTimeout(refreshTimer.current);
    if (!exp) return;
    // 60mp-cel lejárat előtt frissít, hogy az API sose lásson lejárt tokent.
    const delay = Math.max(exp * 1000 - Date.now() - 60000, 5000);
    refreshTimer.current = setTimeout(() => {
      refreshRef.current().catch(() => setState({ authenticated: false, name: "", exp: null }));
    }, delay);
  }, []);

  const refresh = useCallback(async () => {
    const response = await fetch("/api/auth/refresh", { method: "POST" });
    if (!response.ok) throw new Error("A token frissítés sikertelen.");
    const data = await response.json();
    const next: AuthState = { authenticated: true, name: data.name ?? "", exp: data.exp ?? null };
    setState(next);
    scheduleRefresh(next.exp);
  }, [scheduleRefresh]);

  useEffect(() => {
    refreshRef.current = refresh;
  }, [refresh]);

  useEffect(() => {
    fetchSession().then((session) => {
      setState(session);
      if (session.authenticated) scheduleRefresh(session.exp);
    });
    return () => {
      if (refreshTimer.current) clearTimeout(refreshTimer.current);
    };
    // csak mountkor bootstrappelünk; a scheduleRefresh identitása stabil
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    // Háttérbe kerülő tab-oknál a setTimeout felfüggesztődhet, ezért előtérbe kerüléskor is ellenőrzünk.
    function handleVisibility() {
      if (document.visibilityState !== "visible" || !state.authenticated || !state.exp) return;
      if (state.exp * 1000 - Date.now() < 60000) {
        refreshRef.current().catch(() => setState({ authenticated: false, name: "", exp: null }));
      }
    }
    document.addEventListener("visibilitychange", handleVisibility);
    return () => document.removeEventListener("visibilitychange", handleVisibility);
  }, [state.authenticated, state.exp]);

  const login = useCallback(async (returnPath = "/") => {
    if (!ISSUER || !CLIENT_ID) {
      throw new Error("Az OIDC kliens nincs konfigurálva (NEXT_PUBLIC_OIDC_ISSUER / NEXT_PUBLIC_OIDC_CLIENT_ID).");
    }
    const verifier = createVerifier();
    const challenge = await createCodeChallenge(verifier);
    storeVerifier(verifier, returnPath);
    const authorizationEndpoint = await discoverAuthorizationEndpoint(ISSUER);
    const params = new URLSearchParams({
      response_type: "code",
      client_id: CLIENT_ID,
      redirect_uri: redirectUri(),
      scope: "openid profile email offline_access",
      state: verifier,
      code_challenge: challenge,
      code_challenge_method: "S256",
    });
    // authorizationEndpoint is an absolute external URL (the Pocket ID issuer), not an internal Next.js route
    // eslint-disable-next-line @next/next/no-location-assign-relative-destination
    window.location.assign(\`\${authorizationEndpoint}?\${params}\`);
  }, []);

  const logout = useCallback(async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    if (refreshTimer.current) clearTimeout(refreshTimer.current);
    setState({ authenticated: false, name: "", exp: null });
  }, []);

  return <AuthContext.Provider value={{ ...state, login, logout }}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth csak <AuthProvider> alatt használható.");
  return context;
}
`
  );

  // ---- app/auth/callback/page.tsx (dedicated redirect_uri target) ----
  writeFile(
    outDir,
    "app/auth/callback/page.tsx",
    `"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { consumeVerifier, redirectUri } from "@/lib/auth/pkce";

function AuthCallbackInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const code = searchParams.get("code");
    const state = searchParams.get("state");
    const callbackError = searchParams.get("error");

    async function run() {
      if (callbackError) throw new Error(\`OIDC hiba: \${callbackError}\`);
      if (!code) throw new Error("Hiányzó authorization code.");
      const { verifier, returnPath } = consumeVerifier();
      if (!verifier || state !== verifier) throw new Error("Érvénytelen OIDC state.");
      const response = await fetch("/api/auth/token", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code, code_verifier: verifier, redirect_uri: redirectUri() }),
      });
      if (!response.ok) throw new Error(\`Token csere sikertelen (\${response.status}).\`);
      router.replace(returnPath || "/");
    }

    run().catch((err) => setError(err instanceof Error ? err.message : String(err)));
    // csak mountkor fut le, a query paraméterek az URL-ből jönnek
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <main className="flex min-h-screen items-center justify-center p-8">
      <p className="text-slate-600">{error ? \`Bejelentkezési hiba: \${error}\` : "Bejelentkezés folyamatban…"}</p>
    </main>
  );
}

export default function AuthCallbackPage() {
  return (
    <Suspense fallback={<main className="p-8" />}>
      <AuthCallbackInner />
    </Suspense>
  );
}
`
  );

  // ---- app/api/auth/token/route.ts ----
  writeFile(
    outDir,
    "app/api/auth/token/route.ts",
    `import { NextResponse } from "next/server";
import { buildSessionResponse, exchangeWithPocketId } from "@/lib/auth";

export async function POST(request: Request) {
  const configuredRedirectUri = process.env.OIDC_REDIRECT_URI;
  if (!configuredRedirectUri) {
    return NextResponse.json({ error: "Az OIDC szerver konfiguráció hiányos." }, { status: 503 });
  }

  const body = (await request.json().catch(() => null)) as
    | { code?: string; code_verifier?: string; redirect_uri?: string }
    | null;
  if (
    !body ||
    typeof body.code !== "string" ||
    typeof body.code_verifier !== "string" ||
    body.redirect_uri !== configuredRedirectUri
  ) {
    return NextResponse.json({ error: "Érvénytelen OIDC token kérés." }, { status: 400 });
  }

  try {
    const tokens = await exchangeWithPocketId({
      grant_type: "authorization_code",
      code: body.code,
      redirect_uri: configuredRedirectUri,
      code_verifier: body.code_verifier,
    });
    return buildSessionResponse(tokens);
  } catch {
    return NextResponse.json({ error: "A token csere sikertelen." }, { status: 401 });
  }
}
`
  );

  // ---- app/api/auth/refresh/route.ts ----
  writeFile(
    outDir,
    "app/api/auth/refresh/route.ts",
    `import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { REFRESH_TOKEN_COOKIE, buildSessionResponse, exchangeWithPocketId } from "@/lib/auth";

export async function POST() {
  const store = await cookies();
  const refreshToken = store.get(REFRESH_TOKEN_COOKIE)?.value;
  if (!refreshToken) {
    return NextResponse.json({ error: "Nincs refresh token." }, { status: 401 });
  }

  try {
    const tokens = await exchangeWithPocketId({ grant_type: "refresh_token", refresh_token: refreshToken });
    return buildSessionResponse(tokens);
  } catch {
    return NextResponse.json({ error: "A token frissítés sikertelen." }, { status: 401 });
  }
}
`
  );

  // ---- app/api/auth/session/route.ts ----
  writeFile(
    outDir,
    "app/api/auth/session/route.ts",
    `import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { ACCESS_TOKEN_COOKIE, getSessionName, verifyAccessToken } from "@/lib/auth";

export async function GET() {
  const store = await cookies();
  const token = store.get(ACCESS_TOKEN_COOKIE)?.value;
  if (!token) return NextResponse.json({ authenticated: false });

  try {
    const payload = await verifyAccessToken(token);
    const name = (await getSessionName()) ?? "felhasználó";
    return NextResponse.json({ authenticated: true, name, exp: payload.exp ?? null });
  } catch {
    return NextResponse.json({ authenticated: false });
  }
}
`
  );

  // ---- app/api/auth/logout/route.ts ----
  writeFile(
    outDir,
    "app/api/auth/logout/route.ts",
    `import { NextResponse } from "next/server";
import { ACCESS_TOKEN_COOKIE, ID_TOKEN_COOKIE, REFRESH_TOKEN_COOKIE } from "@/lib/auth";

export async function POST() {
  const response = new NextResponse(null, { status: 204 });
  response.cookies.set(ACCESS_TOKEN_COOKIE, "", { httpOnly: true, path: "/", maxAge: 0 });
  response.cookies.set(REFRESH_TOKEN_COOKIE, "", { httpOnly: true, path: "/", maxAge: 0 });
  response.cookies.set(ID_TOKEN_COOKIE, "", { httpOnly: true, path: "/", maxAge: 0 });
  return response;
}
`
  );

  // ---- components/ui/auth-controls.tsx ----
  writeFile(
    outDir,
    "components/ui/auth-controls.tsx",
    `"use client";

import { usePathname } from "next/navigation";
import { useAuth } from "@/components/auth-provider";

export function AuthControls() {
  const pathname = usePathname();
  const { authenticated, name, login, logout } = useAuth();

  if (authenticated) {
    return (
      <div className="flex items-center gap-3 text-sm">
        <span className="text-slate-600">Üdv, {name}!</span>
        <button type="button" onClick={() => logout()} className="font-medium text-slate-900 hover:underline">
          Kilépés
        </button>
      </div>
    );
  }

  return (
    <button type="button" onClick={() => login(pathname)} className="text-sm font-medium text-slate-900 hover:underline">
      Belépés
    </button>
  );
}
`
  );
}
