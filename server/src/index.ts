import mongoose from 'mongoose';
import { loadConfig } from './config';
import { createApp } from './app';

async function bootstrap() {
  try {
    const config = loadConfig();
    const app = createApp();

    console.log('[NyayaPacket AI] Connecting to MongoDB...');
    await mongoose.connect(config.MONGODB_URI);
    console.log('[NyayaPacket AI] MongoDB connected successfully.');

    app.listen(config.PORT, () => {
      console.log(`[NyayaPacket AI] Server listening on port ${config.PORT}`);
      console.log(`[NyayaPacket AI] Client origin allowed: ${config.CLIENT_ORIGIN}`);
    });
  } catch (error) {
    console.error('[NyayaPacket AI] Server startup failed:', error);
    process.exit(1);
  }
}

// Start if executed directly
if (process.env.NODE_ENV !== 'test') {
  bootstrap();
}
