import { PubSub } from '@google-cloud/pubsub';
import { Global, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Global()
@Injectable()
export class PubSubClient {
  public readonly client: PubSub;

  constructor(private readonly config: ConfigService) {
    const gcpServiceAccount = this.config.get<string>('GCP_SERVICE_ACCOUNT_JSON');
    const projectId = this.config.get<string>('GCP_PROJECT_ID');

    if (!gcpServiceAccount) {
      throw new Error('GCP_SERVICE_ACCOUNT_JSON is not defined');
    }

    let clientConfig: any = { projectId };

    // Check if it's JSON string or file path
    if (gcpServiceAccount.trim().startsWith('{')) {
      // It's JSON string (production/Render)
      try {
        clientConfig.credentials = JSON.parse(gcpServiceAccount);
      } catch (error) {
        throw new Error(`Failed to parse GCP_SERVICE_ACCOUNT_JSON: ${error.message}`);
      }
    } else {
      // It's a file path (local development)
      clientConfig.keyFilename = gcpServiceAccount;
    }

    this.client = new PubSub(clientConfig);
  }
}