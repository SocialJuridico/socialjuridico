import { isUuid, validateDownloadPayload } from "./processValidation";

const VALID_CLIENT_ID = "2f1c6f84-f2e9-4ad3-88ae-cbe812afca52";
const VALID_PROCESS_NUMBER = "00012345620268200001";

describe("lawyer process download validation", () => {
  test("accepts a valid CRM client UUID", () => {
    expect(isUuid(VALID_CLIENT_ID)).toBe(true);

    const result = validateDownloadPayload({
      numeroProcesso: VALID_PROCESS_NUMBER,
      clientId: VALID_CLIENT_ID,
    });

    expect(result).toMatchObject({
      valid: true,
      numeroProcesso: VALID_PROCESS_NUMBER,
      existingClientId: VALID_CLIENT_ID,
    });
  });

  test("rejects a malformed client identifier", () => {
    const result = validateDownloadPayload({
      numeroProcesso: VALID_PROCESS_NUMBER,
      clientId: "cliente-invalido",
    });

    expect(result).toMatchObject({
      valid: false,
      status: 400,
    });
  });
});
