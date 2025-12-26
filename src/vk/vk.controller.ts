import { Controller, Post, Get, Body, Query, Logger, HttpCode } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBody } from '@nestjs/swagger';
import { ConfigService } from '@nestjs/config';
import { VkService } from './vk.service';
import { ApiService } from './api.service';
import {
  VkCallbackDto,
  TestMessageDto,
  StatusResponseDto,
  HealthResponseDto,
  TestResponseDto,
} from './dto/vk-callback.dto';

@ApiTags('vk')
@Controller('vk')
export class VkController {
  private readonly logger = new Logger(VkController.name);
  private readonly vkConfirmation: string;
  private readonly vkGroupId: number;

  constructor(
    private readonly vkService: VkService,
    private readonly apiService: ApiService,
    private readonly configService: ConfigService,
  ) {
    this.vkConfirmation = this.configService.get<string>('VK_CONFIRMATION');
    this.vkGroupId = parseInt(this.configService.get<string>('VK_GROUP_ID', '0'));
  }

  @Post('callback')
  @HttpCode(200)
  @ApiOperation({ summary: 'VK Callback API', description: 'Эндпоинт для приёма событий от VK Callback API' })
  @ApiBody({ type: VkCallbackDto })
  @ApiResponse({ status: 200, description: 'Возвращает "ok" или код подтверждения' })
  async handleCallback(
    @Body() body: VkCallbackDto,
    @Query() query: any,
  ): Promise<string> {
    this.logger.debug('VK callback received');

    const eventType = body.type || query.type;

    // Confirmation для VK
    if (eventType === 'confirmation') {
      this.logger.log(`Returning confirmation code: ${this.vkConfirmation}`);
      return this.vkConfirmation;
    }

    // Проверка group_id
    if (body.group_id && body.group_id !== this.vkGroupId) {
      this.logger.warn(`Invalid group_id: ${body.group_id}, expected: ${this.vkGroupId}`);
      return 'ok';
    }

    // Обработка событий
    try {
      switch (eventType) {
        case 'message_new':
          await this.handleMessageNew(body.object);
          break;
          
        case 'message_typing_state':
          // Игнорируем
          break;
          
        default:
          this.logger.log(`Unhandled event: ${eventType}`);
      }
    } catch (error) {
      this.logger.error(`Error processing ${eventType}:`, error.message);
    }

    return 'ok';
  }

  /**
   * Обработка нового сообщения из VK
   */
  private async handleMessageNew(messageData: any): Promise<void> {
    try {
      const message = messageData.message;
      const vkUserId = message.from_id;
      const messageText = message.text || '';
      
      this.logger.log(`Processing message from ${vkUserId}: ${messageText.substring(0, 100)}...`);

      // Получаем информацию о пользователе VK
      const userInfo = await this.vkService.getVkUserInfo(vkUserId);
      
      // Используем комплексный метод ApiService
      const success = await this.apiService.processVkMessage(vkUserId, userInfo, messageText);
      
      if (success) {
        this.logger.log(`Message from ${vkUserId} successfully sent to СпросиИИ`);
      } else {
        this.logger.error(`Failed to process message from ${vkUserId}`);
      }
      
    } catch (error) {
      this.logger.error('Error in handleMessageNew:', error.message, error.stack);
    }
  }

  @Post('test')
  @ApiOperation({ summary: 'Тест интеграции', description: 'Тестовая отправка сообщения через API' })
  @ApiBody({ type: TestMessageDto })
  @ApiResponse({ status: 200, type: TestResponseDto })
  async testIntegration(@Body() testData: TestMessageDto): Promise<TestResponseDto> {
    try {
      const vkUserId = testData.user_id || 506175275;
      const messageText = testData.message || 'Test message from VK integration';
      
      this.logger.log(`Manual test for user ${vkUserId}: ${messageText}`);
      
      const userInfo = await this.vkService.getVkUserInfo(vkUserId);
      const success = await this.apiService.processVkMessage(vkUserId, userInfo, messageText);
      
      return {
        status: success ? 'success' : 'error',
        message: success ? 'Test message processed through СпросиИИ API' : 'Failed to process test message',
        user_id: vkUserId,
        api_type: 'application',
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      return {
        status: 'error',
        message: error.message,
        timestamp: new Date().toISOString(),
      };
    }
  }

  @Post('test-api')
  @ApiOperation({ summary: 'Тест API подключения', description: 'Проверка соединения с СпросиИИ API' })
  @ApiResponse({ status: 200, type: TestResponseDto })
  async testApiConnection(): Promise<TestResponseDto> {
    try {
      const connected = await this.apiService.testConnection();

      return {
        status: connected ? 'success' : 'error',
        message: connected ? 'СпросиИИ API connection is working' : 'Failed to connect to СпросиИИ API',
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      return {
        status: 'error',
        message: error.message,
        timestamp: new Date().toISOString(),
      };
    }
  }

  @Get('status')
  @ApiOperation({ summary: 'Статус сервера', description: 'Получение полного статуса сервера и подключений' })
  @ApiResponse({ status: 200, type: StatusResponseDto })
  async getStatus(): Promise<StatusResponseDto> {
    const apiTest = await this.apiService.testConnection();

    return {
      status: 'online',
      timestamp: new Date().toISOString(),
      vk: {
        group_id: this.vkGroupId,
        confirmation_code_set: !!this.vkConfirmation,
      },
      api: {
        connected: apiTest,
        base_url: this.configService.get('API_BASE_URL'),
        account_id: this.configService.get('ACCOUNT_ID'),
        inbox_id: this.configService.get('INBOX_ID'),
      },
      server: {
        webhook_url: `${this.configService.get('WEBHOOK_URL', '')}/vk/callback`,
        environment: this.configService.get('NODE_ENV'),
      },
      endpoints: {
        vk_callback: `${this.configService.get('WEBHOOK_URL', '')}/vk/callback`,
        test: `${this.configService.get('WEBHOOK_URL', '')}/vk/test`,
        test_api: `${this.configService.get('WEBHOOK_URL', '')}/vk/test-api`,
        status: `${this.configService.get('WEBHOOK_URL', '')}/vk/status`,
      }
    };
  }

  @Get('health')
  @ApiOperation({ summary: 'Health check', description: 'Проверка работоспособности сервера' })
  @ApiResponse({ status: 200, type: HealthResponseDto })
  healthCheck(): HealthResponseDto {
    return {
      status: 'ok',
      timestamp: new Date().toISOString(),
      service: 'vk-sprosiii-integration',
    };
  }
}