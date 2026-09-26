import HttpStatusCodes from '@src/common/constants/HttpStatusCodes';

// One failed field in a validation error.
export interface IFieldIssue {
  field: string;
  message: string;
}

// HTTP error with a status code, thrown by controllers/repos/middleware.
export class ApiError extends Error {
  public status: HttpStatusCodes;
  public details?: IFieldIssue[];

  public constructor(
    status: HttpStatusCodes,
    message: string,
    details?: IFieldIssue[],
  ) {
    super(message);
    this.status = status;
    this.details = details;
  }

  // JSON body for the error response.
  public toResponse(): { error: string; details?: IFieldIssue[] } {
    return this.details
      ? { error: this.message, details: this.details }
      : { error: this.message };
  }
}

// 400 with field-level issues (bad body, bad params).
export class ValidationError extends ApiError {
  public static MESSAGE = 'Validation failed';

  public constructor(details: IFieldIssue[]) {
    super(HttpStatusCodes.BAD_REQUEST, ValidationError.MESSAGE, details);
  }
}

export default ApiError;
