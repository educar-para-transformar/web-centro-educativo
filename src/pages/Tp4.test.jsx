import { describe, expect, it, vi } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import Tp4 from './Tp4';

vi.mock('../components/Navbar', () => ({
  default: () => <nav aria-label="Navegación principal" />,
}));

describe('Tp4', () => {
  it('muestra el tipo de optimización aplicada y las herramientas', () => {
    render(<Tp4 />);

    expect(
      screen.getByRole('heading', {
        level: 1,
        name: /Optimización del ciclo de desarrollo de software/i,
      })
    ).toBeInTheDocument();
    expect(
      screen.getByText(
        /Integración Continua \(CI\) con Entrega\/Despliegue Continuo/i
      )
    ).toBeInTheDocument();
    expect(screen.getAllByText(/GitHub Actions/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/SonarQube/i).length).toBeGreaterThan(0);
    expect(screen.getByText(/11 de noviembre/i)).toBeInTheDocument();
  });

  it('incluye las cuatro actividades de la Parte 1', () => {
    render(<Tp4 />);

    expect(
      screen.getByRole('heading', { name: /Actividad 1/i })
    ).toBeInTheDocument();
    expect(
      screen.getByRole('heading', { name: /Actividad 2/i })
    ).toBeInTheDocument();
    expect(
      screen.getByRole('heading', { name: /Actividad 3/i })
    ).toBeInTheDocument();
    expect(
      screen.getByRole('heading', { name: /Actividad 4/i })
    ).toBeInTheDocument();
  });

  it('responde verdadero o falso y justifica la respuesta falsa', () => {
    render(<Tp4 />);

    expect(screen.getAllByText('V')).toHaveLength(5);
    expect(screen.getAllByText('F')).toHaveLength(1);

    const preguntaCD = screen
      .getByText('Relación con Entrega Continua (CD)')
      .closest('article');

    expect(preguntaCD).not.toBeNull();
    expect(within(preguntaCD).getByText('F')).toBeInTheDocument();
    expect(
      within(preguntaCD).getByText(/puede requerir aprobación manual/i)
    ).toBeInTheDocument();
  });

  it('muestra el cuadro de beneficios y la propuesta de SonarQube', () => {
    render(<Tp4 />);

    expect(
      screen.getByText('Detección temprana de errores')
    ).toBeInTheDocument();
    expect(
      screen.getByText('Reducción de conflictos de integración')
    ).toBeInTheDocument();
    expect(screen.getByText('Mayor calidad del software')).toBeInTheDocument();
    expect(screen.getByText('Entrega más rápida')).toBeInTheDocument();
    expect(screen.getByText('Transparencia')).toBeInTheDocument();
    expect(screen.getByText(/política de quality gate/i)).toBeInTheDocument();
    expect(
      screen.getByText(
        /Source - Build - Test \(unitarias, integración y SonarQube\)/i
      )
    ).toBeInTheDocument();
  });
});
