import { PubSub } from '@google-cloud/pubsub';
import { Global, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
@Global()
@Injectable()
export class PubSubClient {
  public readonly client: PubSub;

  constructor(private readonly config: ConfigService) {
    this.client = new PubSub({
      projectId: this.config.get<string>('GCP_PROJECT_ID'),
      keyFilename: this.config.get<string>('GOOGLE_APPLICATION_CREDENTIALS'),
    });
  }
}
