import axios from "axios";

const formatFieldErrors = (fieldErrors: any[]) =>
  fieldErrors
    .slice(0, 3)
    .map((item) => {
      const field = typeof item?.field === "string" && item.field.length > 0 ? item.field : null;
      const message = typeof item?.message === "string" ? item.message : "valor invalido";
      return field ? `${field}: ${message}` : message;
    })
    .join(" | ");

export function getApiErrorMessage(error: unknown, fallback = "Error inesperado.") {
  if (axios.isAxiosError(error)) {
    const data = error.response?.data as any;
    const baseMessage =
      typeof data?.error === "string"
        ? data.error
        : typeof data?.message === "string"
          ? data.message
          : null;

    const fieldErrors = Array.isArray(data?.details?.fieldErrors)
      ? data.details.fieldErrors
      : [];

    if (fieldErrors.length > 0) {
      const fields = formatFieldErrors(fieldErrors);
      return baseMessage ? `${baseMessage}: ${fields}` : fields;
    }

    if (baseMessage) return baseMessage;

    if (error.response?.status === 409) {
      return "Conflicto de datos. Verifica registros duplicados.";
    }
    if (error.response?.status === 400) {
      return "Datos invalidos. Revisa los campos enviados.";
    }
  }

  if (error instanceof Error && error.message) return error.message;
  return fallback;
}
