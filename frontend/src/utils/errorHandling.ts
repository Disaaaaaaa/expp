export class AppError extends Error {
  constructor(
    message: string,
    public code: string,
    public details?: any
  ) {
    super(message);
  }
}

export const handleApiError = (error: unknown) => {
  if (error instanceof AppError) {
    
    return error.message;
  }
  
  return 'An unexpected error occurred';
}; 