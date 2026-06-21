export type LoginCaptchaStatus = {
  ok: boolean;
  reason: "TURNSTILE_ONLY" | "TURNSTILE_REQUIRED";
};

export function createLoginCaptcha() {
  return {
    token: "",
    code: "TURNSTILE",
    expiresInSeconds: 180
  };
}

export function verifyLoginCaptcha(tokenInput: string) {
  return Boolean(tokenInput.trim());
}

