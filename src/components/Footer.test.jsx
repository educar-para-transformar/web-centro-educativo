import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import Footer from './Footer';

describe('Footer', () => {
  it('incluye el acceso a la respuesta de la Unidad 4', () => {
    render(
      <MemoryRouter>
        <Footer />
      </MemoryRouter>
    );

    expect(screen.getByRole('link', { name: 'UNIDAD 4' })).toHaveAttribute(
      'href',
      '/tp4'
    );
  });
});
