import { normalizeEmailForSubmit } from './emailUtils';

describe('normalizeEmailForSubmit', () => {
  it('removes invisible characters, trims whitespace, and lowercases only the domain', () => {
    expect(normalizeEmailForSubmit(' \u200BUser.Name@EXAMPLE.COM\uFEFF ')).toBe('User.Name@example.com');
  });

  it('preserves the local part', () => {
    expect(normalizeEmailForSubmit('User.Name@Example.com')).toBe('User.Name@example.com');
  });

  it('does not aggressively alter an invalid email address', () => {
    expect(normalizeEmailForSubmit(' user@@EXAMPLE.COM ')).toBe('user@@EXAMPLE.COM');
  });
});
