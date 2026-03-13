import { describe, expect, it } from 'vitest';
import { buildExternalToolEnv } from '../childProcessEnv';

describe('buildExternalToolEnv', () => {
  it('removes AppImage-only keys and strips mount paths from PATH-like vars', () => {
    const env = buildExternalToolEnv({
      APPDIR: '/tmp/.mount_scrawlAbCd',
      APPIMAGE: '/home/user/scrawl.AppImage',
      ARGV0: 'AppRun',
      CHROME_DESKTOP: 'scrawl.desktop',
      GSETTINGS_SCHEMA_DIR: '/tmp/.mount_scrawlAbCd/usr/share/glib-2.0/schemas',
      OWD: '/tmp',
      PATH: '/usr/local/bin:/tmp/.mount_scrawlAbCd/usr/bin:/usr/bin',
      LD_LIBRARY_PATH: '/tmp/.mount_scrawlAbCd/usr/lib:/usr/local/cuda/lib64',
      XDG_DATA_DIRS: '/tmp/.mount_scrawlAbCd/usr/share:/usr/share',
      HOME: '/home/user',
      USER: 'user',
      KEEP_ME: 'yes',
    });

    expect(env.APPDIR).toBeUndefined();
    expect(env.APPIMAGE).toBeUndefined();
    expect(env.ARGV0).toBeUndefined();
    expect(env.CHROME_DESKTOP).toBeUndefined();
    expect(env.GSETTINGS_SCHEMA_DIR).toBeUndefined();
    expect(env.OWD).toBeUndefined();

    expect(env.PATH).toBe('/usr/local/bin:/usr/bin');
    expect(env.LD_LIBRARY_PATH).toBe('/usr/local/cuda/lib64');
    expect(env.XDG_DATA_DIRS).toBe('/usr/share');

    expect(env.HOME).toBe('/home/user');
    expect(env.USER).toBe('user');
    expect(env.KEEP_ME).toBe('yes');
  });

  it('removes Python vars only when they point into AppImage mount paths', () => {
    const stripped = buildExternalToolEnv({
      APPDIR: '/tmp/.mount_scrawlZZ',
      PYTHONHOME: '/tmp/.mount_scrawlZZ/usr',
      PYTHONPATH: '/tmp/.mount_scrawlZZ/usr/lib/python3.11',
    });

    expect(stripped.PYTHONHOME).toBeUndefined();
    expect(stripped.PYTHONPATH).toBeUndefined();

    const kept = buildExternalToolEnv({
      PYTHONHOME: '/opt/python',
      PYTHONPATH: '/opt/python/lib',
    });

    expect(kept.PYTHONHOME).toBe('/opt/python');
    expect(kept.PYTHONPATH).toBe('/opt/python/lib');
  });
});
