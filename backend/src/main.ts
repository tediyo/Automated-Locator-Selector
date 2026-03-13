import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

async function bootstrap() {
  try {
    const app = await NestFactory.create(AppModule);
    app.enableCors({
      origin: '*', // For production, you should specify your Vercel URL
      methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
      credentials: true,
    });
    const port = process.env.PORT ?? 3001;
    await app.listen(port);
    console.log(`Backend is running on port: ${port}`);
  } catch (error) {
    console.error('Failed to bootstrap the application:', error);
    process.exit(1);
  }
}
bootstrap();
