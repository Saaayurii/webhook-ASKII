export default () => ({
  port: parseInt(process.env.PORT, 10) || 3000,

  vk: {
    token: process.env.VK_TOKEN,
    confirmation: process.env.VK_CONFIRMATION,
    groupId: parseInt(process.env.VK_GROUP_ID, 10),
    apiVersion: process.env.VK_API_VERSION || '5.199',
    secret: process.env.VK_SECRET,
  },

  api: {
    baseUrl: process.env.API_BASE_URL,
    token: process.env.API_TOKEN,
    inboxId: parseInt(process.env.INBOX_ID, 10),
    accountId: parseInt(process.env.ACCOUNT_ID, 10) || 1,
  },

  webhook: {
    url: process.env.WEBHOOK_URL,
  },
});