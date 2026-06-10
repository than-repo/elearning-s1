import { cleanData } from './clean-data-util';

describe('cleanData', () => {
  it('removes undefined fields', () => {
    const result = cleanData({
      name: 'test',
      description: undefined,
    });

    expect(result).toEqual({
      name: 'test',
    });
  });

  it('preserves string values without trimming', () => {
    const result = cleanData({
      name: '   NestJS   ',
    });

    expect(result).toEqual({
      name: '   NestJS   ',
    });
  });

  it('preserves empty string values without converting to null', () => {
    const result = cleanData({
      description: '   ',
    });

    expect(result).toEqual({
      description: '   ',
    });
  });

  it('preserves null values', () => {
    const result = cleanData({
      description: null,
    });

    expect(result).toEqual({
      description: null,
    });
  });

  it('preserves number values', () => {
    const result = cleanData({
      order: 10,
    });

    expect(result).toEqual({
      order: 10,
    });
  });

  it('preserves boolean values', () => {
    const result = cleanData({
      isActive: false,
    });

    expect(result).toEqual({
      isActive: false,
    });
  });

  it('preserves Date objects', () => {
    const now = new Date();

    const result = cleanData({
      createdAt: now,
    });

    expect(result).toEqual({
      createdAt: now,
    });
  });

  it('preserves nested objects', () => {
    const result = cleanData({
      meta: {
        role: 'admin',
      },
    });

    expect(result).toEqual({
      meta: {
        role: 'admin',
      },
    });
  });

  it('handles mixed values correctly', () => {
    const now = new Date();

    const result = cleanData({
      name: '  Category ',
      description: '   ',
      order: 1,
      isActive: true,
      deletedAt: null,
      createdAt: now,
      ignored: undefined,
    });

    expect(result).toEqual({
      name: '  Category ',
      description: '   ',
      order: 1,
      isActive: true,
      deletedAt: null,
      createdAt: now,
    });
  });
});
