export interface FireflyCredentials {
  instanceUrl: string;
  personalAccessToken: string;
}

export interface FireflyVersion {
  data: {
    version: string;
    api_version: string;
    os: string;
    php_version: string;
  };
}

export interface FireflyApiResponse<T> {
  data: T;
  meta?: {
    pagination?: {
      total: number;
      count: number;
      per_page: number;
      current_page: number;
      total_pages: number;
    };
  };
}

export interface CacheMetadata {
  lastSynced: number;
  version: string;
}
