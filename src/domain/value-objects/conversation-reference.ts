import { InvalidArgumentError } from '../errors/invalid-argument.error.js';

interface ConversationReferenceProps {
  conversationId: string;
  serviceUrl: string;
  channelId?: string;
}

export class ConversationReference {
  readonly conversationId: string;
  readonly serviceUrl: string;
  readonly channelId: string | undefined;

  private constructor(props: ConversationReferenceProps) {
    this.conversationId = props.conversationId;
    this.serviceUrl = props.serviceUrl;
    this.channelId = props.channelId;
  }

  static create(props: ConversationReferenceProps): ConversationReference {
    if (!props.conversationId) {
      throw new InvalidArgumentError('conversationId must not be empty');
    }
    if (!props.serviceUrl) {
      throw new InvalidArgumentError('serviceUrl must not be empty');
    }
    return new ConversationReference(props);
  }

  equals(other: ConversationReference): boolean {
    return (
      this.conversationId === other.conversationId &&
      this.serviceUrl === other.serviceUrl &&
      this.channelId === other.channelId
    );
  }
}
