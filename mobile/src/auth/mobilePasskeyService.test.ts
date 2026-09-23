import { MobilePasskeyService } from "./mobilePasskeyService";

describe("MobilePasskeyService", () => {
  test("loads, registers through a browser handoff, and removes owner passkeys", async () => {
    const request = jest
      .fn()
      .mockResolvedValueOnce({ data: [{ id: "1", name: "iPhone" }] })
      .mockResolvedValueOnce({
        data: {
          management_url: "https://lifeos.test/passkeys/manage#token=secret",
        },
      })
      .mockResolvedValueOnce(undefined);
    const service = new MobilePasskeyService({ request });

    await expect(service.list()).resolves.toEqual([
      { id: "1", name: "iPhone" },
    ]);
    await expect(service.beginManagement()).resolves.toBe(
      "https://lifeos.test/passkeys/manage#token=secret",
    );
    await expect(service.remove("1")).resolves.toBeUndefined();

    expect(request).toHaveBeenNthCalledWith(1, "/security/passkeys");
    expect(request).toHaveBeenNthCalledWith(
      2,
      "/security/passkeys/management-sessions",
      { method: "POST" },
    );
    expect(request).toHaveBeenNthCalledWith(3, "/security/passkeys/1", {
      method: "DELETE",
    });
  });

  test("loads and persists the owner passkey setting and origin", async () => {
    const request = jest
      .fn()
      .mockResolvedValueOnce({
        data: {
          passkeys_enabled: true,
          passkey_origin: "https://lifeos.home.arpa",
          passkey_origin_is_secure: true,
        },
      })
      .mockResolvedValueOnce({
        data: {
          passkeys_enabled: false,
          passkey_origin: "https://lifeos.home.arpa",
          passkey_origin_is_secure: true,
        },
      });
    const service = new MobilePasskeyService({ request });

    await expect(service.getSettings()).resolves.toMatchObject({
      passkeys_enabled: true,
      passkey_origin_is_secure: true,
    });
    await expect(service.updateSettings(false)).resolves.toMatchObject({
      passkeys_enabled: false,
    });
    expect(request).toHaveBeenNthCalledWith(1, "/settings");
    expect(request).toHaveBeenNthCalledWith(2, "/settings", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ passkeys_enabled: false }),
    });
  });
});
