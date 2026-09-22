import test from 'node:test';
import assert from 'node:assert/strict';
import { canAccessAdmin, isLocalhost, isProduction } from '../src/utils/domain';

test('domain utilities protect admin view from non-localhost hosts', () => {
  // Test SSR / window undefined
  assert.equal(isLocalhost(), false);
  assert.equal(canAccessAdmin(), false);

  // Setup fake window
  const originalWindow = (globalThis as any).window;

  try {
    // 1. Localhost variations
    for (const host of ['localhost', '127.0.0.1', '[::1]', '::1']) {
      (globalThis as any).window = { location: { hostname: host, href: `http://${host}:3000/` } };
      assert.equal(isLocalhost(), true, `Expected ${host} to be localhost`);
      assert.equal(canAccessAdmin(), true, `Expected ${host} to have admin access`);
      assert.equal(isProduction(), false, `Expected ${host} to not be production`);
    }

    // 2. LAN IP variations (must NOT have admin access)
    for (const host of ['192.168.0.15', '10.0.0.2', '172.16.0.5']) {
      (globalThis as any).window = { location: { hostname: host, href: `http://${host}:3000/` } };
      assert.equal(isLocalhost(), false, `Expected LAN IP ${host} to NOT be localhost`);
      assert.equal(canAccessAdmin(), false, `Expected LAN IP ${host} to NOT have admin access`);
      assert.equal(isProduction(), true, `Expected LAN IP ${host} to be treated as production/non-local`);
    }

    // 3. Production domain
    (globalThis as any).window = {
      location: { hostname: 'bcc-ufape.vercel.app', href: 'https://bcc-ufape.vercel.app/' }
    };
    assert.equal(isLocalhost(), false);
    assert.equal(canAccessAdmin(), false);
    assert.equal(isProduction(), true);

    // 4. Preview deployment domain
    (globalThis as any).window = {
      location: { hostname: 'grade-academica-app-preview.vercel.app', href: 'https://grade-academica-app-preview.vercel.app/' }
    };
    assert.equal(isLocalhost(), false);
    assert.equal(canAccessAdmin(), false);
    assert.equal(isProduction(), true);

  } finally {
    (globalThis as any).window = originalWindow;
  }
});

test('localhostOnly IP verification logic allows only local addresses', () => {
  function isLocalhostIp(req: { socket?: { remoteAddress?: string }; ip?: string }): boolean {
    const remoteIp = req.socket?.remoteAddress || req.ip || '';
    return (
      remoteIp === '127.0.0.1' ||
      remoteIp === '::1' ||
      remoteIp === '::ffff:127.0.0.1' ||
      remoteIp === 'localhost'
    );
  }

  // Permitted IPs
  assert.equal(isLocalhostIp({ ip: '127.0.0.1' }), true);
  assert.equal(isLocalhostIp({ ip: '::1' }), true);
  assert.equal(isLocalhostIp({ ip: '::ffff:127.0.0.1' }), true);
  assert.equal(isLocalhostIp({ ip: 'localhost' }), true);
  assert.equal(isLocalhostIp({ socket: { remoteAddress: '127.0.0.1' } }), true);

  // Blocked IPs (LAN, WAN, VPN)
  assert.equal(isLocalhostIp({ ip: '192.168.1.100' }), false);
  assert.equal(isLocalhostIp({ ip: '10.0.0.5' }), false);
  assert.equal(isLocalhostIp({ ip: '200.18.90.1' }), false);
  assert.equal(isLocalhostIp({ ip: '::ffff:192.168.1.100' }), false);
  assert.equal(isLocalhostIp({}), false);
});
