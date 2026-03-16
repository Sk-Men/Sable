// Example: testing a utility file with multiple related exports.
// Uses it.each for table-driven tests — good for exhaustive format coverage.
import { describe, it, expect } from 'vitest';
import { bytesToSize, millisecondsToMinutesAndSeconds, secondsToMinutesAndSeconds } from './common';

describe('bytesToSize', () => {
  it.each([
    [0, '0KB'],
    [1_500, '1.5 KB'],
    [2_500_000, '2.5 MB'],
    [3_200_000_000, '3.2 GB'],
  ])('bytesToSize(%i) → %s', (input, expected) => {
    expect(bytesToSize(input)).toBe(expected);
  });
});

describe('millisecondsToMinutesAndSeconds', () => {
  it.each([
    [0, '0:00'],
    [5_000, '0:05'],
    [60_000, '1:00'],
    [90_000, '1:30'],
    [3_661_000, '61:01'],
  ])('%ims → %s', (ms, expected) => {
    expect(millisecondsToMinutesAndSeconds(ms)).toBe(expected);
  });
});

describe('secondsToMinutesAndSeconds', () => {
  it.each([
    [0, '0:00'],
    [9, '0:09'],
    [125, '2:05'],
  ])('%is → %s', (s, expected) => {
    expect(secondsToMinutesAndSeconds(s)).toBe(expected);
  });
});
