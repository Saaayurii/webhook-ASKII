import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class VkCallbackDto {
  @ApiProperty({ description: 'Тип события VK', example: 'message_new' })
  type: string;

  @ApiPropertyOptional({ description: 'ID группы VK', example: 123456789 })
  group_id?: number;

  @ApiPropertyOptional({ description: 'Данные события' })
  object?: any;

  @ApiPropertyOptional({ description: 'Секретный ключ' })
  secret?: string;
}

export class TestMessageDto {
  @ApiPropertyOptional({ description: 'ID пользователя VK', example: 506175275 })
  user_id?: number;

  @ApiPropertyOptional({ description: 'Текст сообщения', example: 'Тестовое сообщение' })
  message?: string;
}

export class StatusResponseDto {
  @ApiProperty({ example: 'online' })
  status: string;

  @ApiProperty({ example: '2024-01-01T12:00:00.000Z' })
  timestamp: string;

  @ApiProperty()
  vk: {
    group_id: number;
    confirmation_code_set: boolean;
  };

  @ApiProperty()
  api: {
    connected: boolean;
    base_url: string;
    account_id: string;
    inbox_id: string;
  };

  @ApiProperty()
  server: {
    webhook_url: string;
    environment: string;
  };

  @ApiProperty()
  endpoints: {
    vk_callback: string;
    test: string;
    test_api: string;
    status: string;
  };
}

export class HealthResponseDto {
  @ApiProperty({ example: 'ok' })
  status: string;

  @ApiProperty({ example: '2024-01-01T12:00:00.000Z' })
  timestamp: string;

  @ApiProperty({ example: 'vk-sprosiii-integration' })
  service: string;
}

export class TestResponseDto {
  @ApiProperty({ enum: ['success', 'error'] })
  status: string;

  @ApiProperty()
  message: string;

  @ApiPropertyOptional()
  user_id?: number;

  @ApiPropertyOptional()
  api_type?: string;

  @ApiProperty()
  timestamp: string;
}
