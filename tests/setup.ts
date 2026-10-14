import "@testing-library/jest-dom";
import { beforeAll, afterAll, afterEach, vi } from "vitest";
import { setupServer } from "msw/node";
export const server = setupServer();
beforeAll(() => server.listen({ onUnhandledRequest: "error" }));
afterEach(() => server.resetHandlers());
afterAll(() => server.close());
vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "http://127.0.0.1:54321");
vi.stubEnv("SUPABASE_SERVICE_ROLE_KEY", "test-service-key");
