import { MobileTwoFactorService } from "./mobileTwoFactorService";

describe("MobileTwoFactorService", () => {
  test("sends setup, confirmation, and disable requests without persisting setup data", async () => {
    const request = jest
      .fn()
      .mockResolvedValueOnce({ data: { secret: "setup-secret" } })
      .mockResolvedValueOnce({ data: { enabled: true } })
      .mockResolvedValueOnce({});
    const service = new MobileTwoFactorService({ request } as never);

    await expect(service.beginSetup("current password")).resolves.toBe(
      "setup-secret",
    );
    await service.confirm("123456");
    await service.disable("current password", "123456");

    expect(request).toHaveBeenNthCalledWith(1, "/security/two-factor/setup", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ current_password: "current password" }),
    });
    expect(request).toHaveBeenNthCalledWith(2, "/security/two-factor/confirm", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ code: "123456" }),
    });
    expect(request).toHaveBeenNthCalledWith(3, "/security/two-factor", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        current_password: "current password",
        code: "123456",
      }),
    });
  });
});
