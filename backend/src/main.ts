import { NestFactory, Reflector } from "@nestjs/core"
import { AppModule } from "./app.module"
import { ConfigService } from "@nestjs/config"
import cookieParser from "cookie-parser"
import { ClassSerializerInterceptor, ValidationPipe } from "@nestjs/common"
import { DocumentBuilder, SwaggerModule } from "@nestjs/swagger"

async function bootstrap() {
  const app = await NestFactory.create(AppModule)

  const configService = app.get(ConfigService)
  const port = configService.get<number>("PORT") || 3000

  app.use(cookieParser())

  app.enableCors({
    origin: configService.get("CLIENT_DOMAIN_DEV"),
    credentials: true,
    methods: "GET,HEAD,PUT,PATCH,POST,DELETE",
    preflightContinue: false,
    optionsSuccessStatus: 204,
    allowedHeaders: "Content-Type, Authorization",
  })

  // P2: whitelist + forbidNonWhitelisted để chặn các field không khai báo trong DTO
  app.useGlobalPipes(
    new ValidationPipe({
      transform: true,
      whitelist: true,
      forbidNonWhitelisted: true,
    }),
  )

  app.useGlobalInterceptors(new ClassSerializerInterceptor(app.get(Reflector)))

  const config = new DocumentBuilder()
    .setTitle("Cafe Management API")
    .setDescription("API cho hệ thống quản lý quán cà phê / nhà hàng")
    .setVersion("1.0")
    .addCookieAuth("access_token")
    .build()
  const documentFactory = () => SwaggerModule.createDocument(app, config)
  SwaggerModule.setup("api", app, documentFactory)

  app.setGlobalPrefix("api/v1")

  await app.listen(port)
  console.log(`🚀 Server running on http://localhost:${port}/api/v1`)
  console.log(`📖 Swagger docs at http://localhost:${port}/api`)
}
bootstrap()
