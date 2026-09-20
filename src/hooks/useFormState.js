import { useCallback, useState } from 'react';

const useFormState = (initialValues) => {
  const [formData, setFormData] = useState(initialValues);
  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(false);

  const handleInputChange = useCallback((event) => {
    const { name, value, type, checked } = event.target;

    setFormData((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }));

    setErrors((prev) => {
      if (!prev[name]) return prev;

      const nextErrors = { ...prev };
      delete nextErrors[name];
      return nextErrors;
    });
  }, []);

  const resetForm = useCallback(() => {
    setFormData(initialValues);
    setErrors({});
    setIsSubmitting(false);
    setSubmitSuccess(false);
  }, [initialValues]);

  return {
    formData,
    setFormData,
    errors,
    setErrors,
    isSubmitting,
    setIsSubmitting,
    submitSuccess,
    setSubmitSuccess,
    handleInputChange,
    resetForm,
  };
};

export default useFormState;
