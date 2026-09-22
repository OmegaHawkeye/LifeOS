import { fireEvent, render, screen } from "@testing-library/react-native";
import * as WebBrowser from "expo-web-browser";
import { MobileAuthProvider } from "../auth/authContext";
import type { MobileAuthService } from "../auth/mobileAuthService";
import { SignInScreen } from "./SignInScreen";

jest.mock("expo-web-browser", () => ({
  openAuthSessionAsync: jest.fn(),
}));

jest.mock("../auth/passkeyPkce", () => ({
  createPasskeyPkce: jest.fn().mockResolvedValue({
    state: "test-state",
    challenge: "test-challenge",
    verifier: "test-verifier",
  }),
}));

async function renderSignInScreen() {
  const service = {
    restoreSession: jest.fn().mockResolvedValue(null),
    beginPasskeySignIn: jest
      .fn()
      .mockResolvedValue("https://lifeos.example.test/passkeys"),
  } as unknown as MobileAuthService;

  await render(
    <MobileAuthProvider service={service}>
      <SignInScreen />
    </MobileAuthProvider>,
  );
}

describe("SignInScreen", () => {
  test("keeps the form scrollable while the keyboard is open", async () => {
    await renderSignInScreen();

    const scrollView = await screen.findByTestId("sign-in-scroll");

    expect(scrollView.props.keyboardShouldPersistTaps).toBe("handled");
    expect(screen.getByLabelText("LifeOS email")).toBeTruthy();
  });

  test("shows a helpful message when native passkey sign-in fails", async () => {
    jest
      .mocked(WebBrowser.openAuthSessionAsync)
      .mockRejectedValueOnce(new Error("ExpoWebBrowser is unavailable"));
    await renderSignInScreen();

    await fireEvent.press(
      await screen.findByRole("button", { name: "Sign in with a passkey" }),
    );

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Passkey sign-in could not be completed. Try again or use your password.",
    );
  });
});
