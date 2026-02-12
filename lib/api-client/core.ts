import type { FireflyCredentials, FireflyVersion } from "@/types";
import axios, { AxiosError, AxiosInstance } from "axios";

export class FireflyApiClient {
  protected axiosInstance: AxiosInstance | null = null;
  private credentials: FireflyCredentials | null = null;

  initialize(credentials: FireflyCredentials) {
    this.credentials = credentials;
    const baseURL = credentials.instanceUrl.endsWith("/")
      ? credentials.instanceUrl
      : `${credentials.instanceUrl}/`;

    this.axiosInstance = axios.create({
      baseURL: `${baseURL}api/v1/`,
      headers: {
        Authorization: `Bearer ${credentials.personalAccessToken}`,
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      timeout: 30000,
    });

    this.axiosInstance.interceptors.response.use(
      (response) => response,
      (error: AxiosError) => {
        return Promise.reject(this.handleError(error));
      }
    );
  }

  protected handleError(error: AxiosError): Error {
    if (error.response) {
      const status = error.response.status;
      const data = error.response.data as any;

      switch (status) {
        case 401:
          return new Error(
            "Invalid credentials. Please check your Personal Access Token."
          );
        case 403:
          return new Error(
            "Access forbidden. You do not have permission to access this resource."
          );
        case 404:
          return new Error("Resource not found.");
        case 422: {
          // For validation errors, preserve the full response data
          const validationError = new Error(
            data?.message || "Validation error. Please check your input."
          );
          // Attach the full response data to the error object
          (validationError as any).response = error.response;
          return validationError;
        }
        case 429:
          return new Error(
            "Too many requests. Please wait a moment and try again."
          );
        case 500:
          return new Error("Server error. Please try again later.");
        default:
          return new Error(
            data?.message || `Request failed with status ${status}`
          );
      }
    } else if (error.request) {
      return new Error(
        "Cannot connect to Firefly III. Please check your instance URL and network connection."
      );
    } else {
      return new Error(error.message || "An unexpected error occurred.");
    }
  }

  protected ensureInitialized(): AxiosInstance {
    if (!this.axiosInstance) {
      throw new Error(
        "API client not initialized. Please set credentials first."
      );
    }
    return this.axiosInstance;
  }

  async validateConnection(): Promise<FireflyVersion> {
    const api = this.ensureInitialized();
    const response = await api.get<FireflyVersion>("about");
    return response.data;
  }
}
