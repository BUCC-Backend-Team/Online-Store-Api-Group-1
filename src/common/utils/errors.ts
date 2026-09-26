import HttpStatusCodes from '@src/common/constants/HttpStatusCodes';

// HTTP error with a status code, thrown by controllers/repos.
export class ApiError extends Error {
  public status: HttpStatusCodes;

  public constructor(status: HttpStatusCodes, message: string) {
    super(message);
    this.status = status;
  }
}

export default ApiError;
