import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import Button from './Button';

describe('Button', () => {
  it('renderiza el texto y aplica las variantes solicitadas', () => {
    render(
      <Button variant="secondary" size="large">
        Guardar cambios
      </Button>
    );

    const button = screen.getByRole('button', { name: 'Guardar cambios' });

    expect(button).toHaveClass('custom-button', 'secondary', 'large');
    expect(button).toBeEnabled();
  });

  it('ejecuta el evento onClick', async () => {
    const user = userEvent.setup();
    const handleClick = vi.fn();

    render(<Button onClick={handleClick}>Enviar</Button>);

    await user.click(screen.getByRole('button', { name: 'Enviar' }));

    expect(handleClick).toHaveBeenCalledTimes(1);
  });

  it('no dispara onClick cuando está deshabilitado', async () => {
    const user = userEvent.setup();
    const handleClick = vi.fn();

    render(
      <Button onClick={handleClick} disabled>
        Enviar
      </Button>
    );

    const button = screen.getByRole('button', { name: 'Enviar' });
    expect(button).toBeDisabled();

    await user.click(button);
    expect(handleClick).not.toHaveBeenCalled();
  });
});
