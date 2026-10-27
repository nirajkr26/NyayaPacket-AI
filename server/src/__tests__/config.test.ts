import { describe, it, expect, beforeEach } from 'vitest';
import { loadConfig } from '../config';

describe('Server Config validation', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = { ...originalEnv };
  });

  it('fails fast if MONGODB_URI is missing or empty', () => {
    process.env.MONGODB_URI = '';
    process.env.JWT_SECRET = 'test_secret_key_123';

    expect(() => loadConfig()).toThrowError(/MONGODB_URI/i);
  });

  it('fails fast if JWT_SECRET is missing or empty', () => {
    process.env.MONGODB_URI = 'mongodb://localhost:27017/nyayapacket_test';
    process.env.JWT_SECRET = '';

    expect(() => loadConfig()).toThrowError(/JWT_SECRET/i);
  });

  it('loads config with valid values and defaults', () => {
    process.env.MONGODB_URI = 'mongodb://localhost:27017/nyayapacket_test';
    process.env.JWT_SECRET = 'valid_secret_key';
    delete process.env.PORT;
    delete process.env.CLIENT_ORIGIN;

    const config = loadConfig();
    expect(config.MONGODB_URI).toBe('mongodb://localhost:27017/nyayapacket_test');
    expect(config.JWT_SECRET).toBe('valid_secret_key');
    expect(config.PORT).toBe(5000);
    expect(config.CLIENT_ORIGIN).toBe('http://localhost:5173');
    expect(config.JWT_EXPIRES_IN).toBe('1d');
  });
});
