import { Injectable, Logger } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { firstValueFrom } from 'rxjs';

@Injectable()
export class ApiService {
  private readonly logger = new Logger(ApiService.name);
  private readonly apiBaseUrl: string;
  private readonly inboxIdentifier: string;
  private contactCache = new Map<number, string>(); // vkUserId -> pubsub_token (source_id)

  constructor(
    private readonly httpService: HttpService,
    private readonly configService: ConfigService,
  ) {
    this.apiBaseUrl = this.configService.get<string>('API_BASE_URL');
    this.inboxIdentifier = this.configService.get<string>('INBOX_IDENTIFIER');

    this.logger.log(`СпросиИИ Client API initialized for inbox ${this.inboxIdentifier}`);
    this.validateConfig();
  }

  private validateConfig() {
    if (!this.inboxIdentifier) {
      this.logger.warn('INBOX_IDENTIFIER is not configured!');
    }
    if (!this.apiBaseUrl) {
      this.logger.warn('API_BASE_URL is not configured!');
    }
  }

  /**
   * Базовый URL для Client API
   */
  private get clientApiUrl(): string {
    return `${this.apiBaseUrl}/public/api/v1/inboxes/${this.inboxIdentifier}`;
  }

  /**
   * Создаёт контакт в СпросиИИ через Client API
   */
  async createContact(vkUserId: number, userInfo: any): Promise<{ sourceId: string; pubsubToken: string } | null> {
    try {
      const identifier = `vk_${vkUserId}`;

      // Проверяем кэш
      if (this.contactCache.has(vkUserId)) {
        const sourceId = this.contactCache.get(vkUserId);
        this.logger.debug(`Contact found in cache: ${sourceId}`);
        return { sourceId, pubsubToken: sourceId };
      }

      this.logger.log(`Creating contact for VK user ${vkUserId}`);

      const url = `${this.clientApiUrl}/contacts`;
      const contactData = {
        identifier: identifier,
        name: `${userInfo.first_name} ${userInfo.last_name}`.trim(),
        email: `vk_${vkUserId}@vk.messenger`,
        custom_attributes: {
          vk_id: vkUserId.toString(),
          vk_profile: `https://vk.com/id${vkUserId}`,
          source: 'vk_messenger'
        }
      };

      const response = await firstValueFrom(
        this.httpService.post(url, contactData, {
          headers: { 'Content-Type': 'application/json' },
          timeout: 10000,
        })
      );

      const sourceId = response.data?.source_id;
      const pubsubToken = response.data?.pubsub_token;

      if (!sourceId) {
        throw new Error('No source_id in response');
      }

      this.contactCache.set(vkUserId, sourceId);
      this.logger.log(`Created contact: source_id=${sourceId} for VK user ${vkUserId}`);

      return { sourceId, pubsubToken };

    } catch (error) {
      // Если контакт уже существует, пробуем получить его
      if (error.response?.status === 422 || error.response?.data?.message?.includes('already')) {
        this.logger.log(`Contact already exists for VK user ${vkUserId}, fetching...`);
        return this.getExistingContact(vkUserId);
      }

      this.logger.error(`Failed to create contact for ${vkUserId}:`, {
        status: error.response?.status,
        data: error.response?.data,
        message: error.message
      });
      return null;
    }
  }

  /**
   * Получает существующий контакт
   */
  private async getExistingContact(vkUserId: number): Promise<{ sourceId: string; pubsubToken: string } | null> {
    try {
      const identifier = `vk_${vkUserId}`;
      const url = `${this.clientApiUrl}/contacts/${identifier}`;

      const response = await firstValueFrom(
        this.httpService.get(url, {
          headers: { 'Content-Type': 'application/json' },
          timeout: 10000,
        })
      );

      const sourceId = response.data?.source_id || response.data?.identifier;
      if (sourceId) {
        this.contactCache.set(vkUserId, sourceId);
        return { sourceId, pubsubToken: response.data?.pubsub_token || sourceId };
      }
      return null;
    } catch (error) {
      this.logger.error(`Failed to get existing contact:`, error.message);
      return null;
    }
  }

  /**
   * Создаёт беседу в СпросиИИ
   */
  async createConversation(sourceId: string): Promise<number | null> {
    try {
      const url = `${this.clientApiUrl}/contacts/${sourceId}/conversations`;

      this.logger.debug(`Creating conversation for contact ${sourceId}`);

      const response = await firstValueFrom(
        this.httpService.post(url, {}, {
          headers: { 'Content-Type': 'application/json' },
          timeout: 10000,
        })
      );

      const conversationId = response.data?.id;

      if (!conversationId) {
        throw new Error('No conversation ID in response');
      }

      this.logger.log(`Created conversation: ${conversationId}`);
      return conversationId;

    } catch (error) {
      this.logger.error(`Failed to create conversation:`, {
        status: error.response?.status,
        data: error.response?.data,
        message: error.message
      });
      return null;
    }
  }

  /**
   * Получает список бесед контакта
   */
  async getConversations(sourceId: string): Promise<any[]> {
    try {
      const url = `${this.clientApiUrl}/contacts/${sourceId}/conversations`;

      const response = await firstValueFrom(
        this.httpService.get(url, {
          headers: { 'Content-Type': 'application/json' },
          timeout: 10000,
        })
      );

      return response.data || [];
    } catch (error) {
      this.logger.error(`Failed to get conversations:`, error.message);
      return [];
    }
  }

  /**
   * Отправляет сообщение в беседу СпросиИИ
   */
  async sendMessage(sourceId: string, conversationId: number, content: string): Promise<boolean> {
    try {
      if (!content || content.trim().length === 0) {
        this.logger.warn('Empty message, skipping');
        return false;
      }

      const url = `${this.clientApiUrl}/contacts/${sourceId}/conversations/${conversationId}/messages`;

      const messageData = {
        content: content.trim()
      };

      this.logger.debug(`Sending message to conversation ${conversationId}`);

      await firstValueFrom(
        this.httpService.post(url, messageData, {
          headers: { 'Content-Type': 'application/json' },
          timeout: 10000,
        })
      );

      this.logger.log(`Message sent to conversation ${conversationId}`);
      return true;

    } catch (error) {
      this.logger.error(`Failed to send message:`, {
        status: error.response?.status,
        data: error.response?.data,
        message: error.message
      });
      return false;
    }
  }

  /**
   * Тестирует подключение к СпросиИИ Client API
   */
  async testConnection(): Promise<boolean> {
    try {
      const url = this.clientApiUrl;

      this.logger.log(`Testing СпросиИИ Client API connection: ${url}`);

      const response = await firstValueFrom(
        this.httpService.get(url, {
          headers: { 'Content-Type': 'application/json' },
          timeout: 10000,
        })
      );

      if (response.status === 200 && response.data?.identifier) {
        this.logger.log(`СпросиИИ Client API connection: SUCCESS (inbox: ${response.data.name})`);
        return true;
      }

      return false;
    } catch (error) {
      this.logger.error('СпросиИИ Client API connection: FAILED', {
        status: error.response?.status,
        message: error.message
      });
      return false;
    }
  }

  /**
   * Комплексный метод: обрабатывает сообщение от VK
   */
  async processVkMessage(vkUserId: number, userInfo: any, messageText: string): Promise<boolean> {
    try {
      // 1. Создаём/получаем контакт
      const contact = await this.createContact(vkUserId, userInfo);

      if (!contact) {
        this.logger.error(`Failed to create/get contact for ${vkUserId}`);
        return false;
      }

      // 2. Получаем существующие беседы или создаём новую
      let conversationId: number | null = null;

      const conversations = await this.getConversations(contact.sourceId);
      if (conversations.length > 0) {
        // Берём последнюю открытую беседу
        const openConv = conversations.find((c: any) => c.status === 'open') || conversations[0];
        conversationId = openConv.id;
        this.logger.log(`Using existing conversation: ${conversationId}`);
      } else {
        // Создаём новую беседу
        conversationId = await this.createConversation(contact.sourceId);
      }

      if (!conversationId) {
        this.logger.error(`Failed to get/create conversation for contact ${contact.sourceId}`);
        return false;
      }

      // 3. Отправляем сообщение
      const success = await this.sendMessage(contact.sourceId, conversationId, messageText);

      return success;
    } catch (error) {
      this.logger.error(`Failed to process VK message:`, error.message);
      return false;
    }
  }
}
