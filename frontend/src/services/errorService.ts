export const handleApiError = (error: any): string => {
  // Axios timeout — the request was aborted client-side.
  if (error?.code === "ECONNABORTED") {
    return "Request timed out. The AI model may be warming up — please try again in ~30 seconds.";
  }

  if (!error.response) {
    // Network error
    return "Network error. Please check your internet connection and try again.";
  }

  const status = error.response.status;
  const data = error.response.data || {};
  const message = data.error || error.message;

  // Backend signals an HF cold-start with {warmingUp: true}.
  if (data.warmingUp) {
    return (
      data.error ||
      "The AI model is warming up — please try again in ~30 seconds."
    );
  }

  switch (status) {
    case 401:
      return "Authentication required. Please log in again.";
    case 403:
      return "Access denied. You don't have permission for this action.";
    case 404:
      return "The requested resource was not found.";
    case 500:
      return "Server error. Please try again later.";
    case 502:
      return "AI service is temporarily unavailable. Please try again.";
    case 503:
      return (
        message ||
        "The AI model is warming up — please try again in ~30 seconds."
      );
    default:
      return message || `An error occurred (${status}).`;
  }
};

export const isAuthError = (error: any): boolean => {
  return error.response?.status === 401;
};
