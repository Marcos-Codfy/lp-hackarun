import { describe, expect, it } from 'vitest';
import { mentorFormStatus } from '@presentation/components/mentor/mentorFormStatus';
import { mentorHref, mentorSourceFromSearch } from '@presentation/view-models/mentor/mentorOrigin';

describe('origem do cadastro de mentor', () => {
  it('monta o link do CTA com a origem, ou o endereço limpo', () => {
    expect(mentorHref('crew')).toBe('/seja-mentor?origem=crew');
    expect(mentorHref()).toBe('/seja-mentor');
  });

  it('lê só origens conhecidas; o resto conta como acesso direto', () => {
    expect(mentorSourceFromSearch('?origem=crew')).toBe('crew');
    expect(mentorSourceFromSearch('?origem=%20FOOTER%20')).toBe('footer');
    expect(mentorSourceFromSearch('')).toBe('direct');
    expect(mentorSourceFromSearch('?origem=hero')).toBe('direct');
    expect(mentorSourceFromSearch('?origem=<script>')).toBe('direct');
  });
});

describe('mentorFormStatus', () => {
  const ENDPOINT = 'https://script.google.com/macros/s/abc/exec';

  it('com planilha o cadastro abre, de verdade (o endpoint ganha da simulação)', () => {
    expect(mentorFormStatus(ENDPOINT, false)).toEqual({ status: 'open', simulated: false, isOpen: true });
    expect(mentorFormStatus(ENDPOINT, true)).toEqual({ status: 'open', simulated: false, isOpen: true });
  });

  it('sem planilha: abre simulado só quando a simulação está liberada; senão fica "em breve"', () => {
    expect(mentorFormStatus(null, true)).toEqual({ status: 'open', simulated: true, isOpen: true });
    expect(mentorFormStatus(null, false)).toEqual({ status: 'soon', simulated: false, isOpen: false });
  });
});
