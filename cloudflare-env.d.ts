declare global {
  interface D1PreparedStatement {
    bind(...values: unknown[]): D1PreparedStatement;
    first<T = unknown>(): Promise<T | null>;
    all<T = unknown>(): Promise<{ results?: T[] }>;
    run(): Promise<unknown>;
  }

  interface D1Database {
    prepare(query: string): D1PreparedStatement;
    batch<T = unknown>(statements: D1PreparedStatement[]): Promise<T>;
  }

  interface CloudflareEnv {
    POLYSMART_DB?: D1Database;
    LOGTO_ENDPOINT?: string;
    LOGTO_APP_ID?: string;
    LOGTO_APP_SECRET?: string;
    LOGTO_COOKIE_SECRET?: string;
    TURNSTILE_SITE_KEY?: string;
    TURNSTILE_SECRET_KEY?: string;
    APP_BASE_URL?: string;
  }
}

export {};
