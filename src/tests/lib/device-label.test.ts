import { describe, expect, it } from "vitest";
import { describeDevice } from "@/lib/device-label";

describe("describeDevice", () => {
  it("turns a user agent into browser + system", () => {
    expect(describeDevice("Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Mobile Safari/537.36")).toBe("Chrome en Android");
    expect(describeDevice("Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1")).toBe("Safari en iPhone");
    expect(describeDevice("Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36 Edg/140.0.0.0")).toBe("Edge en Windows");
    expect(describeDevice("Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:130.0) Gecko/20100101 Firefox/130.0")).toBe("Firefox en Mac");
  });

  it("keeps custom names and copes with missing ones", () => {
    expect(describeDevice("Móvil de Alberto")).toBe("Móvil de Alberto");
    expect(describeDevice(null)).toBe("Dispositivo");
  });
});
