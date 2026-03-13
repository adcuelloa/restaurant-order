import { describe, it, expect } from "vitest";
import { BadRequestException } from "@nestjs/common";
import { ZodValidationPipe, ZodUpdatePipe } from "./zod-validation.pipe";
import { z } from "zod";

const schema = z.object({ name: z.string(), count: z.number() });
const metadata = {} as never;

describe("ZodValidationPipe", () => {
  it("returns parsed data when valid", () => {
    const pipe = new ZodValidationPipe(schema);
    const result = pipe.transform({ name: "a", count: 1 }, metadata);
    expect(result).toEqual({ name: "a", count: 1 });
  });

  it("throws ZodError when invalid", () => {
    const pipe = new ZodValidationPipe(schema);
    expect(() => pipe.transform({ name: "a", count: "not-a-number" }, metadata)).toThrow();
    expect(() => pipe.transform({}, metadata)).toThrow();
  });
});

describe("ZodUpdatePipe", () => {
  it("returns parsed data when valid", () => {
    const pipe = new ZodUpdatePipe(schema);
    const result = pipe.transform({ name: "b", count: 2 }, metadata);
    expect(result).toEqual({ name: "b", count: 2 });
  });

  it("throws BadRequestException when body is empty", () => {
    const pipe = new ZodUpdatePipe(schema);
    expect(() => pipe.transform({}, metadata)).toThrow(BadRequestException);
    expect(() => pipe.transform(null, metadata)).toThrow(BadRequestException);
    expect(() => pipe.transform(undefined, metadata)).toThrow(BadRequestException);
  });

  it("throws when partial object is empty", () => {
    const pipe = new ZodUpdatePipe(z.object({ name: z.string().optional() }));
    expect(() => pipe.transform({}, metadata)).toThrow(BadRequestException);
  });
});
