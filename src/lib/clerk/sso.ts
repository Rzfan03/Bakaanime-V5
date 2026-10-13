import type { SetActive, SignInResource, SignUpResource } from "@clerk/shared/types";
import { App } from "@capacitor/app";
import { Browser } from "@capacitor/browser";

// Harus sama persis dengan intent-filter di AndroidManifest.xml dan yang
// di-allowlist di Clerk Dashboard -> Native applications -> mobile SSO redirect.
export const NATIVE_REDIRECT_URL = "com.bakaanime.app://sso-callback";

type StartArgs = {
  signIn: SignInResource;
  signUp: SignUpResource;
  setActive?: SetActive;
};

/**
 * OAuth lewat system browser + deep link (pola native Clerk).
 * Buka provider di @capacitor/browser, tunggu appUrlOpen, lalu selesaikan
 * pakai rotating_token_nonce (tanpa cookie). Return sessionId / null (batal).
 */
export async function startNativeSSO({
  signIn,
  signUp,
  setActive,
}: StartArgs): Promise<string | null> {
  await signIn.create({ strategy: "oauth_google", redirectUrl: NATIVE_REDIRECT_URL });
  const external = signIn.firstFactorVerification.externalVerificationRedirectURL;
  if (!external) throw new Error("no_external_verification_url");

  let resolveCallback!: (url: string | null) => void;
  const callbackPromise = new Promise<string | null>((resolve) => {
    resolveCallback = resolve;
  });

  const urlListener = await App.addListener("appUrlOpen", async (event) => {
    if (event.url.startsWith(NATIVE_REDIRECT_URL)) {
      void urlListener.remove();
      void finishedListener.remove();
      await Browser.close();
      resolveCallback(event.url);
    }
  });
  const finishedListener = await Browser.addListener("browserFinished", () => {
    void urlListener.remove();
    void finishedListener.remove();
    resolveCallback(null);
  });

  await Browser.open({ url: external.toString() });

  const callbackUrl = await callbackPromise;
  if (!callbackUrl) return null;

  const nonce = new URL(callbackUrl).searchParams.get("rotating_token_nonce") ?? "";
  await signIn.reload({ rotatingTokenNonce: nonce });
  if (signIn.firstFactorVerification.status === "transferable") {
    await signUp.create({ transfer: true });
  }

  const sessionId = signUp.createdSessionId ?? signIn.createdSessionId ?? null;
  if (sessionId && setActive) await setActive({ session: sessionId });
  return sessionId;
}
