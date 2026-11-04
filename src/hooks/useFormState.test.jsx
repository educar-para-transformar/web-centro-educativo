import { describe, expect, it } from 'vitest';
import { act, renderHook } from '@testing-library/react';
import useFormState from './useFormState';

describe('useFormState', () => {
  it('actualiza campos de texto y checkboxes', () => {
    const { result } = renderHook(() =>
      useFormState({ nombre: '', aceptaTerminos: false })
    );

    act(() => {
      result.current.handleInputChange({
        target: { name: 'nombre', value: 'Ana', type: 'text' },
      });
    });

    expect(result.current.formData.nombre).toBe('Ana');

    act(() => {
      result.current.handleInputChange({
        target: { name: 'aceptaTerminos', checked: true, type: 'checkbox' },
      });
    });

    expect(result.current.formData.aceptaTerminos).toBe(true);
  });

  it('limpia el error del campo cuando el usuario vuelve a escribir', () => {
    const { result } = renderHook(() => useFormState({ nombre: '' }));

    act(() => {
      result.current.setErrors({ nombre: 'El nombre es obligatorio' });
    });

    expect(result.current.errors.nombre).toBe('El nombre es obligatorio');

    act(() => {
      result.current.handleInputChange({
        target: { name: 'nombre', value: 'Ana', type: 'text' },
      });
    });

    expect(result.current.errors.nombre).toBeUndefined();
  });

  it('restablece el formulario y sus estados', () => {
    const initialValues = { nombre: 'Ana', aceptaTerminos: true };
    const { result } = renderHook(() => useFormState(initialValues));

    act(() => {
      result.current.setIsSubmitting(true);
      result.current.setSubmitSuccess(true);
      result.current.setFormData({ nombre: 'Otro', aceptaTerminos: false });
    });

    act(() => {
      result.current.resetForm();
    });

    expect(result.current.formData).toEqual(initialValues);
    expect(result.current.errors).toEqual({});
    expect(result.current.isSubmitting).toBe(false);
    expect(result.current.submitSuccess).toBe(false);
  });
});
